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
    createdAt: new Date().toISOString()
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
  res.json({ events: [] });
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