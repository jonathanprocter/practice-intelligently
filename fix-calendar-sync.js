// Quick fix for calendar sync issues
import { simpleOAuth } from './server/oauth-simple.js';

async function fixCalendarSync() {
  try {
    console.log('🔧 Testing Google Calendar connection...');
    
    // Check if connected
    if (!simpleOAuth.isConnected()) {
      console.log('❌ Not connected to Google Calendar');
      return;
    }
    
    console.log('✅ Connected to Google Calendar');
    
    // Try to refresh tokens
    try {
      await simpleOAuth.refreshTokensIfNeeded();
      console.log('✅ Tokens refreshed successfully');
    } catch (error) {
      console.log('❌ Token refresh failed:', error.message);
      return;
    }
    
    // Test calendar list
    try {
      const calendars = await simpleOAuth.getCalendars();
      console.log(`📅 Found ${calendars.length} calendars:`);
      
      calendars.forEach((cal, index) => {
        const calType = cal.primary ? '[PRIMARY]' : 
                       cal.id?.includes('@group.calendar.google.com') ? '[SUBCALENDAR]' :
                       '[PERSONAL]';
        console.log(`  ${index + 1}. "${cal.summary}" ${calType}`);
        console.log(`      ID: ${cal.id}`);
        console.log(`      Access: ${cal.accessRole}`);
      });
      
      // Test event fetching for each calendar
      console.log('\n🔍 Testing event fetching...');
      const today = new Date();
      const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const timeMax = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();
      
      for (const calendar of calendars.slice(0, 3)) { // Test first 3 calendars
        try {
          const events = await simpleOAuth.getEvents(calendar.id, timeMin, timeMax);
          console.log(`  📅 ${calendar.summary}: ${events.length} events today`);
        } catch (error) {
          console.log(`  ❌ ${calendar.summary}: Failed - ${error.message}`);
        }
      }
      
    } catch (error) {
      console.log('❌ Failed to fetch calendars:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error during calendar sync test:', error);
  }
}

// Run the test
fixCalendarSync().then(() => {
  console.log('✅ Calendar sync test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Calendar sync test failed:', error);
  process.exit(1);
});

export { fixCalendarSync };