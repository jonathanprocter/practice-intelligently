import { simpleOAuth } from './oauth-simple';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * OAuth Token Manager
 * Handles automatic token refresh and validation
 */
export class OAuthTokenManager {
  private refreshInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 30 * 60 * 1000; // Check every 30 minutes
  private readonly REFRESH_BUFFER = 10 * 60 * 1000; // Refresh 10 minutes before expiry

  /**
   * Start automatic token refresh monitoring
   */
  startAutoRefresh(): void {
    // Clear any existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Initial check
    this.checkAndRefreshTokens();

    // Set up periodic checks
    this.refreshInterval = setInterval(() => {
      this.checkAndRefreshTokens();
    }, this.CHECK_INTERVAL);

    console.log('OAuth token auto-refresh started');
  }

  /**
   * Stop automatic token refresh monitoring
   */
  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('OAuth token auto-refresh stopped');
    }
  }

  /**
   * Check tokens and refresh if needed
   */
  async checkAndRefreshTokens(): Promise<boolean> {
    try {
      // Check if OAuth is connected
      if (!simpleOAuth.isConnected()) {
        console.log('OAuth not connected - skipping refresh check');
        return false;
      }

      // Try to refresh tokens if needed
      await simpleOAuth.refreshTokensIfNeeded();
      
      // Verify the connection works
      const isValid = await simpleOAuth.testConnection();
      
      if (isValid) {
        console.log('OAuth tokens are valid and working');
        return true;
      } else {
        console.warn('OAuth tokens exist but connection test failed');
        return false;
      }
    } catch (error: any) {
      console.error('Error during token refresh check:', error.message);
      return false;
    }
  }

  /**
   * Force refresh tokens regardless of expiry
   */
  async forceRefreshTokens(): Promise<boolean> {
    try {
      if (!simpleOAuth.isConnected()) {
        throw new Error('Cannot refresh - no tokens available');
      }

      // Load current tokens
      const tokensPath = path.join(process.cwd(), '.oauth-tokens.json');
      const tokensData = await fs.readFile(tokensPath, 'utf8');
      const tokens = JSON.parse(tokensData);

      // Force expiry to trigger refresh
      tokens.expiry_date = Date.now() - 1000;
      await fs.writeFile(tokensPath, JSON.stringify(tokens, null, 2));

      // Now refresh
      await simpleOAuth.refreshTokensIfNeeded();
      
      const isValid = await simpleOAuth.testConnection();
      console.log(isValid ? 'Tokens forcefully refreshed successfully' : 'Force refresh failed');
      
      return isValid;
    } catch (error: any) {
      console.error('Error during force refresh:', error.message);
      return false;
    }
  }

  /**
   * Get token status information
   */
  async getTokenStatus(): Promise<{
    isConnected: boolean;
    isValid: boolean;
    expiresIn?: number;
    needsRefresh: boolean;
    error?: string;
  }> {
    try {
      const isConnected = simpleOAuth.isConnected();
      
      if (!isConnected) {
        return {
          isConnected: false,
          isValid: false,
          needsRefresh: true,
          error: 'No OAuth tokens found'
        };
      }

      // Check token expiry
      const tokensPath = path.join(process.cwd(), '.oauth-tokens.json');
      const tokensData = await fs.readFile(tokensPath, 'utf8');
      const tokens = JSON.parse(tokensData);
      
      const now = Date.now();
      const expiryDate = tokens.expiry_date || 0;
      const expiresIn = Math.max(0, expiryDate - now);
      const needsRefresh = expiresIn < this.REFRESH_BUFFER;
      
      // Test actual connection
      const isValid = await simpleOAuth.testConnection();
      
      return {
        isConnected,
        isValid,
        expiresIn: Math.round(expiresIn / 1000), // Convert to seconds
        needsRefresh,
        error: isValid ? undefined : 'Connection test failed'
      };
    } catch (error: any) {
      return {
        isConnected: false,
        isValid: false,
        needsRefresh: true,
        error: error.message
      };
    }
  }

  /**
   * Initialize OAuth with automatic recovery
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('Initializing OAuth Token Manager...');
      
      // Check current status
      const status = await this.getTokenStatus();
      
      if (!status.isConnected) {
        console.log('No OAuth tokens - authentication required');
        return false;
      }
      
      if (status.needsRefresh) {
        console.log('Tokens need refresh - attempting refresh...');
        const refreshed = await this.checkAndRefreshTokens();
        
        if (!refreshed) {
          console.warn('Token refresh failed - manual re-authentication may be required');
          return false;
        }
      }
      
      // Start auto-refresh
      this.startAutoRefresh();
      
      console.log('OAuth Token Manager initialized successfully');
      return true;
    } catch (error: any) {
      console.error('Failed to initialize OAuth Token Manager:', error.message);
      return false;
    }
  }

  /**
   * Handle OAuth callback and save tokens
   */
  async handleOAuthCallback(code: string): Promise<boolean> {
    try {
      // Exchange code for tokens
      await simpleOAuth.exchangeCodeForTokens(code);
      
      // Start auto-refresh
      this.startAutoRefresh();
      
      console.log('OAuth callback handled successfully');
      return true;
    } catch (error: any) {
      console.error('Failed to handle OAuth callback:', error.message);
      return false;
    }
  }

  /**
   * Clear all OAuth tokens and reset
   */
  async clearTokens(): Promise<void> {
    try {
      // Stop auto-refresh
      this.stopAutoRefresh();
      
      // Clear tokens
      await simpleOAuth.clearTokens();
      
      console.log('OAuth tokens cleared');
    } catch (error: any) {
      console.error('Error clearing tokens:', error.message);
    }
  }
}

// Export singleton instance
export const oauthTokenManager = new OAuthTokenManager();

// Initialize on module load if in production
if (process.env.NODE_ENV === 'production') {
  oauthTokenManager.initialize().catch(error => {
    console.error('Failed to auto-initialize OAuth Token Manager:', error);
  });
}