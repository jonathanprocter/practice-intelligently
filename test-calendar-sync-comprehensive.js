#!/usr/bin/env node

/**
 * Test script for comprehensive calendar sync (2015-2030)
 * Tests the bidirectional sync implementation
 */

import fetch from 'node-fetch';

const API_BASE = 'http://0.0.0.0:5000';
const THERAPIST_ID = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';

async function testCalendarSync() {
  console.log('🧪 Testing Comprehensive Calendar Sync (2015-2030)');
  console.log('================================================\n');

  try {
    // Test 1: Full sync (2015-2030)
    console.log('📊 Test 1: Full Calendar Sync (2015-2030)');
    console.log('------------------------------------------');
    
    const fullSyncResponse = await fetch(`${API_BASE}/api/calendar/sync/full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ therapistId: THERAPIST_ID })
    });

    if (fullSyncResponse.ok) {
      const fullSyncResult = await fullSyncResponse.json();
      console.log('✅ Full sync completed successfully!');
      console.log(`   - Total synced: ${fullSyncResult.synced}`);
      console.log(`   - Created: ${fullSyncResult.created}`);
      console.log(`   - Updated: ${fullSyncResult.updated}`);
      console.log(`   - Deleted: ${fullSyncResult.deleted}`);
      console.log(`   - Skipped: ${fullSyncResult.skipped}`);
      if (fullSyncResult.errors && fullSyncResult.errors.length > 0) {
        console.log(`   - Errors: ${fullSyncResult.errors.length}`);
        fullSyncResult.errors.slice(0, 3).forEach(err => {
          console.log(`     • ${err}`);
        });
      }
      console.log(`   - Date range: ${fullSyncResult.dateRange?.start} to ${fullSyncResult.dateRange?.end}`);
    } else {
      const error = await fullSyncResponse.text();
      console.error('❌ Full sync failed:', error);
    }

    console.log('\n');
    
    // Test 2: Today's sync
    console.log('📅 Test 2: Today\'s Calendar Sync');
    console.log('----------------------------------');
    
    const todaySyncResponse = await fetch(`${API_BASE}/api/calendar/sync/today`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ therapistId: THERAPIST_ID })
    });

    if (todaySyncResponse.ok) {
      const todayResult = await todaySyncResponse.json();
      console.log('✅ Today\'s sync completed!');
      console.log(`   - Events synced: ${todayResult.synced}`);
      console.log(`   - Date: ${todayResult.date}`);
    } else {
      const error = await todaySyncResponse.text();
      console.error('❌ Today\'s sync failed:', error);
    }

    console.log('\n');
    
    // Test 3: Custom date range sync
    console.log('📆 Test 3: Custom Date Range Sync (Sept 2025)');
    console.log('---------------------------------------------');
    
    const customRangeResponse = await fetch(`${API_BASE}/api/calendar/sync/range`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        therapistId: THERAPIST_ID,
        startDate: '2025-09-01T00:00:00.000Z',
        endDate: '2025-09-30T23:59:59.999Z'
      })
    });

    if (customRangeResponse.ok) {
      const rangeResult = await customRangeResponse.json();
      console.log('✅ Custom range sync completed!');
      console.log(`   - Events synced: ${rangeResult.synced}`);
      console.log(`   - Created: ${rangeResult.created}`);
      console.log(`   - Updated: ${rangeResult.updated}`);
      console.log(`   - Period: Sept 1-30, 2025`);
    } else {
      const error = await customRangeResponse.text();
      console.error('❌ Custom range sync failed:', error);
    }

    console.log('\n');
    
    // Test 4: Verify appointments in database
    console.log('🔍 Test 4: Verify Appointments in Database');
    console.log('------------------------------------------');
    
    const appointmentsResponse = await fetch(`${API_BASE}/api/appointments/${THERAPIST_ID}`);
    
    if (appointmentsResponse.ok) {
      const appointments = await appointmentsResponse.json();
      console.log(`✅ Found ${appointments.length} appointments in database`);
      
      // Group appointments by year
      const appointmentsByYear = {};
      appointments.forEach(apt => {
        const year = new Date(apt.startTime).getFullYear();
        appointmentsByYear[year] = (appointmentsByYear[year] || 0) + 1;
      });
      
      console.log('   Appointments by year:');
      Object.keys(appointmentsByYear).sort().forEach(year => {
        console.log(`     • ${year}: ${appointmentsByYear[year]} appointments`);
      });
      
      // Show sample appointments
      if (appointments.length > 0) {
        console.log('\n   Sample appointments:');
        appointments.slice(0, 3).forEach(apt => {
          const date = new Date(apt.startTime).toLocaleDateString();
          const time = new Date(apt.startTime).toLocaleTimeString();
          console.log(`     • ${date} ${time} - ${apt.type || 'therapy'} (${apt.status})`);
          if (apt.googleEventId) {
            console.log(`       Google Event ID: ${apt.googleEventId.substring(0, 20)}...`);
          }
        });
      }
    } else {
      const error = await appointmentsResponse.text();
      console.error('❌ Failed to fetch appointments:', error);
    }

    console.log('\n');
    console.log('✨ All tests completed!');
    console.log('========================\n');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

// Run the test
testCalendarSync().catch(console.error);