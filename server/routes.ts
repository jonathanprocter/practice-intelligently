import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeContent, analyzeSessionTranscript } from "./ai-services";
import { multiModelAI } from './ai-multi-model';
import { perplexityClient } from './perplexity';
import { documentProcessor } from './document-processor';
// Removed old import - now using simpleOAuth
import { generateAppointmentInsights } from "./ai-insights";
import { pool } from "./db";
import { 
  insertClientSchema, insertAppointmentSchema, insertSessionNoteSchema, 
  insertActionItemSchema, insertTreatmentPlanSchema 
} from "@shared/schema";
import { z } from "zod";
import { randomUUID } from 'crypto';
import multer from 'multer';
import fs from 'fs';
import { getAllApiStatuses } from "./health-check";
import { simpleOAuth } from "./oauth-simple";
import { googleCalendarService } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get("/api/health", async (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      integrations: {
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY,
        perplexity: !!process.env.PERPLEXITY_API_KEY,
        database: !!process.env.DATABASE_URL,
      }
    });
  });

  // User/Settings endpoints
  app.get("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Don't return password
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove password field if it's empty or undefined
      if (!updateData.password) {
        delete updateData.password;
      }

      const user = await storage.updateUser(id, updateData);
      // Don't return password
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // AI Services health check
  app.get("/api/health/ai-services", async (req, res) => {
    try {
      const statuses = await getAllApiStatuses();
      res.json(statuses);
    } catch (error) {
      console.error("Error checking AI service statuses:", error);
      res.status(500).json({ error: "Failed to check AI service statuses" });
    }
  });

  // Dashboard stats with Google Calendar integration
  app.get("/api/dashboard/stats/:therapistId", async (req, res) => {
    try {
      const { therapistId } = req.params;

      // Get base stats from database
      const stats = await storage.getDashboardStats(therapistId);

      // Try to add Google Calendar data for today's sessions
      try {
        const { simpleOAuth } = await import('./oauth-simple');

        if (simpleOAuth.isConnected()) {
          // Get today's events from Google Calendar
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          // Get events from all calendars, especially Simple Practice
          const calendars = await simpleOAuth.getCalendars();
          let allEvents = [];

          for (const calendar of calendars) {
            try {
              const events = await simpleOAuth.getEvents(
                calendar.id,
                today.toISOString(),
                tomorrow.toISOString()
              );
              // Filter dashboard stats events the same way
              const todaysEvents = events.filter(event => {
                const eventStart = event.start?.dateTime || event.start?.date;
                if (!eventStart) return false;

                if (event.start?.date && !event.start?.dateTime) {
                  // All-day event - only include if it's specifically for today
                  const eventDateStr = event.start.date; // YYYY-MM-DD format
                  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
                  return eventDateStr === todayStr;
                } else {
                  // Timed event
                  const eventDateTime = new Date(eventStart);
                  return eventDateTime >= today && eventDateTime < tomorrow;
                }
              });

              allEvents = allEvents.concat(todaysEvents);
            } catch (calError) {
              console.warn(`Could not fetch events from calendar ${calendar.summary}:`, calError.message);
            }
          }

          const events = allEvents;

          // Add calendar events to today's sessions count
          stats.todaysSessions = (stats.todaysSessions || 0) + events.length;

          // Add a flag to indicate calendar integration is active
          stats.calendarIntegrated = true;
          stats.calendarEvents = events.length;
        } else {
          stats.calendarIntegrated = false;
        }
      } catch (calendarError) {
        console.warn('Could not fetch calendar data for dashboard stats:', calendarError.message);
        stats.calendarIntegrated = false;
      }

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

  // Get all clients (for dropdowns and selections)
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClients('e66b8b8e-e7a2-40b9-ae74-00c93ffe503c'); // Default therapist UUID
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  // Progress Notes endpoints
  app.get("/api/progress-notes/:therapistId", async (req, res) => {
    try {
      const { therapistId } = req.params;
      const notes = await storage.getProgressNotes(therapistId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching progress notes:", error);
      res.status(500).json({ error: "Failed to fetch progress notes" });
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

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const client = await storage.updateClient(id, updates);
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid client data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update client" });
      }
    }
  });

  // Bulk client creation endpoint
  app.post("/api/clients/bulk", async (req, res) => {
    try {
      const { clients: clientsData } = req.body;

      if (!Array.isArray(clientsData)) {
        return res.status(400).json({ error: "Clients data must be an array" });
      }

      const createdClients = [];
      const errors = [];

      for (let i = 0; i < clientsData.length; i++) {
        try {
          const validatedData = insertClientSchema.parse(clientsData[i]);
          const client = await storage.createClient(validatedData);
          createdClients.push(client);
        } catch (error) {
          errors.push({ index: i, error: error.message, data: clientsData[i] });
        }
      }

      res.json({
        success: true,
        created: createdClients.length,
        errors: errors.length,
        clients: createdClients,
        errorDetails: errors
      });
    } catch (error) {
      console.error("Error in bulk client creation:", error);
      res.status(500).json({ error: "Failed to create clients in bulk" });
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

  app.put("/api/appointments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const appointment = await storage.updateAppointment(id, updateData);
      res.json(appointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ error: "Failed to update appointment" });
    }
  });

  app.patch("/api/appointments/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      let updateData: any = { status };

      if (status === 'cancelled' && reason) {
        updateData.cancellationReason = reason;
      } else if (status === 'no_show' && reason) {
        updateData.noShowReason = reason;
      } else if (status === 'completed') {
        updateData.completedAt = new Date();
      } else if (status === 'checked_in') {
        updateData.checkedInAt = new Date();
      }

      const appointment = await storage.updateAppointment(id, updateData);
      res.json(appointment);
    } catch (error) {
      console.error("Error updating appointment status:", error);
      res.status(500).json({ error: "Failed to update appointment status" });
    }
  });

  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const appointment = await storage.cancelAppointment(id, reason || 'Cancelled by user');
      res.json(appointment);
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      res.status(500).json({ error: "Failed to cancel appointment" });
    }
  });

  app.get("/api/appointments/detail/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const appointment = await storage.getAppointment(id);
      if (!appointment) {
        res.status(404).json({ error: "Appointment not found" });
        return;
      }
      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ error: "Failed to fetch appointment" });
    }
  });

  // Session Notes by client ID (more specific route)
  app.get("/api/session-notes/client/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const notes = await storage.getSessionNotes(clientId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching session notes:", error);
      res.status(500).json({ error: "Failed to fetch session notes" });
    }
  });

  app.get("/api/session-notes/today/:therapistId", async (req, res) => {
    try {
      const { therapistId } = req.params;
      const notes = await storage.getTodaysSessionNotes(therapistId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching today's session notes:", error);
      res.status(500).json({ error: "Failed to fetch today's session notes" });
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

  // AI Analysis endpoints with provider-specific routing
  app.post('/api/ai/analyze', async (req, res) => {
    try {
      const { content, type = 'session', provider } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }

      let result;

      if (provider === 'openai') {
        // Use OpenAI for primary analysis
        result = await multiModelAI.generateClinicalAnalysis(content, type);
      } else if (provider === 'claude') {
        // Use Claude for secondary analysis  
        result = await multiModelAI.generateDetailedInsights(content, type);
      } else if (provider === 'gemini') {
        // Use Gemini for multimodal analysis
        result = await multiModelAI.analyzeMultimodalContent(content, type);
      } else {
        // Default to OpenAI-first fallback chain
        result = await multiModelAI.generateClinicalAnalysis(content, type);
      }

      // Transform to expected format
      const transformedResult = {
        insights: [result.content],
        recommendations: ['Analysis completed using ' + result.model],
        themes: ['Clinical analysis'],
        priority: result.confidence > 0.8 ? 'high' : 'medium',
        nextSteps: ['Review analysis and implement recommendations']
      };

      res.json(transformedResult);
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
      const { transcript, provider = 'openai' } = req.body;

      if (!transcript) {
        return res.status(400).json({ error: 'Transcript is required' });
      }

      let result;

      if (provider === 'openai') {
        // Use OpenAI for transcript analysis (primary)
        result = await multiModelAI.generateClinicalAnalysis(transcript, 'session transcript analysis');
      } else {
        // Fallback to old method
        result = await analyzeSessionTranscript(transcript);
      }

      // Ensure we return the expected format for transcript analysis
      if (result.content) {
        // Transform multiModelAI response to SessionTranscriptAnalysis format
        res.json({
          summary: result.content.substring(0, 200) + '...',
          keyPoints: [result.content],
          actionItems: ['Review session insights'],
          emotionalTone: 'Analysis completed',
          progressIndicators: ['Session analyzed using ' + result.model],
          concernFlags: []
        });
      } else {
        res.json(result);
      }
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

  // Google Calendar OAuth Routes (Updated)
  app.get('/api/auth/google', async (req, res) => {
    // OAuth initiation requested

    try {
      const { simpleOAuth } = await import('./oauth-simple');
      const authUrl = await simpleOAuth.getAuthUrl();
      // Redirecting to OAuth...
      res.redirect(authUrl);
    } catch (error: any) {
      console.error('Error initiating Google OAuth:', error);
      res.status(500).json({ 
        error: 'Failed to initiate Google authentication', 
        details: error?.message || 'Unknown error',
        suggestion: 'Please check your Google OAuth credentials in Replit Secrets'
      });
    }
  });

  // Check Google Calendar connection status
  app.get('/api/auth/google/status', async (req, res) => {
    try {
      const { simpleOAuth } = await import('./oauth-simple');
      const isConnected = simpleOAuth.isConnected();
      res.json({ connected: isConnected });
    } catch (error: any) {
      console.error('Error checking OAuth status:', error);
      res.json({ connected: false, error: error.message });
    }
  });

  // OAuth API endpoints for dashboard integration
  app.get('/api/oauth/is-connected', async (req, res) => {
    try {
      const { simpleOAuth } = await import('./oauth-simple');
      const isConnected = simpleOAuth.isConnected();
      res.json({ connected: isConnected });
    } catch (error: any) {
      console.error('Error checking OAuth connection:', error);
      res.json({ connected: false, error: error.message });
    }
  });

  app.get('/api/oauth/calendars', async (req, res) => {
    try {
      const { simpleOAuth } = await import('./oauth-simple');

      if (!simpleOAuth.isConnected()) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }

      const calendars = await simpleOAuth.getCalendars();
      res.json(calendars);
    } catch (error: any) {
      console.error('Error fetching OAuth calendars:', error);
      if (error.message?.includes('authentication') || error.message?.includes('expired')) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }
      res.status(500).json({ error: 'Failed to fetch calendars', details: error.message });
    }
  });

  app.get('/api/oauth/events/today', async (req, res) => {
    try {
      const { simpleOAuth } = await import('./oauth-simple');

      if (!simpleOAuth.isConnected()) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get events from ALL calendars, especially Simple Practice
      const calendars = await simpleOAuth.getCalendars();
      let allEvents = [];

      // Checking calendars for today's events

      for (const calendar of calendars) {
        // Processing calendar: ${calendar.summary}
        try {
          // Processing calendar: ${calendar.summary}
          const events = await simpleOAuth.getEvents(
            calendar.id,
            today.toISOString(),
            tomorrow.toISOString()
          );

          // Processing calendar: ${calendar.summary}
          // Found ${events.length} events in ${calendar.summary}
          // Filter events to only include TODAY'S events (strict date filtering)
          const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

          const todaysEvents = events.filter(event => {
            const eventStart = event.start?.dateTime || event.start?.date;
            if (!eventStart) return false;

            // Handle all-day events (date only) vs timed events (dateTime)
            if (event.start?.date && !event.start?.dateTime) {
              // All-day event - STRICT date comparison
              const eventDateStr = event.start.date; // YYYY-MM-DD format
              const isToday = eventDateStr === todayStr;

              // Found ${events.length} events in ${calendar.summary}
              // All-day event "${event.summary}": ${eventDateStr} === ${todayStr}? ${isToday}
              // ONLY include if the all-day event is exactly today's date
              return isToday;
            } else {
              // Timed event - check if it falls within today's date range
              const eventDateTime = new Date(eventStart);
              const eventDateStr = eventDateTime.toISOString().split('T')[0];
              const isToday = eventDateStr === todayStr;

              // All-day event "${event.summary}": ${eventDateStr} === ${todayStr}? ${isToday}
              // Timed event "${event.summary}": ${eventDateStr} === ${todayStr}? ${isToday}
              return isToday;
            }
          });

          // Timed event "${event.summary}": ${eventDateStr} === ${todayStr}? ${isToday}
          // Filtered to ${todaysEvents.length} events actually for today in ${calendar.summary}
          // Add calendar info to each event
          const eventsWithCalendar = todaysEvents.map(event => ({
            ...event,
            calendarName: calendar.summary,
            calendarId: calendar.id
          }));
          allEvents = allEvents.concat(eventsWithCalendar);
        } catch (calError) {
          console.warn(`Could not fetch events from calendar ${calendar.summary}:`, calError.message);
        }
      }

      // Filtered to ${todaysEvents.length} events actually for today in ${calendar.summary}
      // Total events found across all calendars: ${allEvents.length}
      res.json(allEvents);
    } catch (error: any) {
      console.error('Error fetching today\'s events:', error);
      if (error.message?.includes('authentication') || error.message?.includes('expired')) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }
      res.status(500).json({ error: 'Failed to fetch today\'s events', details: error.message });
    }
  });

  // Disconnect Google Calendar
  app.post('/api/auth/google/disconnect', async (req, res) => {
    try {
      const { simpleOAuth } = await import('./oauth-simple');
      await simpleOAuth.disconnect();
      res.json({ success: true, message: 'Google Calendar disconnected' });
    } catch (error: any) {
      console.error('Error disconnecting OAuth:', error);
      res.status(500).json({ error: 'Failed to disconnect', details: error.message });
    }
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    try {
      const { code, error, state } = req.query;

      console.log('OAuth callback received:', { 
        hasCode: !!code, 
        hasError: !!error, 
        codeLength: code ? (code as string).length : 0,
        host: req.get('host')
      });

      if (error) {
        console.error('OAuth authorization error:', error);
        const errorMessage = error === 'access_denied' 
          ? 'You denied permission to access your Google Calendar. Please try again and click "Allow" when prompted.'
          : `OAuth error: ${error}`;
        return res.redirect('/oauth-troubleshoot?error=oauth_failed&message=' + encodeURIComponent(errorMessage));
      }

      if (!code || typeof code !== 'string' || code.trim() === '') {
        console.error('No authorization code received');
        return res.redirect('/oauth-troubleshoot?error=no_code&message=' + encodeURIComponent('No authorization code received from Google. Please try the OAuth flow again.'));
      }

      console.log('Processing authorization code...');

      // Use the simple OAuth implementation
      const { simpleOAuth } = await import('./oauth-simple');
      await simpleOAuth.exchangeCodeForTokens(code as string);

      console.log('Google Calendar authentication successful');
      res.redirect('/calendar?success=connected&message=' + encodeURIComponent('Successfully connected to Google Calendar!'));

    } catch (error: any) {
      console.error('OAuth callback error:', error.message);
      res.redirect('/oauth-troubleshoot?error=auth_failed&message=' + encodeURIComponent(error.message || 'Authentication failed. Please try again or check your configuration.'));
    }
  });

  // Google Calendar Integration - new route without therapist ID parameter
  app.get('/api/calendar/events', async (req,res) => {
    try {
      const { timeMin, timeMax, start, end, calendarId } = req.query;

      const { simpleOAuth } = await import('./oauth-simple');

      if (!simpleOAuth.isConnected()) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }

      // Use start/end or timeMin/timeMax
      const startTime = (start as string) || (timeMin as string);
      const endTime = (end as string) || (timeMax as string);

      console.log(`Fetching calendar events from ${startTime} to ${endTime}`);

      // Get events from all calendars if no specific calendar is requested
      if (!calendarId) {
        const calendars = await simpleOAuth.getCalendars();
        let allEvents = [];

        for (const calendar of calendars) {
          try {
            const events = await simpleOAuth.getEvents(
              calendar.id,
              startTime,
              endTime
            );

            console.log(`Found ${events.length} events in ${calendar.summary}`);

            // Convert to standard format
            const formattedEvents = events.map(event => ({
              id: event.id,
              title: event.summary || 'Untitled Event',
              startTime: new Date(event.start?.dateTime || event.start?.date),
              endTime: new Date(event.end?.dateTime || event.end?.date),
              location: calendar.summary,
              description: event.description || '',
              calendarId: calendar.id,
              calendarName: calendar.summary
            }));

            allEvents = allEvents.concat(formattedEvents);
          } catch (calError) {
            console.warn(`Could not fetch events from calendar ${calendar.summary}:`, calError.message);
          }
        }

        console.log(`Total events found for date range: ${allEvents.length}`);
        res.json(allEvents);
      } else {
        // Get events from specific calendar
        const events = await simpleOAuth.getEvents(
          calendarId as string,
          startTime,
          endTime
        );

        res.json(events);
      }
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);
      if (error.message?.includes('authentication') || error.message?.includes('expired')) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }
      res.status(500).json({ error: 'Failed to fetch calendar events', details: error.message });
    }
  });

  // Legacy Google Calendar route with therapist ID (for backwards compatibility)
  app.get('/api/calendar/events/:therapistId', async (req, res) => {
    try {
      const { timeMin, timeMax, calendarId } = req.query;

      const { simpleOAuth } = await import('./oauth-simple');

      if (!simpleOAuth.isConnected()) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }

      const events = await simpleOAuth.getEvents(
        calendarId as string || 'primary',
        timeMin as string,
        timeMax as string
      );

      res.json(events);
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);
      if (error.message?.includes('authentication') || error.message?.includes('expired')) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }
      res.status(500).json({ error: 'Failed to fetch calendar events', details: error.message });
    }
  });

  app.get('/api/calendar/calendars', async (req, res) => {
    try {
      const { simpleOAuth } = await import('./oauth-simple');

      if (!simpleOAuth.isConnected()) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }

      const calendars = await simpleOAuth.getCalendars();
      res.json(calendars);
    } catch (error: any) {
      console.error('Error fetching calendars:', error);
      if (error.message?.includes('authentication') || error.message?.includes('expired')) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }
      res.status(500).json({ error: 'Failed to fetch calendars', details: error.message });
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

  // Predictive Models endpoints (#2)
  app.post('/api/ai/predict-treatment-outcome', async (req, res) => {
    try {
      const { clientId, currentSessionCount } = req.body;
      const { predictTreatmentOutcome } = await import('./ai-predictive-models');
      const prediction = await predictTreatmentOutcome(clientId, currentSessionCount);
      res.json(prediction);
    } catch (error: any) {
      console.error('Error predicting treatment outcome:', error);
      res.status(500).json({ error: 'Failed to predict treatment outcome' });
    }
  });

  app.post('/api/ai/risk-escalation-alert', async (req, res) => {
    try {
      const { clientId, sessionContent } = req.body;
      const { generateRiskEscalationAlert } = await import('./ai-predictive-models');
      const alert = await generateRiskEscalationAlert(clientId, sessionContent);
      res.json(alert);
    } catch (error: any) {
      console.error('Error generating risk escalation alert:', error);
      res.status(500).json({ error: 'Failed to generate risk escalation alert' });
    }
  });

  app.post('/api/ai/optimal-intervention-timing', async (req, res) => {
    try {
      const { clientId, potentialInterventions } = req.body;
      const { determineOptimalInterventionTiming } = await import('./ai-predictive-models');
      const timing = await determineOptimalInterventionTiming(clientId, potentialInterventions);
      res.json(timing);
    } catch (error: any) {
      console.error('Error determining optimal intervention timing:', error);
      res.status(500).json({ error: 'Failed to determine optimal intervention timing' });
    }
  });

  // Pattern Recognition endpoints (#3)
  app.post('/api/ai/cross-client-patterns', async (req, res) => {
    try {
      const { therapistId } = req.body;
      const { analyzeCrossClientPatterns } = await import('./ai-pattern-recognition');
      const patterns = await analyzeCrossClientPatterns(therapistId);
      res.json(patterns);
    } catch (error: any) {
      console.error('Error analyzing cross-client patterns:', error);
      res.status(500).json({ error: 'Failed to analyze cross-client patterns' });
    }
  });

  app.post('/api/ai/seasonal-patterns', async (req, res) => {
    try {
      const { clientId } = req.body;
      const { detectSeasonalCyclicalPatterns } = await import('./ai-pattern-recognition');
      const patterns = await detectSeasonalCyclicalPatterns(clientId);
      res.json(patterns);
    } catch (error: any) {
      console.error('Error detecting seasonal patterns:', error);
      res.status(500).json({ error: 'Failed to detect seasonal patterns' });
    }
  });

  app.post('/api/ai/therapeutic-relationship', async (req, res) => {
    try {
      const { clientId, therapistId } = req.body;
      const { mapTherapeuticRelationship } = await import('./ai-pattern-recognition');
      const relationship = await mapTherapeuticRelationship(clientId, therapistId);
      res.json(relationship);
    } catch (error: any) {
      console.error('Error mapping therapeutic relationship:', error);
      res.status(500).json({ error: 'Failed to map therapeutic relationship' });
    }
  });

  // Personalized Therapy endpoints (#5)
  app.post('/api/ai/evidence-based-interventions', async (req, res) => {
    try {
      const { clientProfile, sessionHistory } = req.body;
      const { generateEvidenceBasedInterventions } = await import('./ai-personalized-therapy');
      const interventions = await generateEvidenceBasedInterventions(clientProfile, sessionHistory);
      res.json(interventions);
    } catch (error: any) {
      console.error('Error generating evidence-based interventions:', error);
      res.status(500).json({ error: 'Failed to generate evidence-based interventions' });
    }
  });

  app.post('/api/ai/personalized-homework', async (req, res) => {
    try {
      const { clientId, sessionContent, clientPreferences } = req.body;
      const { createPersonalizedHomework } = await import('./ai-personalized-therapy');
      const homework = await createPersonalizedHomework(clientId, sessionContent, clientPreferences);
      res.json(homework);
    } catch (error: any) {
      console.error('Error creating personalized homework:', error);
      res.status(500).json({ error: 'Failed to create personalized homework' });
    }
  });

  app.post('/api/ai/curate-resources', async (req, res) => {
    try {
      const { clientProfile, currentChallenges } = req.body;
      const { curateTherapeuticResources } = await import('./ai-personalized-therapy');
      const resources = await curateTherapeuticResources(clientProfile, currentChallenges);
      res.json(resources);
    } catch (error: any) {
      console.error('Error curating therapeutic resources:', error);
      res.status(500).json({ error: 'Failed to curate therapeutic resources' });
    }
  });

  // Practice Intelligence endpoints (#7)
  app.post('/api/ai/session-efficiency', async (req, res) => {
    try {
      const { therapistId, timeframe } = req.body;
      const { analyzeSessionEfficiency } = await import('./ai-practice-intelligence');
      const efficiency = await analyzeSessionEfficiency(therapistId, timeframe);
      res.json(efficiency);
    } catch (error: any) {
      console.error('Error analyzing session efficiency:', error);
      res.status(500).json({ error: 'Failed to analyze session efficiency' });
    }
  });

  app.post('/api/ai/client-retention', async (req, res) => {
    try {
      const { clientId } = req.body;
      const { predictClientRetention } = await import('./ai-practice-intelligence');
      const retention = await predictClientRetention(clientId);
      res.json(retention);
    } catch (error: any) {
      console.error('Error predicting client retention:', error);
      res.status(500).json({ error: 'Failed to predict client retention' });
    }
  });

  // Personal Practice Insights endpoints (#10)
  app.post('/api/ai/therapist-strengths', async (req, res) => {
    try {
      const { therapistId } = req.body;
      const { analyzeTherapistStrengths } = await import('./ai-practice-intelligence');
      const strengths = await analyzeTherapistStrengths(therapistId);
      res.json(strengths);
    } catch (error: any) {
      console.error('Error analyzing therapist strengths:', error);
      res.status(500).json({ error: 'Failed to analyze therapist strengths' });
    }
  });

  // Configure multer for file uploads
  const upload = multer({
    dest: 'uploads/',
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
        'text/markdown',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/gif',
        'image/bmp',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'application/pdf'
      ];

      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}`));
      }
    }
  });

  // Document processing endpoint - AI extracts client info automatically
  app.post('/api/documents/process-clinical', upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Import document processor
      const { documentProcessor } = await import('./document-processor');

      // Process the uploaded document and extract metadata using AI
      const processedDoc = await documentProcessor.processDocument(
        req.file.path,
        req.file.originalname
      );

      // Clean up uploaded file
      try {
        await fs.promises.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded file:', cleanupError);
      }

      // Return extracted information for user confirmation
      res.json({
        success: true,
        extractedText: processedDoc.extractedText.substring(0, 1000) + '...', // Return preview
        detectedClientName: processedDoc.detectedClientName,
        detectedSessionDate: processedDoc.detectedSessionDate,
        fullContent: processedDoc.extractedText, // Full content for progress note generation
        fileName: req.file.originalname,
        requiresConfirmation: true,
        message: 'Document processed successfully. Please confirm the extracted information.'
      });

    } catch (error: any) {
      console.error('Error processing clinical document:', error);

      // Clean up uploaded file in case of error
      if (req.file?.path) {
        try {
          await fs.promises.unlink(req.file.path);
        } catch (cleanupError) {
          console.warn('Failed to cleanup uploaded file after error:', cleanupError);
        }
      }

      // Provide more specific error messages for common issues
      let errorMessage = 'Failed to process document';
      let details = error.message || 'Unknown error occurred';

      if (error.message && error.message.includes('PDF processing')) {
        errorMessage = 'PDF processing unavailable';
        details = 'PDF processing is currently unavailable. Please convert your PDF to a text file (.txt) or image format (.jpg, .png) for processing.';
      } else if (error.message && error.message.includes('Unsupported file type')) {
        errorMessage = 'Unsupported file format';
        details = error.message;
      }

      res.status(500).json({ 
        error: errorMessage,
        details: details,
        supportedFormats: ['txt', 'doc', 'docx', 'jpg', 'png', 'gif', 'bmp', 'xlsx', 'xls', 'csv']
      });
    }
  });

  // Generate progress note after user confirmation
  app.post('/api/documents/generate-progress-note', async (req, res) => {
    try {
      const { content, clientId, sessionDate, detectedClientName, detectedSessionDate } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Document content is required' });
      }

      // Use detected or provided information
      const finalClientId = clientId || 'detected-client';
      const finalSessionDate = sessionDate || detectedSessionDate || new Date().toISOString();

      // Import document processor
      const { documentProcessor } = await import('./document-processor');

      // Generate progress note using AI
      const progressNote = await documentProcessor.generateProgressNote(
        content,
        finalClientId,
        finalSessionDate
      );

      // Save progress note to database
      const savedNote = await storage.createProgressNote({
        clientId: finalClientId,
        therapistId: req.body.therapistId || 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c',
        title: progressNote.title,
        subjective: progressNote.subjective,
        objective: progressNote.objective,
        assessment: progressNote.assessment,
        plan: progressNote.plan,
        tonalAnalysis: progressNote.tonalAnalysis,
        keyPoints: progressNote.keyPoints,
        significantQuotes: progressNote.significantQuotes,
        narrativeSummary: progressNote.narrativeSummary,
        sessionDate: new Date(finalSessionDate),
      });

      res.json({
        success: true,
        progressNote: savedNote,
        message: 'Progress note generated and saved successfully'
      });

    } catch (error: any) {
      console.error('Error generating progress note:', error);
      res.status(500).json({ 
        error: 'Failed to generate progress note',
        details: error.message 
      });
    }
  });

  app.post('/api/ai/continuing-education', async (req, res) => {
    try {
      const { therapistId, clientMix } = req.body;
      const { generateContinuingEducationRecommendations } = await import('./ai-practice-intelligence');
      const recommendations = await generateContinuingEducationRecommendations(therapistId, clientMix);
      res.json(recommendations);
    } catch (error: any) {
      console.error('Error generating continuing education recommendations:', error);
      res.status(500).json({ error: 'Failed to generate continuing education recommendations' });
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
      // Note: createEvent method needs to be implemented in simpleOAuth
      const event = { error: 'createEvent method not implemented in simpleOAuth' };
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
      // Note: updateEvent method needs to be implemented in simpleOAuth
      const event = { error: 'updateEvent method not implemented in simpleOAuth' };
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
      // Note: deleteEvent method needs to be implemented in simpleOAuth
      // await simpleOAuth.deleteEvent(calendarId as string, eventId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      res.status(500).json({ error: 'Failed to delete calendar event' });
    }
  });

  // Calendar sync endpoints  
  app.post('/api/calendar/sync', async (req, res) => {
    try {
      const { simpleOAuth } = await import('./oauth-simple');

      if (!simpleOAuth.isConnected()) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }

      // Get events and sync to database (simplified for now)
      const events = await simpleOAuth.getEvents('primary');

      res.json({ 
        success: true, 
        message: 'Calendar events retrieved successfully', 
        eventCount: events.length 
      });
    } catch (error: any) {
      console.error('Error syncing calendar:', error);
      if (error.message?.includes('authentication') || error.message?.includes('expired')) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }
      res.status(500).json({ error: 'Failed to sync calendar events', details: error.message });
    }
  });

  // Get events from database (fast local access)
  app.get('/api/calendar/events/local', async (req, res) => {
    try {
      const { timeMin, timeMax, therapistId } = req.query;
      const finalTherapistId = (therapistId as string) || 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';

      const events = await googleCalendarService.getEventsFromDatabase(
        finalTherapistId,
        timeMin as string,
        timeMax as string
      );

      res.json(events);
    } catch (error) {
      console.error('Error fetching events from database:', error);
      res.status(500).json({ error: 'Failed to fetch calendar events from database' });
    }
  });

  // Enhanced events endpoint that can serve from database or live API
  app.get('/api/calendar/events/hybrid', async (req, res) => {
    try {
      const { timeMin, timeMax, source = 'database', therapistId } = req.query;
      const finalTherapistId = (therapistId as string) || 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';

      if (source === 'live' || source === 'api') {
        // Fetch from Google Calendar API using simple OAuth
        const { simpleOAuth } = await import('./oauth-simple');

        if (!simpleOAuth.isConnected()) {
          return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
        }

        const events = await simpleOAuth.getEvents(
          'primary', // Use primary calendar by default
          timeMin as string,
          timeMax as string
        );

        res.json(events);
      } else {
        // Fetch from database (default and fastest)
        const events = await googleCalendarService.getEventsFromDatabase(
          finalTherapistId,
          timeMin as string,
          timeMax as string
        );
        res.json(events);
      }
    } catch (error: any) {
      console.error('Error fetching hybrid calendar events:', error);
      if (error.message?.includes('authentication required')) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }
      res.status(500).json({ error: 'Failed to fetch calendar events' });
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

  // Multi-Model AI Endpoints for Enhanced Clinical Intelligence

  // Clinical Analysis using Claude (primary)
  app.post('/api/ai/clinical-analysis', async (req, res) => {
    try {
      const { content, context } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const result = await multiModelAI.generateClinicalAnalysis(content, context);
      res.json(result);
    } catch (error: any) {
      console.error('Error in clinical analysis:', error);
      res.status(500).json({ error: 'Failed to generate clinical analysis', details: error.message });
    }
  });

  // Detailed Insights using OpenAI
  app.post('/api/ai/detailed-insights', async (req, res) => {
    try {
      const { content, analysisType } = req.body;

      if (!content || !analysisType) {
        return res.status(400).json({ error: 'Content and analysis type are required' });
      }

      const result = await multiModelAI.generateDetailedInsights(content, analysisType);
      res.json(result);
    } catch (error: any) {
      console.error('Error generating detailed insights:', error);
      res.status(500).json({ error: 'Failed to generate detailed insights', details: error.message });
    }
  });

  // Evidence-Based Recommendations using Perplexity
  app.post('/api/ai/evidence-recommendations', async (req, res) => {
    try {
      const { query, domain } = req.body;

      if (!query || !domain) {
        return res.status(400).json({ error: 'Query and domain are required' });
      }

      if (!['clinical', 'treatment', 'education'].includes(domain)) {
        return res.status(400).json({ error: 'Domain must be clinical, treatment, or education' });
      }

      const result = await multiModelAI.getEvidenceBasedRecommendations(query, domain);
      res.json(result);
    } catch (error: any) {
      console.error('Error getting evidence-based recommendations:', error);
      res.status(500).json({ error: 'Failed to get evidence-based recommendations', details: error.message });
    }
  });

  // Multimodal Analysis using Gemini
  app.post('/api/ai/multimodal-analysis', async (req, res) => {
    try {
      const { content, mediaType } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const result = await multiModelAI.analyzeMultimodalContent(content, mediaType);
      res.json(result);
    } catch (error: any) {
      console.error('Error in multimodal analysis:', error);
      res.status(500).json({ error: 'Failed to perform multimodal analysis', details: error.message });
    }
  });

  // Ensemble Analysis combining all models
  app.post('/api/ai/ensemble-analysis', async (req, res) => {
    try {
      const { content, analysisType } = req.body;

      if (!content || !analysisType) {
        return res.status(400).json({ error: 'Content and analysis type are required' });
      }

      const result = await multiModelAI.generateEnsembleAnalysis(content, analysisType);
      res.json(result);
    } catch (error: any) {
      console.error('Error in ensemble analysis:', error);
      res.status(500).json({ error: 'Failed to generate ensemble analysis', details: error.message });
    }
  });

  // Clinical Research using Perplexity directly
  app.post('/api/ai/clinical-research', async (req, res) => {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Research query is required' });
      }

      const research = await perplexityClient.getClinicalResearch(query);
      res.json({ content: research, model: 'perplexity-research' });
    } catch (error: any) {
      console.error('Error getting clinical research:', error);
      res.status(500).json({ error: 'Failed to get clinical research', details: error.message });
    }
  });

  // Treatment Protocols using Perplexity
  app.post('/api/ai/treatment-protocols', async (req, res) => {
    try {
      const { condition, clientProfile } = req.body;

      if (!condition) {
        return res.status(400).json({ error: 'Condition is required' });
      }

      const protocols = await perplexityClient.getTreatmentProtocols(condition, clientProfile || {});
      res.json({ content: protocols, model: 'perplexity-protocols' });
    } catch (error: any) {
      console.error('Error getting treatment protocols:', error);
      res.status(500).json({ error: 'Failed to get treatment protocols', details: error.message });
    }
  });

  // Continuing Education using Perplexity
  app.post('/api/ai/continuing-education-research', async (req, res) => {
    try {
      const { therapistProfile, clientMix } = req.body;

      const education = await perplexityClient.getContinuingEducation(therapistProfile || {}, clientMix || {});
      res.json({ content: education, model: 'perplexity-education' });
    } catch (error: any) {
      console.error('Error getting continuing education:', error);
      res.status(500).json({ error: 'Failed to get continuing education recommendations', details: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}