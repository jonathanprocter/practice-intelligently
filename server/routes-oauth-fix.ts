import { Router } from 'express';
import { simpleOAuth } from './oauth-simple';
import { oauthTokenManager } from './oauth-token-manager';

export const oauthFixRoutes = Router();

/**
 * Get OAuth status and token information
 */
oauthFixRoutes.get('/api/auth/status', async (req, res) => {
  try {
    const status = await oauthTokenManager.getTokenStatus();
    
    res.json({
      success: true,
      status: {
        isConnected: status.isConnected,
        isValid: status.isValid,
        expiresIn: status.expiresIn,
        needsRefresh: status.needsRefresh,
        error: status.error
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Force refresh OAuth tokens
 */
oauthFixRoutes.post('/api/auth/refresh', async (req, res) => {
  try {
    const refreshed = await oauthTokenManager.forceRefreshTokens();
    
    if (refreshed) {
      res.json({
        success: true,
        message: 'Tokens refreshed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to refresh tokens - re-authentication may be required'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Initialize OAuth token auto-refresh
 */
oauthFixRoutes.post('/api/auth/initialize', async (req, res) => {
  try {
    const initialized = await oauthTokenManager.initialize();
    
    if (initialized) {
      res.json({
        success: true,
        message: 'OAuth token manager initialized with auto-refresh'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to initialize - authentication required'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Clear OAuth tokens (logout)
 */
oauthFixRoutes.post('/api/auth/clear', async (req, res) => {
  try {
    await oauthTokenManager.clearTokens();
    
    res.json({
      success: true,
      message: 'OAuth tokens cleared successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test Google Calendar connection
 */
oauthFixRoutes.get('/api/auth/test-calendar', async (req, res) => {
  try {
    // Check if connected
    if (!simpleOAuth.isConnected()) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated with Google'
      });
    }
    
    // Try to refresh tokens first
    await simpleOAuth.refreshTokensIfNeeded();
    
    // Attempt to get calendars
    const calendars = await simpleOAuth.getCalendars();
    
    res.json({
      success: true,
      message: 'Calendar connection successful',
      calendarCount: calendars.length,
      calendars: calendars.slice(0, 5).map(cal => ({
        id: cal.id,
        summary: cal.summary,
        primary: cal.primary
      }))
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Fix common OAuth issues automatically
 */
oauthFixRoutes.post('/api/auth/auto-fix', async (req, res) => {
  try {
    const fixes = [];
    let success = true;
    
    // Check current status
    const status = await oauthTokenManager.getTokenStatus();
    
    if (!status.isConnected) {
      fixes.push({
        issue: 'No OAuth tokens',
        action: 'Authentication required',
        fixed: false
      });
      success = false;
    } else {
      // Try to refresh if needed
      if (status.needsRefresh) {
        const refreshed = await oauthTokenManager.checkAndRefreshTokens();
        fixes.push({
          issue: 'Tokens expired or expiring soon',
          action: 'Attempted refresh',
          fixed: refreshed
        });
        
        if (!refreshed) {
          success = false;
        }
      }
      
      // Initialize auto-refresh if not running
      if (success) {
        const initialized = await oauthTokenManager.initialize();
        fixes.push({
          issue: 'Auto-refresh not running',
          action: 'Started auto-refresh',
          fixed: initialized
        });
      }
    }
    
    res.json({
      success,
      fixes,
      authUrl: !status.isConnected ? await simpleOAuth.getAuthUrl() : undefined
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});