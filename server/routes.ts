import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeContent, analyzeSessionTranscript } from "./ai-services";
import { googleCalendarService } from "./auth";
import { generateAppointmentInsights } from "./ai-insights";
import { pool } from "./db";
import { 
  insertClientSchema, insertAppointmentSchema, insertSessionNoteSchema, 
  insertActionItemSchema, insertTreatmentPlanSchema 
} from "@shared/schema";
import { z } from "zod";
import { randomUUID } from 'crypto';

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get("/api/health", async (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      integrations: {
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        database: !!process.env.DATABASE_URL,
      }
    });
  });

  // Dashboard stats
  app.get("/api/dashboard/stats/:therapistId", async (req, res) => {
    try {
      const { therapistId } = req.params;
      const stats = await storage.getDashboardStats(therapistId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Clients
  app.get("/api/clients/:therapistId", async (req, res) => {
    try {
      const { therapistId } = req.params;
      const clients = await storage.getClients(therapistId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid client data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create client" });
      }
    }
  });

  app.get("/api/clients/detail/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const client = await storage.getClient(id);
      if (!client) {
        res.status(404).json({ error: "Client not found" });
        return;
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  // Appointments
  app.get("/api/appointments/:therapistId", async (req, res) => {
    try {
      const { therapistId } = req.params;
      const { date } = req.query;
      
      // Validate therapistId is not undefined and is a valid UUID format
      if (!therapistId || therapistId === 'undefined') {
        return res.status(400).json({ error: 'Valid therapist ID is required' });
      }
      
      // Basic UUID format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(therapistId)) {
        return res.status(400).json({ error: 'Invalid therapist ID format' });
      }
      
      const appointments = date 
        ? await storage.getAppointments(therapistId, new Date(date as string))
        : await storage.getAppointments(therapistId);
      
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  app.get("/api/appointments/today/:therapistId", async (req, res) => {
    try {
      const { therapistId } = req.params;
      const appointments = await storage.getTodaysAppointments(therapistId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching today's appointments:", error);
      res.status(500).json({ error: "Failed to fetch today's appointments" });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const validatedData = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(validatedData);
      res.json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid appointment data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create appointment" });
      }
    }
  });

  // Session Notes
  app.get("/api/session-notes/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const notes = await storage.getSessionNotes(clientId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching session notes:", error);
      res.status(500).json({ error: "Failed to fetch session notes" });
    }
  });

  // Legacy session notes endpoint - disabled in favor of calendar-specific endpoint below

  // Action Items
  app.get("/api/action-items/:therapistId", async (req, res) => {
    try {
      const { therapistId } = req.params;
      const items = await storage.getActionItems(therapistId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching action items:", error);
      res.status(500).json({ error: "Failed to fetch action items" });
    }
  });

  app.get("/api/action-items/urgent/:therapistId", async (req, res) => {
    try {
      const { therapistId } = req.params;
      const items = await storage.getUrgentActionItems(therapistId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching urgent action items:", error);
      res.status(500).json({ error: "Failed to fetch urgent action items" });
    }
  });

  app.post("/api/action-items", async (req, res) => {
    try {
      const validatedData = insertActionItemSchema.parse(req.body);
      const item = await storage.createActionItem(validatedData);
      res.json(item);
    } catch (error) {
      console.error("Error creating action item:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid action item data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create action item" });
      }
    }
  });

  app.patch("/api/action-items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      if (updateData.status === 'completed' && !updateData.completedAt) {
        updateData.completedAt = new Date();
      }
      
      const item = await storage.updateActionItem(id, updateData);
      res.json(item);
    } catch (error) {
      console.error("Error updating action item:", error);
      res.status(500).json({ error: "Failed to update action item" });
    }
  });

  // AI Analysis endpoints
  app.post('/api/ai/analyze', async (req, res) => {
    try {
      const { content, type, provider } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }
      
      const result = await analyzeContent(content, type || 'session');
      res.json(result);
    } catch (error) {
      console.error('AI analysis error:', error);
      res.status(500).json({ 
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/ai/analyze-transcript', async (req, res) => {
    try {
      const { transcript } = req.body;
      
      if (!transcript) {
        return res.status(400).json({ error: 'Transcript is required' });
      }
      
      const result = await analyzeSessionTranscript(transcript);
      res.json(result);
    } catch (error) {
      console.error('Transcript analysis error:', error);
      res.status(500).json({ 
        error: 'Transcript analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AI Insights
  app.get("/api/ai-insights/:therapistId", async (req, res) => {
    try {
      const { therapistId } = req.params;
      const insights = await storage.getAiInsights(therapistId);
      res.json(insights);
    } catch (error) {
      console.error("Error fetching AI insights:", error);
      res.status(500).json({ error: "Failed to fetch AI insights" });
    }
  });

  app.post("/api/ai/generate-insights/:therapistId", async (req, res) => {
    try {
      const { therapistId } = req.params;
      
      // Get recent data for analysis
      const clients = await storage.getClients(therapistId);
      const actionItems = await storage.getActionItems(therapistId);
      const appointments = await storage.getAppointments(therapistId);
      
      // Generate insights using AI
      const analysisContent = `
        Practice Analytics:
        - Total Clients: ${clients.length}
        - Recent Action Items: ${actionItems.slice(0, 20).length}
        - Recent Appointments: ${appointments.slice(0, 50).length}
        
        Client Summary: ${JSON.stringify(clients.slice(0, 5), null, 2)}
        Action Items: ${JSON.stringify(actionItems.slice(0, 10), null, 2)}
        Appointments: ${JSON.stringify(appointments.slice(0, 10), null, 2)}
      `;
      
      const rawInsights = await analyzeContent(analysisContent, 'progress');
      
      // Transform AI response into insight format
      const insights = rawInsights.insights.map((insight, index) => ({
        type: rawInsights.priority === 'high' ? 'urgent' : 'general',
        title: `Insight ${index + 1}`,
        description: insight,
        confidence: 0.8,
        actionable: rawInsights.nextSteps.length > 0
      }));
      
      // Store insights in database
      for (const insight of insights) {
        await storage.createAiInsight({
          therapistId,
          type: insight.type,
          title: insight.title,
          content: insight.description,
          confidence: insight.confidence,
          metadata: { actionable: insight.actionable }
        });
      }
      
      res.json(insights);
    } catch (error) {
      console.error("Error generating AI insights:", error);
      res.status(500).json({ error: "Failed to generate AI insights" });
    }
  });

  // Google Calendar OAuth Routes
  app.get('/api/auth/google', (req, res) => {
    try {
      console.log('Google OAuth initiation requested');
      const authUrl = googleCalendarService.generateAuthUrl();
      console.log('Generated auth URL length:', authUrl.length);
      console.log('Auth URL domain:', authUrl.substring(0, 50) + '...');
      res.redirect(authUrl);
    } catch (error) {
      console.error('Error generating Google auth URL:', error);
      res.status(500).json({ error: 'Failed to initiate Google authentication', details: error.message });
    }
  });

  // Check Google Calendar connection status
  app.get('/api/auth/google/status', (req, res) => {
    const isConnected = googleCalendarService.isConnected();
    res.json({ connected: isConnected });
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    try {
      const { code, error } = req.query;
      
      if (error) {
        console.error('OAuth authorization error:', error);
        return res.redirect('/calendar?error=oauth_denied');
      }
      
      if (!code) {
        console.error('No authorization code received');
        return res.status(400).json({ error: 'Authorization code is required' });
      }
      
      console.log('Processing OAuth callback with code:', (code as string).substring(0, 10) + '...');
      await googleCalendarService.getAccessToken(code as string);
      console.log('Google Calendar authentication successful');
      res.redirect('/calendar?connected=true');
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/calendar?error=auth_failed');
    }
  });

  // Google Calendar Integration - new route without therapist ID parameter
  app.get('/api/calendar/events', async (req, res) => {
    try {
      const { timeMin, timeMax, calendarId } = req.query;
      
      if (!googleCalendarService.isConnected()) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }
      
      let events;
      if (!calendarId || calendarId === 'all') {
        // Fetch from all calendars
        events = await googleCalendarService.getAllEvents(
          timeMin as string,
          timeMax as string
        );
      } else {
        // Fetch from specific calendar
        events = await googleCalendarService.getEvents(
          calendarId as string,
          timeMin as string,
          timeMax as string
        );
      }
      
      res.json(events);
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);
      if (error.message?.includes('authentication required')) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }
      res.status(500).json({ error: 'Failed to fetch calendar events' });
    }
  });

  // Legacy Google Calendar route with therapist ID (for backwards compatibility)
  app.get('/api/calendar/events/:therapistId', async (req, res) => {
    try {
      const { timeMin, timeMax, calendarId } = req.query;
      
      if (!googleCalendarService.isConnected()) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }
      
      let events;
      if (!calendarId || calendarId === 'all') {
        // Fetch from all calendars
        events = await googleCalendarService.getAllEvents(
          timeMin as string,
          timeMax as string
        );
      } else {
        // Fetch from specific calendar
        events = await googleCalendarService.getEvents(
          calendarId as string,
          timeMin as string,
          timeMax as string
        );
      }
      
      res.json(events);
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);
      if (error.message?.includes('authentication required')) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }
      res.status(500).json({ error: 'Failed to fetch calendar events' });
    }
  });

  app.get('/api/calendar/calendars', async (req, res) => {
    try {
      if (!googleCalendarService.isConnected()) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }
      const calendars = await googleCalendarService.listCalendars();
      res.json(calendars);
    } catch (error: any) {
      console.error('Error fetching calendars:', error);
      if (error.message?.includes('authentication required')) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }
      res.status(500).json({ error: 'Failed to fetch calendars' });
    }
  });

  // AI Appointment Insights endpoint
  app.post('/api/ai/appointment-insights', async (req, res) => {
    try {
      const { appointment } = req.body;
      const insights = await generateAppointmentInsights(appointment);
      res.json(insights);
    } catch (error: any) {
      console.error('Error generating AI insights:', error);
      res.status(500).json({ error: 'Failed to generate insights' });
    }
  });

  // Enhanced AI Insights endpoint
  app.post('/api/ai/enhanced-insights', async (req, res) => {
    try {
      const { generateEnhancedInsights } = await import('./ai-enhanced-insights');
      const insights = await generateEnhancedInsights(req.body);
      res.json(insights);
    } catch (error: any) {
      console.error('Error generating enhanced insights:', error);
      res.status(500).json({ error: 'Failed to generate enhanced insights' });
    }
  });

  // Progress Report endpoint
  app.post('/api/ai/progress-report', async (req, res) => {
    try {
      const { clientId, timeframe } = req.body;
      const { generateProgressReport } = await import('./ai-enhanced-insights');
      const report = await generateProgressReport(clientId, timeframe);
      res.json(report);
    } catch (error: any) {
      console.error('Error generating progress report:', error);
      res.status(500).json({ error: 'Failed to generate progress report' });
    }
  });

  // Risk Assessment endpoint
  app.post('/api/ai/risk-assessment', async (req, res) => {
    try {
      const { sessionContent, clientHistory } = req.body;
      const { assessClientRisk } = await import('./ai-enhanced-insights');
      const assessment = await assessClientRisk(sessionContent, clientHistory);
      res.json(assessment);
    } catch (error: any) {
      console.error('Error conducting risk assessment:', error);
      res.status(500).json({ error: 'Failed to conduct risk assessment' });
    }
  });

  // Session Notes endpoints
  app.post('/api/session-notes', async (req, res) => {
    try {
      const { eventId, notes, content, date, clientName, clientId, therapistId } = req.body;
      
      console.log('Received session notes request:', { eventId, notes, content, date, clientName });
      
      // Get content from either field
      const sessionContent = content || notes;
      
      if (!eventId || !sessionContent) {
        return res.status(400).json({ error: 'Missing required fields: eventId and content/notes' });
      }

      // Generate UUIDs for required fields if not provided
      const finalTherapistId = therapistId || randomUUID();
      const finalClientId = clientId || randomUUID();

      // Save to database
      const sessionNote = await storage.createSessionNote({
        eventId,
        therapistId: finalTherapistId,
        clientId: finalClientId,
        content: sessionContent
      });
      
      console.log('Session note saved successfully:', sessionNote.id);
      res.json(sessionNote);
    } catch (error: any) {
      console.error('Error saving session notes:', error);
      res.status(500).json({ error: 'Failed to save session notes', details: error.message });
    }
  });

  app.get('/api/session-notes/:eventId', async (req, res) => {
    try {
      const { eventId } = req.params;
      const notes = await storage.getSessionNotesByEventId(eventId);
      res.json(notes);
    } catch (error: any) {
      console.error('Error fetching session notes:', error);
      res.status(500).json({ error: 'Failed to fetch session notes' });
    }
  });

  // AI Insights Save endpoint
  app.post('/api/ai-insights/:eventId/save', async (req, res) => {
    try {
      const { eventId } = req.params;
      const { insights, clientId, therapistId } = req.body;
      
      if (!insights) {
        return res.status(400).json({ error: 'Missing AI insights content' });
      }

      const sessionNote = await storage.createSessionNote({
        eventId,
        therapistId: therapistId || randomUUID(),
        clientId: clientId || randomUUID(),
        content: `AI Insights:\n\n${insights}`,
        aiSummary: insights
      });

      res.json(sessionNote);
    } catch (error: any) {
      console.error('Error saving AI insights:', error);
      res.status(500).json({ error: 'Failed to save AI insights', details: error.message });
    }
  });

  // Appointment Summary endpoint
  app.get('/api/appointments/:eventId/next-summary', async (req, res) => {
    try {
      const { eventId } = req.params;
      
      // Get session notes for this appointment
      const notes = await storage.getSessionNotesByEventId(eventId);
      
      // Get action items for this client/appointment (stub for now)
      const actionItems = await storage.getActionItemsByEventId(eventId);
      
      // Find next appointment (stub for now - would integrate with calendar)
      const nextAppointment = null; // Would query calendar for next appointment
      
      const summary = {
        notes: notes.map(note => ({
          content: note.content,
          aiSummary: note.aiSummary,
          createdAt: note.createdAt
        })),
        actionItems: actionItems.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          priority: item.priority,
          dueDate: item.dueDate,
          status: item.status
        })),
        nextAppointment
      };
      
      res.json(summary);
    } catch (error: any) {
      console.error('Error fetching appointment summary:', error);
      res.status(500).json({ error: 'Failed to fetch appointment summary' });
    }
  });

  app.post('/api/calendar/events', async (req, res) => {
    try {
      const { calendarId = 'primary', ...eventData } = req.body;
      const event = await googleCalendarService.createEvent(calendarId, eventData);
      res.json(event);
    } catch (error) {
      console.error('Error creating calendar event:', error);
      res.status(500).json({ error: 'Failed to create calendar event' });
    }
  });

  app.put('/api/calendar/events/:eventId', async (req, res) => {
    try {
      const { eventId } = req.params;
      const { calendarId = 'primary', ...eventData } = req.body;
      const event = await googleCalendarService.updateEvent(calendarId, eventId, eventData);
      res.json(event);
    } catch (error) {
      console.error('Error updating calendar event:', error);
      res.status(500).json({ error: 'Failed to update calendar event' });
    }
  });

  app.delete('/api/calendar/events/:eventId', async (req, res) => {
    try {
      const { eventId } = req.params;
      const { calendarId = 'primary' } = req.query;
      await googleCalendarService.deleteEvent(calendarId as string, eventId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      res.status(500).json({ error: 'Failed to delete calendar event' });
    }
  });

  // Treatment Plans
  app.get("/api/treatment-plans/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const plans = await storage.getTreatmentPlans(clientId);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching treatment plans:", error);
      res.status(500).json({ error: "Failed to fetch treatment plans" });
    }
  });

  app.post("/api/treatment-plans", async (req, res) => {
    try {
      const validatedData = insertTreatmentPlanSchema.parse(req.body);
      const plan = await storage.createTreatmentPlan(validatedData);
      res.json(plan);
    } catch (error) {
      console.error("Error creating treatment plan:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid treatment plan data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create treatment plan" });
      }
    }
  });

  // Save AI insights as session note
  app.post('/api/ai-insights/:eventId/save', async (req, res) => {
    try {
      const { eventId } = req.params;
      const { insights, clientId, therapistId } = req.body;
      
      if (!insights || !clientId || !therapistId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const sessionNote = await storage.createSessionNote({
        eventId,
        clientId,
        therapistId,
        content: `AI Insights:\n\n${insights}`,
        aiSummary: insights
      });

      res.json({ success: true, noteId: sessionNote.id });
    } catch (error: any) {
      console.error('Error saving AI insights:', error);
      res.status(500).json({ error: 'Failed to save insights' });
    }
  });

  // Get next appointment summary with notes and action items
  app.get('/api/appointments/:eventId/next-summary', async (req, res) => {
    try {
      const { eventId } = req.params;
      
      // Get current appointment details
      const currentNotes = await storage.getSessionNotesByEventId(eventId);
      
      if (currentNotes.length === 0) {
        return res.json({ notes: [], actionItems: [], nextAppointment: null });
      }

      const currentNote = currentNotes[0];
      const clientId = currentNote.clientId;

      // Find next scheduled appointment for this client
      const client = await pool.connect();
      try {
        const nextApptResult = await client.query(`
          SELECT event_id, summary, start_time, end_time, location 
          FROM appointments 
          WHERE client_id = $1 AND start_time > NOW() 
          ORDER BY start_time ASC 
          LIMIT 1
        `, [clientId]);

        // Get all action items for this client
        const actionItemsResult = await client.query(`
          SELECT * FROM action_items 
          WHERE client_id = $1 AND status != 'completed'
          ORDER BY priority DESC, due_date ASC
        `, [clientId]);

        // Compile comprehensive summary
        const summary = {
          notes: currentNotes.map(note => ({
            content: note.content,
            aiSummary: note.aiSummary,
            createdAt: note.createdAt
          })),
          actionItems: actionItemsResult.rows.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            priority: item.priority,
            dueDate: item.due_date,
            status: item.status
          })),
          nextAppointment: nextApptResult.rows.length > 0 ? {
            eventId: nextApptResult.rows[0].event_id,
            summary: nextApptResult.rows[0].summary,
            startTime: nextApptResult.rows[0].start_time,
            endTime: nextApptResult.rows[0].end_time,
            location: nextApptResult.rows[0].location
          } : null
        };

        res.json(summary);
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Error getting next appointment summary:', error);
      res.status(500).json({ error: 'Failed to get summary' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
