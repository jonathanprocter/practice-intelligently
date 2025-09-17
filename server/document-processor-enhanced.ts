import fs from 'fs';
import path from 'path';
import { Transform, Readable } from 'stream';
import { pipeline } from 'stream/promises';
import zlib from 'zlib';
import crypto from 'crypto';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import sharp from 'sharp';
import { multiModelAI } from './ai-multi-model';
import OpenAI from 'openai';
import { storage } from './storage';
import type { InsertSessionNote, InsertDocument } from '../shared/schema';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

// Constants for optimization
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_CONCURRENT_PROCESSING = 5;
const COMPRESSION_THRESHOLD = 1024 * 1024; // Compress files larger than 1MB

export interface ProcessingProgress {
  id: string;
  fileName: string;
  totalSize: number;
  processedSize: number;
  percentage: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  startTime: Date;
  endTime?: Date;
  result?: any;
}

export interface BatchProcessingOptions {
  parallel?: boolean;
  maxConcurrent?: number;
  compress?: boolean;
  deduplicate?: boolean;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export interface DocumentMetadata {
  fileHash: string;
  originalSize: number;
  compressedSize?: number;
  compressionRatio?: number;
  processingTime: number;
  chunks: number;
  extractedText?: string;
  detectedLanguage?: string;
  documentStructure?: any;
}

export class EnhancedDocumentProcessor extends EventEmitter {
  private openai: OpenAI;
  private processingQueue: Map<string, ProcessingProgress> = new Map();
  private fileHashCache: Map<string, string> = new Map();
  private processingWorkers: number = 0;
  private maxWorkers: number = MAX_CONCURRENT_PROCESSING;

  constructor() {
    super();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Process a document with streaming and chunking support
   */
  async processDocumentStream(
    fileStream: Readable,
    fileName: string,
    fileSize: number,
    options: {
      therapistId: string;
      clientId?: string;
      documentType?: string;
      compress?: boolean;
      onProgress?: (progress: ProcessingProgress) => void;
    }
  ): Promise<DocumentMetadata & { documentId: string }> {
    const processingId = randomUUID();
    const startTime = Date.now();
    
    // Initialize progress tracking
    const progress: ProcessingProgress = {
      id: processingId,
      fileName,
      totalSize: fileSize,
      processedSize: 0,
      percentage: 0,
      status: 'processing',
      startTime: new Date()
    };
    
    this.processingQueue.set(processingId, progress);
    this.emit('processing:start', progress);

    try {
      // Check file size limit
      if (fileSize > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      }

      // Create temporary file path for processing
      const tempDir = path.join(process.cwd(), 'temp_uploads');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, `${processingId}_${fileName}`);
      const writeStream = fs.createWriteStream(tempFilePath);

      // Calculate file hash while streaming
      const hash = crypto.createHash('sha256');
      let processedBytes = 0;

      // Create progress tracking transform stream
      const progressStream = new Transform({
        transform(chunk, encoding, callback) {
          processedBytes += chunk.length;
          hash.update(chunk);
          
          // Update progress
          progress.processedSize = processedBytes;
          progress.percentage = Math.round((processedBytes / fileSize) * 100);
          
          if (options.onProgress) {
            options.onProgress(progress);
          }
          
          this.push(chunk);
          callback();
        }
      });

      // Stream file to disk with progress tracking
      await pipeline(
        fileStream,
        progressStream,
        writeStream
      );

      const fileHash = hash.digest('hex');
      
      // Check for duplicate files
      if (this.fileHashCache.has(fileHash)) {
        // File already processed, return cached result
        const existingDocId = this.fileHashCache.get(fileHash)!;
        fs.unlinkSync(tempFilePath); // Clean up temp file
        
        progress.status = 'completed';
        progress.endTime = new Date();
        this.emit('processing:complete', progress);
        
        return {
          fileHash,
          originalSize: fileSize,
          processingTime: Date.now() - startTime,
          chunks: 1,
          documentId: existingDocId
        };
      }

      // Process file based on type
      const fileExtension = path.extname(fileName).toLowerCase();
      let extractedText = '';
      let metadata: DocumentMetadata = {
        fileHash,
        originalSize: fileSize,
        processingTime: 0,
        chunks: Math.ceil(fileSize / CHUNK_SIZE)
      };

      // Process file in chunks for memory efficiency
      extractedText = await this.processFileInChunks(tempFilePath, fileExtension, progress);
      
      // Compress file if needed
      let finalFilePath = tempFilePath;
      if (options.compress && fileSize > COMPRESSION_THRESHOLD) {
        const compressedPath = await this.compressFile(tempFilePath);
        metadata.compressedSize = fs.statSync(compressedPath).size;
        metadata.compressionRatio = metadata.compressedSize / fileSize;
        finalFilePath = compressedPath;
        fs.unlinkSync(tempFilePath); // Remove uncompressed file
      }

      // Move to permanent storage
      const permanentDir = path.join(process.cwd(), 'uploads', 'documents');
      if (!fs.existsSync(permanentDir)) {
        fs.mkdirSync(permanentDir, { recursive: true });
      }
      
      const permanentPath = path.join(permanentDir, `${fileHash}_${fileName}`);
      fs.renameSync(finalFilePath, permanentPath);

      // Extract metadata and create document record
      const documentData = await this.extractDocumentMetadata(extractedText, fileName);
      
      // Store document in database
      const document = await storage.createDocument({
        fileName: `${fileHash}_${fileName}`,
        originalName: fileName,
        fileType: fileExtension,
        fileSize: metadata.compressedSize || fileSize,
        documentType: options.documentType || 'general',
        filePath: permanentPath,
        therapistId: options.therapistId,
        clientId: options.clientId || undefined,
        contentSummary: documentData.summary,
        aiTags: documentData.tags,
        clinicalKeywords: documentData.keywords,
        extractedText: extractedText.substring(0, 5000), // Store first 5000 chars
        tags: { metadata } // Store metadata in tags field as JSONB
      });

      // Cache the file hash
      this.fileHashCache.set(fileHash, document.id);

      metadata.processingTime = Date.now() - startTime;
      metadata.extractedText = extractedText;

      // Update progress
      progress.status = 'completed';
      progress.endTime = new Date();
      progress.result = document;
      this.emit('processing:complete', progress);

      return {
        ...metadata,
        documentId: document.id
      };
    } catch (error) {
      progress.status = 'failed';
      progress.error = error.message;
      progress.endTime = new Date();
      this.emit('processing:error', { progress, error });
      throw error;
    } finally {
      this.processingQueue.delete(processingId);
    }
  }

  /**
   * Process file in chunks to handle large files efficiently
   */
  private async processFileInChunks(
    filePath: string,
    fileExtension: string,
    progress: ProcessingProgress
  ): Promise<string> {
    const chunks: string[] = [];
    
    switch (fileExtension) {
      case '.pdf':
        chunks.push(await this.processPDFChunked(filePath, progress));
        break;
      case '.docx':
      case '.doc':
        chunks.push(await this.processWordDocument(filePath));
        break;
      case '.txt':
      case '.md':
        chunks.push(await this.processTextFileChunked(filePath, progress));
        break;
      case '.png':
      case '.jpg':
      case '.jpeg':
        chunks.push(await this.processImage(filePath));
        break;
      case '.xlsx':
      case '.xls':
        chunks.push(await this.processExcelChunked(filePath, progress));
        break;
      case '.csv':
        chunks.push(await this.processCSVChunked(filePath, progress));
        break;
      case '.mp3':
      case '.wav':
      case '.m4a':
        chunks.push(await this.processAudio(filePath, progress));
        break;
      case '.zip':
        return await this.processZipFile(filePath, progress);
      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }

    return chunks.join('\n');
  }

  /**
   * Process PDF files in chunks
   */
  private async processPDFChunked(filePath: string, progress: ProcessingProgress): Promise<string> {
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const workerPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;

      const data = new Uint8Array(fs.readFileSync(filePath));
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      
      const textChunks: string[] = [];
      const totalPages = pdf.numPages;
      
      // Process pages in batches
      const batchSize = 10;
      for (let i = 0; i < totalPages; i += batchSize) {
        const batch = [];
        for (let j = i; j < Math.min(i + batchSize, totalPages); j++) {
          batch.push(pdf.getPage(j + 1).then(async page => {
            const textContent = await page.getTextContent();
            return textContent.items.map((item: any) => item.str).join(' ');
          }));
        }
        
        const batchTexts = await Promise.all(batch);
        textChunks.push(...batchTexts);
        
        // Update progress
        progress.percentage = Math.round(((i + batchSize) / totalPages) * 100);
        this.emit('processing:progress', progress);
      }

      return textChunks.join('\n');
    } catch (error) {
      console.error('PDF processing error:', error);
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  }

  /**
   * Process Word documents
   */
  private async processWordDocument(filePath: string): Promise<string> {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  /**
   * Process text files in chunks
   */
  private async processTextFileChunked(filePath: string, progress: ProcessingProgress): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: string[] = [];
      const stream = fs.createReadStream(filePath, { 
        encoding: 'utf8',
        highWaterMark: CHUNK_SIZE 
      });
      
      let processedSize = 0;
      const fileSize = fs.statSync(filePath).size;
      
      stream.on('data', (chunk: string) => {
        chunks.push(chunk);
        processedSize += Buffer.byteLength(chunk);
        progress.percentage = Math.round((processedSize / fileSize) * 100);
        this.emit('processing:progress', progress);
      });
      
      stream.on('end', () => resolve(chunks.join('')));
      stream.on('error', reject);
    });
  }

  /**
   * Process images with OCR
   */
  private async processImage(filePath: string): Promise<string> {
    try {
      // Optimize image first
      const optimizedPath = filePath + '_optimized.jpg';
      await sharp(filePath)
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(optimizedPath);

      // Convert to base64 for OCR
      const imageBuffer = fs.readFileSync(optimizedPath);
      const base64Image = imageBuffer.toString('base64');

      // Use OpenAI Vision API for OCR
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all text from this image. If it's a document, preserve the structure and formatting as much as possible." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ],
          },
        ],
        max_tokens: 4096,
      });

      fs.unlinkSync(optimizedPath); // Clean up optimized image
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Image processing error:', error);
      return ''; // Return empty string if OCR fails
    }
  }

  /**
   * Process Excel files in chunks
   */
  private async processExcelChunked(filePath: string, progress: ProcessingProgress): Promise<string> {
    const workbook = xlsx.readFile(filePath);
    const sheets: string[] = [];
    const totalSheets = workbook.SheetNames.length;
    
    workbook.SheetNames.forEach((sheetName, index) => {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      sheets.push(`Sheet: ${sheetName}\n${JSON.stringify(jsonData, null, 2)}`);
      
      progress.percentage = Math.round(((index + 1) / totalSheets) * 100);
      this.emit('processing:progress', progress);
    });
    
    return sheets.join('\n\n');
  }

  /**
   * Process CSV files in chunks
   */
  private async processCSVChunked(filePath: string, progress: ProcessingProgress): Promise<string> {
    const csvParser = (await import('csv-parser')).default;
    const results: any[] = [];
    
    return new Promise((resolve, reject) => {
      let rowCount = 0;
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (data) => {
          results.push(data);
          rowCount++;
          if (rowCount % 100 === 0) {
            this.emit('processing:progress', progress);
          }
        })
        .on('end', () => {
          resolve(JSON.stringify(results, null, 2));
        })
        .on('error', reject);
    });
  }

  /**
   * Process audio files (transcription)
   */
  private async processAudio(filePath: string, progress: ProcessingProgress): Promise<string> {
    try {
      // Check if file size is within OpenAI limits (25MB)
      const stats = fs.statSync(filePath);
      if (stats.size > 25 * 1024 * 1024) {
        throw new Error('Audio file too large for transcription (max 25MB)');
      }

      // Create a readable stream from the file
      const audioStream = fs.createReadStream(filePath);
      
      // Use OpenAI Whisper API for transcription
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioStream as any,
        model: "whisper-1",
        response_format: "text",
      });

      return transcription as string;
    } catch (error) {
      console.error('Audio processing error:', error);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  /**
   * Process ZIP files and extract documents
   */
  private async processZipFile(filePath: string, progress: ProcessingProgress): Promise<string> {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    const extractedTexts: string[] = [];
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.isDirectory) {
        const tempPath = path.join(path.dirname(filePath), entry.entryName);
        zip.extractEntryTo(entry, path.dirname(tempPath), false, true);
        
        try {
          const ext = path.extname(entry.entryName).toLowerCase();
          if (['.pdf', '.docx', '.txt', '.md'].includes(ext)) {
            const text = await this.processFileInChunks(tempPath, ext, progress);
            extractedTexts.push(`File: ${entry.entryName}\n${text}`);
          }
        } catch (error) {
          console.error(`Error processing ${entry.entryName}:`, error);
        } finally {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        }
      }
      
      progress.percentage = Math.round(((i + 1) / entries.length) * 100);
      this.emit('processing:progress', progress);
    }
    
    return extractedTexts.join('\n\n---\n\n');
  }

  /**
   * Compress file using gzip
   */
  private async compressFile(filePath: string): Promise<string> {
    const compressedPath = filePath + '.gz';
    const readStream = fs.createReadStream(filePath);
    const writeStream = fs.createWriteStream(compressedPath);
    const gzip = zlib.createGzip({ level: 9 });
    
    await pipeline(readStream, gzip, writeStream);
    return compressedPath;
  }

  /**
   * Extract metadata and generate AI tags
   */
  private async extractDocumentMetadata(text: string, fileName: string): Promise<any> {
    try {
      const prompt = `Analyze this document and provide:
1. A brief summary (max 200 words)
2. Top 10 relevant tags with confidence scores
3. Clinical keywords if applicable
4. Document category

Document excerpt: ${text.substring(0, 3000)}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      return {
        summary: result.summary || '',
        tags: result.tags || [],
        keywords: result.keywords || [],
        category: result.category || 'general'
      };
    } catch (error) {
      console.error('Metadata extraction error:', error);
      return {
        summary: '',
        tags: [],
        keywords: [],
        category: 'general'
      };
    }
  }

  /**
   * Batch process multiple documents
   */
  async processBatch(
    files: Array<{ stream: Readable; name: string; size: number }>,
    options: BatchProcessingOptions & {
      therapistId: string;
      clientId?: string;
      onProgress?: (batchProgress: any) => void;
    }
  ): Promise<any[]> {
    const results: any[] = [];
    const errors: any[] = [];
    const maxConcurrent = options.maxConcurrent || this.maxWorkers;
    
    // Process files in parallel with concurrency limit
    const processFile = async (file: any, index: number) => {
      const maxRetries = options.maxRetries || 3;
      let lastError: any;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const result = await this.processDocumentStream(
            file.stream,
            file.name,
            file.size,
            {
              therapistId: options.therapistId,
              clientId: options.clientId,
              compress: options.compress,
              onProgress: (progress) => {
                if (options.onProgress) {
                  options.onProgress({
                    fileIndex: index,
                    fileName: file.name,
                    progress,
                    totalFiles: files.length
                  });
                }
              }
            }
          );
          
          return { success: true, result, fileName: file.name };
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries && options.retryOnFailure) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          }
        }
      }
      
      return { success: false, error: lastError.message, fileName: file.name };
    };

    // Process files with concurrency control
    const queue = [...files.map((file, index) => ({ file, index }))];
    const processing: Promise<any>[] = [];
    
    while (queue.length > 0 || processing.length > 0) {
      while (processing.length < maxConcurrent && queue.length > 0) {
        const item = queue.shift()!;
        const promise = processFile(item.file, item.index).then(result => {
          if (result.success) {
            results.push(result);
          } else {
            errors.push(result);
          }
          return result;
        });
        
        processing.push(promise);
      }
      
      if (processing.length > 0) {
        const completed = await Promise.race(processing);
        const index = processing.findIndex(p => p === completed);
        processing.splice(index, 1);
      }
    }
    
    return {
      processed: results.length,
      failed: errors.length,
      results,
      errors,
      totalTime: Date.now()
    };
  }

  /**
   * Get processing status
   */
  getProcessingStatus(processingId: string): ProcessingProgress | undefined {
    return this.processingQueue.get(processingId);
  }

  /**
   * Get all active processing jobs
   */
  getActiveJobs(): ProcessingProgress[] {
    return Array.from(this.processingQueue.values());
  }

  /**
   * Cancel processing job
   */
  cancelProcessing(processingId: string): boolean {
    const progress = this.processingQueue.get(processingId);
    if (progress && progress.status === 'processing') {
      progress.status = 'failed';
      progress.error = 'Cancelled by user';
      progress.endTime = new Date();
      this.emit('processing:cancelled', progress);
      this.processingQueue.delete(processingId);
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const enhancedDocumentProcessor = new EnhancedDocumentProcessor();