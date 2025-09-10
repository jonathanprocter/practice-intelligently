const path = require('path');

// Test loading the compiled JavaScript version
async function testOAuth() {
  try {
    // Check if environment variables are set
    console.log('GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
    console.log('GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET);
    
    // Try to import the module
    const oauthPath = path.join(__dirname, 'server', 'oauth-simple.ts');
    console.log('Attempting to load from:', oauthPath);
    
    // Since we're in production, the module should be compiled
    const { simpleOAuth } = await import('./server/oauth-simple.ts');
    console.log('simpleOAuth loaded successfully:', !!simpleOAuth);
    
    // Check if it's connected
    const isConnected = simpleOAuth.isConnected();
    console.log('OAuth is connected:', isConnected);
    
    // Test connection
    const testResult = await simpleOAuth.testConnection();
    console.log('Connection test result:', testResult);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testOAuth();