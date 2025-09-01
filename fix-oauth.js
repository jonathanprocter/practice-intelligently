#!/usr/bin/env node
import 'dotenv/config';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(chalk.blue.bold('\n=== OAuth Configuration & Fix Tool ===\n'));

class OAuthFixer {
  constructor() {
    this.tokensFilePath = path.join(__dirname, '.oauth-tokens.json');
    this.oauth2Client = null;
  }

  async checkCurrentTokens() {
    console.log(chalk.yellow('1. Checking existing OAuth tokens...'));
    
    try {
      const tokensData = await fs.readFile(this.tokensFilePath, 'utf8');
      const tokens = JSON.parse(tokensData);
      
      console.log(chalk.green('  ✓ Found existing tokens file'));
      
      // Check token details
      if (tokens.access_token) {
        console.log(chalk.green('  ✓ Access token present'));
      }
      
      if (tokens.refresh_token) {
        console.log(chalk.green('  ✓ Refresh token present'));
      } else {
        console.log(chalk.yellow('  ⚠ No refresh token - may need re-authentication'));
      }
      
      if (tokens.expiry_date) {
        const now = Date.now();
        const expiryDate = new Date(tokens.expiry_date);
        
        if (tokens.expiry_date > now) {
          const hoursRemaining = Math.floor((tokens.expiry_date - now) / (1000 * 60 * 60));
          console.log(chalk.green(`  ✓ Token valid for ${hoursRemaining} more hours`));
        } else {
          console.log(chalk.yellow('  ⚠ Token expired'));
          
          if (tokens.refresh_token) {
            console.log(chalk.cyan('  → Will attempt to refresh token'));
            return { needsRefresh: true, tokens };
          } else {
            console.log(chalk.red('  ✗ Cannot refresh - no refresh token'));
            return { needsReauth: true };
          }
        }
      }
      
      return { valid: true, tokens };
    } catch (error) {
      console.log(chalk.yellow('  ⚠ No existing tokens found'));
      return { needsAuth: true };
    }
  }

  async setupOAuthClient() {
    console.log(chalk.yellow('\n2. Setting up OAuth client...'));
    
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.log(chalk.red('  ✗ Missing Google OAuth credentials'));
      console.log(chalk.cyan('\nTo fix this:'));
      console.log(chalk.gray('  1. Go to https://console.cloud.google.com/'));
      console.log(chalk.gray('  2. Create or select a project'));
      console.log(chalk.gray('  3. Enable Google Calendar API'));
      console.log(chalk.gray('  4. Create OAuth 2.0 credentials'));
      console.log(chalk.gray('  5. Add credentials to .env file:'));
      console.log(chalk.blue('     GOOGLE_CLIENT_ID=your-client-id'));
      console.log(chalk.blue('     GOOGLE_CLIENT_SECRET=your-client-secret'));
      return false;
    }
    
    const redirectUri = this.getRedirectUri();
    
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
    
    console.log(chalk.green('  ✓ OAuth client configured'));
    console.log(chalk.gray(`  • Redirect URI: ${redirectUri}`));
    
    return true;
  }

  getRedirectUri() {
    if (process.env.REPLIT_DEV_DOMAIN) {
      return `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
    }
    if (process.env.REPLIT_DOMAINS) {
      const domain = process.env.REPLIT_DOMAINS.split(',')[0];
      return `https://${domain}/api/auth/google/callback`;
    }
    return 'http://localhost:5000/api/auth/google/callback';
  }

  async refreshTokens(tokens) {
    console.log(chalk.yellow('\n3. Attempting to refresh tokens...'));
    
    try {
      this.oauth2Client.setCredentials(tokens);
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      const newTokens = {
        ...tokens,
        ...credentials,
        refresh_token: tokens.refresh_token || credentials.refresh_token
      };
      
      await this.saveTokens(newTokens);
      console.log(chalk.green('  ✓ Tokens refreshed successfully'));
      
      return true;
    } catch (error) {
      console.log(chalk.red(`  ✗ Failed to refresh: ${error.message}`));
      return false;
    }
  }

  async saveTokens(tokens) {
    try {
      await fs.writeFile(this.tokensFilePath, JSON.stringify(tokens, null, 2));
      console.log(chalk.green('  ✓ Tokens saved to file'));
    } catch (error) {
      console.log(chalk.red(`  ✗ Failed to save tokens: ${error.message}`));
    }
  }

  async testConnection(tokens) {
    console.log(chalk.yellow('\n4. Testing Google Calendar connection...'));
    
    try {
      this.oauth2Client.setCredentials(tokens);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      // Try to list calendars
      const response = await calendar.calendarList.list({ maxResults: 1 });
      
      if (response.data.items && response.data.items.length > 0) {
        console.log(chalk.green('  ✓ Successfully connected to Google Calendar'));
        console.log(chalk.gray(`  • Found calendar: ${response.data.items[0].summary}`));
        return true;
      }
      
      console.log(chalk.yellow('  ⚠ Connected but no calendars found'));
      return true;
    } catch (error) {
      console.log(chalk.red(`  ✗ Connection test failed: ${error.message}`));
      return false;
    }
  }

  generateAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/drive.readonly'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      include_granted_scopes: true
    });
  }

  async promptForAuthCode() {
    const authUrl = this.generateAuthUrl();
    
    console.log(chalk.cyan('\n=== Manual Authentication Required ==='));
    console.log(chalk.yellow('\n1. Visit this URL in your browser:'));
    console.log(chalk.blue(authUrl));
    console.log(chalk.yellow('\n2. Authorize the application'));
    console.log(chalk.yellow('3. Copy the authorization code from the redirect URL'));
    console.log(chalk.gray('   (It will be in the URL after ?code=...)'));
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(chalk.cyan('\nEnter the authorization code: '), (code) => {
        rl.close();
        resolve(code);
      });
    });
  }

  async exchangeCodeForTokens(code) {
    console.log(chalk.yellow('\n5. Exchanging code for tokens...'));
    
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      await this.saveTokens(tokens);
      console.log(chalk.green('  ✓ Successfully obtained new tokens'));
      return tokens;
    } catch (error) {
      console.log(chalk.red(`  ✗ Failed to exchange code: ${error.message}`));
      return null;
    }
  }

  async clearTokens() {
    console.log(chalk.yellow('\nClearing existing tokens...'));
    
    try {
      await fs.unlink(this.tokensFilePath);
      console.log(chalk.green('  ✓ Tokens cleared'));
    } catch (error) {
      console.log(chalk.gray('  • No tokens to clear'));
    }
  }
}

async function main() {
  const fixer = new OAuthFixer();
  
  try {
    // Check current token status
    const tokenStatus = await fixer.checkCurrentTokens();
    
    // Setup OAuth client
    const clientSetup = await fixer.setupOAuthClient();
    if (!clientSetup) {
      console.log(chalk.red('\n✗ Cannot proceed without OAuth credentials'));
      process.exit(1);
    }
    
    let tokens = tokenStatus.tokens;
    
    // Handle different scenarios
    if (tokenStatus.needsRefresh) {
      const refreshed = await fixer.refreshTokens(tokens);
      if (!refreshed) {
        console.log(chalk.yellow('\n→ Refresh failed, need re-authentication'));
        tokenStatus.needsReauth = true;
      } else {
        // Re-read the refreshed tokens
        const newStatus = await fixer.checkCurrentTokens();
        tokens = newStatus.tokens;
      }
    }
    
    if (tokenStatus.needsAuth || tokenStatus.needsReauth) {
      console.log(chalk.cyan('\n=== Authentication Required ==='));
      
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise((resolve) => {
        rl.question(chalk.yellow('\nDo you want to authenticate now? (y/n): '), resolve);
      });
      rl.close();
      
      if (answer.toLowerCase() === 'y') {
        if (tokenStatus.needsReauth) {
          await fixer.clearTokens();
        }
        
        const code = await fixer.promptForAuthCode();
        tokens = await fixer.exchangeCodeForTokens(code);
        
        if (!tokens) {
          console.log(chalk.red('\n✗ Authentication failed'));
          process.exit(1);
        }
      } else {
        console.log(chalk.yellow('\n→ Skipping authentication'));
        console.log(chalk.cyan('To authenticate later:'));
        console.log(chalk.gray('  1. Start the application: npm run dev'));
        console.log(chalk.gray('  2. Visit: http://localhost:5000/api/auth/google'));
        process.exit(0);
      }
    }
    
    // Test the connection if we have tokens
    if (tokens && tokenStatus.valid || tokens) {
      const connected = await fixer.testConnection(tokens);
      
      if (connected) {
        console.log(chalk.green.bold('\n✅ OAuth setup complete and working!'));
      } else {
        console.log(chalk.yellow.bold('\n⚠ OAuth tokens present but connection test failed'));
        console.log(chalk.cyan('You may need to re-authenticate'));
      }
    }
    
    // Summary
    console.log(chalk.blue.bold('\n=== OAuth Status Summary ==='));
    console.log(tokens ? chalk.green('✓ Tokens configured') : chalk.red('✗ No tokens'));
    console.log(tokens?.refresh_token ? chalk.green('✓ Refresh token present') : chalk.yellow('⚠ No refresh token'));
    console.log(chalk.gray(`• Tokens file: ${fixer.tokensFilePath}`));
    
  } catch (error) {
    console.log(chalk.red.bold('\n❌ OAuth fix failed:'));
    console.log(chalk.red(error.message));
    console.log(chalk.gray(error.stack));
    process.exit(1);
  }
}

// Run the fixer
main();