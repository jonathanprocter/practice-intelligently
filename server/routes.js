// server/routes.js
import { Router } from "express";
import { storage } from './storage.js';

var router = Router();

router.get("/health", (req, res) => {
  // Check if AI services are configured
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasDatabase = !!process.env.DATABASE_URL;
  
  res.status(200).json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    service: "Practice Intelligence API",
    integrations: {
      openai: hasOpenAI,
      anthropic: hasAnthropic,
      gemini: false, // Not configured
      perplexity: false, // Not configured  
      database: hasDatabase
    }
  });
});

router.get("/status", (req, res) => {
  res.json({
    status: "running",
    message: "API is operational",
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development"
  });
});

// Dashboard stats - connect to real database
router.get('/dashboard/stats/:therapistId', async (req, res) => {
  try {
    const { therapistId } = req.params;
    
    // Get real data from storage
    const [clients, appointments, actionItems, sessionNotes] = await Promise.all([
      storage.getClients(therapistId),
      storage.getTodaysAppointments(therapistId),
      storage.getActionItems(therapistId),
      storage.getSessionNotes(therapistId)
    ]);
    
    res.json({
      totalClients: clients.length,
      totalSessions: sessionNotes.length,
      weeklyAppointments: appointments.length,
      upcomingAppointments: appointments.filter(a => a.status === 'scheduled').length,
      recentActivity: []
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.json({
      totalClients: 0,
      totalSessions: 0,
      weeklyAppointments: 0,
      upcomingAppointments: 0,
      recentActivity: []
    });
  }
});

// Today's appointments - connect to real database
router.get('/appointments/today/:therapistId', async (req, res) => {
  try {
    const appointments = await storage.getTodaysAppointments(req.params.therapistId);
    res.json(appointments || []);
  } catch (error) {
    console.error('Appointments error:', error);
    res.json([]);
  }
});

// Urgent action items - connect to real database
router.get('/action-items/urgent/:therapistId', async (req, res) => {
  try {
    const actionItems = await storage.getUrgentActionItems(req.params.therapistId);
    res.json(actionItems || []);
  } catch (error) {
    console.error('Action items error:', error);
    res.json([]);
  }
});

// Client list
router.get('/clients/:therapistId', async (req, res) => {
  try {
    const clients = await storage.getClients(req.params.therapistId);
    res.json(clients || []);
  } catch (error) {
    console.error('Clients error:', error);
    res.json([]);
  }
});

// Session notes for today
router.get('/session-notes/today/:therapistId', async (req, res) => {
  try {
    const notes = await storage.getTodaysSessionNotes(req.params.therapistId);
    res.json(notes || []);
  } catch (error) {
    console.error('Session notes error:', error);
    res.json([]);
  }
});

// AI insights
router.get('/ai-insights/:therapistId', async (req, res) => {
  try {
    const insights = await storage.getAiInsights(req.params.therapistId);
    res.json({
      insights: insights || [],
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI insights error:', error);
    res.json({
      insights: [],
      lastUpdated: new Date().toISOString()
    });
  }
});

// Recent activity
router.get('/recent-activity/:therapistId', async (req, res) => {
  try {
    const activity = await storage.getRecentActivity(req.params.therapistId);
    res.json(activity || []);
  } catch (error) {
    console.error('Recent activity error:', error);
    res.json([]);
  }
});

// Calendar events
router.get('/calendar/events', (req, res) => {
  res.json([]);
});

// Health check for AI services
router.get('/health/ai-services', (req, res) => {
  res.json({
    status: 'ok',
    services: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      gemini: false,
      perplexity: false
    }
  });
});

// Action items by therapist
router.get('/action-items/:therapistId', async (req, res) => {
  try {
    const actionItems = await storage.getActionItems(req.params.therapistId);
    res.json(actionItems || []);
  } catch (error) {
    console.error('Action items error:', error);
    res.json([]);
  }
});

// Action items by client
router.get('/action-items/client/:clientId', async (req, res) => {
  try {
    const actionItems = await storage.getActionItemsByClient(req.params.clientId);
    res.json(actionItems || []);
  } catch (error) {
    console.error('Client action items error:', error);
    res.json([]);
  }
});

// General routes
router.get("/clients", (req, res) => {
  res.json({ message: "Clients endpoint - implementation pending" });
});

router.get("/appointments", (req, res) => {
  res.json({ message: "Appointments endpoint - implementation pending" });
});

router.get("/session-notes", (req, res) => {
  res.json({ message: "Session notes endpoint - implementation pending" });
});
var routes_default = router;
export {
  routes_default as default
};
