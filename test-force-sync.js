#!/usr/bin/env node

import fetch from 'node-fetch';

async function testForceSync() {
  console.log('\n🔄 Testing Calendar Sync with Force Update Enabled\n');
  console.log('=' .repeat(60));
  
  try {
    // Get current date range (this week)
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay())); // End of week (Saturday)
    endOfWeek.setHours(23, 59, 59, 999);
    
    console.log(`📅 Sync Range: ${startOfWeek.toLocaleDateString()} to ${endOfWeek.toLocaleDateString()}`);
    console.log('🚀 Triggering sync with forceUpdate = true...\n');
    
    // Use the Replit URL - get it from environment or use the known URL
    const baseUrl = 'https://be19ccdd-fe98-4120-a41d-5c815c7c7a5e-00-24nxj2b2smggx.picard.replit.dev';
    
    const response = await fetch(`${baseUrl}/api/calendar/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        therapistId: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c',
        startDate: startOfWeek.toISOString(),
        endDate: endOfWeek.toISOString(),
        forceUpdate: true // Enable force update
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Sync Completed Successfully!\n');
    console.log('📊 Sync Results:');
    console.log('=' .repeat(60));
    console.log(`   Total Synced: ${result.synced}`);
    console.log(`   Created:      ${result.created}`);
    console.log(`   Updated:      ${result.updated} ← This should be higher with force update!`);
    console.log(`   Deleted:      ${result.deleted}`);
    console.log(`   Skipped:      ${result.skipped} ← This should be lower with force update!`);
    console.log('=' .repeat(60));
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n⚠️ Errors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    // Success analysis
    if (result.updated > 0) {
      console.log('\n🎉 Force update worked! Appointments were updated.');
    } else if (result.skipped > 0) {
      console.log('\n⚠️ Warning: Still skipping appointments. The force update may not be working correctly.');
    }
    
    console.log('\n📝 Summary:');
    console.log(`   Date Range: ${result.dateRange.start} to ${result.dateRange.end}`);
    console.log(`   Message: ${result.message}`);
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    console.error('\nPlease ensure:');
    console.error('1. The server is running on http://localhost:5000');
    console.error('2. Google Calendar is properly authenticated');
    console.error('3. You have appointments in Google Calendar for this week');
  }
}

// Run the test
testForceSync();