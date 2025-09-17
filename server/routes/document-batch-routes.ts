import type { Express } from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import { enhancedDocumentProcessor } from '../document-processor-enhanced';
import { storage } from '../storage';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import { multiModelAI } from '../ai-multi-model';
import AdmZip from 'adm-zip';

// Configure multer for streaming uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 20 // Max 20 files at once
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
      '.pdf', '.docx', '.doc', '.txt', '.md',
      '.png', '.jpg', '.jpeg', '.gif', '.bmp',
      '.xlsx', '.xls', '.csv',
      '.mp3', '.wav', '.m4a',
      '.zip'
    ];
    
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not supported`));
    }
  }
});

// WebSocket connections for progress updates
const progressConnections = new Map<string, any>();

export function registerDocumentBatchRoutes(app: Express, server: any) {
  // Create WebSocket server for progress updates
  const wss = new WebSocketServer({ 
    server,
    path: '/ws/document-progress'
  });

  wss.on('connection', (ws, req) => {
    const sessionId = req.url?.split('sessionId=')[1] || '';
    if (sessionId) {
      progressConnections.set(sessionId, ws);
      
      ws.on('close', () => {
        progressConnections.delete(sessionId);
      });
    }
  });

  // Subscribe to processor events
  enhancedDocumentProcessor.on('processing:progress', (progress) => {
    // Send progress updates to connected clients
    progressConnections.forEach(ws => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'progress',
          data: progress
        }));
      }
    });
  });

  enhancedDocumentProcessor.on('processing:complete', (progress) => {
    progressConnections.forEach(ws => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'complete',
          data: progress
        }));
      }
    });
  });

  enhancedDocumentProcessor.on('processing:error', ({ progress, error }) => {
    progressConnections.forEach(ws => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          data: { progress, error: error.message }
        }));
      }
    });
  });

  /**
   * Batch upload endpoint with streaming and progress
   */
  app.post('/api/documents/batch-upload', upload.array('documents', 20), async (req, res) => {
    try {
      const { therapistId, clientId, compress = 'true', deduplicate = 'true' } = req.body;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
      }

      if (!therapistId) {
        return res.status(400).json({ error: 'Therapist ID required' });
      }

      // Convert files to streams
      const fileStreams = files.map(file => ({
        stream: Readable.from(file.buffer),
        name: file.originalname,
        size: file.size
      }));

      // Process batch with progress tracking
      const sessionId = req.headers['x-session-id'] as string;
      const results = await enhancedDocumentProcessor.processBatch(
        fileStreams,
        {
          therapistId,
          clientId,
          compress: compress === 'true',
          deduplicate: deduplicate === 'true',
          parallel: true,
          maxConcurrent: 5,
          retryOnFailure: true,
          maxRetries: 3,
          onProgress: (batchProgress) => {
            // Send progress via WebSocket if session connected
            const ws = progressConnections.get(sessionId);
            if (ws && ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({
                type: 'batch-progress',
                data: batchProgress
              }));
            }
          }
        }
      );

      res.json({
        success: true,
        ...results
      });
    } catch (error) {
      console.error('Batch upload error:', error);
      res.status(500).json({
        error: 'Batch processing failed',
        message: error.message
      });
    }
  });

  /**
   * Process ZIP file containing multiple documents
   */
  app.post('/api/documents/import-zip', upload.single('zipFile'), async (req, res) => {
    try {
      const { therapistId, clientId } = req.body;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'No ZIP file provided' });
      }

      if (!therapistId) {
        return res.status(400).json({ error: 'Therapist ID required' });
      }

      // Create temporary directory for extraction
      const tempDir = path.join(process.cwd(), 'temp_uploads', `zip_${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });

      try {
        // Extract ZIP file
        const zip = new AdmZip(file.buffer);
        zip.extractAllTo(tempDir, true);

        // Get all extracted files
        const extractedFiles: any[] = [];
        const walkDir = (dir: string) => {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
              walkDir(filePath);
            } else {
              const ext = path.extname(file).toLowerCase();
              if (['.pdf', '.docx', '.doc', '.txt', '.md', '.png', '.jpg', '.jpeg', '.csv', '.xlsx'].includes(ext)) {
                extractedFiles.push({
                  path: filePath,
                  name: file,
                  size: stat.size
                });
              }
            }
          }
        };
        
        walkDir(tempDir);

        // Process extracted files
        const fileStreams = extractedFiles.map(file => ({
          stream: fs.createReadStream(file.path),
          name: file.name,
          size: file.size
        }));

        const results = await enhancedDocumentProcessor.processBatch(
          fileStreams,
          {
            therapistId,
            clientId,
            compress: true,
            deduplicate: true,
            parallel: true,
            maxConcurrent: 3
          }
        );

        // Clean up temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });

        res.json({
          success: true,
          extractedCount: extractedFiles.length,
          ...results
        });
      } catch (error) {
        // Clean up on error
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        throw error;
      }
    } catch (error) {
      console.error('ZIP import error:', error);
      res.status(500).json({
        error: 'ZIP import failed',
        message: error.message
      });
    }
  });

  /**
   * Process CSV/Excel file for batch client import
   */
  app.post('/api/documents/import-clients', upload.single('file'), async (req, res) => {
    try {
      const { therapistId } = req.body;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      if (!therapistId) {
        return res.status(400).json({ error: 'Therapist ID required' });
      }

      const ext = path.extname(file.originalname).toLowerCase();
      let clientData: any[] = [];

      if (ext === '.csv') {
        // Parse CSV
        const csvParser = (await import('csv-parser')).default;
        const stream = Readable.from(file.buffer);
        
        await new Promise((resolve, reject) => {
          stream
            .pipe(csvParser())
            .on('data', (data) => clientData.push(data))
            .on('end', resolve)
            .on('error', reject);
        });
      } else if (['.xlsx', '.xls'].includes(ext)) {
        // Parse Excel
        const xlsx = await import('xlsx');
        const workbook = xlsx.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        clientData = xlsx.utils.sheet_to_json(sheet);
      } else {
        return res.status(400).json({ error: 'File must be CSV or Excel format' });
      }

      // Process and validate client data
      const results = {
        imported: 0,
        failed: 0,
        errors: [] as any[]
      };

      for (const row of clientData) {
        try {
          // Map common field names
          const clientInfo = {
            firstName: row.firstName || row['First Name'] || row.first_name || '',
            lastName: row.lastName || row['Last Name'] || row.last_name || '',
            email: row.email || row.Email || '',
            phone: row.phone || row.Phone || row.telephone || '',
            dateOfBirth: row.dateOfBirth || row['Date of Birth'] || row.dob || null,
            therapistId,
            status: 'active'
          };

          // Validate required fields
          if (!clientInfo.firstName || !clientInfo.lastName) {
            throw new Error('First name and last name are required');
          }

          // Create client
          await storage.createClient(clientInfo);
          results.imported++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: clientData.indexOf(row) + 1,
            error: error.message,
            data: row
          });
        }
      }

      res.json({
        success: true,
        totalRows: clientData.length,
        ...results
      });
    } catch (error) {
      console.error('Client import error:', error);
      res.status(500).json({
        error: 'Client import failed',
        message: error.message
      });
    }
  });

  /**
   * Get processing status for a job
   */
  app.get('/api/documents/processing-status/:jobId', (req, res) => {
    const { jobId } = req.params;
    const status = enhancedDocumentProcessor.getProcessingStatus(jobId);
    
    if (status) {
      res.json(status);
    } else {
      res.status(404).json({ error: 'Job not found' });
    }
  });

  /**
   * Get all active processing jobs
   */
  app.get('/api/documents/active-jobs', (req, res) => {
    const jobs = enhancedDocumentProcessor.getActiveJobs();
    res.json(jobs);
  });

  /**
   * Cancel a processing job
   */
  app.post('/api/documents/cancel/:jobId', (req, res) => {
    const { jobId } = req.params;
    const cancelled = enhancedDocumentProcessor.cancelProcessing(jobId);
    
    if (cancelled) {
      res.json({ success: true, message: 'Job cancelled' });
    } else {
      res.status(404).json({ error: 'Job not found or already completed' });
    }
  });

  /**
   * Transcribe audio file
   */
  app.post('/api/documents/transcribe-audio', upload.single('audio'), async (req, res) => {
    try {
      const { therapistId, clientId, sessionDate } = req.body;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      if (!therapistId) {
        return res.status(400).json({ error: 'Therapist ID required' });
      }

      // Check file type
      const ext = path.extname(file.originalname).toLowerCase();
      if (!['.mp3', '.wav', '.m4a', '.webm'].includes(ext)) {
        return res.status(400).json({ error: 'File must be an audio format (MP3, WAV, M4A, WEBM)' });
      }

      // Process audio file
      const stream = Readable.from(file.buffer);
      const result = await enhancedDocumentProcessor.processDocumentStream(
        stream,
        file.originalname,
        file.size,
        {
          therapistId,
          clientId,
          documentType: 'session-transcript',
          compress: false
        }
      );

      // Create session note from transcription if requested
      if (clientId && sessionDate && result.extractedText) {
        const sessionNote = await storage.createSessionNote({
          clientId,
          therapistId,
          sessionDate: new Date(sessionDate),
          noteType: 'progress',
          content: result.extractedText,
          subjective: 'Transcribed from audio recording',
          objective: '',
          assessment: '',
          plan: '',
          metadata: {
            audioFile: file.originalname,
            transcriptionId: result.documentId
          }
        });

        result.sessionNoteId = sessionNote.id;
      }

      res.json({
        success: true,
        documentId: result.documentId,
        sessionNoteId: result.sessionNoteId,
        transcription: result.extractedText?.substring(0, 1000) // Return first 1000 chars
      });
    } catch (error) {
      console.error('Audio transcription error:', error);
      res.status(500).json({
        error: 'Transcription failed',
        message: error.message
      });
    }
  });

  /**
   * Analyze document batch for patterns
   */
  app.post('/api/documents/analyze-batch', async (req, res) => {
    try {
      const { documentIds, analysisType = 'comprehensive' } = req.body;
      
      if (!documentIds || documentIds.length === 0) {
        return res.status(400).json({ error: 'Document IDs required' });
      }

      const documents = await Promise.all(
        documentIds.map(id => storage.getDocument(id))
      );

      // Perform batch analysis
      const analysis = {
        documentCount: documents.length,
        commonThemes: [] as string[],
        timeline: [] as any[],
        riskFactors: [] as string[],
        progressIndicators: [] as string[],
        recommendations: [] as string[]
      };

      // Extract text from all documents
      const allText = documents
        .map(doc => doc.extractedText || doc.contentSummary || '')
        .join('\n\n');

      if (allText.length > 0) {
        // Use AI to analyze patterns
        const prompt = `Analyze these ${documents.length} clinical documents and identify:
1. Common themes and patterns
2. Risk factors or concerns
3. Progress indicators
4. Treatment recommendations

Focus on clinically relevant insights that would help a therapist.

Documents content: ${allText.substring(0, 10000)}`;

        const response = await multiModelAI.generateResponse(prompt, 'claude');
        
        // Parse response and populate analysis
        analysis.commonThemes = response.match(/theme[s]?:?\s*([^\n]+)/gi)?.map(m => m.replace(/theme[s]?:?\s*/i, '')) || [];
        analysis.riskFactors = response.match(/risk[s]?:?\s*([^\n]+)/gi)?.map(m => m.replace(/risk[s]?:?\s*/i, '')) || [];
        analysis.progressIndicators = response.match(/progress:?\s*([^\n]+)/gi)?.map(m => m.replace(/progress:?\s*/i, '')) || [];
        analysis.recommendations = response.match(/recommend[ation]?[s]?:?\s*([^\n]+)/gi)?.map(m => m.replace(/recommend[ation]?[s]?:?\s*/i, '')) || [];
      }

      res.json({
        success: true,
        analysis
      });
    } catch (error) {
      console.error('Batch analysis error:', error);
      res.status(500).json({
        error: 'Analysis failed',
        message: error.message
      });
    }
  });

  /**
   * Get document processing statistics
   */
  app.get('/api/documents/statistics', async (req, res) => {
    try {
      const { therapistId, startDate, endDate } = req.query;
      
      const stats = await storage.getDocumentStatistics({
        therapistId: therapistId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.json(stats);
    } catch (error) {
      console.error('Statistics error:', error);
      res.status(500).json({
        error: 'Failed to get statistics',
        message: error.message
      });
    }
  });
}