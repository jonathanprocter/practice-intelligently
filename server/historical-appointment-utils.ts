import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Utility for creating historical appointments when session notes are uploaded
 */

interface HistoricalAppointmentData {
  clientId: string;
  therapistId: string;
  sessionDate: Date;
  sessionType?: string;
  sessionContent?: string;
  clientName?: string;
}

interface ExtractedDateInfo {
  extractedDate: string | null;
  sessionType: string;
  confidence: number;
}

/**
 * Extract session date and type from content using AI
 */
export async function extractSessionDateFromContent(
  content: string, 
  clientName?: string
): Promise<ExtractedDateInfo> {
  try {
    const prompt = `
You are a clinical documentation expert. Analyze this session content and extract the session date.

${clientName ? `Client Name: ${clientName}` : ''}

Session Content:
${content.substring(0, 2000)} // First 2000 chars

Please provide a JSON response with the following structure:
{
  "extractedDate": "YYYY-MM-DD format if found, null if not found",
  "sessionType": "individual therapy | group therapy | intake | assessment | follow-up | therapy_session",
  "confidence": "number from 0-100 indicating confidence in the extracted date"
}

Look for:
1. Explicit dates (July 15, 2024, 7/15/2024, 2024-07-15, etc.)
2. Session headers that mention dates
3. Context clues about when the session occurred

Be very precise with date extraction. Only return a date if you're confident.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a clinical documentation expert. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 500
    });

    const analysisText = response.choices[0]?.message?.content;
    if (!analysisText) {
      throw new Error('No analysis received from AI');
    }

    // Clean potential markdown formatting from AI response
    const cleanedText = analysisText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    const analysis = JSON.parse(cleanedText);
    
    return {
      extractedDate: analysis.extractedDate,
      sessionType: analysis.sessionType || 'therapy_session',
      confidence: analysis.confidence || 0
    };
    
  } catch (error) {
    console.error('Error extracting session date:', error);
    return {
      extractedDate: null,
      sessionType: 'therapy_session',
      confidence: 0
    };
  }
}

/**
 * Create or find historical appointment for a session note
 */
export async function createOrFindHistoricalAppointment(
  data: HistoricalAppointmentData,
  storage: any
): Promise<{ appointmentId: string; googleEventId: string; created: boolean }> {
  try {
    const { clientId, therapistId, sessionDate, sessionType, clientName } = data;
    
    console.log(`🔍 Looking for appointment on ${sessionDate.toISOString()} for client ${clientId.substring(0, 8)}...`);
    
    // Check if appointment already exists for this date/time
    const existingAppointments = await storage.getAppointmentsByClientAndDate(
      clientId, 
      sessionDate
    );
    
    if (existingAppointments.length > 0) {
      const existing = existingAppointments[0];
      console.log(`✅ Found existing appointment: ${existing.id.substring(0, 8)}...`);
      return {
        appointmentId: existing.id,
        googleEventId: existing.google_event_id || existing.googleEventId,
        created: false
      };
    }
    
    // Create new historical appointment
    const dateStr = sessionDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = sessionDate.toTimeString().substring(0, 5); // HH:MM
    
    // Generate unique historical event ID
    const googleEventId = `historical_${dateStr.replace(/-/g, '')}_${timeStr.replace(':', '')}_${clientId.substring(0, 8)}_${Date.now()}`;
    
    console.log(`📅 Creating historical appointment for ${clientName || 'client'} on ${dateStr} at ${timeStr}`);
    
    const appointmentData = {
      clientId,
      therapistId,
      startTime: sessionDate,
      endTime: new Date(sessionDate.getTime() + (50 * 60 * 1000)), // 50 minutes default
      type: sessionType || 'therapy_session',
      status: 'completed',
      location: 'Office',
      googleEventId,
      notes: `Historical session created from uploaded document - ${sessionType || 'therapy session'}`
    };
    
    const newAppointment = await storage.createAppointment(appointmentData);
    console.log(`✅ Created historical appointment: ${newAppointment.id.substring(0, 8)}... (${googleEventId})`);
    
    return {
      appointmentId: newAppointment.id,
      googleEventId,
      created: true
    };
    
  } catch (error) {
    console.error('Error creating historical appointment:', error);
    throw error;
  }
}

/**
 * Process session note and create/link historical appointment
 */
export async function processSessionNoteWithHistoricalAppointment(
  sessionNoteData: any,
  storage: any,
  clientName?: string
): Promise<{ sessionNote: any; appointment: any; linked: boolean }> {
  try {
    const { clientId, therapistId, content } = sessionNoteData;
    
    // Extract date information from content
    const dateInfo = await extractSessionDateFromContent(content, clientName);
    
    let appointmentInfo = null;
    let linkedToAppointment = false;
    
    if (dateInfo.extractedDate && dateInfo.confidence > 50) {
      // Parse the extracted date
      const sessionDate = new Date(dateInfo.extractedDate);
      
      // Set a default time if not specified (2:00 PM)
      if (sessionDate.getHours() === 0 && sessionDate.getMinutes() === 0) {
        sessionDate.setHours(14, 0, 0, 0); // 2:00 PM
      }
      
      console.log(`📅 Extracted session date: ${sessionDate.toISOString()} (confidence: ${dateInfo.confidence}%)`);
      
      // Create or find historical appointment
      appointmentInfo = await createOrFindHistoricalAppointment({
        clientId,
        therapistId,
        sessionDate,
        sessionType: dateInfo.sessionType,
        sessionContent: content,
        clientName
      }, storage);
      
      // Link session note to appointment
      sessionNoteData.eventId = appointmentInfo.googleEventId;
      linkedToAppointment = true;
      
      console.log(`🔗 Session note will be linked to appointment: ${appointmentInfo.googleEventId}`);
    } else {
      console.log(`⚠️ Could not extract reliable session date (confidence: ${dateInfo.confidence}%). Session note will be created without appointment link.`);
    }
    
    // Create the session note
    const sessionNote = await storage.createSessionNote(sessionNoteData);
    console.log(`📄 Created session note: ${sessionNote.id.substring(0, 8)}...${linkedToAppointment ? ' (linked to appointment)' : ''}`);
    
    return {
      sessionNote,
      appointment: appointmentInfo,
      linked: linkedToAppointment
    };
    
  } catch (error) {
    console.error('Error processing session note with historical appointment:', error);
    throw error;
  }
}

/**
 * Process existing session note for appointment linking only (no creation)
 */
export async function processSessionNoteForAppointmentLinking(
  existingSessionNote: any,
  storage: any,
  clientName?: string
): Promise<{
  sessionNote: any;
  appointment?: { appointmentId: string; googleEventId: string; created: boolean };
  linked: boolean;
}> {
  try {
    console.log(`🔗 Processing appointment linking for existing session note ${existingSessionNote.id.substring(0, 8)}...`);
    
    // Extract session date from content
    const dateInfo = await extractSessionDateFromContent(
      existingSessionNote.content,
      clientName
    );
    
    if (!dateInfo.extractedDate || dateInfo.confidence < 50) {
      console.log(`⚠️ Could not extract reliable session date (confidence: ${dateInfo.confidence}%). Session note will remain unlinked.`);
      return {
        sessionNote: existingSessionNote,
        linked: false
      };
    }
    
    // Parse the extracted date
    const sessionDate = new Date(dateInfo.extractedDate + 'T14:00:00Z'); // Default to 2pm if no time specified
    
    console.log(`📅 Extracted session date: ${sessionDate.toISOString()} (confidence: ${dateInfo.confidence}%)`);
    
    // Create or find historical appointment
    const appointmentInfo = await createOrFindHistoricalAppointment({
      clientId: existingSessionNote.clientId,
      therapistId: existingSessionNote.therapistId,
      sessionDate,
      sessionType: dateInfo.sessionType,
      clientName
    }, storage);
    
    // Update the existing session note with appointment linkage
    const updatedSessionNote = await storage.updateSessionNote(existingSessionNote.id, {
      appointmentId: appointmentInfo.appointmentId,
      eventId: appointmentInfo.googleEventId
    });
    
    return {
      sessionNote: updatedSessionNote,
      appointment: appointmentInfo,
      linked: true
    };
    
  } catch (error) {
    console.error('Error processing session note for appointment linking:', error);
    return {
      sessionNote: existingSessionNote,
      linked: false
    };
  }
}

/**
 * Batch process multiple session notes and create historical appointments
 */
export async function batchProcessSessionNotesWithAppointments(
  sessionNotesData: any[],
  storage: any
): Promise<{
  processed: number;
  linked: number;
  appointmentsCreated: number;
  errors: string[];
}> {
  let processed = 0;
  let linked = 0;
  let appointmentsCreated = 0;
  const errors: string[] = [];
  
  console.log(`🔄 Starting batch processing of ${sessionNotesData.length} session notes...`);
  
  for (const noteData of sessionNotesData) {
    try {
      const result = await processSessionNoteWithHistoricalAppointment(noteData, storage);
      processed++;
      
      if (result.linked) {
        linked++;
      }
      
      if (result.appointment?.created) {
        appointmentsCreated++;
      }
      
    } catch (error) {
      console.error(`Error processing session note for client ${noteData.clientId}:`, error);
      errors.push(`Client ${noteData.clientId}: ${error.message}`);
    }
  }
  
  console.log(`✅ Batch processing complete: ${processed} notes processed, ${linked} linked to appointments, ${appointmentsCreated} new appointments created`);
  
  return {
    processed,
    linked,
    appointmentsCreated,
    errors
  };
}