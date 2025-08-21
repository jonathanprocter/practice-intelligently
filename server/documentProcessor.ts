import fetch from 'node-fetch';
import OpenAI from 'openai';
import fs from 'fs/promises';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface DocumentAnalysis {
  content: string;
  extractedDate?: string;
  suggestedAppointments: Array<{
    id: string;
    title: string;
    date: string;
    confidence: number;
  }>;
  aiTags: string[];
  sessionType?: string;
  keyTopics: string[];
  mood?: string;
  progressIndicators?: string[];
}

// Utility function to extract text from various file types
export async function extractTextFromFile(filePath: string): Promise<string> {
  const fileExtension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
  
  try {
    if (fileExtension === '.pdf') {
      // Use pdftotext (from poppler-utils) for proper PDF text extraction
      try {
        const { execFile } = await import('child_process');
        const { promisify } = await import('util');
        const execFileAsync = promisify(execFile);
        
        // Use pdftotext to extract text from PDF
        const { stdout, stderr } = await execFileAsync('pdftotext', [filePath, '-']);
        
        if (stdout && stdout.trim().length > 10) {
          console.log(`Successfully extracted ${stdout.length} characters from PDF`);
          return stdout.trim();
        } else {
          throw new Error(`PDF text extraction returned empty content: ${stderr || 'Unknown error'}`);
        }
      } catch (error) {
        // Fallback to trying to read as text if pdftotext fails
        console.log('pdftotext not available, trying fallback method');
        const buffer = await fs.readFile(filePath);
        const textContent = buffer.toString('utf-8');
        
        // Remove PDF metadata and extract readable text
        const lines = textContent.split('\n');
        const textLines = lines.filter(line => {
          // Filter out PDF metadata lines
          return !line.startsWith('%') && 
                 !line.includes('obj') && 
                 !line.includes('endobj') && 
                 !line.includes('<<') && 
                 !line.includes('>>') && 
                 line.trim().length > 0 &&
                 !/^\d+\s+\d+\s+R/.test(line) &&
                 !line.includes('/Type') &&
                 !line.includes('/Creator') &&
                 !line.includes('/Producer');
        });
        
        const extractedText = textLines.join('\n').trim();
        if (extractedText.length > 50) {
          return extractedText;
        }
        
        throw new Error('No readable text content found in PDF');
      }
    } else if (fileExtension === '.docx') {
      // Multiple fallback strategies for DOCX extraction
      try {
        // First try: Mammoth (primary method)
        const mammoth = await import('mammoth');
        const fileBuffer = await fs.readFile(filePath);
        
        // Validate buffer is not empty
        if (!fileBuffer || fileBuffer.length === 0) {
          throw new Error('DOCX file appears to be empty or corrupted');
        }
        
        console.log(`Processing DOCX file of size: ${fileBuffer.length} bytes`);
        
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        
        if (result.value && result.value.trim().length > 0) {
          console.log(`Successfully extracted ${result.value.length} characters from DOCX`);
          return result.value.trim();
        } else {
          throw new Error('Mammoth extraction returned empty content');
        }
      } catch (mammothError) {
        console.warn('Mammoth DOCX extraction failed, trying alternative methods:', mammothError.message);
        
        try {
          // Fallback 1: Try reading as ZIP and extracting document.xml
          const AdmZip = await import('adm-zip');
          const zip = new AdmZip.default(filePath);
          const documentEntry = zip.getEntry('word/document.xml');
          
          if (documentEntry) {
            const documentXml = documentEntry.getData().toString('utf8');
            // Basic XML text extraction - remove tags and get text content
            const textContent = documentXml
              .replace(/<[^>]*>/g, ' ')  // Remove all XML tags
              .replace(/\s+/g, ' ')       // Normalize whitespace
              .trim();
            
            if (textContent.length > 0) {
              console.log(`Successfully extracted ${textContent.length} characters from DOCX via ZIP method`);
              return textContent;
            }
          }
          
          throw new Error('Could not extract document.xml from DOCX');
        } catch (zipError) {
          console.warn('ZIP extraction method failed:', zipError.message);
          
          // Fallback 2: Try reading as plain text (last resort)
          try {
            const fileBuffer = await fs.readFile(filePath);
            const textContent = fileBuffer.toString('utf-8');
            
            // Look for readable text patterns in the binary data
            const readableText = textContent
              .replace(/[^\x20-\x7E\n\r\t]/g, ' ')  // Keep only printable ASCII + whitespace
              .replace(/\s+/g, ' ')                   // Normalize whitespace
              .trim();
            
            if (readableText.length > 100) {  // Require reasonable amount of text
              console.log(`Extracted ${readableText.length} characters from DOCX as plain text`);
              return readableText;
            }
            
            throw new Error('No readable text found in DOCX file');
          } catch (textError) {
            throw new Error(`All DOCX extraction methods failed. Original error: ${mammothError.message}`);
          }
        }
      }
    } else if (['.txt', '.md'].includes(fileExtension)) {
      return await fs.readFile(filePath, 'utf-8');
    } else if (fileExtension === '.doc') {
      // Basic support for .doc files
      return await fs.readFile(filePath, 'utf-8');
    } else {
      throw new Error(`Unsupported file format: ${fileExtension}`);
    }
  } catch (error) {
    console.error(`Error extracting text from ${fileExtension} file:`, error);
    throw new Error(`Failed to extract text from ${fileExtension} file: ${(error as Error)?.message || 'Unknown error'}`);
  }
}

export class DocumentProcessor {
  async processSessionPDF(filePath: string, filename: string, clientId: string, clientName: string): Promise<DocumentAnalysis> {
    try {
      // Step 1: Extract PDF content from file path
      const pdfContent = await this.extractPDFContent(filePath, filename);
      
      // Step 2: Analyze content with AI
      const analysis = await this.analyzeSessionContent(pdfContent, clientName);
      
      // Step 3: Find matching appointments
      const suggestedAppointments = await this.findMatchingAppointments(
        analysis.extractedDate,
        clientId,
        clientName
      );
      
      return {
        content: pdfContent,
        extractedDate: analysis.extractedDate,
        suggestedAppointments,
        aiTags: analysis.aiTags || [],
        sessionType: analysis.sessionType,
        keyTopics: analysis.keyTopics || [],
        mood: analysis.mood,
        progressIndicators: analysis.progressIndicators || []
      };
      
    } catch (error) {
      console.error('Error processing PDF:', error);
      throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractPDFContent(filePath: string, filename: string): Promise<string> {
    try {
      console.log(`📄 Extracting PDF content from: ${filePath}`);
      
      // Dynamic import to avoid issues with pdf-parse test files
      const pdfParse = (await import('pdf-parse')).default;
      
      // Read the PDF file as buffer
      const pdfBuffer = await fs.readFile(filePath);
      
      // Parse PDF content using pdf-parse
      const pdfData = await pdfParse(pdfBuffer);
      
      // Extract text content
      const extractedText = pdfData.text.trim();
      
      if (!extractedText || extractedText.length === 0) {
        throw new Error('No text content found in PDF');
      }
      
      console.log(`📄 Successfully extracted ${extractedText.length} characters from PDF: ${filename}`);
      
      return extractedText;
    } catch (error) {
      console.error('Error extracting PDF content:', error);
      throw new Error(`Failed to extract content from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeSessionContent(content: string, clientName: string): Promise<Partial<DocumentAnalysis>> {
    try {
      const prompt = `
You are an expert clinical psychologist analyzing session notes. Please analyze the following session content and extract key information.

Client Name: ${clientName}

Session Content:
${content}

Please provide a JSON response with the following structure:
{
  "extractedDate": "YYYY-MM-DD format if found, null if not found",
  "sessionType": "individual therapy | group therapy | intake | assessment | follow-up",
  "aiTags": ["array of 5-10 relevant clinical tags like anxiety, depression, CBT, behavioral-intervention, etc."],
  "keyTopics": ["array of 3-5 main topics discussed in session"],
  "mood": "client's overall mood/emotional state",
  "progressIndicators": ["array of progress indicators or improvements noted"]
}

Focus on:
1. Finding any dates mentioned in the content
2. Identifying the type of therapeutic session
3. Extracting relevant clinical tags and themes
4. Noting the client's emotional state and progress
5. Identifying key therapeutic interventions or topics

Be precise and clinical in your analysis.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a clinical psychologist expert at analyzing session notes and extracting structured data. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const analysisText = response.choices[0]?.message?.content;
      if (!analysisText) {
        throw new Error('No analysis received from AI');
      }

      // Parse the JSON response
      const analysis = JSON.parse(analysisText);
      
      return {
        extractedDate: analysis.extractedDate,
        sessionType: analysis.sessionType,
        aiTags: analysis.aiTags || [],
        keyTopics: analysis.keyTopics || [],
        mood: analysis.mood,
        progressIndicators: analysis.progressIndicators || []
      };
      
    } catch (error) {
      console.error('Error analyzing session content:', error);
      // Return basic analysis if AI fails
      return {
        aiTags: ['session-notes', 'imported-document'],
        keyTopics: [],
        progressIndicators: []
      };
    }
  }

  private async findMatchingAppointments(
    extractedDate: string | undefined,
    clientId: string,
    clientName: string
  ): Promise<Array<{ id: string; title: string; date: string; confidence: number }>> {
    try {
      const suggestions: Array<{ id: string; title: string; date: string; confidence: number }> = [];
      
      // If we have an extracted date, look for appointments on that date
      if (extractedDate) {
        // Search for appointments on the extracted date
        const exactDateAppointments = await this.searchAppointmentsByDate(extractedDate, clientName);
        suggestions.push(...exactDateAppointments.map(apt => ({ ...apt, confidence: 95 })));
      }
      
      // Look for appointments within the last 30 days for this client
      const recentAppointments = await this.searchRecentAppointments(clientName, 30);
      
      // Add recent appointments with lower confidence if not already included
      for (const apt of recentAppointments) {
        if (!suggestions.find(s => s.id === apt.id)) {
          suggestions.push({ ...apt, confidence: 60 });
        }
      }
      
      // Sort by confidence and return top 5
      return suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);
        
    } catch (error) {
      console.error('Error finding matching appointments:', error);
      return [];
    }
  }

  private async searchAppointmentsByDate(
    date: string,
    clientName: string
  ): Promise<Array<{ id: string; title: string; date: string }>> {
    try {
      // This would integrate with your calendar API
      // For now, returning mock data structure
      const response = await fetch(`${process.env.BASE_URL || 'http://localhost:5000'}/api/calendar/events?date=${date}&client=${encodeURIComponent(clientName)}`);
      
      if (response.ok) {
        const events: any[] = await response.json();
        return events.map((event: any) => ({
          id: event.id,
          title: event.title || event.summary,
          date: event.start?.dateTime || event.start?.date || date
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error searching appointments by date:', error);
      return [];
    }
  }

  private async searchRecentAppointments(
    clientName: string,
    days: number
  ): Promise<Array<{ id: string; title: string; date: string }>> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // This would integrate with your calendar API
      const response = await fetch(
        `${process.env.BASE_URL || 'http://localhost:5000'}/api/calendar/events?` +
        `start=${startDate.toISOString()}&end=${endDate.toISOString()}&client=${encodeURIComponent(clientName)}`
      );
      
      if (response.ok) {
        const events: any[] = await response.json();
        return events.map((event: any) => ({
          id: event.id,
          title: event.title || event.summary,
          date: event.start?.dateTime || event.start?.date
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error searching recent appointments:', error);
      return [];
    }
  }
}