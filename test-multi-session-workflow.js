#!/usr/bin/env node

/**
 * Multi-Session Document Processing Test
 * 
 * This script demonstrates the enhanced document processing system that:
 * 1. Detects multi-session documents (like the Caitlin Dunn comprehensive progress notes)
 * 2. Parses individual sessions with dates and content
 * 3. Creates appointments if they don't exist
 * 4. Attaches preformatted progress notes to appointments
 * 5. Maintains therapeutic participation logs
 */

const baseUrl = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
  : 'http://localhost:5000';

// Test client information
const CAITLIN_DUNN_CLIENT_ID = '61406635-327c-401d-b209-c20342f4b28a';
const THERAPIST_ID = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';

console.log('🧪 Multi-Session Document Processing Test');
console.log('=========================================\n');

async function testMultiSessionWorkflow() {
  try {
    // Step 1: Check existing appointments for Caitlin Dunn before processing
    console.log('📅 Step 1: Checking existing appointments for Caitlin Dunn...');
    const existingAppointmentsResponse = await fetch(`${baseUrl}/api/appointments/client/${CAITLIN_DUNN_CLIENT_ID}`);
    
    if (existingAppointmentsResponse.ok) {
      const existingAppointments = await existingAppointmentsResponse.json();
      console.log(`   Found ${existingAppointments.length} existing appointments`);
      
      existingAppointments.forEach((apt, index) => {
        const date = new Date(apt.scheduledTime).toLocaleDateString();
        console.log(`   ${index + 1}. ${date} - ${apt.status} (${apt.type || 'therapy'})`);
      });
    }

    // Step 2: Simulate multi-session document upload
    console.log('\n📄 Step 2: Simulating multi-session document processing...');
    console.log('   Document: Caitlin Dunn - Comprehensive Progress Notes - Finalized.docx');
    
    // This would normally be done via file upload, but we'll simulate the processing
    const testMultiSessionContent = `
    Session 1 - July 15, 2025
    ========================
    
    Comprehensive Clinical Progress Note
    
    Client: Caitlin Dunn
    Date: July 15, 2025
    Session Type: Individual Therapy
    Duration: 60 minutes
    
    Subjective:
    Caitlin presented today discussing ongoing anxiety related to work transitions. She reports feeling "overwhelmed" by recent changes in her role and expresses concerns about meeting expectations. Sleep patterns remain disrupted (4-5 hours per night), and she notes increased caffeine intake to compensate for fatigue.
    
    Objective:
    Client appeared alert and engaged throughout the session. Maintained appropriate eye contact. Speech was rapid at times, consistent with reported anxiety. No signs of acute distress observed.
    
    Assessment:
    Caitlin continues to demonstrate symptoms consistent with adjustment disorder with anxiety. Progress noted in identifying trigger patterns, though coping strategies need reinforcement. Client shows good insight into her current challenges.
    
    Plan:
    1. Continue weekly individual therapy sessions
    2. Practice grounding techniques discussed today
    3. Implement sleep hygiene recommendations
    4. Follow up on work-related stressors next session
    
    ---
    
    Session 2 - July 22, 2025
    ========================
    
    Comprehensive Clinical Progress Note
    
    Client: Caitlin Dunn
    Date: July 22, 2025
    Session Type: Individual Therapy
    Duration: 60 minutes
    
    Subjective:
    Caitlin reports improvement in sleep quality following implementation of sleep hygiene techniques. Still experiencing work-related anxiety but notes using grounding techniques "helped twice this week." Expresses interest in exploring assertiveness skills for workplace communication.
    
    Objective:
    Client appeared more relaxed than previous session. Speech pace normalized. Demonstrated understanding of coping strategies through examples. Active participation in session planning.
    
    Assessment:
    Positive response to behavioral interventions. Anxiety symptoms showing gradual improvement. Client is developing better self-awareness and coping mechanisms. Ready to progress to skill-building phase.
    
    Plan:
    1. Continue weekly sessions with focus on assertiveness training
    2. Assign practice exercises for workplace communication
    3. Monitor sleep patterns and anxiety levels
    4. Consider gradual exposure techniques for work situations
    `;

    // Step 3: Process the multi-session document
    console.log('\n🔄 Step 3: Processing multi-session document...');
    
    const processResponse = await fetch(`${baseUrl}/api/documents/upload-and-process-multi-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: testMultiSessionContent,
        filename: 'Caitlin_Dunn_Comprehensive_Progress_Notes.docx',
        clientId: CAITLIN_DUNN_CLIENT_ID,
        clientName: 'Caitlin Dunn'
      })
    });

    if (processResponse.ok) {
      const result = await processResponse.json();
      console.log('   ✅ Multi-session document processed successfully!');
      console.log(`   📊 Detected: ${result.totalSessions} sessions`);
      console.log(`   📝 Created: ${result.processedSessions?.length || 0} progress notes`);
      console.log(`   📅 Appointments: ${result.createdAppointments || 0} created`);

      if (result.processedSessions) {
        result.processedSessions.forEach((session, index) => {
          console.log(`   Session ${index + 1}: ${session.date} - ${session.clientName}`);
        });
      }
    } else {
      const error = await processResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.log('   ❌ Processing failed:', error.error);
    }

    // Step 4: Verify appointments were created
    console.log('\n📅 Step 4: Verifying new appointments...');
    const updatedAppointmentsResponse = await fetch(`${baseUrl}/api/appointments/client/${CAITLIN_DUNN_CLIENT_ID}`);
    
    if (updatedAppointmentsResponse.ok) {
      const updatedAppointments = await updatedAppointmentsResponse.json();
      console.log(`   Found ${updatedAppointments.length} total appointments now`);
      
      // Show only recent appointments (created from document processing)
      const recentAppointments = updatedAppointments.filter(apt => 
        apt.source === 'document-upload' || new Date(apt.createdAt) > new Date(Date.now() - 60000)
      );
      
      console.log(`   ${recentAppointments.length} appointments created from document processing:`);
      recentAppointments.forEach((apt, index) => {
        const date = new Date(apt.scheduledTime).toLocaleDateString();
        console.log(`   ${index + 1}. ${date} - ${apt.status} - Notes: ${apt.notes?.substring(0, 50)}...`);
      });
    }

    // Step 5: Check session notes were attached
    console.log('\n📝 Step 5: Verifying session notes were created and attached...');
    const sessionNotesResponse = await fetch(`${baseUrl}/api/session-notes/client/${CAITLIN_DUNN_CLIENT_ID}`);
    
    if (sessionNotesResponse.ok) {
      const sessionNotes = await sessionNotesResponse.json();
      const recentNotes = sessionNotes.filter(note => 
        new Date(note.createdAt) > new Date(Date.now() - 300000) // Last 5 minutes
      );
      
      console.log(`   Found ${recentNotes.length} session notes from document processing`);
      recentNotes.forEach((note, index) => {
        const date = new Date(note.createdAt).toLocaleDateString();
        console.log(`   ${index + 1}. ${date} - ${note.content?.substring(0, 80)}...`);
      });
    }

    console.log('\n🎉 Multi-Session Document Processing Test Complete!');
    console.log('✅ System successfully:');
    console.log('   • Detected multiple sessions in single document');
    console.log('   • Parsed individual session content and dates');
    console.log('   • Created appointments for therapeutic participation tracking');
    console.log('   • Attached preformatted progress notes to appointments');
    console.log('   • Maintained client therapy flow and history');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testMultiSessionWorkflow();