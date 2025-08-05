import { z } from 'zod';
import mammoth from 'mammoth';
import { Storage } from './storage.js';

// Schema for parsed session data
const ParsedSessionSchema = z.object({
  clientName: z.string(),
  sessionDate: z.string(), // ISO date string
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  fullContent: z.string(),
  supplementalAnalyses: z.string().optional(),
  keyPoints: z.string().optional(),
  significantQuotes: z.string().optional(),
  narrativeSummary: z.string().optional()
});

type ParsedSession = z.infer<typeof ParsedSessionSchema>;

export class SessionDocumentProcessor {
  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  /**
   * Process a uploaded document and extract session data
   */
  async processSessionDocument(
    fileBuffer: Buffer,
    fileName: string,
    therapistId: string
  ): Promise<{
    sessionsCreated: number;
    documentsStored: number;
    clientsMatched: number;
    errors: string[];
  }> {
    const results = {
      sessionsCreated: 0,
      documentsStored: 0,
      clientsMatched: 0,
      errors: [] as string[]
    };

    try {
      // Extract text from document
      let documentText: string;
      
      if (fileName.toLowerCase().endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        documentText = result.value;
      } else {
        // Assume text file
        documentText = fileBuffer.toString('utf-8');
      }

      // Parse sessions from document
      const sessions = this.parseSessionsFromText(documentText);
      console.log(`Found ${sessions.length} sessions in document`);

      // Process each session
      for (const session of sessions) {
        try {
          await this.processSingleSession(session, therapistId, fileName);
          results.sessionsCreated++;
          results.clientsMatched++;
        } catch (error) {
          console.error('Error processing session:', error);
          results.errors.push(`Session ${session.sessionDate}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Store the original document
      try {
        await this.storeOriginalDocument(fileBuffer, fileName, therapistId, sessions);
        results.documentsStored++;
      } catch (error) {
        results.errors.push(`Document storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

    } catch (error) {
      results.errors.push(`Document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return results;
  }

  /**
   * Parse multiple sessions from document text
   */
  private parseSessionsFromText(text: string): ParsedSession[] {
    const sessions: ParsedSession[] = [];
    
    // Split by session markers - look for client name at start and session dates
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentSession: Partial<ParsedSession> = {};
    let currentSection = '';
    let currentContent = '';
    let clientName = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect client name at document start or new session
      if (this.isClientNameLine(line) && !this.isSessionDateLine(line)) {
        // If we have a current session, save it
        if (currentSession.sessionDate && currentSession.clientName) {
          this.finalizeCurrentSession(currentSession, currentContent, currentSection, sessions);
          currentSession = {};
          currentContent = '';
          currentSection = '';
        }
        clientName = this.extractClientName(line);
        continue;
      }
      
      // Detect session date
      if (this.isSessionDateLine(line)) {
        // If we have a current session, save it
        if (currentSession.sessionDate && currentSession.clientName) {
          this.finalizeCurrentSession(currentSession, currentContent, currentSection, sessions);
        }
        
        // Start new session
        currentSession = {
          clientName: clientName,
          sessionDate: this.extractSessionDate(line),
          fullContent: ''
        };
        currentContent = '';
        currentSection = '';
        continue;
      }
      
      // Skip if no current session
      if (!currentSession.sessionDate) {
        continue;
      }
      
      // Detect SOAP sections
      if (this.isSoapSection(line)) {
        // Save previous section content
        if (currentSection && currentContent) {
          this.assignSectionContent(currentSession, currentSection, currentContent.trim());
        }
        
        currentSection = line.toLowerCase();
        currentContent = '';
        continue;
      }
      
      // Detect supplemental sections
      if (this.isSupplementalSection(line)) {
        // Save previous section content
        if (currentSection && currentContent) {
          this.assignSectionContent(currentSession, currentSection, currentContent.trim());
        }
        
        currentSection = this.normalizeSupplementalSection(line);
        currentContent = '';
        continue;
      }
      
      // Add line to current content
      if (line.length > 0) {
        currentContent += line + '\n';
        if (currentSession.fullContent !== undefined) {
          currentSession.fullContent += line + '\n';
        }
      }
    }
    
    // Don't forget the last session
    if (currentSession.sessionDate && currentSession.clientName) {
      this.finalizeCurrentSession(currentSession, currentContent, currentSection, sessions);
    }
    
    return sessions;
  }

  private finalizeCurrentSession(
    currentSession: Partial<ParsedSession>,
    currentContent: string,
    currentSection: string,
    sessions: ParsedSession[]
  ) {
    // Save the last section content
    if (currentSection && currentContent) {
      this.assignSectionContent(currentSession, currentSection, currentContent.trim());
    }
    
    // Validate and add session
    try {
      const validatedSession = ParsedSessionSchema.parse(currentSession);
      sessions.push(validatedSession);
    } catch (error) {
      console.error('Session validation failed:', error, currentSession);
    }
  }

  private isClientNameLine(line: string): boolean {
    // Client name is typically the first line or a standalone name
    return (
      line.length > 0 &&
      line.length < 50 &&
      /^[A-Za-z\s]+$/.test(line) &&
      !this.isSessionDateLine(line) &&
      !this.isSoapSection(line) &&
      !line.toLowerCase().includes('session')
    );
  }

  private extractClientName(line: string): string {
    return line.trim();
  }

  private isSessionDateLine(line: string): boolean {
    return /Session:\s*\d{4}-\d{2}-\d{2}/.test(line);
  }

  private extractSessionDate(line: string): string {
    const match = line.match(/Session:\s*(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  }

  private isSoapSection(line: string): boolean {
    const soapSections = ['subjective', 'objective', 'assessment', 'plan'];
    return soapSections.includes(line.toLowerCase().trim());
  }

  private isSupplementalSection(line: string): boolean {
    const supplementalSections = [
      'supplemental analyses',
      'tonal analysis',
      'thematic analysis',
      'sentiment analysis',
      'key points',
      'significant quotes',
      'comprehensive narrative summary'
    ];
    
    const lowerLine = line.toLowerCase().trim();
    return supplementalSections.some(section => lowerLine.includes(section));
  }

  private normalizeSupplementalSection(line: string): string {
    const lowerLine = line.toLowerCase().trim();
    
    if (lowerLine.includes('supplemental')) return 'supplemental_analyses';
    if (lowerLine.includes('key points')) return 'key_points';
    if (lowerLine.includes('significant quotes')) return 'significant_quotes';
    if (lowerLine.includes('narrative summary')) return 'narrative_summary';
    
    return 'supplemental_analyses';
  }

  private assignSectionContent(session: Partial<ParsedSession>, section: string, content: string) {
    switch (section.toLowerCase()) {
      case 'subjective':
        session.subjective = content;
        break;
      case 'objective':
        session.objective = content;
        break;
      case 'assessment':
        session.assessment = content;
        break;
      case 'plan':
        session.plan = content;
        break;
      case 'supplemental_analyses':
        session.supplementalAnalyses = content;
        break;
      case 'key_points':
        session.keyPoints = content;
        break;
      case 'significant_quotes':
        session.significantQuotes = content;
        break;
      case 'narrative_summary':
        session.narrativeSummary = content;
        break;
    }
  }

  /**
   * Process a single session and store it in the database
   */
  private async processSingleSession(
    session: ParsedSession,
    therapistId: string,
    originalFileName: string
  ): Promise<void> {
    // Find or create client
    const client = await this.findOrCreateClient(session.clientName, therapistId);
    
    // Check if session note already exists for this date
    const existingNotes = await this.storage.getSessionNotesByClientId(client.id);
    const sessionDate = new Date(session.sessionDate);
    
    const existingNote = existingNotes.find(note => {
      const noteDate = new Date(note.createdAt);
      return (
        noteDate.getFullYear() === sessionDate.getFullYear() &&
        noteDate.getMonth() === sessionDate.getMonth() &&
        noteDate.getDate() === sessionDate.getDate()
      );
    });

    if (existingNote) {
      console.log(`Session note already exists for ${session.clientName} on ${session.sessionDate}`);
      return;
    }

    // Create structured session note content
    const sessionContent = this.formatSessionNote(session);
    
    // Create session note
    const sessionNote = await this.storage.createSessionNote({
      clientId: client.id,
      content: sessionContent,
      sessionDate: sessionDate,
      type: 'progress_note'
    });

    // Find appointment for this date and link if exists
    await this.linkSessionToAppointment(sessionNote.id, client.id, sessionDate);

    console.log(`Created session note for ${session.clientName} on ${session.sessionDate}`);
  }

  /**
   * Find existing client or create new one
   */
  private async findOrCreateClient(clientName: string, therapistId: string) {
    const nameParts = clientName.trim().split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || 'Client';

    // Try to find existing client
    const clients = await this.storage.getClients(therapistId);
    const existingClient = clients.find(client => 
      client.firstName.toLowerCase() === firstName.toLowerCase() &&
      client.lastName.toLowerCase() === lastName.toLowerCase()
    );

    if (existingClient) {
      return existingClient;
    }

    // Create new client
    return await this.storage.createClient({
      firstName,
      lastName,
      therapistId,
      status: 'active'
    });
  }

  /**
   * Format session note content in a structured way
   */
  private formatSessionNote(session: ParsedSession): string {
    let content = `# Session Notes - ${session.sessionDate}\n\n`;
    
    if (session.subjective) {
      content += `## Subjective\n${session.subjective}\n\n`;
    }
    
    if (session.objective) {
      content += `## Objective\n${session.objective}\n\n`;
    }
    
    if (session.assessment) {
      content += `## Assessment\n${session.assessment}\n\n`;
    }
    
    if (session.plan) {
      content += `## Plan\n${session.plan}\n\n`;
    }
    
    if (session.keyPoints) {
      content += `## Key Points\n${session.keyPoints}\n\n`;
    }
    
    if (session.significantQuotes) {
      content += `## Significant Quotes\n${session.significantQuotes}\n\n`;
    }
    
    if (session.narrativeSummary) {
      content += `## Narrative Summary\n${session.narrativeSummary}\n\n`;
    }
    
    if (session.supplementalAnalyses) {
      content += `## Supplemental Analyses\n${session.supplementalAnalyses}\n\n`;
    }
    
    return content;
  }

  /**
   * Link session note to appointment if one exists for the date
   */
  private async linkSessionToAppointment(
    sessionNoteId: string,
    clientId: string,
    sessionDate: Date
  ): Promise<void> {
    try {
      const appointments = await this.storage.getAppointmentsByClientId(clientId);
      
      // Find appointment on the same date
      const matchingAppointment = appointments.find(apt => {
        const aptDate = new Date(apt.startTime);
        return (
          aptDate.getFullYear() === sessionDate.getFullYear() &&
          aptDate.getMonth() === sessionDate.getMonth() &&
          aptDate.getDate() === sessionDate.getDate()
        );
      });

      if (matchingAppointment) {
        // Update session note with appointment reference
        await this.storage.updateSessionNote(sessionNoteId, {
          eventId: matchingAppointment.googleEventId || undefined
        });
        console.log(`Linked session note to appointment ${matchingAppointment.id}`);
      }
    } catch (error) {
      console.error('Failed to link session to appointment:', error);
    }
  }

  /**
   * Store the original document in the documents table
   */
  private async storeOriginalDocument(
    fileBuffer: Buffer,
    fileName: string,
    therapistId: string,
    sessions: ParsedSession[]
  ): Promise<void> {
    // Create a summary of sessions found
    const sessionSummary = sessions.map(s => 
      `${s.clientName}: ${s.sessionDate}`
    ).join(', ');

    await this.storage.createDocument({
      fileName: `processed_${fileName}`,
      originalName: fileName,
      fileType: fileName.toLowerCase().endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'text/plain',
      fileSize: fileBuffer.length,
      filePath: `/uploads/sessions/${fileName}`,
      therapistId,
      documentType: 'session_notes',
      description: `Session document containing ${sessions.length} sessions: ${sessionSummary}`,
      tags: {
        sessionsFound: sessions.length,
        sessionSummary,
        processedAt: new Date().toISOString()
      }
    });
  }
}