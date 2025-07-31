import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import csv from 'csv-parser';
import sharp from 'sharp';
import { multiModelAI } from './ai-multi-model';

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
          extractedText = await this.processPDF(filePath);
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
          extractedText = await this.processCSV(filePath);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`);
      }

      // Extract potential client name and session date from content
      const detectedInfo = await this.extractMetadata(extractedText);

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
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }

  private async processWordDocument(filePath: string): Promise<string> {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  private async processTextFile(filePath: string): Promise<string> {
    return fs.readFileSync(filePath, 'utf8');
  }

  private async processImage(filePath: string): Promise<string> {
    // Convert image to base64 for OpenAI Vision API
    const imageBuffer = await sharp(filePath)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    const base64Image = imageBuffer.toString('base64');

    try {
      const result = await multiModelAI.analyzeMultimodalContent(
        `Extract all text content from this image. If this appears to be a clinical document, therapy session notes, or mental health related content, preserve the clinical language and structure. Return the extracted text exactly as it appears in the image. Image data: data:image/jpeg;base64,${base64Image}`,
        'image'
      );

      return result.content;
    } catch (error) {
      console.error('Error processing image with AI:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  private async processExcel(filePath: string): Promise<string> {
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

    return extractedText;
  }

  private async processCSV(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = fs.createReadStream(filePath);
      
      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          const headers = Object.keys(results[0] || {});
          let text = headers.join('\t') + '\n';
          
          results.forEach(row => {
            text += headers.map(header => row[header] || '').join('\t') + '\n';
          });
          
          resolve(text);
        })
        .on('error', reject);
    });
  }

  private async extractMetadata(content: string): Promise<{ clientName?: string; sessionDate?: string }> {
    try {
      const result = await multiModelAI.generateDetailedInsights(
        `Extract client name and session date from this clinical document. Return JSON format with 'clientName' and 'sessionDate' fields. If not found, return null for those fields.\n\nDocument content:\n${content.substring(0, 2000)}`,
        'metadata extraction'
      );

      try {
        const parsed = JSON.parse(result.content);
        return {
          clientName: parsed.clientName || undefined,
          sessionDate: parsed.sessionDate || undefined,
        };
      } catch {
        // If not valid JSON, try to extract from text
        const clientMatch = result.content.match(/client.*?name.*?[:"]\s*([^"\n]+)/i);
        const dateMatch = result.content.match(/session.*?date.*?[:"]\s*([^"\n]+)/i);
        
        return {
          clientName: clientMatch?.[1]?.trim() || undefined,
          sessionDate: dateMatch?.[1]?.trim() || undefined,
        };
      }
    } catch (error) {
      console.error('Error extracting metadata:', error);
      return {};
    }
  }

  async generateProgressNote(extractedText: string, clientId: string, sessionDate: string): Promise<ProgressNote> {
    const prompt = `Comprehensive Clinical Progress Note Generation Prompt

Overview
You are an expert clinical therapist with extensive training in psychotherapy, clinical documentation, and therapeutic modalities including ACT, DBT, Narrative Therapy, and Existentialism. Your task is to create a comprehensive clinical progress note from the provided therapy session content that demonstrates the depth, clinical sophistication, and analytical rigor of an experienced mental health professional.

Document Formatting Requirements
1. Return rich text format (NO MARKDOWN)
2. Use proper formatting with clear section headers
3. Bold important clinical terms and section headers
4. Use italics for emphasis on key therapeutic concepts

Required Document Structure
Create a progress note with the following precise structure:

1. **Title**: "Comprehensive Clinical Progress Note for [Client's Name] - Session Date: [Date]"

2. **Subjective Section**: 
Client's reported experience, direct quotes, emotional state, and presenting concerns. Include specific statements that reveal psychological themes.

3. **Objective Section**: 
Observable behaviors, appearance, affect, mental status observations, therapeutic engagement level, and clinical presentation.

4. **Assessment Section**: 
Clinical formulation, diagnostic considerations, treatment progress, identified patterns, therapeutic alliance quality, and risk assessment.

5. **Plan Section**: 
Specific interventions used, therapeutic modalities applied, homework assignments, goals for next session, and treatment plan modifications.

6. **Supplemental Analyses**:
   - **Tonal Analysis**: Significant shifts in client's emotional tone, voice, or presentation during session
   - **Key Points**: Critical therapeutic insights, breakthroughs, or clinical observations (bullet points)
   - **Significant Quotes**: Important client statements with clinical interpretation
   - **Comprehensive Narrative Summary**: Overall session synthesis and therapeutic significance

Clinical Approach Requirements
Your analysis must demonstrate:
1. **Depth of Clinical Thinking**: Move beyond surface observations to underlying psychological dynamics
2. **Therapeutic Perspective**: Apply evidence-based therapeutic frameworks appropriately
3. **Integration of Therapeutic Frameworks**: Weave together multiple therapeutic approaches
4. **Clinical Sophistication**: Demonstrate advanced understanding of psychotherapeutic processes

Writing Style Requirements
1. **Professional Clinical Voice**: Authoritative yet compassionate clinical documentation style
2. **Structural Integrity**: Clear organization with logical flow between sections
3. **Depth and Detail**: Comprehensive analysis that captures therapeutic nuance
4. **Narrative Cohesion**: Unified clinical narrative throughout the document

The final product should be a clinically sophisticated, detailed, and comprehensive progress note that would meet the highest standards of professional documentation in a mental health setting.

Session Content to Analyze:
${extractedText}

Client ID: ${clientId}
Session Date: ${sessionDate}`;

    try {
      // Use ensemble approach for the most comprehensive clinical analysis
      const result = await multiModelAI.generateEnsembleAnalysis(
        prompt,
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
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      .replace(/\n\s*\n/g, '\n\n'); // Normalize line breaks
  }
}

export const documentProcessor = new DocumentProcessor();