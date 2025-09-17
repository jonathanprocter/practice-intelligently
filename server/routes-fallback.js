// Temporary fallback routes to get the app running
import express from 'express';
import aiServices from './ai-services.js';
import multer from 'multer';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';

// Configure multer for file uploads
const upload = multer({ 
  dest: 'temp_uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const router = express.Router();

// Simple fallback responses to prevent React errors
router.get('/clients/:id', (req, res) => {
  res.json({
    id: req.params.id,
    firstName: 'Demo',
    lastName: 'Client',
    email: 'demo@example.com',
    phoneNumber: '(555) 123-4567',
    dateOfBirth: '1990-01-01',
    status: 'active',
    lastContact: new Date().toISOString(),
    hipaaSignedDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
});

router.get('/clients', (req, res) => {
  res.json([]);
});

router.get('/action-items/urgent/:therapistId', (req, res) => {
  res.json([]);
});

router.get('/health/ai-services', (req, res) => {
  const status = aiServices.getStatus();
  
  // Convert object format to array format that the frontend expects
  const statusArray = [
    { service: 'openai', status: status.openai?.status || 'offline', error: status.openai?.error },
    { service: 'anthropic', status: status.anthropic?.status || 'offline', error: status.anthropic?.error },
    { service: 'perplexity', status: status.perplexity?.status || 'offline', error: status.perplexity?.error },
    { service: 'gemini', status: status.gemini?.status || 'offline', error: status.gemini?.error }
  ];
  
  res.json(statusArray);
});

router.get('/dashboard/stats/:therapistId', (req, res) => {
  res.json({
    totalClients: 0,
    totalSessions: 0,
    weeklyAppointments: 0,
    upcomingAppointments: 0,
    recentActivity: []
  });
});

router.get('/appointments/today/:therapistId', (req, res) => {
  res.json([]);
});

router.get('/ai-insights/:therapistId', (req, res) => {
  res.json({
    insights: [],
    lastUpdated: new Date().toISOString()
  });
});

router.get('/recent-activity/:therapistId', (req, res) => {
  res.json([]);
});

router.get('/calendar/events', (req, res) => {
  res.json([]);
});

router.get('/session-notes/today/:therapistId', (req, res) => {
  res.json([]);
});

router.get('/appointments/:therapistId', (req, res) => {
  res.json([]);
});

router.put('/appointments/:id', (req, res) => {
  res.json({
    id: req.params.id,
    clientId: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
    type: 'therapy',
    status: req.body.status || 'completed',
    notes: 'Session completed',
    clientName: 'Demo Client'
  });
});

router.delete('/appointments/:id', (req, res) => {
  res.json({ success: true, id: req.params.id });
});

// Client-specific endpoints
router.get('/appointments/client/:clientId', (req, res) => {
  res.json([]);
});

router.get('/session-notes/client/:clientId', (req, res) => {
  res.json([]);
});

router.get('/ai-insights/client/:clientId', (req, res) => {
  res.json([]);
});

// Session notes endpoints  
router.get('/session-notes', (req, res) => {
  res.json([]);
});

router.post('/session-notes', (req, res) => {
  res.json({
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  });
});

router.put('/session-notes/:id', (req, res) => {
  res.json({
    id: req.params.id,
    ...req.body,
    updatedAt: new Date().toISOString()
  });
});

router.delete('/session-notes/:id', (req, res) => {
  res.json({ success: true });
});

// API status endpoints
router.get('/api-status', (req, res) => {
  const status = aiServices.getStatus();
  res.json([
    { service: 'openai', status: status.openai?.status || 'offline', error: status.openai?.error },
    { service: 'anthropic', status: status.anthropic?.status || 'offline', error: status.anthropic?.error },
    { service: 'perplexity', status: status.perplexity?.status || 'offline', error: status.perplexity?.error },
    { service: 'gemini', status: status.gemini?.status || 'offline', error: status.gemini?.error }
  ]);
});

router.get('/calendar/connection-status', (req, res) => {
  res.json({ connected: false });
});

// Action items endpoints
router.get('/action-items', (req, res) => {
  res.json([]);
});

router.post('/action-items', (req, res) => {
  res.json({
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  });
});

router.put('/action-items/:id', (req, res) => {
  res.json({
    id: req.params.id,
    ...req.body,
    updatedAt: new Date().toISOString()
  });
});

// Progress metrics
router.get('/progress-metrics/:therapistId', (req, res) => {
  res.json([]);
});

// User endpoints
router.get('/users/:userId', (req, res) => {
  res.json({
    id: req.params.userId,
    name: 'Demo User',
    email: 'demo@example.com'
  });
});

router.put('/users/:userId', (req, res) => {
  res.json({
    id: req.params.userId,
    ...req.body
  });
});

// AI insights endpoints
router.post('/ai-insights/generate', async (req, res) => {
  try {
    if (!aiServices.isAvailable()) {
      return res.status(503).json({ 
        error: 'AI services not available',
        message: 'Please configure OPENAI_API_KEY or ANTHROPIC_API_KEY environment variables'
      });
    }

    const { sessionData, historicalData } = req.body;
    
    if (!sessionData) {
      return res.status(400).json({ error: 'Session data is required' });
    }

    const result = await aiServices.generateInsights(sessionData, historicalData || []);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json(result.insights);
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

router.patch('/ai-insights/:id/read', (req, res) => {
  res.json({ success: true });
});

// Session preparation
router.post('/session-notes/:id/generate-prep', (req, res) => {
  res.json({ appointmentsUpdated: 0 });
});

router.post('/session-notes/:id/generate-tags', async (req, res) => {
  try {
    if (!aiServices.isAvailable()) {
      return res.json({
        id: req.params.id,
        aiTags: ['therapy', 'session', 'clinical']
      });
    }

    const { content } = req.body;
    if (!content) {
      return res.json({
        id: req.params.id,
        aiTags: ['therapy', 'session']
      });
    }

    const result = await aiServices.analyzeDocument(content, { generateTags: true });
    
    // Extract tags from analysis
    const tags = [];
    if (result.success && result.analysis) {
      // Parse key themes and convert to tags
      const themes = result.analysis.match(/Key Themes:?\s*([\s\S]*?)(?=\n\n|Client Presentation:|$)/i);
      if (themes) {
        const themeList = themes[1].split(/[\n,;•-]/).map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
        tags.push(...themeList.slice(0, 5));
      }
      tags.push('therapy', 'session', 'clinical');
    }

    res.json({
      id: req.params.id,
      aiTags: [...new Set(tags)] // Remove duplicates
    });
  } catch (error) {
    console.error('Error generating tags:', error);
    res.json({
      id: req.params.id,
      aiTags: ['therapy', 'session', 'error']
    });
  }
});

// New endpoint: Analyze uploaded documents
router.post('/documents/analyze', upload.single('file'), async (req, res) => {
  try {
    if (!aiServices.isAvailable()) {
      return res.status(503).json({ 
        error: 'AI services not available',
        message: 'Please configure OPENAI_API_KEY or ANTHROPIC_API_KEY environment variables'
      });
    }

    let content = '';
    
    // Handle direct text content
    if (req.body.content) {
      content = req.body.content;
    } 
    // Handle file upload
    else if (req.file) {
      const filePath = req.file.path;
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      
      try {
        if (fileExtension === '.txt') {
          content = await fs.readFile(filePath, 'utf-8');
        } else if (fileExtension === '.docx') {
          const buffer = await fs.readFile(filePath);
          const result = await mammoth.extractRawText({ buffer });
          content = result.value;
        } else if (fileExtension === '.pdf') {
          // For PDF, we'd need a PDF parser library
          // For now, return an error
          return res.status(400).json({ 
            error: 'PDF processing not yet implemented',
            message: 'Please upload .txt or .docx files'
          });
        } else {
          return res.status(400).json({ 
            error: 'Unsupported file type',
            message: 'Please upload .txt, .docx, or provide text content'
          });
        }
      } finally {
        // Clean up uploaded file
        try {
          await fs.unlink(filePath);
        } catch (unlinkError) {
          console.error('Error deleting temp file:', unlinkError);
        }
      }
    } else {
      return res.status(400).json({ error: 'No content or file provided' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Empty content provided' });
    }

    // Analyze the document
    const analysisResult = await aiServices.analyzeDocument(content);
    
    if (!analysisResult.success) {
      return res.status(500).json({ error: analysisResult.error });
    }

    // Only detect sessions if explicitly requested
    let sessionDetection = null;
    if (req.query.includeSessions === 'true') {
      sessionDetection = await aiServices.detectSessions(content);
    }
    
    res.json({
      success: true,
      service: analysisResult.service,
      analysis: analysisResult.analysis,
      sessionCount: sessionDetection ? sessionDetection.sessionCount : undefined,
      sessions: sessionDetection ? sessionDetection.sessions : undefined,
      usage: analysisResult.usage
    });
  } catch (error) {
    console.error('Error analyzing document:', error);
    res.status(500).json({ error: 'Failed to analyze document', message: error.message });
  }
});

// New endpoint: Generate session notes from transcript
router.post('/sessions/generate-notes', async (req, res) => {
  try {
    if (!aiServices.isAvailable()) {
      return res.status(503).json({ 
        error: 'AI services not available',
        message: 'Please configure OPENAI_API_KEY or ANTHROPIC_API_KEY environment variables'
      });
    }

    const { transcript, clientInfo } = req.body;
    
    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    const result = await aiServices.generateSessionNotes(transcript, clientInfo || {});
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      service: result.service,
      notes: result.notes,
      raw: result.raw
    });
  } catch (error) {
    console.error('Error generating session notes:', error);
    res.status(500).json({ error: 'Failed to generate session notes' });
  }
});

// New endpoint: Generate clinical insights from session data
router.post('/insights/generate', async (req, res) => {
  try {
    if (!aiServices.isAvailable()) {
      return res.status(503).json({ 
        error: 'AI services not available',
        message: 'Please configure OPENAI_API_KEY or ANTHROPIC_API_KEY environment variables'
      });
    }

    const { sessionData, historicalData } = req.body;
    
    if (!sessionData) {
      return res.status(400).json({ error: 'Session data is required' });
    }

    const result = await aiServices.generateInsights(sessionData, historicalData || []);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      service: result.service,
      insights: result.insights
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// Catch-all for other routes
router.use('*', (req, res) => {
  console.log(`API route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.originalUrl 
  });
});

export default router;