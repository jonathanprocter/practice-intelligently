#!/usr/bin/env node
import 'dotenv/config';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(chalk.blue.bold('\n=== OAUTH CONFIGURATION FIX ===\n'));

async function checkOAuthTokens() {
  console.log(chalk.yellow('1. Checking OAuth token status...'));
  
  const tokensFilePath = path.join(process.cwd(), '.oauth-tokens.json');
  
  try {
    const tokensData = await fs.readFile(tokensFilePath, 'utf8');
    const tokens = JSON.parse(tokensData);
    
    console.log(chalk.green('  ✓ OAuth tokens file found'));
    
    // Check token structure
    const requiredFields = ['access_token', 'refresh_token', 'scope', 'token_type'];
    const missingFields = requiredFields.filter(field => !tokens[field]);
    
    if (missingFields.length > 0) {
      console.log(chalk.yellow(`  ⚠ Missing fields: ${missingFields.join(', ')}`));
    } else {
      console.log(chalk.green('  ✓ All required token fields present'));
    }
    
    // Check token expiry
    if (tokens.expiry_date) {
      const now = Date.now();
      const expiryDate = new Date(tokens.expiry_date);
      
      if (tokens.expiry_date > now) {
        const hoursRemaining = Math.floor((tokens.expiry_date - now) / (1000 * 60 * 60));
        console.log(chalk.green(`  ✓ Access token valid for ${hoursRemaining} more hours`));
        
        // Suggest refresh if less than 24 hours remaining
        if (hoursRemaining < 24) {
          console.log(chalk.yellow('  ⚠ Token expires soon, consider refreshing'));
        }
      } else {
        console.log(chalk.red('  ✗ Access token expired'));
        
        if (tokens.refresh_token) {
          console.log(chalk.cyan('  → Can be refreshed using refresh token'));
        } else {
          console.log(chalk.red('  ✗ No refresh token available, re-authentication required'));
        }
      }
    } else {
      console.log(chalk.yellow('  ⚠ No expiry date found in tokens'));
    }
    
    // Check scopes
    if (tokens.scope) {
      const scopes = tokens.scope.split(' ');
      console.log(chalk.cyan(`  Scopes: ${scopes.length} permissions granted`));
      
      const requiredScopes = [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/drive.readonly'
      ];
      
      const missingScopes = requiredScopes.filter(scope => !scopes.includes(scope));
      
      if (missingScopes.length > 0) {
        console.log(chalk.yellow('  ⚠ Missing required scopes:'));
        missingScopes.forEach(scope => {
          console.log(chalk.yellow(`    - ${scope}`));
        });
      } else {
        console.log(chalk.green('  ✓ All required scopes present'));
      }
    }
    
    return tokens;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(chalk.red('  ✗ OAuth tokens file not found'));
      console.log(chalk.yellow('  → Authentication required'));
    } else {
      console.log(chalk.red(`  ✗ Error reading tokens: ${error.message}`));
    }
    return null;
  }
}

async function checkOAuthCredentials() {
  console.log(chalk.yellow('\n2. Checking OAuth credentials...'));
  
  const hasClientId = !!process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id';
  const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET !== 'your-google-client-secret';
  
  if (hasClientId) {
    console.log(chalk.green(`  ✓ GOOGLE_CLIENT_ID configured`));
  } else {
    console.log(chalk.red('  ✗ GOOGLE_CLIENT_ID not configured or using placeholder'));
  }
  
  if (hasClientSecret) {
    console.log(chalk.green(`  ✓ GOOGLE_CLIENT_SECRET configured`));
  } else {
    console.log(chalk.red('  ✗ GOOGLE_CLIENT_SECRET not configured or using placeholder'));
  }
  
  return hasClientId && hasClientSecret;
}

async function generateAuthInstructions() {
  console.log(chalk.blue.bold('\n=== AUTHENTICATION INSTRUCTIONS ===\n'));
  
  const hasCredentials = await checkOAuthCredentials();
  
  if (!hasCredentials) {
    console.log(chalk.yellow('Step 1: Set up Google OAuth credentials'));
    console.log(chalk.cyan('\n  1. Go to https://console.cloud.google.com/'));
    console.log(chalk.cyan('  2. Create a new project or select existing'));
    console.log(chalk.cyan('  3. Enable Google Calendar API and Google Drive API'));
    console.log(chalk.cyan('  4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID'));
    console.log(chalk.cyan('  5. Set Application Type to "Web application"'));
    console.log(chalk.cyan('  6. Add Authorized redirect URIs:'));
    console.log(chalk.gray('     - http://localhost:5000/api/auth/google/callback'));
    console.log(chalk.gray('     - http://localhost:3000/api/auth/google/callback'));
    console.log(chalk.cyan('  7. Copy Client ID and Client Secret'));
    console.log(chalk.cyan('  8. Update .env file with actual values'));
    console.log();
  }
  
  console.log(chalk.yellow('Step 2: Authenticate with Google'));
  console.log(chalk.cyan('\n  1. Start the application:'));
  console.log(chalk.gray('     npm run dev'));
  console.log(chalk.cyan('  2. Open browser and visit:'));
  console.log(chalk.gray('     http://localhost:5000/api/auth/google'));
  console.log(chalk.cyan('  3. Complete Google sign-in'));
  console.log(chalk.cyan('  4. Grant requested permissions'));
  console.log(chalk.cyan('  5. You will be redirected back to the app'));
  console.log();
  
  console.log(chalk.yellow('Step 3: Verify authentication'));
  console.log(chalk.cyan('\n  1. Check OAuth status:'));
  console.log(chalk.gray('     http://localhost:5000/api/auth/status'));
  console.log(chalk.cyan('  2. View calendars:'));
  console.log(chalk.gray('     http://localhost:5000/api/google/calendars'));
  console.log();
}

async function createMockTokens() {
  console.log(chalk.yellow('\n3. Creating mock OAuth tokens for development...'));
  
  const mockTokens = {
    access_token: 'mock_access_token_for_development',
    refresh_token: 'mock_refresh_token_for_development',
    scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.readonly',
    token_type: 'Bearer',
    expiry_date: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
    mock: true
  };
  
  const tokensFilePath = path.join(process.cwd(), '.oauth-tokens.json');
  
  try {
    await fs.writeFile(tokensFilePath, JSON.stringify(mockTokens, null, 2));
    console.log(chalk.green('  ✓ Mock tokens created for development'));
    console.log(chalk.yellow('  ⚠ Note: These are mock tokens and won\'t work with actual Google APIs'));
    console.log(chalk.yellow('  → Use for UI development only'));
  } catch (error) {
    console.log(chalk.red(`  ✗ Failed to create mock tokens: ${error.message}`));
  }
}

async function main() {
  try {
    // Check existing tokens
    const tokens = await checkOAuthTokens();
    
    // Check credentials
    const hasCredentials = await checkOAuthCredentials();
    
    // Provide instructions
    await generateAuthInstructions();
    
    // Offer to create mock tokens if needed
    if (!tokens && !hasCredentials) {
      console.log(chalk.blue.bold('\n=== DEVELOPMENT MODE ===\n'));
      console.log(chalk.yellow('Since OAuth credentials are not configured,'));
      console.log(chalk.yellow('you can create mock tokens for UI development.'));
      console.log();
      
      await createMockTokens();
    }
    
    console.log(chalk.blue.bold('\n=== SUMMARY ===\n'));
    
    if (tokens && !tokens.mock) {
      if (tokens.expiry_date && tokens.expiry_date > Date.now()) {
        console.log(chalk.green('✓ OAuth is properly configured and active'));
      } else {
        console.log(chalk.yellow('⚠ OAuth tokens need refresh'));
      }
    } else if (tokens && tokens.mock) {
      console.log(chalk.yellow('⚠ Using mock tokens for development'));
    } else {
      console.log(chalk.red('✗ OAuth authentication required'));
    }
    
    if (hasCredentials) {
      console.log(chalk.green('✓ OAuth credentials configured'));
    } else {
      console.log(chalk.red('✗ OAuth credentials need configuration'));
    }
    
    console.log(chalk.green.bold('\n✅ OAuth check complete!\n'));
    
  } catch (error) {
    console.error(chalk.red('✗ OAuth fix failed:'), error.message);
    process.exit(1);
  }
}

// Run the fix
main();