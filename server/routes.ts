import type { Express } from "express";
import { createServer, type Server } from "http";
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
import authRoutes from './routes/auth-routes';

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

export async function registerRoutes(app: Express, wss?: WebSocketServer): Promise<Server> {
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

  // Register additional route modules
  registerCriticalFixes(app);
  registerEnhancedChartRoutes(app);
  registerTimelineRoutes(app);
  registerEnhancedTimelineRoutes(app);
  registerAIEnhancedRoutes(app);
  app.use('/api/auth', authRoutes);

  // Create and return server
  const server = createServer(app);
  return server;
}