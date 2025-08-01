import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';

// Simple OAuth configuration focused on working implementation
class SimpleOAuth {
  private oauth2Client: OAuth2Client;
  private tokens: any = null;
  private isAuthenticated = false;
  private tokensFilePath: string;

  constructor() {
    const redirectUri = this.getRedirectUri();
    // OAuth initialization complete

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
    }

    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    // Set up persistent token storage
    this.tokensFilePath = path.join(process.cwd(), '.oauth-tokens.json');
    this.loadTokens().catch(error => {
      console.warn('Failed to load tokens during initialization:', error);
    });
  }

  private getRedirectUri(): string {
    // Check Replit environment variables
    if (process.env.REPLIT_DEV_DOMAIN) {
      return `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
    }
    if (process.env.REPLIT_DOMAINS) {
      const domain = process.env.REPLIT_DOMAINS.split(',')[0];
      return `https://${domain}/api/auth/google/callback`;
    }
    // Local development fallback
    return 'http://localhost:5000/api/auth/google/callback';
  }

  async getAccessToken(code: string): Promise<any> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      await this.saveTokens(tokens);
      return tokens;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  async getAuthUrl(): Promise<string> {
    // Generating OAuth URL
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      include_granted_scopes: true
    });

    // OAuth URL generated successfully
    return authUrl;
  }

  private async loadTokens(): Promise<void> {
    try {
      const { promises: fsPromises } = await import('fs');
      try {
        const tokensData = await fsPromises.readFile(this.tokensFilePath, 'utf8');
        this.tokens = JSON.parse(tokensData);
        this.oauth2Client.setCredentials(this.tokens);
        this.isAuthenticated = true;
        console.log('Loaded existing OAuth tokens');
      } catch (fileError) {
        // File doesn't exist or is invalid, start fresh
        this.tokens = null;
        this.isAuthenticated = false;
      }
    } catch (error) {
      console.warn('Failed to load existing tokens:', error);
      this.tokens = null;
      this.isAuthenticated = false;
    }
  }

  private async saveTokens(tokens: any): Promise<void> {
    try {
      const { promises: fsPromises } = await import('fs');
      await fsPromises.writeFile(this.tokensFilePath, JSON.stringify(tokens, null, 2));
      console.log('OAuth tokens saved to file');
    } catch (error) {
      console.error('Failed to save tokens:', error);
    }
  }

  async exchangeCodeForTokens(code: string): Promise<void> {
    try {
      console.log('Exchanging code for tokens...');
      const { tokens } = await this.oauth2Client.getToken(code);

      this.tokens = tokens;
      this.oauth2Client.setCredentials(tokens);
      this.isAuthenticated = true;
      await this.saveTokens(tokens);

      console.log('Successfully obtained and saved tokens:', Object.keys(tokens));
    } catch (error: any) {
      console.error('Token exchange failed:', error);
      this.isAuthenticated = false;
      throw new Error(`OAuth token exchange failed: ${error.message}`);
    }
  }

  isConnected(): boolean {
    return this.isAuthenticated && this.tokens !== null;
  }

  async getCalendars() {
    if (!this.isConnected()) {
      throw new Error('Not authenticated. Please complete OAuth flow first.');
    }

    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      // Fetch ALL calendars including subcalendars with comprehensive parameters
      const response = await calendar.calendarList.list({
        maxResults: 250, // Increase to ensure we get all calendars and subcalendars
        showDeleted: false,
        showHidden: false // Include hidden calendars that might contain subcalendars
      });
      
      const calendars = response.data.items || [];
      
      // Enhanced logging to understand calendar structure
      console.log(`Found ${calendars.length} calendars including subcalendars:`);
      calendars.forEach((cal, index) => {
        console.log(`  ${index + 1}. ${cal.summary} (${cal.id}) [${cal.accessRole}] ${cal.primary ? '[PRIMARY]' : ''}`);
      });
      
      return calendars;
    } catch (error: any) {
      console.error('Error fetching calendars:', error);
      if (error.code === 401 || error.code === 403) {
        this.isAuthenticated = false;
        throw new Error('Authentication expired. Please re-authenticate.');
      }
      throw error;
    }
  }

  async getEvents(calendarId: string = 'primary', timeMin?: string, timeMax?: string) {
    if (!this.isConnected()) {
      throw new Error('Not authenticated. Please complete OAuth flow first.');
    }

    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      const response = await calendar.events.list({
        calendarId,
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500, // Increase to ensure we get all events from each calendar/subcalendar
        showDeleted: false
      });

      const events = response.data.items || [];
      if (events.length > 0) {
        console.log(`  → Fetched ${events.length} events from calendar: ${calendarId}`);
      }
      
      return events;
    } catch (error: any) {
      console.error(`Error fetching events from calendar ${calendarId}:`, error.message);
      if (error.code === 401 || error.code === 403) {
        this.isAuthenticated = false;
        throw new Error('Authentication expired. Please re-authenticate.');
      }
      // Don't throw error for individual calendars, just return empty array
      return [];
    }
  }

  async deleteEvent(calendarId: string = 'primary', eventId: string): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Not authenticated with Google Calendar');
    }

    try {
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      await calendar.events.delete({
        calendarId,
        eventId
      });
      console.log(`Successfully deleted event ${eventId} from calendar ${calendarId}`);
    } catch (error: any) {
      console.error('Error deleting event:', error);
      if (error.code === 401 || error.code === 403) {
        this.isAuthenticated = false;
        throw new Error('Authentication expired. Please re-authenticate.');
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.tokens = null;
    this.isAuthenticated = false;
    this.oauth2Client.setCredentials({});

    // Remove tokens file
    try {
      const { promises: fsPromises } = await import('fs');
      try {
        await fsPromises.unlink(this.tokensFilePath);
        console.log('OAuth tokens file deleted');
      } catch (fileError) {
        // File might not exist, which is fine
      }
    } catch (error) {
      console.warn('Failed to delete tokens file:', error);
    }

    console.log('OAuth session disconnected');
  }
}

// Export singleton instance
export const simpleOAuth = new SimpleOAuth();
export { SimpleOAuth };