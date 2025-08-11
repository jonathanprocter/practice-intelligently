/**
 * Batch Historical Appointment Processor
 * 
 * This utility processes all existing session notes in the database and creates
 * historical appointments for any that don't have proper appointment linkage.
 */

import { processSessionNoteWithHistoricalAppointment } from './historical-appointment-utils';

interface BatchProcessingResult {
  totalProcessed: number;
  appointmentsCreated: number;
  notesLinked: number;
  alreadyLinked: number;
  errors: Array<{ noteId: string; error: string }>;
  summary: string;
}

/**
 * Process all existing session notes and create historical appointments
 */
export async function batchProcessAllSessionNotes(storage: any): Promise<BatchProcessingResult> {
  console.log('🔄 Starting batch processing of all session notes for historical appointment creation...');
  
  const result: BatchProcessingResult = {
    totalProcessed: 0,
    appointmentsCreated: 0,
    notesLinked: 0,
    alreadyLinked: 0,
    errors: [],
    summary: ''
  };
  
  try {
    // Get all session notes from the database
    const allSessionNotes = await storage.getAllSessionNotes();
    console.log(`📊 Found ${allSessionNotes.length} total session notes to process`);
    
    for (const sessionNote of allSessionNotes) {
      try {
        result.totalProcessed++;
        
        // Check if already linked to an appointment
        if (sessionNote.appointmentId && sessionNote.eventId) {
          result.alreadyLinked++;
          console.log(`✅ Note ${sessionNote.id.substring(0, 8)}... already linked to appointment`);
          continue;
        }
        
        // Get client information for better processing
        let clientName = 'Unknown Client';
        try {
          const client = await storage.getClient(sessionNote.clientId);
          if (client) {
            clientName = `${client.firstName} ${client.lastName}`;
          }
        } catch (clientError) {
          console.warn(`Could not fetch client info for ${sessionNote.clientId}`);
        }
        
        console.log(`🔄 Processing unlinked session note for ${clientName}...`);
        
        // Process the session note to create/link historical appointment
        const processResult = await processSessionNoteWithHistoricalAppointment(
          {
            ...sessionNote,
            clientId: sessionNote.clientId,
            therapistId: sessionNote.therapistId,
            content: sessionNote.content,
            eventId: sessionNote.eventId || undefined
          },
          storage,
          clientName
        );
        
        if (processResult.linked) {
          result.notesLinked++;
          
          if (processResult.appointment?.created) {
            result.appointmentsCreated++;
            console.log(`✅ Created historical appointment and linked note ${sessionNote.id.substring(0, 8)}... for ${clientName}`);
          } else {
            console.log(`🔗 Linked existing appointment to note ${sessionNote.id.substring(0, 8)}... for ${clientName}`);
          }
        } else {
          console.log(`⚠️ Could not link note ${sessionNote.id.substring(0, 8)}... for ${clientName} (no reliable date found)`);
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({
          noteId: sessionNote.id,
          error: errorMessage
        });
        console.error(`❌ Error processing session note ${sessionNote.id}:`, errorMessage);
      }
    }
    
    // Generate summary
    result.summary = `
Batch Processing Complete:
✅ Total Notes Processed: ${result.totalProcessed}
📅 Historical Appointments Created: ${result.appointmentsCreated}
🔗 Notes Successfully Linked: ${result.notesLinked}
✓ Already Linked: ${result.alreadyLinked}
❌ Errors: ${result.errors.length}

Success Rate: ${((result.notesLinked + result.alreadyLinked) / result.totalProcessed * 100).toFixed(1)}%
    `.trim();
    
    console.log('\n' + result.summary);
    
    if (result.errors.length > 0) {
      console.log('\nErrors encountered:');
      result.errors.forEach(error => {
        console.log(`- Note ${error.noteId}: ${error.error}`);
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Batch processing failed:', error);
    throw error;
  }
}

/**
 * Process session notes for a specific client
 */
export async function batchProcessSessionNotesForClient(
  clientId: string, 
  storage: any
): Promise<BatchProcessingResult> {
  console.log(`🔄 Starting batch processing of session notes for client ${clientId}...`);
  
  const result: BatchProcessingResult = {
    totalProcessed: 0,
    appointmentsCreated: 0,
    notesLinked: 0,
    alreadyLinked: 0,
    errors: [],
    summary: ''
  };
  
  try {
    // Get client information
    const client = await storage.getClient(clientId);
    const clientName = client ? `${client.firstName} ${client.lastName}` : 'Unknown Client';
    
    // Get all session notes for this client
    const sessionNotes = await storage.getSessionNotes(clientId);
    console.log(`📊 Found ${sessionNotes.length} session notes for ${clientName}`);
    
    for (const sessionNote of sessionNotes) {
      try {
        result.totalProcessed++;
        
        // Check if already linked to an appointment
        if (sessionNote.appointmentId && sessionNote.eventId) {
          result.alreadyLinked++;
          console.log(`✅ Note ${sessionNote.id.substring(0, 8)}... already linked`);
          continue;
        }
        
        console.log(`🔄 Processing unlinked session note ${sessionNote.id.substring(0, 8)}...`);
        
        // Process the session note
        const processResult = await processSessionNoteWithHistoricalAppointment(
          {
            ...sessionNote,
            clientId: sessionNote.clientId,
            therapistId: sessionNote.therapistId,
            content: sessionNote.content,
            eventId: sessionNote.eventId || undefined
          },
          storage,
          clientName
        );
        
        if (processResult.linked) {
          result.notesLinked++;
          
          if (processResult.appointment?.created) {
            result.appointmentsCreated++;
            console.log(`✅ Created historical appointment and linked note ${sessionNote.id.substring(0, 8)}...`);
          } else {
            console.log(`🔗 Linked existing appointment to note ${sessionNote.id.substring(0, 8)}...`);
          }
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({
          noteId: sessionNote.id,
          error: errorMessage
        });
        console.error(`❌ Error processing session note ${sessionNote.id}:`, errorMessage);
      }
    }
    
    result.summary = `
Client ${clientName} Processing Complete:
✅ Total Notes: ${result.totalProcessed}
📅 Appointments Created: ${result.appointmentsCreated}
🔗 Notes Linked: ${result.notesLinked}
✓ Already Linked: ${result.alreadyLinked}
❌ Errors: ${result.errors.length}
    `.trim();
    
    console.log('\n' + result.summary);
    return result;
    
  } catch (error) {
    console.error(`❌ Batch processing failed for client ${clientId}:`, error);
    throw error;
  }
}