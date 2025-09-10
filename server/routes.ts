import type { Express } from "express";
import { storage } from "./storage";
import { analyzeContent, analyzeSessionTranscript } from "./ai-services";
import { multiModelAI } from './ai-multi-model';
import { perplexityClient } from './perplexity';
import { documentProcessor } from './document-processor';
import { DocumentProcessor } from './documentProcessor';
// Removed old import - now using simpleOAuth
import { generateAppointmentInsights } from "./ai-insights";
import { pool } from "./db";
import { 
  insertClientSchema, insertAppointmentSchema, insertSessionNoteSchema, 
  insertActionItemSchema, insertTreatmentPlanSchema,
  insertAssessmentCatalogSchema, insertClientAssessmentSchema, insertAssessmentResponseSchema,
  insertAssessmentScoreSchema, insertAssessmentPackageSchema, insertSessionRecommendationSchema,
  insertSessionSummarySchema
} from "@shared/schema";
import { z } from "zod";
import { randomUUID } from 'crypto';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { uploadSingle, uploadMultiple } from './upload';
import { DEFAULT_THERAPIST_ID } from '@shared/constants';

// Added for WebSocket support
import WebSocket, { WebSocketServer } from 'ws';

// Configure multer for in-memory storage
const uploadToMemory = multer({ 
  storage:multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});
import { getAllApiStatuses } from "./health-check";
import { simpleOAuth } from "./oauth-simple";
import { googleCalendarService } from "./auth";
import { generateUSHolidays, getHolidaysForYear, getHolidaysInRange, isUSHoliday } from "./us-holidays";
import { SessionDocumentProcessor } from './session-document-processor';
import { optimizedComprehensiveProgressNotesParser } from './comprehensiveProgressNotesParser-optimized';
import { stevenDelucaProcessor } from './steven-deluca-processor';
import { registerEnhancedChartRoutes } from './routes/enhanced-chart-routes';
import { registerTimelineRoutes } from './routes/timeline-routes';
import { registerEnhancedTimelineRoutes } from './routes/enhanced-timeline-routes';
import { registerCriticalFixes } from './fixes/critical-bugs-and-improvements';
import { registerAIEnhancedRoutes } from './routes/ai-enhanced-routes';
import OpenAI from 'openai';
// Auth routes removed - single-user system

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize document processor
const docProcessor = new DocumentProcessor();

// Initialize session document processor
const sessionDocProcessor = new SessionDocumentProcessor(storage);

// Configure multer for session documents
const sessionUpload = multer({
  dest: 'uploads/sessions/',
  fileFilter: (req, file, cb) => {
    console.log('Session upload - mimetype:', file.mimetype, 'originalname:', file.originalname);

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'text/plain', // .txt
      'application/pdf', // .pdf
      'application/octet-stream' // Sometimes DOCX files are detected as this
    ];

    // Check file extension if MIME type is not reliable
    const fileName = file.originalname.toLowerCase();
    const allowedExtensions = ['.docx', '.doc', '.txt', '.pdf'];
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    console.log('File validation - hasValidExtension:', hasValidExtension, 'mimeTypeAllowed:', allowedTypes.includes(file.mimetype));

    if (allowedTypes.includes(file.mimetype) || hasValidExtension) {
      console.log('File accepted');
      cb(null, true);
    } else {
      console.log('File rejected');
      cb(new Error('Only DOCX, DOC, TXT, and PDF files are allowed for session documents'));
    }
  },
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit for session documents
  }
});

export async function registerRoutes(app: Express, wss?: WebSocketServer): Promise<void> {
  // Set the WebSocket server on app locals for access in routes
  app.locals.wss = wss;

  // Health check
  app.get("/api/health", async (req, res) => {
    try {
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
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({ status: "error", message: "Health check failed" });
    }
  });

  // Dashboard stats endpoint
  app.get("/api/dashboard/stats/:therapistId", async (req, res) => {
    try {
      const { therapistId } = req.params;
      const effectiveTherapistId = therapistId || DEFAULT_THERAPIST_ID;

      // Get base stats from database
      const stats = await storage.getDashboardStats(effectiveTherapistId);

      // Add integration status flags
      (stats as any).calendarIntegrated = false; // Calendar integration can be added later
      
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching dashboard stats:", error?.message || error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Client routes
  app.get("/api/clients/search", async (req, res) => {
    try {
      const { name } = req.query;
      if (!name) {
        return res.status(400).json({ error: "Name parameter is required" });
      }

      const clients = await storage.getClients(DEFAULT_THERAPIST_ID);
      const searchTerm = (name as string).toLowerCase().trim();

      const matchingClients = clients.filter(client => {
        const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
        const firstName = client.firstName?.toLowerCase() || '';
        const lastName = client.lastName?.toLowerCase() || '';

        return fullName.includes(searchTerm) || 
               firstName.includes(searchTerm) || 
               lastName.includes(searchTerm);
      });

      res.json(matchingClients);
    } catch (error) {
      console.error("Error searching clients:", error);
      res.status(500).json({ error: "Failed to search clients" });
    }
  });

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

  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClients(DEFAULT_THERAPIST_ID);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const clientData = req.body;
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

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteClient(id);
      res.json({ success: true, message: "Client deleted successfully" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ error: "Failed to delete client" });
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

  // Appointment routes
  app.get("/api/appointments/:therapistId", async (req, res) => {
    try {
      const { therapistId } = req.params;
      const { date } = req.query;

      if (!therapistId || therapistId === 'undefined') {
        return res.status(400).json({ error: 'Valid therapist ID is required' });
      }

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
      const processedBody = { ...req.body };
      const dateFields = ['startTime', 'endTime', 'lastGoogleSync', 'reminderSentAt', 'checkedInAt', 'completedAt'];

      dateFields.forEach(field => {
        if (processedBody[field] !== undefined && processedBody[field] !== null) {
          if (typeof processedBody[field] === 'string' || typeof processedBody[field] === 'number') {
            processedBody[field] = new Date(processedBody[field]);
          }
        }
      });

      const validatedData = insertAppointmentSchema.parse(processedBody);
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

  // Session notes routes
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

  app.put("/api/session-notes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const note = await storage.updateSessionNote(id, req.body);
      res.json(note);
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

  // Action items routes  
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

  // Treatment plans routes
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

  // Register additional route modules
  registerCriticalFixes(app);
  registerEnhancedChartRoutes(app);
  registerTimelineRoutes(app);
  registerEnhancedTimelineRoutes(app);
  registerAIEnhancedRoutes(app);
  // Auth routes removed - single-user system
}