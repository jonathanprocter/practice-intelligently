import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { aiServices } from "./ai-services";
import { 
  insertClientSchema, insertAppointmentSchema, insertSessionNoteSchema, 
  insertActionItemSchema, insertTreatmentPlanSchema 
} from "@shared/schema";
import { z } from "zod";

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

  app.post("/api/session-notes", async (req, res) => {
    try {
      const validatedData = insertSessionNoteSchema.parse(req.body);
      
      // Process transcript if provided
      if (validatedData.transcript) {
        try {
          const analysis = await aiServices.analyzeTranscript(validatedData.transcript);
          validatedData.aiSummary = analysis.summary;
          
          // Generate tags
          const tags = await aiServices.generateTags(validatedData.content);
          validatedData.tags = tags;
          
          // Extract action items and create them
          const actionItems = await aiServices.extractActionItems(validatedData.content);
          for (const item of actionItems) {
            await storage.createActionItem({
              therapistId: validatedData.therapistId,
              clientId: validatedData.clientId,
              title: item,
              priority: 'medium',
              status: 'pending'
            });
          }
        } catch (aiError) {
          console.error("AI processing failed:", aiError);
          // Continue without AI processing
        }
      }
      
      const note = await storage.createSessionNote(validatedData);
      res.json(note);
    } catch (error) {
      console.error("Error creating session note:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid session note data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create session note" });
      }
    }
  });

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
      const insights = await aiServices.generateInsights(
        clients,
        actionItems.slice(0, 20), // Recent activities
        appointments.slice(0, 50) // Session patterns
      );
      
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

  const httpServer = createServer(app);
  return httpServer;
}
