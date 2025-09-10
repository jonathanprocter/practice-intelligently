// OAuth Token Refresh Service with Automatic Recovery
import { simpleOAuth } from './oauth-simple';
import { promises as fs } from 'fs';
import path from 'path';

interface TokenInfo {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
  scope?: string;
  token_type?: string;
}

export class OAuthRefreshService {
  private static instance: OAuthRefreshService;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private readonly REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
  private readonly REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes before expiry
  private readonly TOKEN_FILE = path.join(process.cwd(), '.oauth-tokens.json');
  private tokenRefreshCallbacks: Set<() => void> = new Set();
  private lastSuccessfulRefresh: Date | null = null;
  private failedRefreshAttempts = 0;
  private readonly MAX_FAILED_ATTEMPTS = 3;

  private constructor() {
    this.initialize();
  }

  static getInstance(): OAuthRefreshService {
    if (!OAuthRefreshService.instance) {
      OAuthRefreshService.instance = new OAuthRefreshService();
    }
    return OAuthRefreshService.instance;
  }

  private async initialize() {
    console.log('Initializing OAuth Refresh Service...');
    
    // Check initial token status
    const status = await this.getTokenStatus();
    console.log('Initial OAuth status:', status);

    // Start automatic refresh if we have tokens
    if (status.hasTokens) {
      this.startAutoRefresh();
      
      // Do an immediate check if token needs refresh
      if (status.needsRefresh) {
        await this.refreshTokens();
      }
    }
  }

  async getTokenStatus(): Promise<{
    hasTokens: boolean;
    isValid: boolean;
    needsRefresh: boolean;
    expiresIn: number | null;
    error?: string;
  }> {
    try {
      // Check if token file exists
      const tokenExists = await this.tokenFileExists();
      if (!tokenExists) {
        return {
          hasTokens: false,
          isValid: false,
          needsRefresh: true,
          expiresIn: null,
          error: 'No OAuth tokens found'
        };
      }

      // Read token info
      const tokens = await this.readTokens();
      if (!tokens || !tokens.access_token) {
        return {
          hasTokens: false,
          isValid: false,
          needsRefresh: true,
          expiresIn: null,
          error: 'Invalid token data'
        };
      }

      // Check expiry
      const now = Date.now();
      const expiryDate = tokens.expiry_date || 0;
      const expiresIn = expiryDate - now;
      const needsRefresh = expiresIn < this.REFRESH_BUFFER;

      // Test token validity
      const isValid = await this.testTokenValidity(tokens.access_token);

      return {
        hasTokens: true,
        isValid,
        needsRefresh: needsRefresh || !isValid,
        expiresIn: expiresIn > 0 ? expiresIn : null
      };

    } catch (error: any) {
      console.error('Error checking token status:', error);
      return {
        hasTokens: false,
        isValid: false,
        needsRefresh: true,
        expiresIn: null,
        error: error.message
      };
    }
  }

  async refreshTokens(): Promise<boolean> {
    if (this.isRefreshing) {
      console.log('Token refresh already in progress');
      return this.waitForRefresh();
    }

    this.isRefreshing = true;
    console.log('Starting OAuth token refresh...');

    try {
      // Read current tokens
      const tokens = await this.readTokens();
      if (!tokens || !tokens.refresh_token) {
        throw new Error('No refresh token available');
      }

      // Use the simpleOAuth instance to refresh
      const refreshed = await simpleOAuth.refreshTokensIfNeeded();
      
      if (refreshed) {
        console.log('OAuth tokens refreshed successfully');
        this.lastSuccessfulRefresh = new Date();
        this.failedRefreshAttempts = 0;
        
        // Notify callbacks
        this.notifyRefreshCallbacks();
        
        return true;
      } else {
        throw new Error('Token refresh returned false');
      }

    } catch (error: any) {
      console.error('Failed to refresh OAuth tokens:', error.message);
      this.failedRefreshAttempts++;

      // If we've failed too many times, stop trying
      if (this.failedRefreshAttempts >= this.MAX_FAILED_ATTEMPTS) {
        console.error('Max refresh attempts reached. OAuth connection may be broken.');
        this.stopAutoRefresh();
        
        // Clear tokens after max failures
        await this.clearTokens();
      }

      return false;

    } finally {
      this.isRefreshing = false;
    }
  }

  private async waitForRefresh(): Promise<boolean> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.isRefreshing) {
          clearInterval(checkInterval);
          resolve(this.lastSuccessfulRefresh !== null && 
                  (Date.now() - this.lastSuccessfulRefresh.getTime()) < 60000);
        }
      }, 100);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, 30000);
    });
  }

  startAutoRefresh() {
    if (this.refreshTimer) {
      return; // Already running
    }

    console.log('Starting OAuth auto-refresh timer');

    // Initial check
    this.checkAndRefresh();

    // Set up periodic refresh
    this.refreshTimer = setInterval(() => {
      this.checkAndRefresh();
    }, this.REFRESH_INTERVAL);
  }

  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('Stopped OAuth auto-refresh timer');
    }
  }

  private async checkAndRefresh() {
    try {
      const status = await this.getTokenStatus();
      
      if (status.needsRefresh && status.hasTokens) {
        console.log('Token needs refresh, refreshing now...');
        await this.refreshTokens();
      } else if (status.isValid) {
        console.log(`Token valid for ${Math.round((status.expiresIn || 0) / 60000)} more minutes`);
      }
    } catch (error) {
      console.error('Error in auto-refresh check:', error);
    }
  }

  async forceRefresh(): Promise<boolean> {
    console.log('Force refreshing OAuth tokens...');
    this.failedRefreshAttempts = 0; // Reset failure counter
    return await this.refreshTokens();
  }

  onTokenRefresh(callback: () => void): () => void {
    this.tokenRefreshCallbacks.add(callback);
    return () => {
      this.tokenRefreshCallbacks.delete(callback);
    };
  }

  private notifyRefreshCallbacks() {
    this.tokenRefreshCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in token refresh callback:', error);
      }
    });
  }

  // Helper methods
  private async tokenFileExists(): Promise<boolean> {
    try {
      await fs.access(this.TOKEN_FILE);
      return true;
    } catch {
      return false;
    }
  }

  private async readTokens(): Promise<TokenInfo | null> {
    try {
      const data = await fs.readFile(this.TOKEN_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to read token file:', error);
      return null;
    }
  }

  private async clearTokens(): Promise<void> {
    try {
      await fs.unlink(this.TOKEN_FILE);
      console.log('Cleared OAuth tokens');
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  private async testTokenValidity(accessToken: string): Promise<boolean> {
    try {
      // Test the token with a simple API call
      const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }

  // Public API for checking connection status
  async isConnected(): boolean {
    const status = await this.getTokenStatus();
    return status.hasTokens && status.isValid;
  }

  async ensureValidToken(): Promise<boolean> {
    const status = await this.getTokenStatus();
    
    if (!status.hasTokens) {
      console.log('No OAuth tokens available');
      return false;
    }

    if (status.needsRefresh) {
      return await this.refreshTokens();
    }

    return status.isValid;
  }

  getRefreshStatus(): {
    isRefreshing: boolean;
    lastRefresh: Date | null;
    failedAttempts: number;
    autoRefreshActive: boolean;
  } {
    return {
      isRefreshing: this.isRefreshing,
      lastRefresh: this.lastSuccessfulRefresh,
      failedAttempts: this.failedRefreshAttempts,
      autoRefreshActive: this.refreshTimer !== null
    };
  }

  // Graceful shutdown
  destroy() {
    this.stopAutoRefresh();
    this.tokenRefreshCallbacks.clear();
  }
}

// Export singleton instance
export const oauthRefreshService = OAuthRefreshService.getInstance();

// Graceful shutdown handler
process.on('SIGTERM', () => {
  oauthRefreshService.destroy();
});

process.on('SIGINT', () => {
  oauthRefreshService.destroy();
});

export default oauthRefreshService;