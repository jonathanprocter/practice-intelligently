#!/usr/bin/env node

/**
 * Simple Client Linking Diagnostic Script
 * Uses SQL queries to analyze client linking issues
 */

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

class SimpleDiagnostic {
  constructor() {
    this.issues = [];
    this.statistics = {};
  }

  async query(sql, params = []) {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async run() {
    console.log('🚀 Running Client Linking Diagnostic...\n');
    
    try {
      // 1. Get basic statistics
      console.log('📊 COLLECTING STATISTICS...');
      
      const clientCount = await this.query('SELECT COUNT(*) as count FROM clients');
      const appointmentCount = await this.query('SELECT COUNT(*) as count FROM appointments');
      const sessionNoteCount = await this.query('SELECT COUNT(*) as count FROM session_notes');
      const calendarEventCount = await this.query('SELECT COUNT(*) as count FROM calendar_events');

      this.statistics = {
        clients: parseInt(clientCount[0].count),
        appointments: parseInt(appointmentCount[0].count),
        sessionNotes: parseInt(sessionNoteCount[0].count),
        calendarEvents: parseInt(calendarEventCount[0].count)
      };

      console.log(`   Clients: ${this.statistics.clients}`);
      console.log(`   Appointments: ${this.statistics.appointments}`);
      console.log(`   Session Notes: ${this.statistics.sessionNotes}`);
      console.log(`   Calendar Events: ${this.statistics.calendarEvents}`);

      // 2. Check clients without therapists
      console.log('\n🔍 CHECKING CLIENT ASSIGNMENTS...');
      const clientsWithoutTherapist = await this.query(`
        SELECT id, first_name, last_name 
        FROM clients 
        WHERE therapist_id IS NULL
      `);
      
      if (clientsWithoutTherapist.length > 0) {
        console.log(`❌ ${clientsWithoutTherapist.length} clients without therapist assignment:`);
        clientsWithoutTherapist.forEach(client => {
          console.log(`   - ${client.first_name} ${client.last_name} (${client.id})`);
        });
      } else {
        console.log('✅ All clients have therapist assignments');
      }

      // 3. Check session notes with client names instead of IDs
      console.log('\n🔍 CHECKING SESSION NOTES LINKING...');
      const notesWithClientNames = await this.query(`
        SELECT id, client_id, event_id, LEFT(content, 50) as content_preview
        FROM session_notes 
        WHERE client_id IS NOT NULL 
        AND LENGTH(client_id) < 36
      `);

      if (notesWithClientNames.length > 0) {
        console.log(`❌ ${notesWithClientNames.length} session notes using client names instead of IDs:`);
        notesWithClientNames.forEach(note => {
          console.log(`   - Note ${note.id}: Client "${note.client_id}" (Event: ${note.event_id || 'none'})`);
        });
      } else {
        console.log('✅ All session notes use proper client IDs');
      }

      // 4. Check appointments without calendar sync
      console.log('\n🔍 CHECKING CALENDAR SYNC...');
      const unsyncedAppointments = await this.query(`
        SELECT a.id, c.first_name, c.last_name, a.start_time, a.status
        FROM appointments a
        LEFT JOIN clients c ON a.client_id = c.id
        WHERE a.google_event_id IS NULL
        ORDER BY a.start_time DESC
        LIMIT 10
      `);

      if (unsyncedAppointments.length > 0) {
        console.log(`❌ Found appointments without Google Calendar sync:`);
        unsyncedAppointments.forEach(apt => {
          console.log(`   - ${apt.first_name} ${apt.last_name}: ${apt.start_time} (${apt.status})`);
        });
      } else {
        console.log('✅ All appointments synced with Google Calendar');
      }

      // 5. Check calendar events table
      console.log('\n🔍 CHECKING CALENDAR EVENTS TABLE...');
      if (this.statistics.calendarEvents === 0) {
        console.log('❌ No calendar events in database - sync may not be working');
      } else {
        const eventsWithoutClients = await this.query(`
          SELECT COUNT(*) as count 
          FROM calendar_events 
          WHERE client_id IS NULL
        `);
        
        const eventsWithoutAppointments = await this.query(`
          SELECT COUNT(*) as count 
          FROM calendar_events 
          WHERE appointment_id IS NULL
        `);

        const clientLessEvents = parseInt(eventsWithoutClients[0].count);
        const appointmentLessEvents = parseInt(eventsWithoutAppointments[0].count);

        if (clientLessEvents > 0) {
          console.log(`❌ ${clientLessEvents} calendar events not linked to clients`);
        }
        if (appointmentLessEvents > 0) {
          console.log(`❌ ${appointmentLessEvents} calendar events not linked to appointments`);
        }
        if (clientLessEvents === 0 && appointmentLessEvents === 0) {
          console.log('✅ All calendar events properly linked');
        }
      }

      // 6. Check for orphaned appointments
      console.log('\n🔍 CHECKING FOR ORPHANED RECORDS...');
      const orphanedAppointments = await this.query(`
        SELECT a.id, a.client_id 
        FROM appointments a
        LEFT JOIN clients c ON a.client_id = c.id
        WHERE c.id IS NULL
      `);

      if (orphanedAppointments.length > 0) {
        console.log(`❌ ${orphanedAppointments.length} orphaned appointments (client doesn't exist):`);
        orphanedAppointments.forEach(apt => {
          console.log(`   - Appointment ${apt.id} references non-existent client ${apt.client_id}`);
        });
      } else {
        console.log('✅ No orphaned appointments found');
      }

      // 7. Find client name matches for session notes
      console.log('\n🔍 ANALYZING CLIENT NAME MATCHING...');
      if (notesWithClientNames.length > 0) {
        console.log('Attempting to match client names to IDs:');
        
        for (const note of notesWithClientNames) {
          const possibleMatches = await this.query(`
            SELECT id, first_name, last_name, 
                   SIMILARITY(LOWER(CONCAT(first_name, ' ', last_name)), LOWER($1)) as similarity
            FROM clients 
            WHERE LOWER(CONCAT(first_name, ' ', last_name)) LIKE LOWER($2)
               OR LOWER(first_name) LIKE LOWER($3)
               OR LOWER(last_name) LIKE LOWER($3)
            ORDER BY similarity DESC
            LIMIT 3
          `, [note.client_id, `%${note.client_id}%`, `%${note.client_id}%`]);

          if (possibleMatches.length > 0) {
            console.log(`   Note ${note.id} "${note.client_id}" might match:`);
            possibleMatches.forEach(match => {
              console.log(`     - ${match.first_name} ${match.last_name} (${match.id})`);
            });
          } else {
            console.log(`   Note ${note.id} "${note.client_id}" - NO MATCHES FOUND`);
          }
        }
      }

      // 8. Summary and recommendations
      this.generateSummary();

    } catch (error) {
      console.error('❌ Diagnostic failed:', error);
    } finally {
      await pool.end();
    }
  }

  generateSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 DIAGNOSTIC SUMMARY');
    console.log('='.repeat(80));

    console.log('\n🔧 CRITICAL ISSUES TO FIX:');
    console.log('1. Session notes using client names instead of IDs');
    console.log('2. Missing calendar event synchronization');
    console.log('3. Unassigned clients (missing therapist)');

    console.log('\n💡 RECOMMENDED ACTIONS:');
    console.log('1. Run a script to convert client names to IDs in session_notes table');
    console.log('2. Set up automated calendar sync to populate calendar_events table');
    console.log('3. Assign therapists to unassigned clients');
    console.log('4. Create appointment records for calendar events');
    console.log('5. Link existing appointments to their Google Calendar events');

    console.log('\n📝 NEXT STEPS:');
    console.log('1. Create a client linking fix script');
    console.log('2. Implement automated calendar sync');
    console.log('3. Add client name matching logic');
    console.log('4. Test the fixes with a subset of data');

    console.log('\n' + '='.repeat(80));
  }
}

// Run the diagnostic
if (require.main === module) {
  const diagnostic = new SimpleDiagnostic();
  diagnostic.run().catch(console.error);
}

module.exports = SimpleDiagnostic;