import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Session data structure for July 2025 comprehensive notes
interface SessionData {
  clientName: string;
  sessionDate: string;
  sessionTime: string;
  duration?: string;
  sessionType: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  tonalAnalysis?: string;
  keyPoints: string[];
  significantQuotes: string[];
  narrativeSummary: string;
  aiTags: string[];
}

// Extract session data from comprehensive progress notes document
export async function parseComprehensiveProgressNotes(documentContent: string): Promise<SessionData[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert clinical documentation processor. Extract individual therapy session data from this comprehensive progress notes document.

For each session, extract:
- Client name (full name)
- Session date (convert to YYYY-MM-DD format)
- Session time (convert to HH:MM format using 24-hour time)
- Duration (if mentioned)
- Session type
- Complete SOAP notes (Subjective, Objective, Assessment, Plan)
- Tonal analysis (if present)
- Key clinical points (3-7 bullet points)
- Significant client quotes (2-5 direct quotes)
- Brief narrative summary (1-2 sentences)
- AI tags (5-10 relevant clinical tags)

Return as a JSON array of session objects. Be precise with dates and times.`
        },
        {
          role: "user",
          content: `Parse this comprehensive clinical progress notes document and extract all individual therapy sessions:\n\n${documentContent}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.sessions || [];
  } catch (error) {
    console.error('Error parsing comprehensive progress notes:', error);
    throw new Error(`Failed to parse progress notes: ${error.message}`);
  }
}

// Process and create session records
export async function processComprehensiveProgressNotes(
  documentContent: string,
  therapistId: string,
  storage: any
): Promise<{ 
  created: number, 
  matched: number, 
  unmatched: string[],
  sessions: any[]
}> {
  console.log('🔄 Starting comprehensive progress notes processing...');
  
  const sessions = await parseComprehensiveProgressNotes(documentContent);
  console.log(`📋 Extracted ${sessions.length} therapy sessions from document`);
  
  let created = 0;
  let matched = 0;
  const unmatched: string[] = [];
  const createdSessions: any[] = [];
  
  for (const session of sessions) {
    try {
      console.log(`\n🔍 Processing session for: ${session.clientName}`);
      
      // Find client in database
      const clientId = await storage.getClientIdByName(session.clientName);
      
      if (!clientId) {
        console.log(`❌ Client not found: ${session.clientName}`);
        unmatched.push(session.clientName);
        continue;
      }
      
      console.log(`✅ Found client: ${session.clientName} (${clientId.substring(0, 8)}...)`);
      matched++;
      
      // Parse session date and time
      const sessionDateTime = new Date(`${session.sessionDate}T${session.sessionTime}`);
      
      // Look for existing appointment on this date/time
      const existingAppointments = await storage.getAppointmentsByClientAndDate(
        clientId, 
        sessionDateTime
      );
      
      let appointmentId = null;
      if (existingAppointments.length > 0) {
        appointmentId = existingAppointments[0].id;
        console.log(`🔗 Found existing appointment: ${appointmentId.substring(0, 8)}...`);
      } else {
        // Create new appointment for this session
        const appointmentData = {
          clientId,
          therapistId,
          startTime: sessionDateTime,
          endTime: new Date(sessionDateTime.getTime() + (50 * 60 * 1000)), // 50 minutes default
          type: session.sessionType || 'Individual Therapy',
          status: 'completed',
          location: 'Office',
          notes: `${session.sessionType} session - ${session.narrativeSummary}`
        };
        
        const newAppointment = await storage.createAppointment(appointmentData);
        appointmentId = newAppointment.id;
        console.log(`📅 Created new appointment: ${appointmentId.substring(0, 8)}...`);
      }
      
      // Create progress note linked to appointment and client
      const progressNoteData = {
        clientId,
        therapistId,
        appointmentId,
        title: `Clinical Progress Note - ${session.clientName} - ${session.sessionDate}`,
        subjective: session.subjective,
        objective: session.objective,
        assessment: session.assessment,
        plan: session.plan,
        tonalAnalysis: session.tonalAnalysis || null,
        keyPoints: session.keyPoints,
        significantQuotes: session.significantQuotes,
        narrativeSummary: session.narrativeSummary,
        aiTags: session.aiTags,
        sessionDate: sessionDateTime
      };
      
      const progressNote = await storage.createProgressNote(progressNoteData);
      console.log(`📝 Created progress note: ${progressNote.id.substring(0, 8)}...`);
      
      createdSessions.push({
        clientName: session.clientName,
        clientId,
        appointmentId,
        progressNoteId: progressNote.id,
        sessionDate: session.sessionDate,
        sessionTime: session.sessionTime
      });
      
      created++;
      
    } catch (error) {
      console.error(`❌ Error processing session for ${session.clientName}:`, error);
      unmatched.push(`${session.clientName} (processing error)`);
    }
  }
  
  console.log(`\n✅ Processing complete:`);
  console.log(`   Created: ${created} session records`);
  console.log(`   Matched: ${matched} clients`);
  console.log(`   Unmatched: ${unmatched.length} clients`);
  
  return {
    created,
    matched,
    unmatched,
    sessions: createdSessions
  };
}