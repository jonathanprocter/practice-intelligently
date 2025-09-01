import { Express } from 'express';
import { clientChartManager } from '../client-chart-manager';
import { enhancedDocumentProcessor } from '../enhanced-document-processor';
import { storage } from '../storage';
import multer from 'multer';
import { z } from 'zod';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

export function registerEnhancedChartRoutes(app: Express) {
  /**
   * Get comprehensive client chart with all data
   */
  app.get('/api/client-chart/:clientId/comprehensive', async (req, res) => {
    try {
      const { clientId } = req.params;
      
      if (!clientId || clientId === 'undefined') {
        return res.status(400).json({ error: 'Valid client ID is required' });
      }

      const chart = await clientChartManager.getComprehensiveChart(clientId);
      res.json(chart);
    } catch (error) {
      console.error('Error fetching comprehensive chart:', error);
      res.status(500).json({ 
        error: 'Failed to fetch comprehensive chart',
        message: error.message 
      });
    }
  });

  /**
   * Get specific section of client chart
   */
  app.get('/api/client-chart/:clientId/section/:section', async (req, res) => {
    try {
      const { clientId, section } = req.params;
      
      const validSections = ['overview', 'sessions', 'documents', 'assessments', 'treatment', 'timeline'];
      if (!validSections.includes(section)) {
        return res.status(400).json({ 
          error: 'Invalid section',
          validSections 
        });
      }

      const data = await clientChartManager.getChartSection(clientId, section as any);
      res.json(data);
    } catch (error) {
      console.error('Error fetching chart section:', error);
      res.status(500).json({ 
        error: 'Failed to fetch chart section',
        message: error.message 
      });
    }
  });

  /**
   * Get longitudinal journey for client
   */
  app.get('/api/client-chart/:clientId/longitudinal', async (req, res) => {
    try {
      const { clientId } = req.params;
      
      const journey = await enhancedDocumentProcessor.buildLongitudinalJourney(clientId);
      res.json(journey);
    } catch (error) {
      console.error('Error building longitudinal journey:', error);
      res.status(500).json({ 
        error: 'Failed to build longitudinal journey',
        message: error.message 
      });
    }
  });

  /**
   * Search within client data
   */
  app.get('/api/client-chart/:clientId/search', async (req, res) => {
    try {
      const { clientId } = req.params;
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const results = await clientChartManager.searchClientData(clientId, q);
      res.json(results);
    } catch (error) {
      console.error('Error searching client data:', error);
      res.status(500).json({ 
        error: 'Failed to search client data',
        message: error.message 
      });
    }
  });

  /**
   * Process and categorize document with enhanced AI
   */
  app.post('/api/documents/process-enhanced', upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const { therapistId, clientId } = req.body;
      
      if (!therapistId) {
        return res.status(400).json({ error: 'Therapist ID is required' });
      }

      // Convert buffer to string
      const fileContent = req.file.buffer.toString('utf-8');
      
      // Process document with enhanced processor
      const analysis = await enhancedDocumentProcessor.processAndCategorizeDocument(
        fileContent,
        req.file.originalname,
        req.file.mimetype,
        therapistId,
        clientId
      );

      // Store document in database
      const document = await storage.createDocument({
        clientId,
        therapistId,
        fileName: req.file.originalname,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        documentType: analysis.category.primary,
        description: analysis.contentSummary,
        filePath: `/uploads/${req.file.originalname}`,
        isConfidential: analysis.sensitivityLevel === 'confidential',
        aiTags: analysis.aiTags,
        category: analysis.category.primary,
        subcategory: analysis.category.secondary,
        contentSummary: analysis.contentSummary,
        clinicalKeywords: analysis.clinicalKeywords,
        confidenceScore: analysis.category.confidence,
        sensitivityLevel: analysis.sensitivityLevel,
        extractedText: fileContent.substring(0, 10000) // Store first 10k chars
      });

      // Link to sessions/appointments if found
      if (analysis.chartPlacement.linkedSessions.length > 0) {
        for (const sessionId of analysis.chartPlacement.linkedSessions) {
          // Update session note with document reference
          await storage.updateSessionNote(sessionId, {
            aiTags: [...(await storage.getSessionNote(sessionId))?.aiTags || [], ...analysis.aiTags.map(t => t.tag)]
          });
        }
      }

      res.json({
        success: true,
        document,
        analysis,
        message: 'Document processed and categorized successfully'
      });
    } catch (error) {
      console.error('Error processing document:', error);
      res.status(500).json({ 
        error: 'Failed to process document',
        message: error.message 
      });
    }
  });

  /**
   * Get AI tags for a document
   */
  app.get('/api/documents/:documentId/tags', async (req, res) => {
    try {
      const { documentId } = req.params;
      
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      res.json({
        documentId,
        fileName: document.fileName,
        aiTags: document.aiTags || [],
        category: document.category,
        subcategory: document.subcategory,
        clinicalKeywords: document.clinicalKeywords || [],
        sensitivityLevel: document.sensitivityLevel
      });
    } catch (error) {
      console.error('Error fetching document tags:', error);
      res.status(500).json({ 
        error: 'Failed to fetch document tags',
        message: error.message 
      });
    }
  });

  /**
   * Update document tags and categorization
   */
  app.put('/api/documents/:documentId/tags', async (req, res) => {
    try {
      const { documentId } = req.params;
      const { aiTags, category, subcategory, sensitivityLevel } = req.body;
      
      const document = await storage.updateDocument(documentId, {
        aiTags,
        category,
        subcategory,
        sensitivityLevel
      });

      res.json({
        success: true,
        document,
        message: 'Document tags updated successfully'
      });
    } catch (error) {
      console.error('Error updating document tags:', error);
      res.status(500).json({ 
        error: 'Failed to update document tags',
        message: error.message 
      });
    }
  });

  /**
   * Get client progress metrics
   */
  app.get('/api/client-chart/:clientId/progress-metrics', async (req, res) => {
    try {
      const { clientId } = req.params;
      const { timeframe = 'month' } = req.query;
      
      // Get session notes for timeframe
      const sessions = await storage.getSessionNotesByClientId(clientId);
      
      // Calculate progress metrics
      const metrics = {
        sessionCount: sessions.length,
        averageSentiment: 0,
        progressIndicators: [],
        riskFactors: [],
        improvements: [],
        challenges: []
      };

      // Analyze each session for metrics
      for (const session of sessions.slice(0, 10)) {
        if (session.assessment) {
          // Extract progress indicators
          if (session.assessment.toLowerCase().includes('improvement') ||
              session.assessment.toLowerCase().includes('progress')) {
            metrics.improvements.push({
              date: session.sessionDate,
              note: session.assessment.substring(0, 100)
            });
          }
          
          // Extract challenges
          if (session.assessment.toLowerCase().includes('challenge') ||
              session.assessment.toLowerCase().includes('difficulty')) {
            metrics.challenges.push({
              date: session.sessionDate,
              note: session.assessment.substring(0, 100)
            });
          }
        }
      }

      res.json(metrics);
    } catch (error) {
      console.error('Error fetching progress metrics:', error);
      res.status(500).json({ 
        error: 'Failed to fetch progress metrics',
        message: error.message 
      });
    }
  });

  /**
   * Get clinical themes across sessions
   */
  app.get('/api/client-chart/:clientId/clinical-themes', async (req, res) => {
    try {
      const { clientId } = req.params;
      
      const sessions = await storage.getSessionNotesByClientId(clientId);
      
      // Extract themes from AI tags
      const themeMap = new Map<string, { count: number; sessions: string[] }>();
      
      for (const session of sessions) {
        const tags = Array.isArray(session.aiTags) ? session.aiTags : [];
        
        for (const tag of tags) {
          const tagStr = typeof tag === 'string' ? tag : tag.tag;
          if (!tagStr) continue;
          
          if (!themeMap.has(tagStr)) {
            themeMap.set(tagStr, { count: 0, sessions: [] });
          }
          
          const theme = themeMap.get(tagStr)!;
          theme.count++;
          theme.sessions.push(session.id);
        }
      }

      // Convert to array and sort by frequency
      const themes = Array.from(themeMap.entries())
        .map(([theme, data]) => ({
          theme,
          frequency: data.count,
          sessionIds: data.sessions,
          trend: data.count > 3 ? 'recurring' : 'occasional'
        }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 20);

      res.json(themes);
    } catch (error) {
      console.error('Error fetching clinical themes:', error);
      res.status(500).json({ 
        error: 'Failed to fetch clinical themes',
        message: error.message 
      });
    }
  });

  /**
   * Get document categorization statistics
   */
  app.get('/api/documents/stats/:therapistId', async (req, res) => {
    try {
      const { therapistId } = req.params;
      
      const documents = await storage.getDocumentsByTherapist(therapistId);
      
      // Calculate statistics
      const stats = {
        total: documents.length,
        byCategory: {},
        bySensitivity: {},
        recentlyProcessed: documents.slice(0, 5).map(d => ({
          id: d.id,
          fileName: d.fileName,
          category: d.category,
          processedAt: d.createdAt
        }))
      };

      // Count by category
      for (const doc of documents) {
        const category = doc.category || 'uncategorized';
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
        
        const sensitivity = doc.sensitivityLevel || 'standard';
        stats.bySensitivity[sensitivity] = (stats.bySensitivity[sensitivity] || 0) + 1;
      }

      res.json(stats);
    } catch (error) {
      console.error('Error fetching document statistics:', error);
      res.status(500).json({ 
        error: 'Failed to fetch document statistics',
        message: error.message 
      });
    }
  });

  /**
   * Batch process documents for a client
   */
  app.post('/api/documents/batch-process', upload.array('documents', 10), async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
      }

      const { therapistId, clientId } = req.body;
      const results = [];
      const errors = [];

      for (const file of req.files as Express.Multer.File[]) {
        try {
          const fileContent = file.buffer.toString('utf-8');
          
          const analysis = await enhancedDocumentProcessor.processAndCategorizeDocument(
            fileContent,
            file.originalname,
            file.mimetype,
            therapistId,
            clientId
          );

          results.push({
            fileName: file.originalname,
            analysis,
            success: true
          });
        } catch (error) {
          errors.push({
            fileName: file.originalname,
            error: error.message
          });
        }
      }

      res.json({
        processed: results.length,
        failed: errors.length,
        results,
        errors
      });
    } catch (error) {
      console.error('Error in batch processing:', error);
      res.status(500).json({ 
        error: 'Failed to batch process documents',
        message: error.message 
      });
    }
  });
}