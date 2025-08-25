import mammoth from 'mammoth';
import OpenAI from 'openai';
import { storage } from './storage';
import { insertProgressNoteSchema } from '../shared/schema';
import { z } from 'zod';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExtractedClient {
  name: string;
  firstName: string;
  lastName: string;
  sessions: ExtractedSession[];
}

interface ExtractedSession {
  sessionNumber: number;
  sessionDate: string;
  content: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  tonalAnalysis?: string;
  keyPoints: string[];
  significantQuotes: string[];
  narrativeSummary: string;
}

interface ProcessingResult {
  totalClients: number;
  totalSessions: number;
  successfulMatches: number;
  unmatchedClients: string[];
  createdProgressNotes: number;
  errors: string[];
  processingDetails: {
    clients: ExtractedClient[];
    matchedClients: Array<{
      extractedClient: ExtractedClient;
      matchedClientId: string;
      matchedClientName: string;
      sessionsProcessed: number;
    }>;
  };
}

export class ComprehensiveProgressNotesParser {
  
  async parseComprehensiveDocument(filePath: string, therapistId: string): Promise<ProcessingResult> {
    try {
      console.log(`Starting comprehensive progress notes parsing for therapist: ${therapistId}`);
      
      // Extract text from DOCX
      const extractedText = await this.extractDocxContent(filePath);
      
      // Parse the document structure to extract clients and sessions
      const clients = await this.parseDocumentStructure(extractedText);
      
      // Match clients with existing database records
      const matchingResults = await this.matchClientsWithDatabase(clients, therapistId);
      
      // Create progress notes for matched clients
      const creationResults = await this.createProgressNotesForClients(
        matchingResults.matchedClients, 
        therapistId
      );
      
      return {
        totalClients: clients.length,
        totalSessions: clients.reduce((sum, client) => sum + client.sessions.length, 0),
        successfulMatches: matchingResults.successfulMatches,
        unmatchedClients: matchingResults.unmatchedClients,
        createdProgressNotes: creationResults.createdCount,
        errors: [...matchingResults.errors, ...creationResults.errors],
        processingDetails: {
          clients,
          matchedClients: matchingResults.matchedClients
        }
      };
      
    } catch (error) {
      console.error('Error in comprehensive progress notes parsing:', error);
      throw new Error(`Failed to parse comprehensive progress notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractDocxContent(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      console.error('Error extracting DOCX content:', error);
      throw new Error(`Failed to extract DOCX content: ${error.message}`);
    }
  }

  private async parseDocumentStructure(text: string): Promise<ExtractedClient[]> {
    try {
      const prompt = `
You are an expert clinical document parser. Parse this comprehensive progress notes document and extract structured information about each client and their sessions.

The document contains multiple clients, each with multiple therapy sessions. Each client section typically includes:
- Client name (like "Amberly Comeau", "Nancy Grossman", etc.)
- Multiple sessions with dates (like "Session 1: 2025-07-07", "Session 2: 2025-07-14")
- Each session contains clinical notes with sections like Subjective, Objective, Assessment, Plan

Parse this document and return a JSON array with the following structure:

[
  {
    "name": "Full Client Name",
    "firstName": "First",
    "lastName": "Last", 
    "sessions": [
      {
        "sessionNumber": 1,
        "sessionDate": "2025-07-07",
        "content": "Full session content text",
        "subjective": "Subjective section content (what client reports)",
        "objective": "Objective section content (therapist observations)",
        "assessment": "Assessment section content (clinical analysis)",
        "plan": "Plan section content (treatment plans and next steps)",
        "keyPoints": ["key point 1", "key point 2", "key point 3"],
        "significantQuotes": ["important quote 1", "important quote 2"],
        "narrativeSummary": "Brief summary of this session"
      }
    ]
  }
]

Guidelines:
1. Extract ALL clients and ALL their sessions from the document
2. For dates, convert to YYYY-MM-DD format
3. Split client names into firstName and lastName
4. Extract complete session content for each session
5. If SOAP structure isn't clear, infer the sections from content
6. Key points should be 3-5 most important therapeutic insights
7. Significant quotes should be impactful client statements
8. Narrative summary should be 1-2 sentences capturing session essence

Document text:
${text}

Return only valid JSON with no additional text.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a clinical document parser expert. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 16000,
        response_format: { type: "json_object" }
      });

      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from AI parser');
      }

      // Handle both array and object responses
      let parsedResult;
      try {
        parsedResult = JSON.parse(responseText);
        
        // If the response is wrapped in an object with a "clients" property, extract it
        if (parsedResult.clients && Array.isArray(parsedResult.clients)) {
          parsedResult = parsedResult.clients;
        }
        
        // If it's not an array, make it one
        if (!Array.isArray(parsedResult)) {
          throw new Error('Response is not an array of clients');
        }
        
        return parsedResult as ExtractedClient[];
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        console.error('Raw response:', responseText);
        throw new Error('Failed to parse AI response as valid JSON');
      }

    } catch (error) {
      console.error('Error parsing document structure:', error);
      throw new Error(`Failed to parse document structure: ${error.message}`);
    }
  }

  private async matchClientsWithDatabase(
    extractedClients: ExtractedClient[], 
    therapistId: string
  ): Promise<{
    matchedClients: Array<{
      extractedClient: ExtractedClient;
      matchedClientId: string;
      matchedClientName: string;
      sessionsProcessed: number;
    }>;
    successfulMatches: number;
    unmatchedClients: string[];
    errors: string[];
  }> {
    const matchedClients = [];
    const unmatchedClients = [];
    const errors: string[] = [];

    try {
      // Get all clients for this therapist
      const existingClients = await storage.getClients(therapistId);
      console.log(`🔍 Matching ${extractedClients.length} extracted clients against ${existingClients.length} database clients`);
      
      for (const extractedClient of extractedClients) {
        let bestMatch = null;
        let bestScore = 0;
        let matchType = '';

        console.log(`\n🔍 Matching client: "${extractedClient.name}"`);

        // Normalize extracted name for better matching
        const normalizedExtractedName = this.normalizeName(extractedClient.name);
        const extractedParts = normalizedExtractedName.split(' ');
        const extractedFirstName = extractedParts[0]?.toLowerCase() || '';
        const extractedLastName = extractedParts[extractedParts.length - 1]?.toLowerCase() || '';

        console.log(`   Normalized: "${normalizedExtractedName}" (First: "${extractedFirstName}", Last: "${extractedLastName}")`);

        // Try to match by exact name, fuzzy name, or name components
        for (const existingClient of existingClients) {
          const existingFullName = `${existingClient.firstName} ${existingClient.lastName}`.toLowerCase();
          const existingFirstName = existingClient.firstName.toLowerCase();
          const existingLastName = existingClient.lastName.toLowerCase();
          
          console.log(`   Comparing with: "${existingFullName}"`);

          // 1. Exact full name match
          if (existingFullName === normalizedExtractedName.toLowerCase()) {
            bestMatch = existingClient;
            bestScore = 1.0;
            matchType = 'exact_full';
            console.log(`   ✅ Exact full name match!`);
            break;
          }

          // 2. Exact last name + first name match
          if (existingLastName === extractedLastName && existingFirstName === extractedFirstName) {
            bestMatch = existingClient;
            bestScore = 0.95;
            matchType = 'exact_parts';
            console.log(`   ✅ Exact first+last name match!`);
            break;
          }

          // 3. Exact last name + fuzzy first name
          if (existingLastName === extractedLastName) {
            const firstNameSimilarity = this.calculateStringSimilarity(existingFirstName, extractedFirstName);
            console.log(`   📊 Last name match, first name similarity: ${firstNameSimilarity}`);
            
            if (firstNameSimilarity > 0.7 && firstNameSimilarity > bestScore) {
              bestMatch = existingClient;
              bestScore = firstNameSimilarity;
              matchType = 'last_exact_first_fuzzy';
            }
          }

          // 4. Fuzzy full name match
          const fullNameSimilarity = this.calculateStringSimilarity(existingFullName, normalizedExtractedName.toLowerCase());
          console.log(`   📊 Full name similarity: ${fullNameSimilarity}`);
          
          if (fullNameSimilarity > 0.8 && fullNameSimilarity > bestScore) {
            bestMatch = existingClient;
            bestScore = fullNameSimilarity;
            matchType = 'fuzzy_full';
          }

          // 5. Check for name variations (nickname matching)
          if (this.areNamesVariations(extractedFirstName, existingFirstName) && extractedLastName === existingLastName) {
            if (0.85 > bestScore) {
              bestMatch = existingClient;
              bestScore = 0.85;
              matchType = 'nickname_variation';
              console.log(`   ✅ Nickname variation match!`);
            }
          }
        }

        if (bestMatch && bestScore > 0.7) {
          console.log(`   ✅ MATCHED: "${extractedClient.name}" → "${bestMatch.firstName} ${bestMatch.lastName}" (Score: ${bestScore}, Type: ${matchType})`);
          matchedClients.push({
            extractedClient,
            matchedClientId: bestMatch.id,
            matchedClientName: `${bestMatch.firstName} ${bestMatch.lastName}`,
            sessionsProcessed: extractedClient.sessions.length
          });
        } else {
          console.log(`   ❌ NO MATCH: "${extractedClient.name}" (Best score: ${bestScore})`);
          unmatchedClients.push(extractedClient.name);
        }
      }

      console.log(`\n📊 Matching Summary: ${matchedClients.length} matched, ${unmatchedClients.length} unmatched`);

      return {
        matchedClients,
        successfulMatches: matchedClients.length,
        unmatchedClients,
        errors
      };

    } catch (error) {
      console.error('Error matching clients with database:', error);
      return {
        matchedClients: [],
        successfulMatches: 0,
        unmatchedClients: extractedClients.map(c => c.name),
        errors: [`Database matching error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private normalizeName(name: string): string {
    return name
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .replace(/\b\w/g, l => l.toUpperCase()); // Title case
  }

  private areNamesVariations(name1: string, name2: string): boolean {
    const nicknames: { [key: string]: string[] } = {
      'angelica': ['angie', 'angel', 'angela'],
      'angelita': ['angie', 'angel', 'angelica'],
      'angela': ['angie', 'angel', 'angelica'],
      'elizabeth': ['liz', 'beth', 'betty', 'eliza'],
      'katherine': ['kate', 'kathy', 'katie', 'kat'],
      'catherine': ['kate', 'cathy', 'katie', 'cat'],
      'christopher': ['chris', 'christie'],
      'anthony': ['tony', 'ant'],
      'robert': ['rob', 'bob', 'bobby'],
      'william': ['will', 'bill', 'billy'],
      'michael': ['mike', 'mick'],
      'richard': ['rick', 'rich', 'dick'],
      'joseph': ['joe', 'joey'],
      'david': ['dave', 'davey'],
      'james': ['jim', 'jimmy', 'jamie'],
      'daniel': ['dan', 'danny'],
      'matthew': ['matt', 'matty'],
      'jennifer': ['jen', 'jenny', 'jenn'],
      'jessica': ['jess', 'jessie'],
      'amanda': ['mandy', 'amy'],
      'stephanie': ['steph', 'steffi']
    };

    const n1 = name1.toLowerCase();
    const n2 = name2.toLowerCase();

    // Check if one is a nickname of the other
    for (const [fullName, nicks] of Object.entries(nicknames)) {
      if ((n1 === fullName && nicks.includes(n2)) || 
          (n2 === fullName && nicks.includes(n1)) ||
          (nicks.includes(n1) && nicks.includes(n2))) {
        return true;
      }
    }

    return false;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
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

  private async createProgressNotesForClients(
    matchedClients: Array<{
      extractedClient: ExtractedClient;
      matchedClientId: string;
      matchedClientName: string;
      sessionsProcessed: number;
    }>,
    therapistId: string
  ): Promise<{
    createdCount: number;
    errors: string[];
  }> {
    let createdCount = 0;
    const errors = [];

    for (const match of matchedClients) {
      try {
        for (const session of match.extractedClient.sessions) {
          // Generate enhanced session analysis
          const enhancedAnalysis = await this.enhanceSessionWithAI(session, match.matchedClientName);
          
          const progressNoteData = {
            clientId: match.matchedClientId,
            therapistId: therapistId,
            title: `Session ${session.sessionNumber} - ${match.matchedClientName} (${session.sessionDate})`,
            subjective: session.subjective || enhancedAnalysis.subjective,
            objective: session.objective || enhancedAnalysis.objective,
            assessment: session.assessment || enhancedAnalysis.assessment,
            plan: session.plan || enhancedAnalysis.plan,
            tonalAnalysis: enhancedAnalysis.tonalAnalysis || 'Standard therapeutic tone observed',
            keyPoints: session.keyPoints || enhancedAnalysis.keyPoints || [],
            significantQuotes: session.significantQuotes || enhancedAnalysis.significantQuotes || [],
            narrativeSummary: session.narrativeSummary || enhancedAnalysis.narrativeSummary,
            aiTags: enhancedAnalysis.aiTags || ['therapy', 'session'],
            sessionDate: new Date(session.sessionDate),
          };

          // Validate the data
          const validatedData = insertProgressNoteSchema.parse(progressNoteData);
          
          // Create the progress note
          await storage.createProgressNote(validatedData);
          createdCount++;
          
          console.log(`Created progress note for ${match.matchedClientName} - Session ${session.sessionNumber}`);
        }
      } catch (error) {
        console.error(`Error creating progress notes for ${match.matchedClientName}:`, error);
        errors.push(`Failed to create progress notes for ${match.matchedClientName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { createdCount, errors };
  }

  private async enhanceSessionWithAI(session: ExtractedSession, clientName: string): Promise<{
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    tonalAnalysis: string;
    keyPoints: string[];
    significantQuotes: string[];
    narrativeSummary: string;
    aiTags: string[];
  }> {
    try {
      const prompt = `
You are an expert clinical psychologist. Analyze this therapy session and provide enhanced clinical documentation.

Client: ${clientName}
Session Date: ${session.sessionDate}
Session Content: ${session.content}

Provide a JSON response with:
{
  "subjective": "What the client reported (symptoms, feelings, experiences)",
  "objective": "Your clinical observations (behavior, appearance, mood)",
  "assessment": "Clinical analysis and diagnostic impressions",
  "plan": "Treatment recommendations and next steps",
  "tonalAnalysis": "Analysis of emotional tone and therapeutic dynamics",
  "keyPoints": ["3-5 most important clinical insights"],
  "significantQuotes": ["2-3 most impactful client statements"],
  "narrativeSummary": "2-3 sentence session summary",
  "aiTags": ["relevant clinical tags like CBT, anxiety, depression, progress, etc."]
}

Be professional, precise, and clinically appropriate.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a clinical psychologist expert at analyzing therapy sessions. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const analysisText = response.choices[0]?.message?.content;
      if (!analysisText) {
        throw new Error('No AI analysis received');
      }

      return JSON.parse(analysisText);

    } catch (error) {
      console.error('Error enhancing session with AI:', error);
      // Return basic structure if AI enhancement fails
      return {
        subjective: session.subjective || session.content.substring(0, 500),
        objective: session.objective || 'Client appeared engaged in session.',
        assessment: session.assessment || 'Continued therapeutic work indicated.',
        plan: session.plan || 'Continue with current treatment approach.',
        tonalAnalysis: 'Unable to analyze tone at this time.',
        keyPoints: session.keyPoints || ['Session completed', 'Client participated'],
        significantQuotes: session.significantQuotes || [],
        narrativeSummary: session.narrativeSummary || 'Therapeutic session completed.',
        aiTags: ['therapy', 'session-note']
      };
    }
  }

  async generateProcessingSummary(result: ProcessingResult): Promise<string> {
    return `
Comprehensive Progress Notes Processing Complete

📊 Summary:
• Total Clients Found: ${result.totalClients}
• Total Sessions Found: ${result.totalSessions}
• Successfully Matched: ${result.successfulMatches} clients
• Progress Notes Created: ${result.createdProgressNotes}

✅ Matched Clients:
${result.processingDetails.matchedClients.map(match => 
  `• ${match.extractedName} → ${match.matchedClientName} (${match.sessionsProcessed} sessions)`
).join('\n')}

${result.unmatchedClients.length > 0 ? `
⚠️ Unmatched Clients:
${result.unmatchedClients.map(name => `• ${name}`).join('\n')}
` : ''}

${result.errors.length > 0 ? `
❌ Errors:
${result.errors.map(error => `• ${error}`).join('\n')}
` : ''}

The progress notes have been automatically synced to your client database and are available in each client's session history.
    `.trim();
  }
}

export const comprehensiveProgressNotesParser = new ComprehensiveProgressNotesParser();