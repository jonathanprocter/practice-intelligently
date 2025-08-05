#!/usr/bin/env node

/**
 * Client Database & Calendar Linking Diagnostic Script
 * 
 * This script analyzes the current state of client linking across:
 * - Database clients and appointments
 * - Calendar events synchronization
 * - Session notes linking
 * - Client name matching issues
 */

const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { 
  clients, 
  appointments, 
  sessionNotes, 
  calendarEvents 
} = require('../shared/schema');
const { eq, like, or, and, isNull, isNotNull } = require('drizzle-orm');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

class ClientLinkingDiagnostic {
  constructor() {
    this.issues = [];
    this.recommendations = [];
    this.statistics = {};
  }

  // Add issue to the list
  addIssue(category, severity, description, affectedRecords = 0) {
    this.issues.push({
      category,
      severity,
      description,
      affectedRecords,
      timestamp: new Date().toISOString()
    });
  }

  // Add recommendation
  addRecommendation(priority, action, details) {
    this.recommendations.push({
      priority,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // 1. Analyze client data integrity
  async analyzeClientData() {
    console.log('🔍 Analyzing client data integrity...');
    
    try {
      // Get all clients
      const allClients = await db.select().from(clients);
      this.statistics.totalClients = allClients.length;

      // Check for missing therapist assignments
      const clientsWithoutTherapist = allClients.filter(client => !client.therapistId);
      if (clientsWithoutTherapist.length > 0) {
        this.addIssue(
          'Client Data',
          'HIGH',
          `${clientsWithoutTherapist.length} clients have no assigned therapist`,
          clientsWithoutTherapist.length
        );
        this.addRecommendation(
          'HIGH',
          'Assign therapists to unassigned clients',
          `Clients without therapist: ${clientsWithoutTherapist.map(c => `${c.firstName} ${c.lastName}`).join(', ')}`
        );
      }

      // Check for duplicate client names
      const nameGroups = allClients.reduce((acc, client) => {
        const key = `${client.firstName?.toLowerCase()} ${client.lastName?.toLowerCase()}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(client);
        return acc;
      }, {});

      const duplicateNames = Object.values(nameGroups).filter(group => group.length > 1);
      if (duplicateNames.length > 0) {
        this.addIssue(
          'Client Data',
          'MEDIUM',
          `${duplicateNames.length} potential duplicate client names found`,
          duplicateNames.reduce((sum, group) => sum + group.length, 0)
        );
        this.addRecommendation(
          'MEDIUM',
          'Review potential duplicate clients',
          `Duplicate name groups: ${duplicateNames.map(group => 
            group.map(c => `${c.firstName} ${c.lastName} (${c.id})`).join(' | ')
          ).join('; ')}`
        );
      }

      // Check for missing client contact info
      const clientsWithoutEmail = allClients.filter(client => !client.email);
      if (clientsWithoutEmail.length > 0) {
        this.addIssue(
          'Client Data',
          'MEDIUM',
          `${clientsWithoutEmail.length} clients missing email addresses`,
          clientsWithoutEmail.length
        );
      }

      console.log(`✅ Client data analysis complete: ${allClients.length} clients analyzed`);
    } catch (error) {
      this.addIssue('Client Data', 'CRITICAL', `Failed to analyze client data: ${error.message}`);
      console.error('❌ Client data analysis failed:', error);
    }
  }

  // 2. Analyze appointment-client relationships
  async analyzeAppointmentLinking() {
    console.log('🔍 Analyzing appointment-client relationships...');
    
    try {
      // Get all appointments with client data
      const appointmentsWithClients = await db
        .select({
          appointment: appointments,
          client: clients
        })
        .from(appointments)
        .leftJoin(clients, eq(appointments.clientId, clients.id));

      const totalAppointments = appointmentsWithClients.length;
      this.statistics.totalAppointments = totalAppointments;

      // Check for appointments without valid client links
      const appointmentsWithoutClients = appointmentsWithClients.filter(record => !record.client);
      if (appointmentsWithoutClients.length > 0) {
        this.addIssue(
          'Appointment Linking',
          'HIGH',
          `${appointmentsWithoutClients.length} appointments have invalid client references`,
          appointmentsWithoutClients.length
        );
        this.addRecommendation(
          'HIGH',
          'Fix broken appointment-client links',
          `Broken appointments: ${appointmentsWithoutClients.map(a => a.appointment.id).join(', ')}`
        );
      }

      // Check for appointments with missing Google Calendar sync
      const appointmentsWithoutGoogleSync = appointmentsWithClients.filter(
        record => record.appointment && !record.appointment.googleEventId
      );
      if (appointmentsWithoutGoogleSync.length > 0) {
        this.addIssue(
          'Calendar Sync',
          'MEDIUM',
          `${appointmentsWithoutGoogleSync.length} appointments not synced with Google Calendar`,
          appointmentsWithoutGoogleSync.length
        );
        this.addRecommendation(
          'MEDIUM',
          'Sync appointments with Google Calendar',
          'Use the calendar sync feature to link appointments with Google Calendar events'
        );
      }

      console.log(`✅ Appointment linking analysis complete: ${totalAppointments} appointments analyzed`);
    } catch (error) {
      this.addIssue('Appointment Linking', 'CRITICAL', `Failed to analyze appointments: ${error.message}`);
      console.error('❌ Appointment linking analysis failed:', error);
    }
  }

  // 3. Analyze session notes linking
  async analyzeSessionNotesLinking() {
    console.log('🔍 Analyzing session notes linking...');
    
    try {
      const allSessionNotes = await db.select().from(sessionNotes);
      this.statistics.totalSessionNotes = allSessionNotes.length;

      // Session notes with client ID as text vs UUID reference
      const notesWithTextClientId = allSessionNotes.filter(note => 
        note.clientId && typeof note.clientId === 'string' && note.clientId.length < 36
      );
      
      const notesWithUuidClientId = allSessionNotes.filter(note => 
        note.clientId && typeof note.clientId === 'string' && note.clientId.length === 36
      );

      if (notesWithTextClientId.length > 0) {
        this.addIssue(
          'Session Notes',
          'HIGH',
          `${notesWithTextClientId.length} session notes have client names instead of IDs`,
          notesWithTextClientId.length
        );
        this.addRecommendation(
          'HIGH',
          'Convert client names to IDs in session notes',
          `Notes with text client IDs: ${notesWithTextClientId.map(n => n.clientId).join(', ')}`
        );
      }

      // Session notes without appointment links
      const notesWithoutAppointments = allSessionNotes.filter(note => !note.appointmentId);
      if (notesWithoutAppointments.length > 0) {
        this.addIssue(
          'Session Notes',
          'MEDIUM',
          `${notesWithoutAppointments.length} session notes not linked to appointments`,
          notesWithoutAppointments.length
        );
        this.addRecommendation(
          'MEDIUM',
          'Link session notes to appointments',
          'Use calendar event IDs and dates to match notes with appointments'
        );
      }

      // Session notes with Google Calendar event IDs but no appointment links
      const notesWithEventButNoAppointment = allSessionNotes.filter(note => 
        note.eventId && !note.appointmentId
      );
      if (notesWithEventButNoAppointment.length > 0) {
        this.addIssue(
          'Session Notes',
          'MEDIUM',
          `${notesWithEventButNoAppointment.length} session notes have calendar events but no appointment links`,
          notesWithEventButNoAppointment.length
        );
        this.addRecommendation(
          'MEDIUM',
          'Match calendar events to appointments',
          'Create appointment records for session notes that only have calendar event IDs'
        );
      }

      console.log(`✅ Session notes analysis complete: ${allSessionNotes.length} notes analyzed`);
    } catch (error) {
      this.addIssue('Session Notes', 'CRITICAL', `Failed to analyze session notes: ${error.message}`);
      console.error('❌ Session notes analysis failed:', error);
    }
  }

  // 4. Analyze calendar events table
  async analyzeCalendarEvents() {
    console.log('🔍 Analyzing calendar events...');
    
    try {
      const allCalendarEvents = await db.select().from(calendarEvents);
      this.statistics.totalCalendarEvents = allCalendarEvents.length;

      if (allCalendarEvents.length === 0) {
        this.addIssue(
          'Calendar Events',
          'HIGH',
          'No calendar events found in database - calendar sync may not be working',
          0
        );
        this.addRecommendation(
          'HIGH',
          'Set up calendar event synchronization',
          'Configure Google Calendar API integration to sync events to database'
        );
      } else {
        // Check for events without client links
        const eventsWithoutClients = allCalendarEvents.filter(event => !event.clientId);
        if (eventsWithoutClients.length > 0) {
          this.addIssue(
            'Calendar Events',
            'MEDIUM',
            `${eventsWithoutClients.length} calendar events not linked to clients`,
            eventsWithoutClients.length
          );
          this.addRecommendation(
            'MEDIUM',
            'Link calendar events to clients',
            'Use client name extraction from event summaries to link events to client records'
          );
        }

        // Check for events without appointment links
        const eventsWithoutAppointments = allCalendarEvents.filter(event => !event.appointmentId);
        if (eventsWithoutAppointments.length > 0) {
          this.addIssue(
            'Calendar Events',
            'MEDIUM',
            `${eventsWithoutAppointments.length} calendar events not linked to appointments`,
            eventsWithoutAppointments.length
          );
        }
      }

      console.log(`✅ Calendar events analysis complete: ${allCalendarEvents.length} events analyzed`);
    } catch (error) {
      this.addIssue('Calendar Events', 'CRITICAL', `Failed to analyze calendar events: ${error.message}`);
      console.error('❌ Calendar events analysis failed:', error);
    }
  }

  // 5. Check for orphaned records
  async analyzeOrphanedRecords() {
    console.log('🔍 Checking for orphaned records...');
    
    try {
      // Check for orphaned appointments (client_id doesn't exist)
      const orphanedAppointments = await db
        .select({ id: appointments.id, clientId: appointments.clientId })
        .from(appointments)
        .leftJoin(clients, eq(appointments.clientId, clients.id))
        .where(isNull(clients.id));

      if (orphanedAppointments.length > 0) {
        this.addIssue(
          'Data Integrity',
          'HIGH',
          `${orphanedAppointments.length} orphaned appointments (client doesn't exist)`,
          orphanedAppointments.length
        );
        this.addRecommendation(
          'HIGH',
          'Clean up orphaned appointments',
          `Orphaned appointment IDs: ${orphanedAppointments.map(a => a.id).join(', ')}`
        );
      }

      console.log(`✅ Orphaned records analysis complete`);
    } catch (error) {
      this.addIssue('Data Integrity', 'CRITICAL', `Failed to check orphaned records: ${error.message}`);
      console.error('❌ Orphaned records analysis failed:', error);
    }
  }

  // 6. Check client name normalization issues
  async analyzeClientNameMatching() {
    console.log('🔍 Analyzing client name matching issues...');
    
    try {
      const allClients = await db.select().from(clients);
      const allSessionNotes = await db.select().from(sessionNotes);

      // Find session notes with client names that don't match any client
      const unmatchedNotes = [];
      
      for (const note of allSessionNotes) {
        if (note.clientId && typeof note.clientId === 'string' && note.clientId.length < 36) {
          // This is a client name, not an ID
          const possibleMatches = allClients.filter(client => {
            const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
            const noteName = note.clientId.toLowerCase();
            
            return fullName.includes(noteName) || 
                   noteName.includes(client.firstName?.toLowerCase()) ||
                   noteName.includes(client.lastName?.toLowerCase());
          });

          if (possibleMatches.length === 0) {
            unmatchedNotes.push({
              noteId: note.id,
              clientName: note.clientId,
              eventId: note.eventId
            });
          }
        }
      }

      if (unmatchedNotes.length > 0) {
        this.addIssue(
          'Client Name Matching',
          'HIGH',
          `${unmatchedNotes.length} session notes have unmatched client names`,
          unmatchedNotes.length
        );
        this.addRecommendation(
          'HIGH',
          'Fix unmatched client names in session notes',
          `Unmatched names: ${unmatchedNotes.map(n => n.clientName).join(', ')}`
        );
      }

      console.log(`✅ Client name matching analysis complete`);
    } catch (error) {
      this.addIssue('Client Name Matching', 'CRITICAL', `Failed to analyze name matching: ${error.message}`);
      console.error('❌ Client name matching analysis failed:', error);
    }
  }

  // Generate comprehensive report
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 CLIENT LINKING DIAGNOSTIC REPORT');
    console.log('='.repeat(80));
    
    // Statistics
    console.log('\n📈 STATISTICS:');
    console.log(`   Total Clients: ${this.statistics.totalClients || 0}`);
    console.log(`   Total Appointments: ${this.statistics.totalAppointments || 0}`);
    console.log(`   Total Session Notes: ${this.statistics.totalSessionNotes || 0}`);
    console.log(`   Total Calendar Events: ${this.statistics.totalCalendarEvents || 0}`);

    // Issues by severity
    const criticalIssues = this.issues.filter(i => i.severity === 'CRITICAL');
    const highIssues = this.issues.filter(i => i.severity === 'HIGH');
    const mediumIssues = this.issues.filter(i => i.severity === 'MEDIUM');

    console.log('\n🚨 ISSUES FOUND:');
    
    if (criticalIssues.length > 0) {
      console.log(`\n  ❌ CRITICAL (${criticalIssues.length}):`);
      criticalIssues.forEach(issue => {
        console.log(`     • [${issue.category}] ${issue.description}`);
        if (issue.affectedRecords > 0) {
          console.log(`       Affected records: ${issue.affectedRecords}`);
        }
      });
    }

    if (highIssues.length > 0) {
      console.log(`\n  🔴 HIGH (${highIssues.length}):`);
      highIssues.forEach(issue => {
        console.log(`     • [${issue.category}] ${issue.description}`);
        if (issue.affectedRecords > 0) {
          console.log(`       Affected records: ${issue.affectedRecords}`);
        }
      });
    }

    if (mediumIssues.length > 0) {
      console.log(`\n  🟡 MEDIUM (${mediumIssues.length}):`);
      mediumIssues.forEach(issue => {
        console.log(`     • [${issue.category}] ${issue.description}`);
        if (issue.affectedRecords > 0) {
          console.log(`       Affected records: ${issue.affectedRecords}`);
        }
      });
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    const highPriorityRecs = this.recommendations.filter(r => r.priority === 'HIGH');
    const mediumPriorityRecs = this.recommendations.filter(r => r.priority === 'MEDIUM');

    if (highPriorityRecs.length > 0) {
      console.log(`\n  🔴 HIGH PRIORITY:`);
      highPriorityRecs.forEach((rec, index) => {
        console.log(`     ${index + 1}. ${rec.action}`);
        if (rec.details) {
          console.log(`        Details: ${rec.details}`);
        }
      });
    }

    if (mediumPriorityRecs.length > 0) {
      console.log(`\n  🟡 MEDIUM PRIORITY:`);
      mediumPriorityRecs.forEach((rec, index) => {
        console.log(`     ${index + 1}. ${rec.action}`);
        if (rec.details) {
          console.log(`        Details: ${rec.details}`);
        }
      });
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 SUMMARY:');
    
    const totalIssues = this.issues.length;
    if (totalIssues === 0) {
      console.log('✅ No major issues found. Client linking appears to be working correctly.');
    } else {
      console.log(`❌ Found ${totalIssues} issues that need attention.`);
      console.log(`🔴 Critical/High priority issues: ${criticalIssues.length + highIssues.length}`);
      console.log(`🟡 Medium priority issues: ${mediumIssues.length}`);
    }

    console.log('\n🔧 NEXT STEPS:');
    console.log('   1. Address critical and high-priority issues first');
    console.log('   2. Run the client linking fix script (if provided)');
    console.log('   3. Verify calendar sync is working properly');
    console.log('   4. Re-run this diagnostic after fixes to confirm improvements');
    
    console.log('\n' + '='.repeat(80));
  }

  // Main execution
  async run() {
    console.log('🚀 Starting Client Linking Diagnostic...\n');
    
    try {
      await this.analyzeClientData();
      await this.analyzeAppointmentLinking();
      await this.analyzeSessionNotesLinking();
      await this.analyzeCalendarEvents();
      await this.analyzeOrphanedRecords();
      await this.analyzeClientNameMatching();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Diagnostic failed:', error);
      this.addIssue('System', 'CRITICAL', `Diagnostic script failed: ${error.message}`);
    } finally {
      await pool.end();
    }
  }
}

// Run the diagnostic
if (require.main === module) {
  const diagnostic = new ClientLinkingDiagnostic();
  diagnostic.run().catch(console.error);
}

module.exports = ClientLinkingDiagnostic;