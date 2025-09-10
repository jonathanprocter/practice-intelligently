// Test script to manually refresh OAuth tokens
const fs = require('fs');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

async function testTokenRefresh() {
  console.log('Testing OAuth token refresh...\n');
  
  // Check if environment variables are set
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('❌ Error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set in environment');
    return;
  }
  
  console.log('✅ OAuth credentials found in environment');
  
  // Load current tokens
  const tokensPath = '.oauth-tokens.json';
  let tokens;
  
  try {
    const tokensData = fs.readFileSync(tokensPath, 'utf8');
    tokens = JSON.parse(tokensData);
    console.log('✅ Loaded existing tokens from file');
    console.log(`  - Access token: ${tokens.access_token?.substring(0, 20)}...`);
    console.log(`  - Refresh token: ${tokens.refresh_token?.substring(0, 20)}...`);
    console.log(`  - Expiry date: ${new Date(tokens.expiry_date).toISOString()}`);
    console.log(`  - Current time: ${new Date().toISOString()}`);
    console.log(`  - Token expired: ${tokens.expiry_date < Date.now()}\n`);
  } catch (error) {
    console.error('❌ Error loading tokens:', error.message);
    return;
  }
  
  // Create OAuth2 client
  const oauth2Client = new OAuth2Client(
    clientId,
    clientSecret,
    'https://remarkableplanner-e66b8b8e-e7a2-40b9-ae74-00c93ffe503c.a.free.replit.dev/api/auth/google/callback'
  );
  
  // Set the current tokens
  oauth2Client.setCredentials(tokens);
  
  console.log('Attempting to refresh tokens...');
  
  try {
    // Try to refresh the access token
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    console.log('✅ Successfully refreshed tokens!');
    console.log(`  - New access token: ${credentials.access_token?.substring(0, 20)}...`);
    console.log(`  - New expiry: ${new Date(credentials.expiry_date).toISOString()}`);
    
    // Merge with existing tokens (preserve refresh_token if not provided)
    const updatedTokens = {
      ...tokens,
      ...credentials,
      refresh_token: credentials.refresh_token || tokens.refresh_token
    };
    
    // Save updated tokens
    fs.writeFileSync(tokensPath, JSON.stringify(updatedTokens, null, 2));
    console.log('\n✅ Updated tokens saved to file');
    
    // Test API call with new tokens
    console.log('\nTesting calendar API with new tokens...');
    oauth2Client.setCredentials(updatedTokens);
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const response = await calendar.calendarList.list({ maxResults: 1 });
    
    if (response.data.items && response.data.items.length > 0) {
      console.log('✅ API test successful! Found calendar:', response.data.items[0].summary);
    } else {
      console.log('✅ API test successful! (No calendars found)');
    }
    
  } catch (error) {
    console.error('\n❌ Error refreshing tokens:', error.message);
    
    if (error.message.includes('invalid_grant')) {
      console.log('\n⚠️  The refresh token has expired or been revoked.');
      console.log('   You need to re-authenticate through the OAuth flow.');
      console.log('   Visit: /api/auth/google to start the authentication process');
    } else {
      console.log('\nFull error:', error);
    }
  }
}

// Run the test
testTokenRefresh().catch(console.error);