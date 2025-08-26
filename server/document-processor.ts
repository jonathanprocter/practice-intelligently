import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import sharp from 'sharp';
import { multiModelAI } from './ai-multi-model';
import OpenAI from 'openai';

// Dynamic imports for ES module compatibility
let csvParser: any = null;
async function getCsvParser() {
  if (!csvParser) {
    try {
      csvParser = (await import('csv-parser')).default;
    } catch (error) {
      console.error('Failed to import csv-parser:', error);
      throw new Error('CSV processing is not available');
    }
  }
  return csvParser;
}

// Import pdfjs-dist for direct PDF text extraction
async function getPdfJS() {
  try {
    // Import the legacy build for Node.js environments
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    // Configure worker for Node.js environment - use absolute path
    if (pdfjsLib.GlobalWorkerOptions) {
      const workerPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;
    }
    
    return pdfjsLib;
  } catch (error) {
    // Failed to import pdfjs-dist (production logging disabled)
    throw new Error('PDF processing is currently unavailable. Please convert your PDF to a text file (.txt) or image format (.jpg, .png) for processing.');
  }
}

export interface ProcessedDocument {
  extractedText: string;
  detectedClientName?: string;
  detectedSessionDate?: string;
  fileType: string;
  metadata: any;
}

export interface ProgressNote {
  title: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  tonalAnalysis: string;
  keyPoints: string[];
  significantQuotes: string[];
  narrativeSummary: string;
  aiTags?: string[];
  clientId: string;
  sessionDate: string;
  createdAt: Date;
}

export class DocumentProcessor {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private async _fileExists(path: string): Promise<boolean> {
    try {
      await fs.promises.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async processDocument(filePath: string, originalName: string): Promise<ProcessedDocument> {
    const fileExtension = path.extname(originalName).toLowerCase();
    let extractedText = '';
    let metadata: any = {};

    try {
      switch (fileExtension) {
        case '.pdf':
          try {
            extractedText = await this.processPDF(filePath);
          } catch (pdfError: any) {
            // If PDF processing fails, suggest alternative approaches
            console.warn('PDF processing failed, suggesting alternatives:', pdfError.message);
            throw new Error(`PDF processing failed: ${pdfError.message} Please try converting your PDF to a text file or image format instead.`);
          }
          break;
        case '.docx':
        case '.doc':
          extractedText = await this.processWordDocument(filePath);
          break;
        case '.txt':
        case '.md':
          extractedText = await this.processTextFile(filePath);
          break;
        case '.png':
        case '.jpg':
        case '.jpeg':
        case '.gif':
        case '.bmp':
          extractedText = await this.processImage(filePath);
          break;
        case '.xlsx':
        case '.xls':
          extractedText = await this.processExcel(filePath);
          break;
        case '.csv':
          try {
            extractedText = await this.processCSV(filePath);
          } catch (csvError: any) {
            // CSV processing failed (production logging disabled)
            throw new Error(`CSV processing failed: ${csvError.message}. Please try converting your CSV to a text file instead.`);
          }
          break;
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`);
      }

      // Extract potential client name and session date from content and filename
      const detectedInfo = await this.extractMetadata(extractedText, originalName);

      return {
        extractedText,
        detectedClientName: detectedInfo.clientName,
        detectedSessionDate: detectedInfo.sessionDate,
        fileType: fileExtension,
        metadata,
      };
    } catch (error: any) {
      // Error processing document (production logging disabled)
      throw new Error(`Failed to process ${fileExtension} file: ${error?.message || 'Unknown error'}`);
    }
  }

  private async processPDF(filePath: string): Promise<string> {
    try {
      if (!await this._fileExists(filePath)) {
        throw new Error('PDF file not found');
      }

      // Debug logging removed for production

      const pdfjsLib = await getPdfJS();

      // Read PDF file as buffer and convert to Uint8Array
      const pdfBuffer = await fs.promises.readFile(filePath);
      const pdfData = new Uint8Array(pdfBuffer);

      // Parse PDF document with Node.js compatible options
      const pdfDocument = await pdfjsLib.getDocument({
        data: pdfData,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      }).promise;

      let fullText = '';

      // Extract text from each page
      for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        try {
          // Processing PDF page (production logging disabled)

          const page = await pdfDocument.getPage(pageNum);
          const textContent = await page.getTextContent();

          let pageText = '';
          for (const item of textContent.items) {
            if ('str' in item) {
              pageText += item.str + ' ';
            }
          }

          if (pageText.trim()) {
            fullText += `Page ${pageNum}:\n${pageText.trim()}\n\n`;
          }

          // Clean up page
          page.cleanup();
        } catch (pageError: any) {
          // Failed to process PDF page (production logging disabled)
        }
      }

      // Clean up document
      pdfDocument.destroy();

      if (fullText.trim().length === 0) {
        throw new Error('No text could be extracted from PDF. The PDF might be image-based or encrypted.');
      }

      // Successfully extracted text from PDF (production logging disabled)
      return fullText;
    } catch (error: any) {
      // PDF processing error (production logging disabled)
      throw new Error(`PDF processing failed: ${error.message || 'Unknown error'}`);
    }
  }

  private async processWordDocument(filePath: string): Promise<string> {
    try {
      if (!await this._fileExists(filePath)) {
        throw new Error('Word document file not found');
      }
      const result = await mammoth.extractRawText({ path: filePath });
      if (!result.value || result.value.trim().length === 0) {
        throw new Error('No text content found in Word document');
      }
      return result.value;
    } catch (error: any) {
      // Word document processing error (production logging disabled)
      throw new Error(`Failed to process Word document: ${error.message || 'Unknown error'}`);
    }
  }

  private async processTextFile(filePath: string): Promise<string> {
    try {
      if (!await this._fileExists(filePath)) {
        throw new Error('Text file not found');
      }
      const content = await fs.promises.readFile(filePath, 'utf8');
      if (!content || content.trim().length === 0) {
        throw new Error('No content found in text file');
      }
      return content;
    } catch (error: any) {
      // Text file processing error (production logging disabled)
      throw new Error(`Failed to process text file: ${error.message || 'Unknown error'}`);
    }
  }

  private async processImage(filePath: string): Promise<string> {
    try {
      // Convert image to base64 for OpenAI Vision API
      const imageBuffer = await sharp(filePath)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const base64Image = imageBuffer.toString('base64');

      const result = await multiModelAI.analyzeMultimodalContent(
        `Extract all text content from this image. If this appears to be a clinical document, therapy session notes, or mental health related content, preserve the clinical language and structure. Return the extracted text exactly as it appears in the image. Image data: data:image/jpeg;base64,${base64Image}`,
        'image'
      );

      return result.content;
    } catch (error) {
      console.error('Error processing image with AI:', error);
      throw new Error(`Failed to extract text from image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processExcel(filePath: string): Promise<string> {
    try {
      if (!await this._fileExists(filePath)) {
        throw new Error('Excel file not found');
      }
      const workbook = xlsx.readFile(filePath);
      let extractedText = '';

      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        extractedText += `Sheet: ${sheetName}\n`;
        (jsonData as any[]).forEach((row: any) => {
          if (Array.isArray(row)) {
            extractedText += row.join('\t') + '\n';
          }
        });
        extractedText += '\n';
      });

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No content found in Excel file');
      }
      return extractedText;
    } catch (error: any) {
      // Excel processing error (production logging disabled)
      throw new Error(`Failed to process Excel file: ${error.message || 'Unknown error'}`);
    }
  }

  private async processCSV(filePath: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!await this._fileExists(filePath)) {
          return reject(new Error('CSV file not found'));
        }

        const csvParserModule = await getCsvParser();
        const results: any[] = [];
        const stream = fs.createReadStream(filePath);

        stream
          .pipe(csvParserModule())
          .on('data', (data: any) => results.push(data))
          .on('end', () => {
            try {
              if (results.length === 0) {
                return reject(new Error('No data found in CSV file'));
              }

              const headers = Object.keys(results[0] || {});
              let text = headers.join('\t') + '\n';

              results.forEach(row => {
                text += headers.map(header => row[header] || '').join('\t') + '\n';
              });

              if (!text || text.trim().length === 0) {
                return reject(new Error('No content extracted from CSV file'));
              }

              resolve(text);
            } catch (error) {
              reject(new Error(`Failed to process CSV data: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
          })
          .on('error', (error: any) => {
            reject(new Error(`Failed to read CSV file: ${error.message}`));
          });
      } catch (error) {
        reject(new Error(`Failed to process CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  private async extractMetadata(content: string, filename?: string): Promise<{ 
    clientName?: string; 
    sessionDate?: string; 
    confidence?: { name: number; date: number }; 
    extractionMethods?: string[];
    alternatives?: { names: string[]; dates: string[] };
  }> {
    try {
      console.log('🔍 Starting enhanced metadata extraction...');
      
      // Enhanced AI extraction with multiple validation passes
      const analysisPrompt = `You are an expert clinical document analyzer. Extract client name and session date with maximum precision.

ANALYSIS TASK:
1. Find the EXACT client name as written in the document - look EVERYWHERE in the content
2. Extract the EXACT session/appointment date
3. Provide confidence scores (0.0-1.0) for each extraction
4. List alternative possibilities if multiple candidates exist

COMPREHENSIVE CLIENT NAME SEARCH PATTERNS:
- Document titles: "Comprehensive Clinical Progress Note for [Name]", "Progress Note for [Name]"
- Session headers: "[Name]'s Therapy Session", "Session with [Name]"
- Direct references: "Client: [Name]", "Patient: [Name]", "[Name] attended", "[Name] presented"
- Within content: "[Name] reported", "[Name] expressed", "[Name] described", "[Name] stated"
- Possessive forms: "[Name]'s session", "[Name]'s therapy", "[Name]'s treatment"
- Action contexts: "[Name] discussed", "[Name] mentioned", "[Name] shared", "[Name] indicated"
- Clinical references: "The client [Name]", "Patient [Name]", "Individual [Name]"
- Anywhere a proper name appears that could be the client

Session Dates:
- "Session on [Date]" or "Therapy Session on [Date]"
- "Date: [Date]" in headers
- "[Date]" near session/appointment references
- ISO format: YYYY-MM-DD
- US format: MM/DD/YYYY or M/D/YYYY
- Text format: "Month DD, YYYY"

SEARCH STRATEGY:
1. Scan the ENTIRE document content for proper names (First Last format)
2. Look for names that appear multiple times or in clinical contexts
3. Check for names near therapy/session/clinical terminology
4. Consider names that appear with possessive pronouns or action verbs
5. Prioritize names that appear in structured contexts (titles, headers)

CRITICAL REQUIREMENTS:
- Extract EXACT names without modification
- Search the FULL document content, not just headers
- Convert all dates to YYYY-MM-DD format
- Provide confidence scores based on context clarity and frequency
- List up to 3 alternative possibilities for each field

Document filename: ${filename || 'unknown'}
Document content:
${content.substring(0, 8000)}

RESPOND WITH ONLY VALID JSON:
{
  "primary": {
    "clientName": "Exact Full Name or null",
    "sessionDate": "YYYY-MM-DD or null",
    "nameConfidence": 0.95,
    "dateConfidence": 0.90
  },
  "alternatives": {
    "clientNames": ["Alternative Name 1", "Alternative Name 2"],
    "sessionDates": ["2024-09-13", "2024-09-12"]
  },
  "extractionContext": {
    "nameSource": "Document title/header/content",
    "dateSource": "Session header/content",
    "ambiguities": ["Note any uncertainties"]
  }
}`;

      let extractedData: any = {};
      let confidence = { name: 0, date: 0 };
      let extractionMethods: string[] = [];
      let alternatives = { names: [], dates: [] };

      try {
        console.log('🤖 Using enhanced AI extraction with validation...');
        const result = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a precision clinical document analyzer. Provide accurate extractions with confidence metrics. Always respond with valid JSON only."
            },
            {
              role: "user",
              content: analysisPrompt
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.0,
          max_tokens: 800
        });

        const responseText = result.choices[0]?.message?.content;
        console.log('🤖 Enhanced AI Response:', responseText);
        
        if (responseText) {
          const parsed = JSON.parse(responseText);
          if (parsed.primary) {
            extractedData = {
              clientName: parsed.primary.clientName || undefined,
              sessionDate: parsed.primary.sessionDate || undefined,
            };
            confidence = {
              name: parsed.primary.nameConfidence || 0,
              date: parsed.primary.dateConfidence || 0
            };
            alternatives = parsed.alternatives || { clientNames: [], sessionDates: [] };
            extractionMethods.push('AI-Enhanced');
          }
          
          console.log('✅ Enhanced AI Extracted:', extractedData);
          console.log('📊 Confidence Scores:', confidence);
        }
      } catch (aiError) {
        console.error('❌ Enhanced AI extraction failed:', aiError);
        // Fallback to regex with confidence scoring
        const regexResult = this.extractWithRegexEnhanced(content);
        extractedData = regexResult.data;
        confidence = regexResult.confidence;
        extractionMethods.push('Regex-Fallback');
        console.log('🔄 Enhanced regex fallback result:', extractedData);
      }

      // Filename extraction as additional validation
      if (!extractedData.clientName || !extractedData.sessionDate || confidence.name < 0.8 || confidence.date < 0.8) {
        const filenameData = this.extractFromFilename(filename || '');
        console.log('📁 Filename extraction for validation:', filenameData);
        
        // Use filename data if confidence is low or data is missing
        if (!extractedData.clientName && filenameData.clientName) {
          extractedData.clientName = filenameData.clientName;
          confidence.name = Math.max(confidence.name, 0.6);
          extractionMethods.push('Filename-Client');
        }
        if (!extractedData.sessionDate && filenameData.sessionDate) {
          extractedData.sessionDate = filenameData.sessionDate;
          confidence.date = Math.max(confidence.date, 0.6);
          extractionMethods.push('Filename-Date');
        }
      }

      const finalResult = {
        ...extractedData,
        confidence,
        extractionMethods,
        alternatives
      };

      console.log('📋 Final enhanced extraction result:', finalResult);
      return finalResult;
    } catch (error) {
      console.error('❌ Error in enhanced metadata extraction:', error);
      return { confidence: { name: 0, date: 0 }, extractionMethods: ['Error'], alternatives: { names: [], dates: [] } };
    }
  }

  private extractWithRegexEnhanced(content: string): { 
    data: { clientName?: string; sessionDate?: string }; 
    confidence: { name: number; date: number } 
  } {
    let clientName: string | undefined;
    let sessionDate: string | undefined;
    let nameConfidence = 0;
    let dateConfidence = 0;

    console.log('🔍 Starting enhanced regex extraction...');

    // Enhanced client name patterns with confidence scoring - search throughout entire document
    const clientPatterns = [
      // High confidence patterns (structured contexts)
      { pattern: /(?:comprehensive\s+clinical\s+progress\s+note\s+for\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i, confidence: 0.95 },
      { pattern: /(?:clinical\s+progress\s+note\s+for\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i, confidence: 0.90 },
      { pattern: /(?:progress\s+note\s+for\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i, confidence: 0.85 },
      { pattern: /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)'s\s+therapy\s+session/i, confidence: 0.90 },
      
      // Direct reference patterns
      { pattern: /client:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i, confidence: 0.85 },
      { pattern: /patient:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i, confidence: 0.85 },
      { pattern: /therapy\s+session\s+(?:for|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i, confidence: 0.80 },
      { pattern: /session\s+(?:for|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i, confidence: 0.80 },
      
      // Content-based patterns (names mentioned within notes)
      { pattern: /\b([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:attended|presented|reported|expressed|stated|described|discussed|mentioned|shared|indicated)/i, confidence: 0.85 },
      { pattern: /\b([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:was|is|has|had|will|would|could|should)/i, confidence: 0.75 },
      { pattern: /(?:the\s+client\s+)([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i, confidence: 0.80 },
      { pattern: /(?:patient\s+)([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i, confidence: 0.80 },
      
      // Possessive and action patterns
      { pattern: /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'s\s+(?:session|therapy|treatment|progress|goals|concerns)/i, confidence: 0.85 },
      { pattern: /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:continues|completed|began|started|ended|finished)/i, confidence: 0.75 },
      
      // Broader name patterns (lower confidence but catches more cases)
      { pattern: /\b([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b/g, confidence: 0.60 }, // General proper names
    ];

    // Track all potential names with their frequencies and contexts
    const nameMatches = new Map<string, { count: number, maxConfidence: number, contexts: string[] }>();
    
    for (const { pattern, confidence } of clientPatterns) {
      const matches = pattern.global ? Array.from(content.matchAll(pattern)) : [content.match(pattern)].filter(Boolean);
      
      for (const match of matches) {
        if (match && match[1]) {
          const foundName = match[1].trim();
          
          // Filter out common words that might match the pattern
          const commonWords = ['The Client', 'This Patient', 'Individual Therapy', 'Session Notes', 'Progress Note'];
          if (commonWords.some(word => foundName.toLowerCase().includes(word.toLowerCase()))) {
            continue;
          }
          
          // Only consider names with reasonable length and format
          if (foundName.length >= 5 && foundName.length <= 50 && foundName.includes(' ')) {
            if (!nameMatches.has(foundName)) {
              nameMatches.set(foundName, { count: 1, maxConfidence: confidence, contexts: [match[0]] });
            } else {
              const existing = nameMatches.get(foundName)!;
              existing.count++;
              existing.maxConfidence = Math.max(existing.maxConfidence, confidence);
              existing.contexts.push(match[0]);
            }
          }
        }
      }
    }
    
    // Find the best candidate based on confidence and frequency
    let bestCandidate: { name: string, score: number } | null = null;
    
    for (const [name, data] of nameMatches) {
      // Calculate composite score: confidence + frequency bonus
      const frequencyBonus = Math.min(data.count * 0.1, 0.3); // Max 0.3 bonus for frequency
      const score = data.maxConfidence + frequencyBonus;
      
      if (!bestCandidate || score > bestCandidate.score) {
        bestCandidate = { name, score };
      }
    }
    
    if (bestCandidate) {
      clientName = bestCandidate.name;
      nameConfidence = Math.min(bestCandidate.score, 1.0);
      console.log(`✅ Client name found with confidence ${nameConfidence}: "${clientName}" (${nameMatches.get(clientName)?.count} occurrences)`);
    }

    // Enhanced date patterns with confidence scoring
    const datePatterns = [
      { pattern: /(?:session\s+on|therapy\s+session\s+on)\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i, confidence: 0.95 },
      { pattern: /(?:session\s+date|date):\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i, confidence: 0.90 },
      { pattern: /(?:session\s+date|date):\s*(\d{4}-\d{2}-\d{2})/i, confidence: 0.95 },
      { pattern: /(?:session\s+date|date):\s*(\d{1,2}\/\d{1,2}\/\d{4})/i, confidence: 0.90 },
      { pattern: /\b([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})\b/i, confidence: 0.70 },
      { pattern: /(\d{4}-\d{2}-\d{2})/i, confidence: 0.60 },
      { pattern: /(\d{1,2}\/\d{1,2}\/\d{4})/i, confidence: 0.60 },
    ];

    for (const { pattern, confidence } of datePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        let dateStr = match[1].trim();
        console.log(`🗓️ Found date string with confidence ${confidence}: "${dateStr}"`);
        
        // Convert various date formats to YYYY-MM-DD
        try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime()) && date.getFullYear() > 2020 && date.getFullYear() < 2030) {
            sessionDate = date.toISOString().split('T')[0];
            dateConfidence = confidence;
            console.log(`✅ Converted to: ${sessionDate}`);
            break;
          }
        } catch (e) {
          // Try manual parsing for formats like MM/DD/YYYY
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              const month = parts[0].padStart(2, '0');
              const day = parts[1].padStart(2, '0');
              const year = parts[2];
              sessionDate = `${year}-${month}-${day}`;
              dateConfidence = confidence * 0.9; // Slightly lower confidence for manual parsing
              console.log(`✅ Manual conversion: ${sessionDate}`);
              break;
            }
          }
        }
      }
    }

    const result = { 
      data: { clientName, sessionDate }, 
      confidence: { name: nameConfidence, date: dateConfidence } 
    };
    console.log('📋 Enhanced regex extraction result:', result);
    return result;
  }

  private extractWithRegex(content: string): { clientName?: string; sessionDate?: string } {
    let clientName: string | undefined;
    let sessionDate: string | undefined;

    console.log('🔍 Starting regex extraction...');

    // Enhanced client name patterns with more comprehensive matching
    const clientPatterns = [
      // Pattern for "Comprehensive Clinical Progress Note for Angelica Ruden"
      /(?:comprehensive\s+clinical\s+progress\s+note\s+for\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      /(?:clinical\s+progress\s+note\s+for\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      /(?:progress\s+note\s+for\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      // Pattern for "Angelica Ruden's Therapy Session"
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)'s\s+therapy\s+session/i,
      // Pattern for "Client: Angelica Ruden"
      /client:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      /patient:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      // Pattern for therapy session references
      /therapy\s+session\s+(?:for|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      /session\s+(?:for|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      // More flexible name patterns
      /\b([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:attended|presented|reported|expressed)/i,
    ];

    for (const pattern of clientPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        clientName = match[1].trim();
        console.log(`✅ Client name found with pattern: "${clientName}"`);
        break;
      }
    }

    // Enhanced date patterns with better matching
    const datePatterns = [
      // Pattern for "Session on September 13, 2024"
      /(?:session\s+on|therapy\s+session\s+on)\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
      // Pattern for standalone dates like "September 13, 2024"
      /\b([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})\b/i,
      // ISO format dates
      /(\d{4}-\d{2}-\d{2})/,
      // US format dates
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      // Alternative formats
      /(\d{1,2}-\d{1,2}-\d{4})/,
      // Date with session reference
      /(?:session\s+date|date):\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
    ];

    for (const pattern of datePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        let dateStr = match[1].trim();
        console.log(`🗓️ Found date string: "${dateStr}"`);
        
        // Convert various date formats to YYYY-MM-DD
        try {
          // Handle month names properly
          const date = new Date(dateStr);
          if (!isNaN(date.getTime()) && date.getFullYear() > 2020 && date.getFullYear() < 2030) {
            sessionDate = date.toISOString().split('T')[0];
            console.log(`✅ Converted to: ${sessionDate}`);
            break;
          }
        } catch (e) {
          // Try manual parsing for formats like MM/DD/YYYY
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              const month = parts[0].padStart(2, '0');
              const day = parts[1].padStart(2, '0');
              const year = parts[2];
              sessionDate = `${year}-${month}-${day}`;
              console.log(`✅ Manual conversion: ${sessionDate}`);
              break;
            }
          }
        }
      }
    }

    const result = { clientName, sessionDate };
    console.log('📋 Regex extraction result:', result);
    return result;
  }

  private extractFromFilename(filename: string): { clientName?: string; sessionDate?: string } {
    if (!filename) return {};

    // Remove file extension and common prefixes
    let cleanName = filename
      .replace(/\.(pdf|txt|docx?|xlsx?|csv)$/i, '')
      .replace(/^(session|note|transcript|clinical|therapy)[-_\s]*/i, '');

    // Extract dates from filename (various formats)
    const datePatterns = [
      /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,           // 2025-01-15 or 2025/01/15
      /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/,           // 01-15-2025 or 01/15/2025
      /(\d{1,2}[-/]\d{1,2}[-/]\d{2})/,           // 01-15-25 or 01/15/25
      /((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-_\s]*\d{1,2}[-_\s]*\d{4})/i, // Jan-15-2025, jan_15_2025
      /(\d{1,2}[-_\s]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-_\s]*\d{4})/i, // 15-Jan-2025
      /((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[-_\s]*\d{1,2}[-_\s]*\d{4})/i, // jan-20-2025
      /(\b\d{4}\b)/,                             // Just year as fallback
    ];

    let extractedDate: string | undefined;
    for (const pattern of datePatterns) {
      const match = cleanName.match(pattern);
      if (match) {
        extractedDate = match[1];
        // Remove date from filename for name extraction
        cleanName = cleanName.replace(match[0], '').trim();
        break;
      }
    }

    // Extract client name from remaining filename
    let clientName: string | undefined;
    if (cleanName.length > 0) {
      // Remove common separators and clean up
      clientName = cleanName
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Filter out common clinical terms that might be in filename
      const clinicalTerms = /^(notes?|session|therapy|clinical|transcript|progress|soap|treatment)$/i;
      if (!clinicalTerms.test(clientName) && clientName.length > 1) {
        // Capitalize name properly
        clientName = clientName
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      } else {
        clientName = undefined;
      }
    }

    return {
      clientName,
      sessionDate: extractedDate,
    };
  }

  async generateProgressNote(extractedText: string, clientId: string, sessionDate: string): Promise<ProgressNote> {
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No content provided for progress note generation');
    }
    // Use the comprehensive clinical prompt provided in the attached file
    const comprehensivePrompt = `You are an expert clinical therapist with extensive training in psychotherapy, clinical documentation, and therapeutic modalities including ACT, DBT, Narrative Therapy, and Existentialism. Your task is to create a comprehensive clinical progress note from the provided therapy session content that demonstrates the depth, clinical sophistication, and analytical rigor of an experienced mental health professional.

CRITICAL FORMATTING REQUIREMENT: Return PLAIN TEXT with NO MARKDOWN syntax. Do not use asterisks, hashtags, or any markdown formatting. Use plain text with clear section headers.

Title Format: Comprehensive Clinical Progress Note for [Client's Full Name]'s Therapy Session on [Date]

Required Document Structure:

Subjective Section:
Client's reported experience, direct quotes, emotional state, and presenting concerns. Include specific statements that reveal psychological themes. Example format: "Carlos attended today's session expressing significant distress about his recent job loss. He appeared visibly agitated when describing the termination meeting, stating, 'They didn't even give me a chance to explain my side of things.'"

Objective Section:
Observable behaviors, appearance, affect, mental status observations, therapeutic engagement level, and clinical presentation. Example format: "Carlos presented to the session casually dressed but well-groomed. He was alert and oriented, with clear speech and logical thought progression."

Assessment Section:
Clinical formulation, diagnostic considerations, treatment progress, identified patterns, therapeutic alliance quality, and risk assessment. Example format: "Carlos continues to meet criteria for Major Depressive Disorder as evidenced by persistent low mood, anhedonia, sleep disturbance, fatigue, and feelings of worthlessness."

Plan Section:
Specific interventions used, therapeutic modalities applied, homework assignments, goals for next session, and treatment plan modifications. Use ACT, DBT, Narrative Therapy approaches as appropriate.

Supplemental Analyses:
Tonal Analysis: Significant shifts in client's emotional tone, voice, or presentation during session
Key Points: Critical therapeutic insights, breakthroughs, or clinical observations
Significant Quotes: Important client statements with clinical interpretation  
Comprehensive Narrative Summary: Overall session synthesis and therapeutic significance

Clinical Approach Requirements:
- Demonstrate depth of clinical thinking beyond surface observations
- Apply evidence-based therapeutic frameworks appropriately
- Integrate multiple therapeutic approaches
- Show advanced understanding of psychotherapeutic processes

REMEMBER: Use PLAIN TEXT formatting only. No asterisks, hashtags, or markdown syntax in the final output.

Session Content to Analyze:
${extractedText}

Client ID: ${clientId}
Session Date: ${sessionDate}`;

    try {
      // Use OpenAI directly for reliable, fast analysis
      console.log('Using OpenAI for progress note generation...');
      const result = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert clinical therapist creating comprehensive SOAP format progress notes. Provide detailed, professional clinical analysis."
          },
          {
            role: "user", 
            content: comprehensivePrompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7
      });

      const progressNoteContent = result.choices[0]?.message?.content || '';

      // Use the rich AI-generated content directly instead of parsing into limited sections
      return this.parseProgressNote(progressNoteContent, clientId, sessionDate);
    } catch (error) {
      console.error('Error generating progress note with OpenAI:', error);
      throw new Error('Failed to generate progress note with AI');
    }
  }

  private parseProgressNote(content: string, clientId: string, sessionDate: string): ProgressNote {
    // Clean content but preserve rich clinical information
    const cleanedContent = this.cleanContent(content);

    // Extract title from content or create appropriate one
    const titleMatch = cleanedContent.match(/(?:^|\n).*?(?:Progress Note|Clinical Note|Comprehensive.*Note).*$/im);
    const title = titleMatch?.[0] || `Comprehensive Clinical Progress Note - ${clientId}`;

    // Split content into meaningful paragraphs for distribution across SOAP sections
    const paragraphs = cleanedContent
      .split(/\n\s*\n/)
      .filter(p => p.trim().length > 50)
      .map(p => p.trim());

    // Intelligently distribute content across SOAP sections based on content analysis
    const soapSections = this.distributeContentToSOAP(paragraphs, cleanedContent);

    // Extract key insights from the comprehensive analysis
    const keyPoints = this.extractKeyInsights(cleanedContent);

    // Extract meaningful quotes
    const significantQuotes = this.extractSignificantQuotes(cleanedContent);

    // Generate AI tags based on content
    const aiTags = this.generateAITags(cleanedContent);

    return {
      title: this.cleanContent(title),
      subjective: soapSections.subjective,
      objective: soapSections.objective,
      assessment: soapSections.assessment,
      plan: soapSections.plan,
      tonalAnalysis: soapSections.tonalAnalysis,
      keyPoints,
      significantQuotes,
      narrativeSummary: soapSections.narrative,
      aiTags,
      clientId,
      sessionDate,
      createdAt: new Date(),
    };
  }

  private parseProgressNote_OLD(content: string, clientId: string, sessionDate: string): ProgressNote {
    // Clean content first
    const cleanedContent = this.cleanContent(content);

    // More flexible regex patterns to match various formats
    const titleMatch = cleanedContent.match(/(?:^|\n).*?(?:Progress Note|Clinical Note|Comprehensive.*Note).*$/im);

    // Extract meaningful clinical content using improved parsing
    const extractSectionFromContent = (textContent: string, keywords: string[]): string => {
      for (const keyword of keywords) {
        // Look for content after keywords with more flexible matching
        const patterns = [
          new RegExp(`${keyword}[:\\s]*([\\s\\S]*?)(?=\\n\\s*(?:[A-Z][^\\n]*:|$))`, 'gis'),
          new RegExp(`${keyword}[:\\s]*([\\s\\S]*?)(?=\\n\\n|$)`, 'gis'),
          new RegExp(`${keyword}.*?\\n([\\s\\S]*?)(?=\\n[A-Z]|$)`, 'gis')
        ];

        for (const pattern of patterns) {
          const match = textContent.match(pattern);
          if (match && match[1] && match[1].trim().length > 30) {
            return match[1].trim().substring(0, 1500); // Increased length for more content
          }
        }
      }
      return '';
    };

    console.log('=== DEBUG: Cleaned Content for Parsing ===');
    console.log(cleanedContent.substring(0, 1000));
    console.log('=== END DEBUG ===');

    // For comprehensive AI-generated content, use intelligent parsing to extract SOAP sections
    const extractedSections = this.extractSOAPSections(cleanedContent);

    console.log('=== DEBUG: Extracted Sections ===');
    console.log('Subjective:', extractedSections.subjective.substring(0, 200));
    console.log('Objective:', extractedSections.objective.substring(0, 200));
    console.log('Assessment:', extractedSections.assessment.substring(0, 200));
    console.log('Plan:', extractedSections.plan.substring(0, 200));
    console.log('=== END DEBUG ===');

    // Extract key therapeutic insights as key points  
    const keyPoints = [
      'Evidence-based therapeutic modalities implemented',
      'Strong therapeutic alliance established', 
      'Comprehensive clinical assessment completed',
      'Treatment planning aligned with client goals'
    ];

    // Extract significant quotes from the content
    const significantQuotes = cleanedContent.match(/"([^"]{15,})"/g)
      ?.map(quote => quote.replace(/"/g, '').trim())
      ?.slice(0, 5) || [];

    // Generate AI tags based on content
    const aiTags = this.generateAITags(cleanedContent);

    return {
      title: this.cleanContent(titleMatch?.[0] || `Clinical Progress Note - ${clientId} - ${sessionDate}`),
      subjective: extractedSections.subjective,
      objective: extractedSections.objective,
      assessment: extractedSections.assessment,
      plan: extractedSections.plan,
      tonalAnalysis: extractedSections.tonalAnalysis,
      keyPoints,
      significantQuotes,
      narrativeSummary: extractedSections.narrative,
      aiTags, // Add AI-generated tags
      clientId,
      sessionDate,
      createdAt: new Date(),
    };
  }

  private extractSOAPSections(content: string): any {
    // Split content into meaningful chunks
    const chunks = content.split(/\n\s*\n/).filter(chunk => chunk.trim().length > 20);

    // Find the most clinically relevant content for each SOAP section
    const findBestMatch = (keywords: string[], fallback: string): string => {
      for (const chunk of chunks) {
        const lowerChunk = chunk.toLowerCase();
        for (const keyword of keywords) {
          if (lowerChunk.includes(keyword.toLowerCase()) && chunk.length > 100) {
            return chunk.trim().substring(0, 1200);
          }
        }
      }

      // If no specific match, use chunks that contain clinical language
      const clinicalChunk = chunks.find(chunk => {
        const lower = chunk.toLowerCase();
        return (lower.includes('client') || lower.includes('patient') || 
                lower.includes('symptoms') || lower.includes('therapy') ||
                lower.includes('treatment') || lower.includes('clinical')) && 
               chunk.length > 100;
      });

      return clinicalChunk ? clinicalChunk.trim().substring(0, 1200) : fallback;
    };

    return {
      subjective: findBestMatch([
        'client reported', 'client stated', 'client expressed', 'presenting concerns',
        'subjective', 'symptoms', 'client described', 'reported feeling',
        'client presentation', 'complaint', 'concern'
      ], 'Client presented for therapy session with subjective reporting documented.'),

      objective: findBestMatch([
        'behavioral observations', 'clinical observations', 'objective', 
        'mental status', 'appearance', 'affect', 'mood', 'presentation',
        'observed', 'behavior', 'demeanor', 'therapeutic alliance'
      ], 'Clinical observations and behavioral assessment documented during session.'),

      assessment: findBestMatch([
        'clinical assessment', 'diagnostic', 'assessment', 'formulation',
        'clinical impression', 'disorder', 'condition', 'diagnosis',
        'clinical reasoning', 'evaluation', 'analysis'
      ], 'Clinical assessment and diagnostic considerations evaluated during session.'),

      plan: findBestMatch([
        'treatment plan', 'intervention', 'therapeutic', 'plan', 'strategies',
        'recommendations', 'goals', 'objectives', 'next session',
        'homework', 'cbt', 'therapy', 'treatment'
      ], 'Treatment planning and therapeutic interventions implemented during session.'),

      tonalAnalysis: findBestMatch([
        'emotional tone', 'therapeutic relationship', 'engagement',
        'emotional', 'relationship', 'alliance', 'rapport',
        'connection', 'dynamics'
      ], 'Emotional tone and therapeutic relationship dynamics observed.'),

      narrative: findBestMatch([
        'overall', 'comprehensive', 'synthesis', 'summary',
        'clinical competency', 'outcomes', 'progress',
        'integration', 'conclusion'
      ], 'Comprehensive clinical analysis and treatment synthesis documented.')
    };
  }

  private generateAITags(content: string): string[] {
    const tags: string[] = [];
    const lowerContent = content.toLowerCase();

    // Therapeutic modalities
    if (lowerContent.includes('cbt') || lowerContent.includes('cognitive behavioral')) tags.push('CBT');
    if (lowerContent.includes('dbt') || lowerContent.includes('dialectical')) tags.push('DBT');
    if (lowerContent.includes('act') || lowerContent.includes('acceptance commitment')) tags.push('ACT');
    if (lowerContent.includes('mindfulness')) tags.push('Mindfulness');
    if (lowerContent.includes('emdr')) tags.push('EMDR');

    // Presenting issues
    if (lowerContent.includes('anxiety') || lowerContent.includes('anxious')) tags.push('Anxiety');
    if (lowerContent.includes('depression') || lowerContent.includes('depressed')) tags.push('Depression');
    if (lowerContent.includes('trauma') || lowerContent.includes('ptsd')) tags.push('Trauma');
    if (lowerContent.includes('grief') || lowerContent.includes('loss')) tags.push('Grief/Loss');
    if (lowerContent.includes('relationship') || lowerContent.includes('couple')) tags.push('Relationships');
    if (lowerContent.includes('work') || lowerContent.includes('job') || lowerContent.includes('career')) tags.push('Work Stress');
    if (lowerContent.includes('family') || lowerContent.includes('parent')) tags.push('Family Issues');
    if (lowerContent.includes('substance') || lowerContent.includes('addiction')) tags.push('Substance Use');
    if (lowerContent.includes('sleep') || lowerContent.includes('insomnia')) tags.push('Sleep Issues');

    // Treatment progress indicators
    if (lowerContent.includes('improvement') || lowerContent.includes('progress') || lowerContent.includes('better')) tags.push('Progress');
    if (lowerContent.includes('crisis') || lowerContent.includes('emergency') || lowerContent.includes('risk')) tags.push('Crisis');
    if (lowerContent.includes('homework') || lowerContent.includes('assignment')) tags.push('Homework');
    if (lowerContent.includes('coping') || lowerContent.includes('strategies')) tags.push('Coping Skills');
    if (lowerContent.includes('medication') || lowerContent.includes('med') || lowerContent.includes('prescription')) tags.push('Medication');

    return tags.slice(0, 8); // Limit to 8 most relevant tags
  }

  private cleanContent(content: string): string {
    return content
      .replace(/\*\*/g, '') // Remove markdown bold
      .replace(/\*/g, '') // Remove markdown italic
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      .replace(/`{1,3}[^`]*`{1,3}/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to plain text
      .replace(/^\s*[-*+]\s+/gm, '') // Remove bullet points
      .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered lists
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Normalize multiple line breaks
      .trim();
  }

  private distributeContentToSOAP(paragraphs: string[], fullContent: string): any {
    // Analyze each paragraph and assign to most appropriate SOAP section
    const soapContent = {
      subjective: [] as string[],
      objective: [] as string[],
      assessment: [] as string[],
      plan: [] as string[],
      tonalAnalysis: [] as string[],
      narrative: [] as string[]
    };

    for (const paragraph of paragraphs) {
      const lowerPara = paragraph.toLowerCase();

      // Classify paragraph based on clinical indicators
      if (this.containsSubjectiveIndicators(lowerPara)) {
        soapContent.subjective.push(paragraph);
      } else if (this.containsObjectiveIndicators(lowerPara)) {
        soapContent.objective.push(paragraph);
      } else if (this.containsAssessmentIndicators(lowerPara)) {
        soapContent.assessment.push(paragraph);
      } else if (this.containsPlanIndicators(lowerPara)) {
        soapContent.plan.push(paragraph);
      } else if (this.containsTonalIndicators(lowerPara)) {
        soapContent.tonalAnalysis.push(paragraph);
      } else {
        // Assign to narrative if unclear or comprehensive analysis
        soapContent.narrative.push(paragraph);
      }
    }

    // Ensure each section has meaningful content
    return {
      subjective: this.ensureMeaningfulContent(soapContent.subjective, 'subjective clinical presentation'),
      objective: this.ensureMeaningfulContent(soapContent.objective, 'objective clinical observations'),
      assessment: this.ensureMeaningfulContent(soapContent.assessment, 'clinical assessment and diagnostic reasoning'),
      plan: this.ensureMeaningfulContent(soapContent.plan, 'treatment planning and therapeutic interventions'),
      tonalAnalysis: this.ensureMeaningfulContent(soapContent.tonalAnalysis, 'emotional tone and therapeutic dynamics'),  
      narrative: this.ensureMeaningfulContent(soapContent.narrative, 'comprehensive clinical synthesis')
    };
  }

  private containsSubjectiveIndicators(text: string): boolean {
    const indicators = ['client reported', 'client stated', 'client expressed', 'client described',
                       'presenting', 'complaint', 'concern',                        'symptoms', 'feeling', 'experiencing'];
    return indicators.some(indicator => text.includes(indicator));
  }

  private containsObjectiveIndicators(text: string): boolean {
    const indicators = ['observed', 'behavior', 'appearance', 'affect', 'mood', 'presentation',
                       'mental status', 'demeanor', 'therapeutic alliance', 'engagement'];
    return indicators.some(indicator => text.includes(indicator));
  }

  private containsAssessmentIndicators(text: string): boolean {
    const indicators = ['assessment', 'diagnosis', 'clinical impression', 'formulation',
                       'disorder', 'condition', 'diagnostic', 'clinical reasoning'];
    return indicators.some(indicator => text.includes(indicator));
  }

  private containsPlanIndicators(text: string): boolean {
    const indicators = ['plan', 'treatment', 'intervention', 'therapy', 'goal', 'objective',
                       'strategy', 'recommendation', 'next session', 'homework', 'cbt', 'dbt'];
    return indicators.some(indicator => text.includes(indicator));
  }

  private containsTonalIndicators(text: string): boolean {
    const indicators = ['emotional', 'tone', 'relationship', 'alliance', 'rapport',
                       'connection', 'dynamics', 'engagement', 'therapeutic relationship'];
    return indicators.some(indicator => text.includes(indicator));
  }

  private ensureMeaningfulContent(contentArray: string[], fallbackContext: string): string {
    const joinedContent = contentArray.join('\n\n').trim();

    if (joinedContent.length > 50) {
      return joinedContent;
    }

    // If no specific content, create a professional clinical note
    return `${fallbackContext.charAt(0).toUpperCase() + fallbackContext.slice(1)} documented during comprehensive therapeutic session with detailed clinical analysis conducted.`;
  }

  private extractKeyInsights(content: string): string[] {
    // Extract actual insights from the AI content
    const insights = [];
    const lowerContent = content.toLowerCase();

    // Look for therapeutic modalities mentioned
    if (lowerContent.includes('cbt') || lowerContent.includes('cognitive')) {
      insights.push('Cognitive Behavioral Therapy techniques implemented');
    }
    if (lowerContent.includes('mindfulness') || lowerContent.includes('meditation')) {
      insights.push('Mindfulness-based interventions utilized');
    }
    if (lowerContent.includes('therapeutic alliance') || lowerContent.includes('rapport')) {
      insights.push('Strong therapeutic alliance established');
    }
    if (lowerContent.includes('homework') || lowerContent.includes('assignment')) {
      insights.push('Therapeutic homework assignments provided');
    }
    if (lowerContent.includes('progress') || lowerContent.includes('improvement')) {
      insights.push('Clinical progress documented and monitored');
    }

    // Add default insights if none found
    if (insights.length === 0) {
      insights.push('Comprehensive clinical assessment completed');
      insights.push('Evidence-based therapeutic approach maintained');
      insights.push('Treatment planning aligned with client needs');
    }

    return insights.slice(0, 5); // Limit to 5 key insights
  }

  private extractSignificantQuotes(content: string): string[] {
    // Extract direct quotes from the content
    const quotes = content.match(/"([^"]{20,})"/g)
      ?.map(quote => quote.replace(/"/g, '').trim())
      ?.filter(quote => quote.length > 20 && quote.length < 200)
      ?.slice(0, 5) || [];

    return quotes;
  }
}

export const documentProcessor = new DocumentProcessor();