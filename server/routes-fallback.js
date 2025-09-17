// Temporary fallback routes to get the app running
import express from 'express';

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
  res.json({
    openai: { status: 'not-configured', message: 'API key not provided' },
    anthropic: { status: 'not-configured', message: 'API key not provided' },
    overall: 'degraded'
  });
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
  res.json([
    { service: 'openai', status: 'not-configured' },
    { service: 'anthropic', status: 'not-configured' }
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
router.post('/ai-insights/generate', (req, res) => {
  res.json([]);
});

router.patch('/ai-insights/:id/read', (req, res) => {
  res.json({ success: true });
});

// Session preparation
router.post('/session-notes/:id/generate-prep', (req, res) => {
  res.json({ appointmentsUpdated: 0 });
});

router.post('/session-notes/:id/generate-tags', (req, res) => {
  res.json({
    id: req.params.id,
    aiTags: ['therapy', 'session']
  });
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