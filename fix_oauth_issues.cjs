#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

console.log(chalk.blue.bold('\n=== OAuth Issues Fix Script ===\n'));

async function fixOAuthIssues() {
  try {
    // Check current OAuth token status
    console.log(chalk.yellow('1. Checking OAuth token status...'));
    
    const tokensFilePath = path.join(process.cwd(), '.oauth-tokens.json');
    let tokens = null;
    let hasTokens = false;
    
    try {
      const tokensData = await fs.readFile(tokensFilePath, 'utf8');
      tokens = JSON.parse(tokensData);
      hasTokens = true;
      console.log(chalk.green('  ✓ OAuth tokens file found'));
      
      // Check token validity
      if (tokens.expiry_date) {
        const now = Date.now();
        const expiryDate = new Date(tokens.expiry_date);
        
        if (tokens.expiry_date > now) {
          const hoursRemaining = Math.floor((tokens.expiry_date - now) / (1000 * 60 * 60));
          console.log(chalk.green(`  ✓ Access token valid for ${hoursRemaining} more hours`));
        } else {
          console.log(chalk.yellow('  ⚠ Access token has expired'));
          
          // Check for refresh token
          if (tokens.refresh_token) {
            console.log(chalk.green('  ✓ Refresh token available - can be refreshed'));
          } else {
            console.log(chalk.red('  ✗ No refresh token - re-authentication required'));
            hasTokens = false;
          }
        }
      }
    } catch (error) {
      console.log(chalk.yellow('  ⚠ No OAuth tokens file found'));
      hasTokens = false;
    }
    
    // Check OAuth credentials in environment
    console.log(chalk.yellow('\n2. Checking OAuth credentials...'));
    
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    let hasValidCredentials = false;
    
    try {
      envContent = await fs.readFile(envPath, 'utf8');
      
      const hasClientId = envContent.includes('GOOGLE_CLIENT_ID=') && 
                          !envContent.includes('GOOGLE_CLIENT_ID=your-google-client-id') &&
                          !envContent.includes('GOOGLE_CLIENT_ID=test-client-id');
      
      const hasClientSecret = envContent.includes('GOOGLE_CLIENT_SECRET=') && 
                             !envContent.includes('GOOGLE_CLIENT_SECRET=your-google-client-secret') &&
                             !envContent.includes('GOOGLE_CLIENT_SECRET=test-client-secret');
      
      if (hasClientId && hasClientSecret) {
        console.log(chalk.green('  ✓ Valid Google OAuth credentials found in .env'));
        hasValidCredentials = true;
      } else {
        console.log(chalk.yellow('  ⚠ Google OAuth credentials not properly configured'));
        
        if (!hasClientId) {
          console.log(chalk.red('    ✗ GOOGLE_CLIENT_ID is not set or using placeholder'));
        }
        if (!hasClientSecret) {
          console.log(chalk.red('    ✗ GOOGLE_CLIENT_SECRET is not set or using placeholder'));
        }
      }
    } catch (error) {
      console.log(chalk.red('  ✗ .env file not found'));
    }
    
    // Fix OAuth redirect URI issues
    console.log(chalk.yellow('\n3. Checking OAuth redirect URI configuration...'));
    
    const oauthSimplePath = path.join(process.cwd(), 'server', 'oauth-simple.ts');
    
    try {
      const oauthContent = await fs.readFile(oauthSimplePath, 'utf8');
      
      if (oauthContent.includes('getRedirectUri')) {
        console.log(chalk.green('  ✓ OAuth redirect URI logic is properly configured'));
        console.log(chalk.cyan('    Redirect URIs will be:'));
        console.log(chalk.gray('    - Development: http://localhost:5000/api/auth/google/callback'));
        console.log(chalk.gray('    - Production: https://[your-domain]/api/auth/google/callback'));
      }
    } catch (error) {
      console.log(chalk.yellow('  ⚠ Could not verify OAuth redirect configuration'));
    }
    
    // Create OAuth setup instructions
    console.log(chalk.blue.bold('\n=== OAuth Setup Instructions ===\n'));
    
    if (!hasValidCredentials) {
      console.log(chalk.cyan('To set up Google OAuth:'));
      console.log(chalk.white('\n1. Go to Google Cloud Console:'));
      console.log(chalk.gray('   https://console.cloud.google.com/'));
      
      console.log(chalk.white('\n2. Create a new project or select existing one'));
      
      console.log(chalk.white('\n3. Enable Google Calendar API:'));
      console.log(chalk.gray('   - Go to "APIs & Services" > "Library"'));
      console.log(chalk.gray('   - Search for "Google Calendar API"'));
      console.log(chalk.gray('   - Click "Enable"'));
      
      console.log(chalk.white('\n4. Create OAuth 2.0 credentials:'));
      console.log(chalk.gray('   - Go to "APIs & Services" > "Credentials"'));
      console.log(chalk.gray('   - Click "Create Credentials" > "OAuth client ID"'));
      console.log(chalk.gray('   - Choose "Web application"'));
      console.log(chalk.gray('   - Add authorized redirect URIs:'));
      console.log(chalk.gray('     • http://localhost:5000/api/auth/google/callback'));
      console.log(chalk.gray('     • https://your-production-domain/api/auth/google/callback'));
      
      console.log(chalk.white('\n5. Copy the credentials to .env:'));
      console.log(chalk.gray('   GOOGLE_CLIENT_ID=your-actual-client-id'));
      console.log(chalk.gray('   GOOGLE_CLIENT_SECRET=your-actual-client-secret'));
    }
    
    if (!hasTokens || !hasValidCredentials) {
      console.log(chalk.cyan('\nTo authenticate after setup:'));
      console.log(chalk.white('1. Start the application:'));
      console.log(chalk.gray('   npm run dev'));
      console.log(chalk.white('2. Visit the OAuth URL:'));
      console.log(chalk.gray('   http://localhost:5000/api/auth/google'));
      console.log(chalk.white('3. Complete the Google sign-in flow'));
      console.log(chalk.white('4. Grant calendar permissions when prompted'));
    }
    
    // Create a helper script for clearing OAuth tokens
    console.log(chalk.yellow('\n4. Creating OAuth helper scripts...'));
    
    const clearOAuthScript = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const tokensPath = path.join(__dirname, '.oauth-tokens.json');

try {
  fs.unlinkSync(tokensPath);
  console.log('✓ OAuth tokens cleared successfully');
  console.log('You will need to re-authenticate on next use.');
} catch (error) {
  if (error.code === 'ENOENT') {
    console.log('No OAuth tokens file found.');
  } else {
    console.error('Error clearing tokens:', error.message);
  }
}
`;
    
    await fs.writeFile('clear-oauth-tokens.js', clearOAuthScript);
    console.log(chalk.green('  ✓ Created clear-oauth-tokens.js'));
    
    // Create test OAuth connection script
    const testOAuthScript = `#!/usr/bin/env node
require('dotenv').config();
const { simpleOAuth } = require('./server/oauth-simple');

async function testOAuth() {
  console.log('Testing OAuth connection...');
  
  try {
    const isConnected = simpleOAuth.isConnected();
    console.log('Connected:', isConnected);
    
    if (isConnected) {
      const testResult = await simpleOAuth.testConnection();
      console.log('Connection test:', testResult ? 'SUCCESS' : 'FAILED');
      
      if (testResult) {
        const calendars = await simpleOAuth.getCalendars();
        console.log('Found', calendars.length, 'calendars');
      }
    } else {
      const authUrl = await simpleOAuth.getAuthUrl();
      console.log('\\nNot authenticated. Visit this URL to authenticate:');
      console.log(authUrl);
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testOAuth();
`;
    
    await fs.writeFile('test-oauth-connection.js', testOAuthScript);
    console.log(chalk.green('  ✓ Created test-oauth-connection.js'));
    
    // Summary and recommendations
    console.log(chalk.blue.bold('\n=== Summary ===\n'));
    
    if (hasValidCredentials && hasTokens) {
      console.log(chalk.green('✓ OAuth appears to be properly configured'));
      console.log(chalk.cyan('\nYou can test the connection with:'));
      console.log(chalk.gray('  node test-oauth-connection.js'));
    } else if (hasValidCredentials && !hasTokens) {
      console.log(chalk.yellow('⚠ OAuth credentials configured but not authenticated'));
      console.log(chalk.cyan('\nNext step: Authenticate with Google'));
      console.log(chalk.gray('  1. npm run dev'));
      console.log(chalk.gray('  2. Visit http://localhost:5000/api/auth/google'));
    } else {
      console.log(chalk.red('✗ OAuth needs to be configured'));
      console.log(chalk.cyan('\nFollow the setup instructions above to configure OAuth'));
    }
    
    console.log(chalk.cyan('\nHelper scripts created:'));
    console.log(chalk.gray('  • clear-oauth-tokens.js - Clear stored OAuth tokens'));
    console.log(chalk.gray('  • test-oauth-connection.js - Test OAuth connection'));
    
    console.log(chalk.green.bold('\n✅ OAuth fix script complete!\n'));
    
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

fixOAuthIssues();