import OpenAI from 'openai';
import * as fs from 'fs';
import { storage } from './storage';
import { extractTextFromFile } from './documentProcessor';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExtractedSession {
  sessionNumber: number;
  sessionDate: string;
  content: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  keyPoints: string[];
  significantQuotes: string[];
  narrativeSummary: string;
}

interface ExtractedClient {
  name: string;
  firstName: string;
  lastName: string;
  sessions: ExtractedSession[];
}

interface ClientMatch {
  extractedClient: ExtractedClient;
  matchedDbClient?: any;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'none';
}

interface ProcessingResult {
  totalClients: number;
  totalSessions: number;
  successfulMatches: number;
  createdProgressNotes: number;
  processingDetails: ClientMatch[];
  errors: string[];
}

export class OptimizedComprehensiveProgressNotesParser {
  
  async parseComprehensiveDocument(filePath: string, therapistId: string): Promise<ProcessingResult> {
    try {
      console.log('Starting optimized comprehensive document parsing...');
      
      // Extract text from document
      const text = await this.extractTextFromDocument(filePath);
      console.log(`Extracted text: ${text.length} characters`);
      
      // Parse document structure with chunking strategy
      const extractedClients = await this.parseDocumentStructureOptimized(text);
      console.log(`Extracted ${extractedClients.length} clients with ${extractedClients.reduce((sum, client) => sum + client.sessions.length, 0)} total sessions`);
      
      // Match clients with database
      const clientMatches = await this.matchClientsWithDatabase(extractedClients, therapistId);
      
      // Create progress notes for matched clients
      const createdProgressNotes = await this.createProgressNotesForMatches(clientMatches, therapistId);
      
      return {
        totalClients: extractedClients.length,
        totalSessions: extractedClients.reduce((sum, client) => sum + client.sessions.length, 0),
        successfulMatches: clientMatches.filter(match => match.matchedDbClient).length,
        createdProgressNotes,
        processingDetails: clientMatches,
        errors: []
      };
      
    } catch (error: any) {
      console.error('Error in parseComprehensiveDocument:', error);
      throw new Error(`Failed to parse comprehensive progress notes: ${error?.message || 'Unknown error'}`);
    }
  }

  private async extractTextFromDocument(filePath: string): Promise<string> {
    try {
      // Use the existing documentProcessor which already handles PDF, DOCX, TXT, etc.
      const extractedText = await extractTextFromFile(filePath);
      return extractedText;
    } catch (error) {
      console.error('Error extracting text from document:', error);
      throw new Error(`Failed to extract text from document: ${(error as Error)?.message || 'Unknown error'}`);
    }
  }

  private async parseDocumentStructureOptimized(text: string): Promise<ExtractedClient[]> {
    try {
      console.log('Using optimized parsing strategy...');
      
      // Step 1: Extract client index to identify all clients
      const clientList = this.extractClientIndex(text);
      console.log(`Found ${clientList.length} clients in index`);
      
      if (clientList.length === 0) {
        // Fallback to chunked parsing if no index found
        return await this.parseInSmartChunks(text);
      }
      
      // Step 2: Parse each client individually to avoid token limits
      const allClients: ExtractedClient[] = [];
      
      for (const clientInfo of clientList) {
        try {
          console.log(`Parsing sessions for ${clientInfo.name}...`);
          
          // Extract client's section from document
          const clientSection = this.extractClientSection(text, clientInfo.name);
          
          if (clientSection) {
            const parsedClient = await this.parseClientSessionsOptimized(clientInfo, clientSection);
            if (parsedClient && parsedClient.sessions.length > 0) {
              allClients.push(parsedClient);
              console.log(`✓ Parsed ${parsedClient.sessions.length} sessions for ${clientInfo.name}`);
            }
          }
        } catch (clientError) {
          console.error(`Error parsing client ${clientInfo.name}:`, clientError);
          // Continue with other clients
        }
      }
      
      return allClients;
      
    } catch (error: any) {
      console.error('Error in optimized parsing:', error);
      throw new Error(`Failed to parse document structure: ${error?.message || 'Unknown error'}`);
    }
  }

  private extractClientIndex(text: string): Array<{name: string, firstName: string, lastName: string, expectedSessions: number}> {
    const clientList = [];
    
    // First, look for comprehensive document with client index section
    const indexMatch = text.match(/Client Index([\s\S]*?)(?=\n\n[A-Z]|\n\n\w+\s+\w+\n|$)/i);
    
    if (indexMatch) {
      const indexText = indexMatch[1];
      
      // Extract client names and session counts
      const clientRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*\((\d+)\s+sessions?\)/g;
      let match;
      
      while ((match = clientRegex.exec(indexText)) !== null) {
        const [, name, sessionCount] = match;
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        
        clientList.push({
          name: name.trim(),
          firstName,
          lastName,
          expectedSessions: parseInt(sessionCount)
        });
      }
    } else {
      // If no client index found, try to extract client name from document title/filename patterns
      // Look for patterns like "Vivian Meador Appointment" or client names in content
      const namePatterns = [
        // Pattern 1: Client Name followed by "Appointment" 
        /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+Appointment/i,
        // Pattern 2: "Client:" followed by name
        /Client:\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
        // Pattern 3: "Patient:" followed by name
        /Patient:\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
        // Pattern 4: Look for names in first line or title
        /^([A-Z][a-z]+\s+[A-Z][a-z]+)/i
      ];
      
      for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match) {
          const name = match[1].trim();
          const nameParts = name.split(/\s+/);
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');
          
          clientList.push({
            name,
            firstName,
            lastName,
            expectedSessions: 1 // Assume single session document
          });
          break; // Only take the first match to avoid duplicates
        }
      }
    }
    
    return clientList;
  }

  private extractClientSection(text: string, clientName: string): string | null {
    // For comprehensive documents, find the client's section 
    const clientSectionRegex = new RegExp(
      `${clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n[\\s\\S]*?(?=\\n\\n[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*\\s*\\n|$)`, 
      'i'
    );
    
    const match = text.match(clientSectionRegex);
    if (match) {
      return match[0];
    }
    
    // For individual session documents, return the entire document if client name is found
    if (text.toLowerCase().includes(clientName.toLowerCase())) {
      return text;
    }
    
    return null;
  }

  private async parseClientSessionsOptimized(clientInfo: any, clientSection: string): Promise<ExtractedClient | null> {
    try {
      // Truncate if too long to stay within token limits
      const maxLength = 20000;
      const truncatedSection = clientSection.length > maxLength 
        ? clientSection.substring(0, maxLength) + '...[content truncated for processing]'
        : clientSection;
      
      const prompt = `
Extract therapy sessions for client: "${clientInfo.name}"

Parse the sessions and return JSON in this format:
{
  "name": "${clientInfo.name}",
  "firstName": "${clientInfo.firstName}",
  "lastName": "${clientInfo.lastName}",
  "sessions": [
    {
      "sessionNumber": 1,
      "sessionDate": "2025-07-07",
      "content": "Full session content",
      "subjective": "What client reported",
      "objective": "Therapist observations", 
      "assessment": "Clinical analysis",
      "plan": "Treatment plans",
      "keyPoints": ["key insight 1", "key insight 2"],
      "significantQuotes": ["important quote"],
      "narrativeSummary": "Brief session summary"
    }
  ]
}

Extract ALL sessions for this client. Use YYYY-MM-DD date format.

Client text:
${truncatedSection}
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a clinical document parser. Return only valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 6000,
        response_format: { type: "json_object" }
      });

      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        return null;
      }

      const parsedResult = JSON.parse(responseText);
      return parsedResult as ExtractedClient;

    } catch (error) {
      console.error(`Error parsing sessions for ${clientInfo.name}:`, error);
      return null;
    }
  }

  private async parseInSmartChunks(text: string): Promise<ExtractedClient[]> {
    console.log('Using smart chunk parsing strategy...');
    
    // Split by client sections if possible
    const clientSections = text.split(/\n\n(?=[A-Z][a-z]+\s+[A-Z][a-z]+\s*\n)/);
    console.log(`Split into ${clientSections.length} potential client sections`);
    
    const allClients: ExtractedClient[] = [];
    
    for (let i = 0; i < clientSections.length; i++) {
      const section = clientSections[i];
      
      // Skip if section is too small or doesn't look like a client section
      if (section.length < 500 || !section.match(/Session \d+:/)) {
        continue;
      }
      
      try {
        console.log(`Processing section ${i + 1}/${clientSections.length}...`);
        
        const prompt = `
Parse this client section and extract the client name and sessions.

Return JSON:
{
  "name": "Full Client Name",
  "firstName": "First",
  "lastName": "Last",
  "sessions": [
    {
      "sessionNumber": 1,
      "sessionDate": "2025-07-07",
      "content": "Session content",
      "narrativeSummary": "Brief summary"
    }
  ]
}

Section text (first 15000 chars):
${section.substring(0, 15000)}
        `;

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "Parse clinical documents. Return only valid JSON."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 3000,
          response_format: { type: "json_object" }
        });

        const responseText = response.choices[0]?.message?.content;
        if (responseText) {
          const parsed = JSON.parse(responseText);
          if (parsed.sessions && parsed.sessions.length > 0) {
            allClients.push(parsed);
          }
        }
      } catch (sectionError) {
        console.error(`Error processing section ${i + 1}:`, sectionError);
        // Continue with other sections
      }
    }
    
    return allClients;
  }

  private async matchClientsWithDatabase(extractedClients: ExtractedClient[], therapistId: string): Promise<ClientMatch[]> {
    const dbClients = await storage.getClients(therapistId);
    const matches: ClientMatch[] = [];
    
    for (const extractedClient of extractedClients) {
      let bestMatch = null;
      let bestConfidence = 0;
      let matchType: 'exact' | 'fuzzy' | 'none' = 'none';
      
      for (const dbClient of dbClients) {
        const dbFullName = `${dbClient.firstName} ${dbClient.lastName}`.toLowerCase();
        const extractedFullName = extractedClient.name.toLowerCase();
        
        // Exact match
        if (dbFullName === extractedFullName) {
          bestMatch = dbClient;
          bestConfidence = 1.0;
          matchType = 'exact';
          break;
        }
        
        // Fuzzy match using simple similarity
        const similarity = this.calculateSimilarity(dbFullName, extractedFullName);
        if (similarity > 0.8 && similarity > bestConfidence) {
          bestMatch = dbClient;
          bestConfidence = similarity;
          matchType = 'fuzzy';
        }
      }
      
      matches.push({
        extractedClient,
        matchedDbClient: bestMatch,
        confidence: bestConfidence,
        matchType
      });
    }
    
    return matches;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private async createProgressNotesForMatches(matches: ClientMatch[], therapistId: string): Promise<number> {
    let createdCount = 0;
    
    for (const match of matches) {
      if (!match.matchedDbClient) continue;
      
      for (const session of match.extractedClient.sessions) {
        try {
          const progressNote = {
            id: `pn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            clientId: match.matchedDbClient.id,
            therapistId,
            title: `Session ${session.sessionNumber} - ${session.sessionDate}`,
            sessionDate: new Date(session.sessionDate),
            sessionType: 'Individual Therapy',
            duration: 50,
            content: session.content,
            subjective: session.subjective || '',
            objective: session.objective || '',
            assessment: session.assessment || '',
            plan: session.plan || '',
            tonalAnalysis: 'Comprehensive progress note analysis',
            keyPoints: session.keyPoints || [],
            significantQuotes: session.significantQuotes || [],
            narrativeSummary: session.narrativeSummary || '',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          await storage.createProgressNote(progressNote);
          createdCount++;
          
        } catch (error) {
          console.error(`Error creating progress note for ${match.extractedClient.name}:`, error);
        }
      }
    }
    
    return createdCount;
  }

  async generateProcessingSummary(result: ProcessingResult): Promise<string> {
    const successful = result.successfulMatches;
    const total = result.totalClients;
    const sessions = result.totalSessions;
    
    return `
Processed comprehensive progress notes successfully:
- ${total} clients found in document
- ${sessions} total therapy sessions extracted
- ${successful} clients matched with database (${Math.round((successful/total) * 100)}% match rate)
- ${result.createdProgressNotes} progress notes created

Matching Details:
${result.processingDetails.map(match => 
  `• ${match.extractedClient.name}: ${match.matchType} match (${Math.round(match.confidence * 100)}% confidence) - ${match.extractedClient.sessions.length} sessions`
).join('\n')}
    `.trim();
  }
}

export const optimizedComprehensiveProgressNotesParser = new OptimizedComprehensiveProgressNotesParser();