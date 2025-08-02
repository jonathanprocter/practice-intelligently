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
import { generateUSHolidays, getHolidaysForYear, getHolidaysInRange, isUSHoliday } from "./us-holidays";
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to generate session prep summary
async function generateSessionPrepSummary(sessionContent: string, aiSummary: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert clinical therapist creating session prep notes. Based on the previous session content and AI summary, create a concise summary that will help the therapist prepare for the next appointment with this client.

Focus on:
- Key themes and progress from the last session
- Important insights or breakthroughs
- Areas that need follow-up
- Specific techniques or interventions that worked well
- Any homework or action items discussed
- Client's current emotional state and needs

Keep the summary concise (3-4 sentences) but actionable for session preparation.`
        },
        {
          role: "user",
          content: `Previous Session Content:\n${sessionContent}\n\nPrevious AI Summary:\n${aiSummary}\n\nPlease create a session prep summary for the next appointment.`
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    return response.choices[0].message.content || "No summary generated";
  } catch (error) {
    console.error("Error generating session prep summary:", error);
    return "Error generating session prep summary";
  }
}

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
          let allEvents: any[] = [];

          for (const calendar of calendars) {
            try {
              const events = await simpleOAuth.getEvents(
                calendar.id || '',
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
            } catch (calError: any) {
              console.warn(`Could not fetch events from calendar ${calendar.summary}:`, calError?.message || calError);
            }
          }

          // Add US holidays if today is a federal holiday
          try {
            const todayStr = new Date().toISOString().split('T')[0];
            const todayHoliday = isUSHoliday(todayStr);
            if (todayHoliday) {
              const year = parseInt(todayStr.substring(0, 4));
              const holidays = getHolidaysForYear(year);
              const holiday = holidays.find(h => h.start.date === todayStr);
              
              if (holiday) {
                const holidayEvent = {
                  id: holiday.id,
                  summary: `🇺🇸 ${holiday.summary}`,
                  start: { date: holiday.start.date },
                  calendarName: 'US Federal Holidays'
                };
                allEvents.push(holidayEvent);
                console.log(`🇺🇸 Added today's US federal holiday to dashboard: ${holiday.summary}`);
              }
            }
          } catch (holidayError: any) {
            console.warn('Could not check for US holidays in dashboard stats:', holidayError?.message || holidayError);
          }

          const events = allEvents;

          // Add calendar events to today's sessions count
          stats.todaysSessions = (stats.todaysSessions || 0) + events.length;

          // Add a flag to indicate calendar integration is active
          (stats as any).calendarIntegrated = true;
          (stats as any).calendarEvents = events.length;
        } else {
          (stats as any).calendarIntegrated = false;
        }
      } catch (calendarError: any) {
        console.warn('Could not fetch calendar data for dashboard stats:', calendarError?.message || calendarError);
        (stats as any).calendarIntegrated = false;
      }

      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching dashboard stats:", error?.message || error);
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
      const clientData = req.body;
      
      // Convert date string fields to Date objects if they exist
      const dateFields = ['dateOfBirth', 'hipaaSignedDate', 'lastContact'];
      dateFields.forEach(field => {
        if (clientData[field] && typeof clientData[field] === 'string') {
          clientData[field] = new Date(clientData[field]);
        }
      });
      
      const validatedData = insertClientSchema.parse(clientData);
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
      
      // Convert date string fields to Date objects if they exist
      const processedUpdates = { ...updates };
      const dateFields = ['dateOfBirth', 'hipaaSignedDate', 'lastContact'];
      
      dateFields.forEach(field => {
        if (processedUpdates[field] && typeof processedUpdates[field] === 'string') {
          processedUpdates[field] = new Date(processedUpdates[field]);
        }
      });
      
      const client = await storage.updateClient(id, processedUpdates);
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
      
      // Convert date string fields to Date objects if they exist
      const processedUpdates = { ...updateData };
      const dateFields = ['startTime', 'endTime', 'lastGoogleSync', 'reminderSentAt', 'checkedInAt', 'completedAt'];
      
      dateFields.forEach(field => {
        if (processedUpdates[field] && typeof processedUpdates[field] === 'string') {
          processedUpdates[field] = new Date(processedUpdates[field]);
        }
      });
      
      const appointment = await storage.updateAppointment(id, processedUpdates);
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

  app.get("/api/session-notes/therapist/:therapistId", async (req, res) => {
    try {
      const { therapistId } = req.params;
      const notes = await storage.getAllSessionNotesByTherapist(therapistId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching session notes:", error);
      res.status(500).json({ error: "Failed to fetch session notes" });
    }
  });

  app.put("/api/session-notes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedNote = await storage.updateSessionNote(id, updates);
      res.json(updatedNote);
    } catch (error) {
      console.error("Error updating session note:", error);
      res.status(500).json({ error: "Failed to update session note" });
    }
  });

  app.delete("/api/session-notes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSessionNote(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting session note:", error);
      res.status(500).json({ error: "Failed to delete session note" });
    }
  });

  // AI Session Prep Generation
  app.post("/api/ai/session-prep-from-note", async (req, res) => {
    try {
      const { sessionNoteId, clientId } = req.body;
      
      // Get the session note
      const sessionNote = await storage.getSessionNoteById(sessionNoteId);
      if (!sessionNote) {
        return res.status(404).json({ error: "Session note not found" });
      }

      // Convert client name to client UUID if needed
      let actualClientId = clientId;
      if (!clientId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // clientId is actually a client name, convert to UUID
        actualClientId = await storage.getClientIdByName(clientId);
        if (!actualClientId) {
          return res.status(404).json({ error: "Client not found" });
        }
      }

      // Get upcoming appointments for this client from database
      let upcomingAppointments = await storage.getUpcomingAppointmentsByClient(actualClientId);
      
      // If no database appointments found, check Google Calendar
      if (upcomingAppointments.length === 0) {
        // For now, we'll create a session prep note directly since appointments might be in Google Calendar
        // This allows the feature to work even when appointments aren't synced to the database
        console.log(`No database appointments found for client ${actualClientId}, proceeding with session prep generation anyway`);
      }

      // Generate AI summary using OpenAI
      const aiSummary = await generateSessionPrepSummary(sessionNote.content, sessionNote.aiSummary || "");
      
      // Update session prep for upcoming appointments
      let appointmentsUpdated = 0;
      
      if (upcomingAppointments.length > 0) {
        // Update database appointments
        for (const appointment of upcomingAppointments) {
          try {
            await storage.updateAppointmentSessionPrep(appointment.id, aiSummary);
            appointmentsUpdated++;
          } catch (error) {
            console.error(`Error updating session prep for appointment ${appointment.id}:`, error);
          }
        }
      } else {
        // Store session prep for future use when appointments are created
        // Create a general session prep note for this client
        try {
          await storage.createSessionPrepNote({
            clientId: sessionNote.clientId, // Use the original client name for consistency
            therapistId: sessionNote.therapistId,
            prepContent: aiSummary,
            eventId: `prep-${sessionNote.id}-${Date.now()}`, // Generate unique event ID
            previousSessionSummary: sessionNote.aiSummary || null
          });
          appointmentsUpdated = 1; // Indicate that prep was created
        } catch (error) {
          console.error("Error creating session prep note:", error);
        }
      }

      res.json({
        success: true,
        appointmentsUpdated,
        summary: aiSummary,
        message: appointmentsUpdated > 0 
          ? `Session prep ${upcomingAppointments.length > 0 ? 'applied to existing appointments' : 'created for future appointments'} (${appointmentsUpdated} item(s) updated)`
          : 'Session prep generated but no appointments found to update'
      });

    } catch (error) {
      console.error("Error generating session prep:", error);
      res.status(500).json({ error: "Failed to generate session prep" });
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
        priority: (result.confidence || 0) > 0.8 ? 'high' : 'medium',
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
      if ((result as any).content) {
        // Transform multiModelAI response to SessionTranscriptAnalysis format
        res.json({
          summary: (result as any).content.substring(0, 200) + '...',
          keyPoints: [(result as any).content],
          actionItems: ['Review session insights'],
          emotionalTone: 'Analysis completed',
          progressIndicators: ['Session analyzed using ' + ((result as any).model || 'AI')],
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

      // Get today's date range in Eastern Standard Time (EST/EDT)
      const now = new Date();
      
      // Convert to Eastern Time (handles both EST/EDT automatically)
      const easternTimeOptions: Intl.DateTimeFormatOptions = { 
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      };
      
      const easternDateStr = now.toLocaleDateString('en-CA', easternTimeOptions); // YYYY-MM-DD format
      console.log(`Today in Eastern Time: ${easternDateStr}`);
      
      // Create today's date range in Eastern timezone  
      const todayEastern = new Date(easternDateStr + 'T00:00:00');
      const tomorrowEastern = new Date(easternDateStr + 'T23:59:59');
      tomorrowEastern.setDate(tomorrowEastern.getDate() + 1);
      tomorrowEastern.setHours(0, 0, 0, 0);

      // Get events from ALL calendars, especially Simple Practice
      const calendars = await simpleOAuth.getCalendars();
      let allEvents: any[] = [];

      for (const calendar of calendars) {
        try {
          const events = await simpleOAuth.getEvents(
            calendar.id || '',
            todayEastern.toISOString(),
            tomorrowEastern.toISOString()
          );

          console.log(`Found ${events.length} events in ${calendar.summary}`);
          
          // STRICT filtering - only include events that are actually for today in Eastern Time
          const todaysEvents = events.filter(event => {
            const eventStart = event.start?.dateTime || event.start?.date;
            if (!eventStart) {
              console.log(`Event "${event.summary}" has no start time - excluding`);
              return false;
            }

            // Handle all-day events (date only) vs timed events (dateTime)
            if (event.start?.date && !event.start?.dateTime) {
              // All-day event - STRICT date comparison
              const eventDateStr = event.start.date; // YYYY-MM-DD format
              const isToday = eventDateStr === easternDateStr;
              console.log(`All-day event "${event.summary}": ${eventDateStr} === ${easternDateStr}? ${isToday}`);
              return isToday;
            } else {
              // Timed event - check if it starts today in Eastern timezone
              const eventDateTime = new Date(eventStart);
              const eventEasternDateStr = eventDateTime.toLocaleDateString('en-CA', easternTimeOptions);
              const isToday = eventEasternDateStr === easternDateStr;
              console.log(`Timed event "${event.summary}": ${eventEasternDateStr} === ${easternDateStr}? ${isToday} (Eastern Time)`);
              return isToday;
            }
          });

          console.log(`Filtered to ${todaysEvents.length} events actually for today (Eastern Time) in ${calendar.summary}`);
          
          // Add calendar info to each event
          const eventsWithCalendar = todaysEvents.map(event => ({
            ...event,
            calendarName: calendar.summary,
            calendarId: calendar.id
          }));
          allEvents = allEvents.concat(eventsWithCalendar);
        } catch (calError: any) {
          console.warn(`Could not fetch events from calendar ${calendar.summary}:`, calError?.message || calError);
        }
      }

      // Add US holidays if today is a federal holiday
      try {
        const todayHoliday = isUSHoliday(easternDateStr);
        if (todayHoliday) {
          const year = parseInt(easternDateStr.substring(0, 4));
          const holidays = getHolidaysForYear(year);
          const holiday = holidays.find(h => h.start.date === easternDateStr);
          
          if (holiday) {
            const holidayEvent = {
              id: holiday.id,
              summary: `🇺🇸 ${holiday.summary}`,
              description: holiday.description,
              start: { date: holiday.start.date },
              end: { date: holiday.end.date },
              status: 'confirmed',
              calendarName: 'US Federal Holidays',
              calendarId: 'us-holidays',
              isAllDay: true,
              isHoliday: true
            };
            
            allEvents.push(holidayEvent);
            console.log(`🇺🇸 Added today's US federal holiday: ${holiday.summary}`);
          }
        }
      } catch (holidayError: any) {
        console.warn('Could not check for US holidays:', holidayError?.message || holidayError);
      }

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

  // Enhanced Google Calendar Integration - fetches from ALL calendars and subcalendars (2019-2030)
  app.get('/api/calendar/events', async (req,res) => {
    try {
      const { timeMin, timeMax, start, end, calendarId } = req.query;

      const { simpleOAuth } = await import('./oauth-simple');

      if (!simpleOAuth.isConnected()) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }

      // Comprehensive default time range: 2015-2035 for complete historical data
      const defaultStartTime = new Date('2015-01-01T00:00:00.000Z').toISOString();
      const defaultEndTime = new Date('2035-12-31T23:59:59.999Z').toISOString();
      
      const startTime = (start as string) || (timeMin as string) || defaultStartTime;
      const endTime = (end as string) || (timeMax as string) || defaultEndTime;

      // Get events from ALL calendars and subcalendars if no specific calendar is requested
      if (!calendarId) {
        const calendars = await simpleOAuth.getCalendars();
        let allEvents = [];
        let processedCalendars = 0;
        let totalEventsFound = 0;

        console.log(`\n🗓️  Processing ${calendars.length} calendars and subcalendars for comprehensive event fetch...`);

        // Process ALL calendars and subcalendars in parallel for better performance
        const calendarPromises = calendars.map(async (calendar) => {
          try {
            // Include all calendar types: primary, secondary, and subcalendars
            const events = await simpleOAuth.getEvents(
              calendar.id,
              startTime,
              endTime
            );

            totalEventsFound += events.length;
            processedCalendars++;

            // Convert to standard format with enhanced metadata including subcalendar info
            return events.map((event: any) => ({
              id: event.id,
              title: event.summary || 'Untitled Event',
              startTime: new Date(event.start?.dateTime || event.start?.date),
              endTime: new Date(event.end?.dateTime || event.end?.date),
              location: event.location || calendar.summary,
              description: event.description || '',
              calendarId: calendar.id,
              calendarName: calendar.summary,
              isPrimary: calendar.primary || false,
              isSubcalendar: !calendar.primary && calendar.accessRole !== 'owner',
              accessRole: calendar.accessRole,
              status: event.status || 'confirmed'
            }));
          } catch (calError) {
            console.warn(`❌ Could not fetch events from calendar ${calendar.summary}:`, calError.message);
            return [];
          }
        });

        const results = await Promise.all(calendarPromises);
        allEvents = results.flat();

        // Add US holidays as all-day events for the requested date range
        try {
          const holidays = getHolidaysInRange(
            startTime.substring(0, 10), // Extract YYYY-MM-DD format
            endTime.substring(0, 10)
          );
          
          const holidayEvents = holidays.map(holiday => ({
            id: holiday.id,
            title: `🇺🇸 ${holiday.summary}`,
            startTime: new Date(holiday.start.date + 'T00:00:00'),
            endTime: new Date(holiday.end.date + 'T23:59:59'),
            location: 'United States',
            description: holiday.description,
            calendarId: 'us-holidays',
            calendarName: 'US Federal Holidays',
            isPrimary: false,
            isSubcalendar: true,
            isAllDay: true,
            isHoliday: true,
            accessRole: 'reader',
            status: 'confirmed'
          }));

          allEvents = allEvents.concat(holidayEvents);
          console.log(`🇺🇸 Added ${holidayEvents.length} US federal holidays to calendar events`);
        } catch (holidayError) {
          console.warn('Could not add US holidays to calendar events:', holidayError.message);
        }

        // Sort events by start time
        allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        // Enhanced logging with subcalendar breakdown
        const subcalendarEvents = allEvents.filter(event => event.isSubcalendar);
        const holidayCount = allEvents.filter(event => event.isHoliday).length;
        console.log(`\n✅ Successfully fetched ${totalEventsFound} events from ${processedCalendars}/${calendars.length} calendars (${startTime.substring(0,4)}-${endTime.substring(0,4)})`);
        console.log(`   📊 Breakdown: ${allEvents.length - subcalendarEvents.length} from primary calendars, ${subcalendarEvents.length} from subcalendars (including ${holidayCount} holidays)`);
        
        res.json(allEvents);
      } else {
        // Get events from specific calendar
        const events = await simpleOAuth.getEvents(
          calendarId as string,
          startTime,
          endTime
        );

        const formattedEvents = events.map((event: any) => ({
          id: event.id,
          title: event.summary || 'Untitled Event',
          startTime: new Date(event.start?.dateTime || event.start?.date),
          endTime: new Date(event.end?.dateTime || event.end?.date),
          location: event.location || 'Google Calendar',
          description: event.description || '',
          calendarId: calendarId as string,
          calendarName: 'Specific Calendar',
          status: event.status || 'confirmed'
        }));

        res.json(formattedEvents);
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

  // US Holidays API endpoints
  app.get('/api/holidays/us', async (req, res) => {
    try {
      const { year, startDate, endDate } = req.query;
      
      if (year) {
        const yearNum = parseInt(year as string);
        if (yearNum < 2015 || yearNum > 2030) {
          return res.status(400).json({ error: 'Year must be between 2015 and 2030' });
        }
        const holidays = getHolidaysForYear(yearNum);
        res.json(holidays);
      } else if (startDate && endDate) {
        const holidays = getHolidaysInRange(startDate as string, endDate as string);
        res.json(holidays);
      } else {
        // Return all holidays (2015-2030)
        const allHolidays = generateUSHolidays();
        res.json(allHolidays);
      }
    } catch (error: any) {
      console.error('Error fetching US holidays:', error);
      res.status(500).json({ error: 'Failed to fetch US holidays', details: error.message });
    }
  });

  app.get('/api/holidays/us/check/:date', async (req, res) => {
    try {
      const { date } = req.params;
      const isHoliday = isUSHoliday(date);
      
      if (isHoliday) {
        const year = parseInt(date.substring(0, 4));
        const holidays = getHolidaysForYear(year);
        const holiday = holidays.find(h => h.start.date === date);
        res.json({ 
          isHoliday: true, 
          holiday: holiday ? {
            name: holiday.summary,
            description: holiday.description
          } : null
        });
      } else {
        res.json({ isHoliday: false, holiday: null });
      }
    } catch (error: any) {
      console.error('Error checking holiday status:', error);
      res.status(500).json({ error: 'Failed to check holiday status', details: error.message });
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

      // Save progress note to database with automated unified narrative workflow
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
        appointmentId: req.body.appointmentId || null,
      });

      res.json({
        success: true,
        progressNote: savedNote,
        unifiedNarrativeCreated: savedNote.unifiedNarrativeCreated,
        sessionNoteId: savedNote.sessionNoteId,
        aiTags: savedNote.aiTags,
        message: savedNote.unifiedNarrativeCreated 
          ? 'Progress note generated and unified narrative created in session notes successfully'
          : 'Progress note generated successfully (session note creation failed)'
      });

    } catch (error: any) {
      console.error('Error generating progress note:', error);
      res.status(500).json({ 
        error: 'Failed to generate progress note',
        details: error.message 
      });
    }
  });

  // Manual endpoint to trigger unified narrative workflow for existing progress notes
  app.post('/api/progress-notes/:id/create-unified-narrative', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the existing progress note
      const progressNoteResult = await pool.query(
        'SELECT * FROM progress_notes WHERE id = $1',
        [id]
      );

      if (progressNoteResult.rows.length === 0) {
        return res.status(404).json({ error: 'Progress note not found' });
      }

      const progressNote = progressNoteResult.rows[0];

      // Create unified narrative from existing sections
      const unifiedNarrative = storage.createUnifiedNarrative({
        subjective: progressNote.subjective,
        objective: progressNote.objective,
        assessment: progressNote.assessment,
        plan: progressNote.plan,
        tonalAnalysis: progressNote.tonal_analysis,
        narrativeSummary: progressNote.narrative_summary
      });

      // Generate AI tags
      const aiTags = await storage.generateAITags(unifiedNarrative);

      // Create session note with unified narrative
      const sessionNoteResult = await pool.query(
        `INSERT INTO session_notes 
         (client_id, therapist_id, content, ai_summary, tags, appointment_id, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
         RETURNING *`,
        [
          progressNote.client_id,
          progressNote.therapist_id,
          unifiedNarrative,
          `Manual unified narrative from progress note: ${progressNote.title}`,
          JSON.stringify(aiTags),
          progressNote.appointment_id
        ]
      );

      console.log(`✅ Manual unified narrative created for progress note ${id}`);
      
      res.json({
        success: true,
        progressNoteId: id,
        sessionNoteId: sessionNoteResult.rows[0].id,
        unifiedNarrative: unifiedNarrative.substring(0, 500) + '...', // Preview
        aiTags,
        message: 'Unified narrative created and saved to session notes successfully'
      });

    } catch (error: any) {
      console.error('Error creating unified narrative:', error);
      res.status(500).json({ 
        error: 'Failed to create unified narrative',
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
      
      // Update event using Google Calendar service
      const updatedEvent = await simpleOAuth.updateEvent(calendarId, eventId, eventData);
      res.json(updatedEvent);
    } catch (error: any) {
      console.error('Error updating calendar event:', error);
      res.status(500).json({ error: 'Failed to update calendar event', details: error.message });
    }
  });

  // Add PATCH endpoint for partial updates (drag and drop)
  app.patch('/api/calendar/events/:eventId', async (req, res) => {
    try {
      const { eventId } = req.params;
      const { calendarId = 'primary', startTime, endTime } = req.body;
      
      console.log(`Updating event ${eventId} in calendar ${calendarId}`);
      console.log('New times:', { startTime, endTime });
      
      // Prepare event data for Google Calendar API
      const eventData = {
        start: {
          dateTime: startTime,
          timeZone: 'America/New_York'
        },
        end: {
          dateTime: endTime,
          timeZone: 'America/New_York'
        }
      };
      
      // Update event using Google Calendar service
      const updatedEvent = await simpleOAuth.updateEvent(calendarId, eventId, eventData);
      console.log(`Successfully updated event ${eventId}`);
      res.json(updatedEvent);
    } catch (error: any) {
      console.error('Error updating calendar event:', error);
      res.status(500).json({ error: 'Failed to update calendar event', details: error.message });
    }
  });

  app.delete('/api/calendar/events/:eventId', async (req, res) => {
    try {
      const { eventId } = req.params;
      const { calendarId = 'primary' } = req.query;
      
      const { simpleOAuth } = await import('./oauth-simple');
      
      if (!simpleOAuth.isConnected()) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }
      
      await simpleOAuth.deleteEvent(calendarId as string, eventId);
      res.json({ success: true, message: 'Event deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting calendar event:', error);
      if (error.message?.includes('authentication') || error.message?.includes('expired')) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }
      res.status(500).json({ error: 'Failed to delete calendar event', details: error.message });
    }
  });

  // Session prep notes endpoints
  app.get('/api/session-prep/:eventId', async (req, res) => {
    try {
      const { eventId } = req.params;
      const prepNote = await storage.getSessionPrepNoteByEventId(eventId);
      
      if (!prepNote) {
        return res.status(404).json({ error: 'Session prep note not found' });
      }
      
      res.json(prepNote);
    } catch (error: any) {
      console.error('Error fetching session prep note:', error);
      res.status(500).json({ error: 'Failed to fetch session prep note' });
    }
  });

  app.post('/api/session-prep', async (req, res) => {
    try {
      const { eventId, clientId, therapistId, prepContent, keyFocusAreas, sessionObjectives } = req.body;
      
      if (!eventId || !clientId || !therapistId || !prepContent) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const newPrepNote = await storage.createSessionPrepNote({
        eventId,
        clientId,
        therapistId,
        prepContent,
        keyFocusAreas: keyFocusAreas || [],
        sessionObjectives: sessionObjectives || [],
        previousSessionSummary: null,
        suggestedInterventions: [],
        clientGoals: [],
        riskFactors: [],
        homeworkReview: null,
        aiGeneratedInsights: null,
        lastUpdatedBy: therapistId,
        appointmentId: null
      });

      res.json(newPrepNote);
    } catch (error: any) {
      console.error('Error creating session prep note:', error);
      res.status(500).json({ error: 'Failed to create session prep note' });
    }
  });

  app.put('/api/session-prep/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const updatedPrepNote = await storage.updateSessionPrepNote(id, updateData);
      res.json(updatedPrepNote);
    } catch (error: any) {
      console.error('Error updating session prep note:', error);
      res.status(500).json({ error: 'Failed to update session prep note' });
    }
  });

  app.post('/api/session-prep/:eventId/ai-insights', async (req, res) => {
    try {
      const { eventId } = req.params;
      const { clientId } = req.body;
      
      if (!clientId) {
        return res.status(400).json({ error: 'Client ID is required' });
      }

      const result = await storage.generateAIInsightsForSession(eventId, clientId);
      
      // Update the prep note with AI insights and new data
      const existingNote = await storage.getSessionPrepNoteByEventId(eventId);
      if (existingNote) {
        await storage.updateSessionPrepNote(existingNote.id, {
          aiGeneratedInsights: result.insights,
          followUpQuestions: result.followUpQuestions,
          psychoeducationalMaterials: result.psychoeducationalMaterials
        });
      }

      res.json(result);
    } catch (error: any) {
      console.error('Error generating AI insights:', error);
      res.status(500).json({ error: 'Failed to generate AI insights' });
    }
  });

  // Client check-ins endpoints
  app.get('/api/client-checkins/:therapistId', async (req, res) => {
    try {
      const { therapistId } = req.params;
      const { status } = req.query;
      
      const checkins = await storage.getClientCheckins(therapistId, status as string);
      res.json(checkins);
    } catch (error: any) {
      console.error('Error fetching client check-ins:', error);
      res.status(500).json({ error: 'Failed to fetch client check-ins' });
    }
  });

  app.post('/api/client-checkins/generate', async (req, res) => {
    try {
      const { therapistId } = req.body;
      
      if (!therapistId) {
        return res.status(400).json({ error: 'Therapist ID is required' });
      }

      const generatedCheckins = await storage.generateAICheckins(therapistId);
      
      res.json({ 
        success: true, 
        message: `Generated ${generatedCheckins.length} AI check-ins`,
        checkins: generatedCheckins 
      });
    } catch (error: any) {
      console.error('Error generating AI check-ins:', error);
      res.status(500).json({ error: 'Failed to generate AI check-ins' });
    }
  });

  app.put('/api/client-checkins/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, clientResponse } = req.body;
      
      const updateData: any = { status };
      if (clientResponse) {
        updateData.clientResponse = clientResponse;
      }

      const updatedCheckin = await storage.updateClientCheckin(id, updateData);
      res.json(updatedCheckin);
    } catch (error: any) {
      console.error('Error updating check-in status:', error);
      res.status(500).json({ error: 'Failed to update check-in status' });
    }
  });

  app.post('/api/client-checkins/:id/send', async (req, res) => {
    try {
      const { id } = req.params;
      const { method = 'email' } = req.body;
      
      const success = await storage.sendCheckin(id, method);
      
      if (success) {
        res.json({ success: true, message: 'Check-in sent successfully' });
      } else {
        res.status(500).json({ error: 'Failed to send check-in' });
      }
    } catch (error: any) {
      console.error('Error sending check-in:', error);
      res.status(500).json({ error: 'Failed to send check-in' });
    }
  });

  app.delete('/api/client-checkins/cleanup', async (req, res) => {
    try {
      const deletedCount = await storage.cleanupExpiredCheckins();
      res.json({ 
        success: true, 
        message: `Cleaned up ${deletedCount} expired check-ins` 
      });
    } catch (error: any) {
      console.error('Error cleaning up expired check-ins:', error);
      res.status(500).json({ error: 'Failed to cleanup expired check-ins' });
    }
  });

  // Enhanced Calendar sync endpoints - fetches from ALL calendars and subcalendars
  app.post('/api/calendar/sync', async (req, res) => {
    try {
      const { simpleOAuth } = await import('./oauth-simple');

      if (!simpleOAuth.isConnected()) {
        return res.status(401).json({ error: 'Google Calendar not connected', requiresAuth: true });
      }

      // Get ALL calendars and subcalendars first
      const calendars = await simpleOAuth.getCalendars();
      let totalEvents = 0;
      let syncedCalendars = 0;

      // Enhanced time range: 2019-2030 to capture all historical and future events
      const timeMin = new Date('2019-01-01T00:00:00.000Z').toISOString();
      const timeMax = new Date('2030-12-31T23:59:59.999Z').toISOString();

      // Sync events from ALL calendars and subcalendars in parallel
      const syncPromises = calendars.map(async (calendar: any) => {
        try {
          const events = await simpleOAuth.getEvents(calendar.id, timeMin, timeMax);
          totalEvents += events.length;
          syncedCalendars++;
          return {
            calendarId: calendar.id,
            calendarName: calendar.summary,
            eventCount: events.length,
            status: 'success'
          };
        } catch (error: any) {
          console.warn(`Failed to sync calendar ${calendar.summary}:`, error);
          return {
            calendarId: calendar.id,
            calendarName: calendar.summary,
            eventCount: 0,
            status: 'error',
            error: error.message
          };
        }
      });

      const syncResults = await Promise.all(syncPromises);

      res.json({ 
        success: true, 
        message: `Successfully synced ${totalEvents} events from ${syncedCalendars}/${calendars.length} calendars (2019-2030)`, 
        totalEventCount: totalEvents,
        calendarsProcessed: calendars.length,
        calendarsSuccessful: syncedCalendars,
        timeRange: '2019-2030',
        syncResults
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

  // ElevenLabs text-to-speech endpoint
  app.post("/api/compass/speak", async (req, res) => {
    try {
      const { text, voice = 'rachel', speed = 1.0 } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      // Voice ID mapping for ElevenLabs
      const voiceMap = {
        'rachel': '21m00Tcm4TlvDq8ikWAM', // Rachel - professional female
        'adam': 'pNInz6obpgDQGcFmaJgB',   // Adam - warm male
        'bella': 'EXAVITQu4vr4xnSDxMaL',  // Bella - young female
        'josh': 'TxGEqnHWrfWFTfGW9XjX',   // Josh - deep male
        'sam': 'yoZ06aMxZJJ28mfd3POQ'     // Sam - raspy male
      };

      const selectedVoiceId = voiceMap[voice as keyof typeof voiceMap] || voiceMap.rachel;

      const elevenLabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`, {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVENLABS_API_KEY || ""
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true,
            speaking_rate: Math.max(0.25, Math.min(4.0, speed)) // Clamp speed between 0.25x and 4x
          }
        })
      });

      if (!elevenLabsResponse.ok) {
        throw new Error(`ElevenLabs API error: ${elevenLabsResponse.status}`);
      }

      const audioBuffer = await elevenLabsResponse.arrayBuffer();
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.byteLength);
      res.send(Buffer.from(audioBuffer));
      
    } catch (error) {
      console.error("Error generating speech:", error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  // Compass AI Assistant Chat
  app.post('/api/compass/chat', async (req, res) => {
    try {
      const { message, therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c' } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Get comprehensive context about the practice
      const [clients, appointments, sessionNotes, actionItems] = await Promise.all([
        storage.getClients(),
        storage.getAppointments(),
        storage.getSessionNotes(),
        storage.getActionItems()
      ]);

      // Create context summary for Compass
      const practiceContext = {
        totalClients: clients.length,
        activeClients: clients.filter(c => c.status === 'active').length,
        archivedClients: clients.filter(c => c.status === 'archived').length,
        todayAppointments: appointments.filter(a => {
          const today = new Date().toDateString();
          return new Date(a.dateTime).toDateString() === today;
        }).length,
        totalAppointments: appointments.length,
        recentNotes: sessionNotes.slice(0, 5),
        pendingActionItems: actionItems.filter(a => a.status === 'pending').length,
        totalActionItems: actionItems.length,
        todayNames: appointments.filter(a => {
          const today = new Date().toDateString();
          return new Date(a.dateTime).toDateString() === today;
        }).map(a => a.clientName).join(', ')
      };

      // Try OpenAI first (primary), then fallback to Anthropic
      let response;
      let aiProvider = 'openai';

      try {
        const openaiResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are Compass, a warm, knowledgeable, and supportive AI assistant for Dr. Jonathan Procter's therapy practice. Think of yourself as a trusted clinical colleague who's always ready to help with genuine enthusiasm and care.

PERSONALITY TRAITS:
- Warm and approachable, like a supportive colleague
- Genuinely excited to help and solve problems
- Speaks with kindness but maintains professional competence
- Proactive in offering specific, actionable suggestions
- Uses encouraging language and shows appreciation for the therapist's work

WHEN HELPING WITH CLIENT COMMUNICATIONS (check-ins, emails, messages):
Use Jonathan's authentic writing style:
- Warm, clear, and professional but never stiff or corporate
- Use contractions (I'll, that's, you're)
- Conversational but composed (not too casual)
- Emotionally attuned, not sentimental
- Keep messages short and balanced
- Examples: "Hi [Name] — just wanted to check in briefly." / "Hope things have been going okay since we last met." / "No pressure to reply right away—just wanted to touch base."

CRITICAL FORMATTING REQUIREMENTS - FOLLOW STRICTLY:
- ABSOLUTELY NO markdown formatting whatsoever (no **bold**, *italics*, ## headers, ### subheaders, - bullet points, 1. numbered lists, \`code\`, etc.)
- ABSOLUTELY NO JSON formatting, code blocks, or structured data formats
- ABSOLUTELY NO special characters like asterisks, hashes, backticks, or brackets for formatting
- Use ONLY plain conversational text as if speaking naturally to a colleague
- Use normal punctuation: periods, commas, colons, exclamation points only
- Write in flowing paragraphs with natural line breaks
- Think of this as a warm phone conversation, not a technical document

Current Practice Overview:
- Total Clients: ${practiceContext.totalClients} (${practiceContext.activeClients} active, ${practiceContext.archivedClients} archived)
- Today's Appointments: ${practiceContext.todayAppointments}${practiceContext.todayNames ? ` (${practiceContext.todayNames})` : ''}
- Total Appointments: ${practiceContext.totalAppointments}
- Pending Action Items: ${practiceContext.pendingActionItems}/${practiceContext.totalActionItems}
- Recent Session Notes: ${practiceContext.recentNotes.length} available

ALWAYS start responses with contextual observations and end with 2-3 specific, actionable suggestions relevant to the current practice state. Examples:
- "I notice you have X today - would you like me to help prepare for those sessions?"
- "With X pending action items, shall I help prioritize them?"
- "I see some recent session notes - would you like insights on patterns or themes?"

You can help with:
- Client management and personalized insights
- Appointment preparation and scheduling
- Session note analysis and therapeutic insights
- Treatment planning and evidence-based recommendations
- Practice analytics and meaningful trends
- Clinical pattern recognition
- Workflow optimization and administrative support

Always be specific, helpful, and ready to dive deeper into any topic. Show genuine interest in supporting excellent client care.`
            },
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 800,
          temperature: 0.7
        });

        response = openaiResponse.choices[0].message.content;
        
        // Post-process to strip any remaining markdown formatting aggressively
        if (response) {
          response = response
            .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove **bold**
            .replace(/\*(.*?)\*/g, '$1')      // Remove *italics*
            .replace(/`(.*?)`/g, '$1')        // Remove `code`
            .replace(/#{1,6}\s*/g, '')        // Remove # headers
            .replace(/^\s*[-*+•]\s*/gm, '')   // Remove bullet points (including unicode bullets)
            .replace(/^\s*\d+\.\s*/gm, '')    // Remove numbered lists
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove [links](url)
            .replace(/(\r\n|\r|\n){3,}/g, '\n\n') // Limit consecutive line breaks
            .trim(); // Clean up whitespace
        }
      } catch (error) {
        console.log('OpenAI failed, trying Anthropic...', error);
        
        try {
          // Fallback to Anthropic
          const { Anthropic } = await import('@anthropic-ai/sdk');
          const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
          });

          const anthropicResponse = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 800,
            system: `You are Compass, a warm, knowledgeable, and supportive AI assistant for Dr. Jonathan Procter's therapy practice. Think of yourself as a trusted clinical colleague who's always ready to help with genuine enthusiasm and care.

PERSONALITY TRAITS:
- Warm and approachable, like a supportive colleague
- Genuinely excited to help and solve problems
- Speaks with kindness but maintains professional competence
- Proactive in offering specific, actionable suggestions
- Uses encouraging language and shows appreciation for the therapist's work

WHEN HELPING WITH CLIENT COMMUNICATIONS (check-ins, emails, messages):
Use Jonathan's authentic writing style:
- Warm, clear, and professional but never stiff or corporate
- Use contractions (I'll, that's, you're)
- Conversational but composed (not too casual)
- Emotionally attuned, not sentimental
- Keep messages short and balanced
- Examples: "Hi [Name] — just wanted to check in briefly." / "Hope things have been going okay since we last met." / "No pressure to reply right away—just wanted to touch base."

CRITICAL FORMATTING REQUIREMENTS - FOLLOW STRICTLY:
- ABSOLUTELY NO markdown formatting whatsoever (no **bold**, *italics*, ## headers, ### subheaders, - bullet points, 1. numbered lists, \`code\`, etc.)
- ABSOLUTELY NO JSON formatting, code blocks, or structured data formats
- ABSOLUTELY NO special characters like asterisks, hashes, backticks, or brackets for formatting
- Use ONLY plain conversational text as if speaking naturally to a colleague
- Use normal punctuation: periods, commas, colons, exclamation points only
- Write in flowing paragraphs with natural line breaks
- Think of this as a warm phone conversation, not a technical document

Current Practice Overview:
- Total Clients: ${practiceContext.totalClients} (${practiceContext.activeClients} active, ${practiceContext.archivedClients} archived)
- Today's Appointments: ${practiceContext.todayAppointments}${practiceContext.todayNames ? ` (${practiceContext.todayNames})` : ''}
- Total Appointments: ${practiceContext.totalAppointments}
- Pending Action Items: ${practiceContext.pendingActionItems}/${practiceContext.totalActionItems}
- Recent Session Notes: ${practiceContext.recentNotes.length} available

ALWAYS start responses with contextual observations and end with 2-3 specific, actionable suggestions relevant to the current practice state. Always be specific, helpful, and ready to dive deeper into any topic. Show genuine interest in supporting excellent client care.`,
            messages: [
              {
                role: "user",
                content: `You are Compass, an expert AI assistant for Dr. Jonathan Procter's therapy practice. 

Practice Overview:
- Total Clients: ${practiceContext.totalClients} (${practiceContext.activeClients} active, ${practiceContext.archivedClients} archived)
- Today's Appointments: ${practiceContext.todayAppointments}
- Pending Action Items: ${practiceContext.pendingActionItems}

User question: ${message}

Provide a helpful, professional response with clinical insights and actionable recommendations.`
              }
            ],
          });

          response = anthropicResponse.content[0].type === 'text' ? anthropicResponse.content[0].text : 'Unable to generate response';
          
          // Post-process to strip any remaining markdown formatting aggressively
          if (response) {
            response = response
              .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove **bold**
              .replace(/\*(.*?)\*/g, '$1')      // Remove *italics*
              .replace(/`(.*?)`/g, '$1')        // Remove `code`
              .replace(/#{1,6}\s*/g, '')        // Remove # headers
              .replace(/^\s*[-*+•]\s*/gm, '')   // Remove bullet points (including unicode bullets)
              .replace(/^\s*\d+\.\s*/gm, '')    // Remove numbered lists
              .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove [links](url)
              .replace(/(\r\n|\r|\n){3,}/g, '\n\n') // Limit consecutive line breaks
              .trim(); // Clean up whitespace
          }
          
          aiProvider = 'anthropic';
        } catch (anthropicError) {
          console.log('Anthropic also failed, using fallback response');
          response = `I'm Compass, your AI assistant. I understand you're asking about: "${message}". 

Based on your practice data:
- You have ${practiceContext.totalClients} total clients (${practiceContext.activeClients} active)
- ${practiceContext.todayAppointments} appointments scheduled for today
- ${practiceContext.pendingActionItems} pending action items

I can help you analyze this data, provide insights, and assist with clinical decisions. Could you be more specific about what you'd like to know?`;
          aiProvider = 'fallback';
        }
      }

      res.json({
        content: response,
        aiProvider,
        practiceContext: {
          clientCount: practiceContext.totalClients,
          activeClients: practiceContext.activeClients,
          todayAppointments: practiceContext.todayAppointments,
          pendingActionItems: practiceContext.pendingActionItems
        }
      });

    } catch (error: any) {
      console.error('Error in Compass chat:', error);
      res.status(500).json({ error: 'Failed to process Compass request', details: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}