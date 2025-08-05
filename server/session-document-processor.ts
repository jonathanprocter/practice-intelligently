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
   * Parse sessions from document text - prioritize single comprehensive sessions
   */
  private parseSessionsFromText(text: string): ParsedSession[] {
    const sessions: ParsedSession[] = [];
    
    // First check if this is a single comprehensive session (most common case)
    const singleSession = this.tryParseSingleSession(text);
    if (singleSession) {
      sessions.push(singleSession);
      return sessions;
    }
    
    // Fall back to multi-session parsing
    return this.parseMultipleSessions(text);
  }

  /**
   * Try to parse as a single comprehensive session
   */
  private tryParseSingleSession(text: string): ParsedSession | null {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let clientName = '';
    let sessionDate = '';
    let currentSection = '';
    let currentContent = '';
    let session: Partial<ParsedSession> = { fullContent: text };
    
    // Look for client name and session date in the first few lines
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i];
      
      if (!clientName && this.isClientNameLine(line) && !this.isSessionDateLine(line)) {
        clientName = this.extractClientName(line);
        continue;
      }
      
      if (!sessionDate && this.isSessionDateLine(line)) {
        sessionDate = this.extractSessionDate(line);
        break;
      }
    }
    
    // Must have both client name and session date
    if (!clientName || !sessionDate) {
      return null;
    }
    
    session.clientName = clientName;
    session.sessionDate = sessionDate;
    
    // Parse content by sections
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip client name and date lines
      if (this.isClientNameLine(line) || this.isSessionDateLine(line)) {
        continue;
      }
      
      // Detect SOAP or supplemental sections
      if (this.isSoapSection(line) || this.isSupplementalSection(line)) {
        // Save previous section content
        if (currentSection && currentContent) {
          this.assignSectionContent(session, currentSection, currentContent.trim());
        }
        
        currentSection = this.isSoapSection(line) ? line.toLowerCase() : this.normalizeSupplementalSection(line);
        currentContent = '';
        continue;
      }
      
      // Add line to current content
      if (line.length > 0) {
        currentContent += line + '\n';
      }
    }
    
    // Save the last section
    if (currentSection && currentContent) {
      this.assignSectionContent(session, currentSection, currentContent.trim());
    }
    
    // Validate the session
    try {
      return ParsedSessionSchema.parse(session);
    } catch (error) {
      console.error('Single session validation failed:', error, session);
      return null;
    }
  }

  /**
   * Parse multiple sessions from document text (fallback method)
   */
  private parseMultipleSessions(text: string): ParsedSession[] {
    const sessions: ParsedSession[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentSession: Partial<ParsedSession> = {};
    let currentSection = '';
    let currentContent = '';
    let clientName = '';
    let sessionCount = 0;
    
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
        sessionCount++;
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
    const cleanLine = line.trim().toLowerCase();
    
    // Must be reasonable length for a name
    if (line.length < 2 || line.length > 50) return false;
    
    // Must only contain letters and spaces
    if (!/^[A-Za-z\s]+$/.test(line)) return false;
    
    // Must have 1-3 words (first name, optional middle, last name)
    const words = line.trim().split(/\s+/);
    if (words.length < 1 || words.length > 3) return false;
    
    // Exclude common section headers and therapy terms
    const excludedTerms = [
      'session', 'subjective', 'objective', 'assessment', 'plan',
      'supplemental', 'analyses', 'analysis', 'tonal', 'thematic',
      'comprehensive', 'narrative', 'summary', 'key', 'points',
      'significant', 'quotes', 'homework', 'next', 'notes',
      'progress', 'therapy', 'client', 'patient', 'theme', 'shift'
    ];
    
    if (excludedTerms.some(term => cleanLine.includes(term))) return false;
    
    // Exclude if it's a SOAP section
    if (this.isSoapSection(line)) return false;
    
    // Exclude if it's a session date line
    if (this.isSessionDateLine(line)) return false;
    
    // Exclude if it's a supplemental section
    if (this.isSupplementalSection(line)) return false;
    
    return true;
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
    // Filter out invalid client names (section headers, common words, etc.)
    const invalidNames = [
      'comprehensive', 'narrative', 'summary', 'session', 'subjective', 'objective', 
      'assessment', 'plan', 'key', 'points', 'significant', 'quotes', 'supplemental',
      'analyses', 'tonal', 'analysis', 'thematic', 'theme', 'shift', 'homework',
      'next', 'notes', 'progress', 'therapy', 'client', 'patient'
    ];
    
    const cleanName = clientName.trim().toLowerCase();
    
    // Skip if it's likely not a real client name
    if (invalidNames.some(invalid => cleanName.includes(invalid)) || 
        cleanName.length < 2 || 
        /\d/.test(cleanName) || // contains numbers
        cleanName.split(' ').length > 3) { // too many words
      throw new Error(`Invalid client name detected: ${clientName}`);
    }

    const nameParts = clientName.trim().split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || 'Client';

    // Try to find existing client with fuzzy matching
    const clients = await this.storage.getClients(therapistId);
    const existingClient = clients.find(client => {
      const firstMatch = client.firstName.toLowerCase() === firstName.toLowerCase();
      const lastMatch = client.lastName.toLowerCase() === lastName.toLowerCase();
      
      // Also check for partial matches
      const firstPartial = client.firstName.toLowerCase().includes(firstName.toLowerCase()) ||
                          firstName.toLowerCase().includes(client.firstName.toLowerCase());
      const lastPartial = client.lastName.toLowerCase().includes(lastName.toLowerCase()) ||
                         lastName.toLowerCase().includes(client.lastName.toLowerCase());
      
      return (firstMatch && lastMatch) || (firstPartial && lastPartial);
    });

    if (existingClient) {
      console.log(`Found existing client: ${existingClient.firstName} ${existingClient.lastName} for search: ${clientName}`);
      return existingClient;
    }

    // Create new client only if name seems valid
    console.log(`Creating new client: ${firstName} ${lastName}`);
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