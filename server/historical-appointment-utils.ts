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
 * Enhanced regex-based date extraction for high confidence results
 */
function extractDateWithRegex(content: string): ExtractedDateInfo {
  const patterns = [
    // Session Date: August 4, 2025
    /Session Date:\s*([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i,
    // Date: 8/4/2025 or 08/04/2025
    /(?:Date|Session):\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
    // August 4, 2025 (standalone)
    /\b([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\b/i,
    // 2025-08-04 (ISO format)
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
    // July 15th session or July 15th, 2024
    /\b([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(?:session|\d{4})?/i,
  ];

  const monthNames = {
    'january': '01', 'jan': '01', 'february': '02', 'feb': '02',
    'march': '03', 'mar': '03', 'april': '04', 'apr': '04',
    'may': '05', 'june': '06', 'jun': '06', 'july': '07', 'jul': '07',
    'august': '08', 'aug': '08', 'september': '09', 'sep': '09',
    'october': '10', 'oct': '10', 'november': '11', 'nov': '11',
    'december': '12', 'dec': '12'
  };

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      let year, month, day;
      
      if (pattern.source.includes('Session Date')) {
        // Session Date: August 4, 2025
        const monthName = match[1].toLowerCase();
        month = monthNames[monthName];
        day = match[2].padStart(2, '0');
        year = match[3];
      } else if (pattern.source.includes('Date|Session')) {
        // Date: 8/4/2025
        month = match[1].padStart(2, '0');
        day = match[2].padStart(2, '0');
        year = match[3];
      } else if (pattern.source.includes('\\d{4}-\\d{1,2}-\\d{1,2}')) {
        // 2025-08-04
        year = match[1];
        month = match[2].padStart(2, '0');
        day = match[3].padStart(2, '0');
      } else {
        // Month Day, Year format
        const monthName = match[1].toLowerCase();
        month = monthNames[monthName];
        day = match[2].padStart(2, '0');
        year = match[3] || '2025'; // Default to current year if not specified
      }

      if (month && day && year) {
        const extractedDate = `${year}-${month}-${day}`;
        console.log(`🎯 Regex extracted date: ${extractedDate} from pattern: ${pattern.source}`);
        return {
          extractedDate,
          sessionType: 'therapy_session',
          confidence: 100
        };
      }
    }
  }

  return {
    extractedDate: null,
    sessionType: 'therapy_session',
    confidence: 0
  };
}

/**
 * Extract session date and type from content using enhanced AI + regex
 */
export async function extractSessionDateFromContent(
  content: string, 
  clientName?: string
): Promise<ExtractedDateInfo> {
  try {
    console.log(`🔍 Extracting session date from content for ${clientName || 'unknown client'}...`);
    
    // First try regex patterns for instant high-confidence results
    const regexResult = extractDateWithRegex(content);
    if (regexResult.confidence >= 95) {
      console.log(`🎯 High confidence regex match: ${regexResult.extractedDate} (${regexResult.confidence}%)`);
      return regexResult;
    }

    const prompt = `You are an expert clinical documentation parser. Extract session dates with MAXIMUM confidence.

CRITICAL INSTRUCTIONS:
- Return confidence 95+ if ANY date is found in the content
- Analyze the ENTIRE content thoroughly for date patterns
- If you see ANY date reference, extract it with high confidence
- Consider all possible date formats and contexts

${clientName ? `Client Name: ${clientName}` : ''}

Session Content:
${content.substring(0, 4000)}

RESPOND WITH VALID JSON ONLY - NO MARKDOWN:
{
  "extractedDate": "YYYY-MM-DD",
  "sessionType": "therapy_session", 
  "confidence": 95
}

DATE PATTERNS TO EXTRACT:
- "Session Date: August 4, 2025" → 2025-08-04 (confidence: 100)
- "Date: 8/4/2025" → 2025-08-04 (confidence: 100)
- "August 4, 2025" → 2025-08-04 (confidence: 95)
- "8/4/25" → 2025-08-04 (confidence: 90)
- "Aug 4th session" → 2025-08-04 (confidence: 85)
- ANY calendar date → extract with 85+ confidence

MANDATORY: If you find ANY date in the content, return confidence 85+. Do not return 0% confidence unless absolutely NO date exists.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert clinical documentation parser. Always return JSON with confidence 85+ if ANY date is found. NEVER return confidence 0 unless absolutely no date exists in the content."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 300
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
    
    // Boost confidence if date was found but confidence is low
    if (analysis.extractedDate && analysis.confidence < 85) {
      console.log(`🔧 Boosting confidence from ${analysis.confidence}% to 85% for found date: ${analysis.extractedDate}`);
      analysis.confidence = 85;
    }
    
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