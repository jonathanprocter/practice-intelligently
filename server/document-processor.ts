import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import sharp from 'sharp';
import { multiModelAI } from './ai-multi-model';

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
    // Use the legacy build for Node.js environments
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    return pdfjsLib;
  } catch (error) {
    console.error('Failed to import pdfjs-dist:', error);
    throw new Error('PDF processing library unavailable');
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
  clientId: string;
  sessionDate: string;
  createdAt: Date;
}

export class DocumentProcessor {
  
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
            console.warn('CSV processing failed:', csvError.message);
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
      console.error('Error processing document:', error);
      throw new Error(`Failed to process ${fileExtension} file: ${error?.message || 'Unknown error'}`);
    }
  }

  private async processPDF(filePath: string): Promise<string> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('PDF file not found');
      }
      
      console.log('Processing PDF using pdfjs-dist:', filePath);
      
      const pdfjsLib = await getPdfJS();
      
      // Read PDF file as buffer and convert to Uint8Array
      const pdfBuffer = fs.readFileSync(filePath);
      const pdfData = new Uint8Array(pdfBuffer);
      
      // Parse PDF document
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
          console.log(`Processing PDF page ${pageNum}...`);
          
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
          console.warn(`Failed to process PDF page ${pageNum}:`, pageError.message);
        }
      }
      
      // Clean up document
      pdfDocument.destroy();
      
      if (fullText.trim().length === 0) {
        throw new Error('No text could be extracted from PDF. The PDF might be image-based or encrypted.');
      }
      
      console.log('Successfully extracted text from PDF, length:', fullText.length);
      return fullText;
    } catch (error: any) {
      console.error('PDF processing error:', error);
      throw new Error(`PDF processing failed: ${error.message || 'Unknown error'}`);
    }
  }

  private async processWordDocument(filePath: string): Promise<string> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('Word document file not found');
      }
      const result = await mammoth.extractRawText({ path: filePath });
      if (!result.value || result.value.trim().length === 0) {
        throw new Error('No text content found in Word document');
      }
      return result.value;
    } catch (error: any) {
      console.error('Word document processing error:', error);
      throw new Error(`Failed to process Word document: ${error.message || 'Unknown error'}`);
    }
  }

  private async processTextFile(filePath: string): Promise<string> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('Text file not found');
      }
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content || content.trim().length === 0) {
        throw new Error('No content found in text file');
      }
      return content;
    } catch (error: any) {
      console.error('Text file processing error:', error);
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
      if (!fs.existsSync(filePath)) {
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
      console.error('Excel processing error:', error);
      throw new Error(`Failed to process Excel file: ${error.message || 'Unknown error'}`);
    }
  }

  private async processCSV(filePath: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!fs.existsSync(filePath)) {
          return reject(new Error('CSV file not found'));
        }
        
        const csvParserModule = await getCsvParser();
        const results: any[] = [];
        const stream = fs.createReadStream(filePath);
        
        stream
          .pipe(csvParserModule())
          .on('data', (data) => results.push(data))
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
          .on('error', (error) => {
            reject(new Error(`Failed to read CSV file: ${error.message}`));
          });
      } catch (error) {
        reject(new Error(`Failed to process CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }

  private async extractMetadata(content: string, filename?: string): Promise<{ clientName?: string; sessionDate?: string }> {
    try {
      // First, try to extract from filename - this is often more reliable
      const filenameData = this.extractFromFilename(filename || '');
      
      // Then analyze content for missing information
      let contentData: { clientName?: string; sessionDate?: string } = {};
      
      if (content && content.trim().length > 0) {
        const analysisPrompt = `Extract client name and session date from this clinical document. 

RESPOND WITH ONLY VALID JSON in this exact format:
{"clientName": "First Last", "sessionDate": "YYYY-MM-DD"}

If information is not found, use null:
{"clientName": null, "sessionDate": null}

Look for:
- Client names in patterns like "Client: [Name]", "Patient: [Name]", or direct name mentions
- Dates in patterns like "Date: [Date]", "Session Date: [Date]", timestamps, or text like "January 20, 2025"

Document content:
${content.substring(0, 3000)}`;

        const result = await multiModelAI.generateDetailedInsights(analysisPrompt, 'metadata extraction');

        try {
          // Clean the AI response first
          let cleanResponse = result.content.trim();
          
          // Remove any markdown formatting
          cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          
          // Try to parse as JSON first
          const parsed = JSON.parse(cleanResponse);
          contentData = {
            clientName: parsed.clientName || undefined,
            sessionDate: parsed.sessionDate || undefined,
          };
        } catch (jsonError) {
          // Fallback: extract using regex patterns from AI response
          const clientMatch = result.content.match(/(?:client.*?name|name).*?[:"]\s*([^"\n,]+)/i);
          const dateMatch = result.content.match(/(?:session.*?date|date).*?[:"]\s*([^"\n,]+)/i);
          
          contentData = {
            clientName: clientMatch?.[1]?.trim().replace(/['"]/g, '') || undefined,
            sessionDate: dateMatch?.[1]?.trim().replace(/['"]/g, '') || undefined,
          };
        }
      }

      // Combine filename and content data, prioritizing filename for names and content for dates
      return {
        clientName: filenameData.clientName || contentData.clientName,
        sessionDate: contentData.sessionDate || filenameData.sessionDate,
      };
    } catch (error) {
      console.error('Error extracting metadata:', error);
      return {};
    }
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
      // Use ensemble approach for the most comprehensive clinical analysis
      const result = await multiModelAI.generateEnsembleAnalysis(
        comprehensivePrompt,
        'comprehensive clinical progress note generation'
      );

      const progressNoteContent = result.content;
      
      // Parse the generated content into structured sections
      return this.parseProgressNote(progressNoteContent, clientId, sessionDate);
    } catch (error) {
      console.error('Error generating progress note:', error);
      throw new Error('Failed to generate progress note with AI');
    }
  }

  private parseProgressNote(content: string, clientId: string, sessionDate: string): ProgressNote {
    // Extract sections using regex patterns
    const titleMatch = content.match(/(?:^|\n)(.+?(?:Progress Note|Clinical Note).+?)(?:\n|$)/i);
    const subjectiveMatch = content.match(new RegExp('(?:Subjective|SUBJECTIVE)[:\\s]*\\n(.*?)(?=\\n(?:Objective|OBJECTIVE|Assessment|ASSESSMENT))', 'is'));
    const objectiveMatch = content.match(new RegExp('(?:Objective|OBJECTIVE)[:\\s]*\\n(.*?)(?=\\n(?:Assessment|ASSESSMENT|Plan|PLAN))', 'is'));
    const assessmentMatch = content.match(new RegExp('(?:Assessment|ASSESSMENT)[:\\s]*\\n(.*?)(?=\\n(?:Plan|PLAN|Supplemental|SUPPLEMENTAL))', 'is'));
    const planMatch = content.match(new RegExp('(?:Plan|PLAN)[:\\s]*\\n(.*?)(?=\\n(?:Supplemental|SUPPLEMENTAL|Tonal|TONAL|Key|KEY|$))', 'is'));
    const tonalMatch = content.match(new RegExp('(?:Tonal Analysis|TONAL ANALYSIS)[:\\s]*\\n(.*?)(?=\\n(?:Key Points|KEY POINTS|Significant|SIGNIFICANT))', 'is'));
    const keyPointsMatch = content.match(new RegExp('(?:Key Points|KEY POINTS)[:\\s]*\\n(.*?)(?=\\n(?:Significant|SIGNIFICANT|Comprehensive|COMPREHENSIVE))', 'is'));
    const quotesMatch = content.match(new RegExp('(?:Significant Quotes|SIGNIFICANT QUOTES)[:\\s]*\\n(.*?)(?=\\n(?:Comprehensive|COMPREHENSIVE|$))', 'is'));
    const narrativeMatch = content.match(new RegExp('(?:Comprehensive Narrative Summary|COMPREHENSIVE NARRATIVE SUMMARY)[:\\s]*\\n(.*?)$', 'is'));

    // Extract key points as array
    const keyPointsText = keyPointsMatch?.[1] || '';
    const keyPoints = keyPointsText
      .split(/[•\n-]/)
      .map(point => point.trim())
      .filter(point => point.length > 10); // Filter out short fragments

    // Extract significant quotes as array
    const quotesText = quotesMatch?.[1] || '';
    const significantQuotes = quotesText
      .split(/["\n]/)
      .map(quote => quote.trim())
      .filter(quote => quote.length > 10 && !quote.match(/^[A-Z][a-z]+ (said|stated|mentioned)/)); // Filter out descriptive text

    return {
      title: titleMatch?.[1]?.trim() || `Clinical Progress Note - ${sessionDate}`,
      subjective: this.cleanContent(subjectiveMatch?.[1] || 'No subjective data captured.'),
      objective: this.cleanContent(objectiveMatch?.[1] || 'No objective observations captured.'),
      assessment: this.cleanContent(assessmentMatch?.[1] || 'No assessment provided.'),
      plan: this.cleanContent(planMatch?.[1] || 'No treatment plan specified.'),
      tonalAnalysis: this.cleanContent(tonalMatch?.[1] || 'No tonal analysis provided.'),
      keyPoints,
      significantQuotes,
      narrativeSummary: this.cleanContent(narrativeMatch?.[1] || 'No narrative summary provided.'),
      clientId,
      sessionDate,
      createdAt: new Date(),
    };
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
}

export const documentProcessor = new DocumentProcessor();