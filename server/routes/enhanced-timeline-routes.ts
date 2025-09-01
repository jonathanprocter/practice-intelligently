import { Express, Request, Response } from 'express';
import { storage } from '../storage';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import OpenAI from 'openai';
import { googleCalendarService } from '../auth';
import { db, pool } from '../db';
import { documents, sessionNotes, appointments, clients } from '@shared/schema';
import { eq, desc, and, or, isNull, sql } from 'drizzle-orm';
import { DocumentProcessor } from '../documentProcessor';
import { SessionDocumentProcessor } from '../session-document-processor';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize processors
const docProcessor = new DocumentProcessor();
const sessionDocProcessor = new SessionDocumentProcessor(storage);

// Schema for enhanced timeline processing
const enhancedTimelineSchema = z.object({
  therapistId: z.string(),
  clientId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  includeUnlinked: z.boolean().default(true),
  includeDocuments: z.boolean().default(true),
  autoReconcile: z.boolean().default(true)
});

export function registerEnhancedTimelineRoutes(app: Express) {
  
  /**
   * Get comprehensive timeline with ALL session notes, documents, and appointments
   * This ensures nothing is missed from the clinical record
   */
  app.get('/api/timeline/comprehensive/:therapistId', async (req: Request, res: Response) => {
    try {
      const { therapistId } = req.params;
      const { 
        clientId, 
        startDate, 
        endDate, 
        includeUnlinked = 'true',
        includeDocuments = 'true',
        autoReconcile = 'true'
      } = req.query;

      console.log('🔄 Fetching comprehensive timeline for therapist:', therapistId);

      // Fetch all data sources in parallel
      const [
        allAppointments,
        allSessionNotes,
        allDocuments,
        calendarEvents
      ] = await Promise.all([
        // Get all appointments
        storage.getAppointments(therapistId),
        
        // Get ALL session notes (linked and unlinked)
        clientId 
          ? storage.getSessionNotesByClientId(clientId as string)
          : storage.getAllSessionNotesByTherapist(therapistId),
        
        // Get all documents from the database
        includeDocuments === 'true' 
          ? db.select().from(documents)
              .where(clientId ? eq(documents.clientId, clientId as string) : eq(documents.therapistId, therapistId))
              .orderBy(desc(documents.createdAt))
          : Promise.resolve([]),
        
        // Get calendar events for reconciliation
        autoReconcile === 'true'
          ? storage.getCalendarEventsByTherapist(therapistId, {
              startDate: startDate as string,
              endDate: endDate as string
            })
          : Promise.resolve([])
      ]);

      const timelineItems = [];
      const processedIds = new Set<string>();

      // Step 1: Process all appointments
      for (const appointment of allAppointments) {
        if (!clientId || appointment.clientId === clientId) {
          const appointmentId = `apt-${appointment.id}`;
          processedIds.add(appointmentId);
          
          // Get linked session notes for this appointment
          const linkedNotes = await storage.getSessionNotesByAppointmentId(appointment.id);
          
          timelineItems.push({
            id: appointmentId,
            type: 'appointment',
            date: appointment.startTime,
            endDate: appointment.endTime,
            title: `Appointment: ${appointment.clientName || 'Unknown Client'}`,
            clientId: appointment.clientId,
            clientName: appointment.clientName || await getClientName(appointment.clientId),
            status: appointment.status || 'scheduled',
            googleEventId: appointment.googleEventId,
            source: appointment.googleEventId ? 'google_calendar' : 'manual',
            hasProgressNotes: linkedNotes.length > 0,
            progressNoteCount: linkedNotes.length,
            metadata: {
              location: appointment.location,
              appointmentType: appointment.type,
              duration: calculateDuration(appointment.startTime, appointment.endTime),
              linkedSessionNotes: linkedNotes.map(n => ({
                id: n.id,
                title: n.title,
                type: n.subjective || n.objective || n.assessment || n.plan ? 'SOAP' : 'narrative'
              }))
            }
          });
        }
      }

      // Step 2: Process ALL session notes as progress notes
      for (const note of allSessionNotes) {
        const noteId = `note-${note.id}`;
        if (!processedIds.has(noteId)) {
          processedIds.add(noteId);
          
          const isLinked = !!note.appointmentId;
          const isChartNote = !note.appointmentId && !note.eventId;
          
          // Determine if this is a structured progress note
          const isStructuredProgressNote = !!(
            note.subjective || 
            note.objective || 
            note.assessment || 
            note.plan
          );
          
          timelineItems.push({
            id: noteId,
            type: isChartNote ? 'chart_note' : 'progress_note',
            date: note.sessionDate || note.createdAt,
            title: note.title || (isChartNote ? 'Chart Note' : 'Progress Note'),
            content: note.content,
            clientId: note.clientId,
            clientName: note.clientName || await getClientName(note.clientId),
            appointmentId: note.appointmentId,
            googleEventId: note.eventId,
            tags: note.tags || note.aiTags || [],
            status: isLinked ? 'linked' : 'unlinked',
            source: note.source || 'manual',
            isProgressNote: true,
            progressNoteType: isStructuredProgressNote ? 'SOAP' : 'narrative',
            metadata: {
              subjective: note.subjective,
              objective: note.objective,
              assessment: note.assessment,
              plan: note.plan,
              tonalAnalysis: note.tonalAnalysis,
              keyPoints: note.keyPoints,
              significantQuotes: note.significantQuotes,
              narrativeSummary: note.narrativeSummary,
              needsAppointmentCreation: isChartNote && autoReconcile === 'true'
            }
          });
        }
      }

      // Step 3: Process all documents as potential progress notes
      if (includeDocuments === 'true') {
        for (const doc of allDocuments) {
          const docId = `doc-${doc.id}`;
          if (!processedIds.has(docId)) {
            processedIds.add(docId);
            
            // Check if this document is already linked to a session note
            const linkedNote = allSessionNotes.find(n => n.documentId === doc.id);
            
            if (!linkedNote) {
              // This is an unprocessed document - treat it as a progress note
              timelineItems.push({
                id: docId,
                type: 'document_progress_note',
                date: doc.uploadDate || doc.createdAt,
                title: `Document: ${doc.originalName || doc.fileName}`,
                content: doc.extractedText || doc.contentSummary,
                clientId: doc.clientId,
                clientName: doc.clientName || await getClientName(doc.clientId),
                tags: doc.tags || [],
                status: 'unlinked',
                source: 'document_upload',
                isProgressNote: true,
                progressNoteType: 'document',
                metadata: {
                  fileName: doc.originalName || doc.fileName,
                  fileType: doc.fileType,
                  category: doc.category,
                  subcategory: doc.subcategory,
                  sensitivityLevel: doc.sensitivityLevel,
                  needsProcessing: true,
                  needsAppointmentCreation: autoReconcile === 'true',
                  extractedDate: doc.sessionDate,
                  documentId: doc.id
                }
              });
            }
          }
        }
      }

      // Step 4: Add unmatched calendar events for reconciliation
      if (autoReconcile === 'true' && calendarEvents) {
        for (const event of calendarEvents) {
          const hasMatch = allAppointments.some(apt => apt.googleEventId === event.googleEventId);
          
          if (!hasMatch && event.summary && !event.summary.toLowerCase().includes('blocked')) {
            const eventId = `cal-${event.googleEventId}`;
            if (!processedIds.has(eventId)) {
              processedIds.add(eventId);
              
              // Extract potential client name from event summary
              const potentialClientName = extractClientNameFromEvent(event.summary);
              
              timelineItems.push({
                id: eventId,
                type: 'calendar_event',
                date: event.startTime,
                endDate: event.endTime,
                title: `Calendar: ${event.summary}`,
                googleEventId: event.googleEventId,
                status: 'needs_reconciliation',
                source: 'google_calendar',
                clientName: potentialClientName,
                metadata: {
                  location: event.location,
                  description: event.description,
                  needsReconciliation: true,
                  suggestedAction: 'create_appointment',
                  calendarId: event.calendarId
                }
              });
            }
          }
        }
      }

      // Sort by date (most recent first)
      timelineItems.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Calculate statistics
      const stats = {
        totalItems: timelineItems.length,
        appointments: timelineItems.filter(i => i.type === 'appointment').length,
        progressNotes: timelineItems.filter(i => i.isProgressNote).length,
        linkedProgressNotes: timelineItems.filter(i => i.isProgressNote && i.status === 'linked').length,
        unlinkedProgressNotes: timelineItems.filter(i => i.isProgressNote && i.status === 'unlinked').length,
        chartNotes: timelineItems.filter(i => i.type === 'chart_note').length,
        documentProgressNotes: timelineItems.filter(i => i.type === 'document_progress_note').length,
        needsReconciliation: timelineItems.filter(i => i.status === 'needs_reconciliation').length,
        needsProcessing: timelineItems.filter(i => i.metadata?.needsProcessing).length
      };

      res.json({
        success: true,
        items: timelineItems,
        stats,
        recommendations: generateRecommendations(stats)
      });

    } catch (error) {
      console.error('❌ Error fetching comprehensive timeline:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch comprehensive timeline data',
        details: error.message 
      });
    }
  });

  /**
   * Process and reconcile a document or session note with appointments and calendar
   */
  app.post('/api/timeline/process-and-reconcile', async (req: Request, res: Response) => {
    try {
      const { 
        itemId, 
        itemType, 
        therapistId,
        createAppointment = true,
        reconcileCalendar = true 
      } = req.body;

      console.log(`🔄 Processing ${itemType} for reconciliation:`, itemId);

      let processedItem: any = null;
      let createdAppointment: any = null;
      let linkedCalendarEvent: any = null;

      if (itemType === 'document_progress_note') {
        // Process document as a progress note
        const [document] = await db.select().from(documents).where(eq(documents.id, itemId));
        
        if (!document) {
          return res.status(404).json({ error: 'Document not found' });
        }

        // Extract metadata from document
        const extractedData = await extractDocumentMetadata(document);
        
        // Try to find matching appointment or calendar event
        if (reconcileCalendar && extractedData.sessionDate) {
          const matchResult = await findMatchingAppointmentOrEvent(
            therapistId,
            extractedData.clientId || document.clientId,
            extractedData.sessionDate
          );

          if (matchResult.appointment) {
            // Link to existing appointment
            const sessionNote = await createSessionNoteFromDocument(
              document,
              extractedData,
              matchResult.appointment.id
            );
            processedItem = sessionNote;
          } else if (matchResult.calendarEvent) {
            // Create appointment from calendar event
            if (createAppointment) {
              createdAppointment = await createAppointmentFromCalendarEvent(
                matchResult.calendarEvent,
                therapistId,
                extractedData.clientId || document.clientId
              );
              
              const sessionNote = await createSessionNoteFromDocument(
                document,
                extractedData,
                createdAppointment.id
              );
              processedItem = sessionNote;
              linkedCalendarEvent = matchResult.calendarEvent;
            }
          } else if (createAppointment) {
            // No match found - create new appointment
            createdAppointment = await storage.createAppointment({
              id: randomUUID(),
              therapistId,
              clientId: extractedData.clientId || document.clientId,
              startTime: new Date(extractedData.sessionDate),
              endTime: new Date(new Date(extractedData.sessionDate).getTime() + 60 * 60 * 1000), // 1 hour
              type: 'therapy_session',
              status: 'completed',
              location: 'Office',
              notes: `Created from document: ${document.originalName}`,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            const sessionNote = await createSessionNoteFromDocument(
              document,
              extractedData,
              createdAppointment.id
            );
            processedItem = sessionNote;
          }
        } else {
          // Create as chart note (no appointment link)
          const sessionNote = await createSessionNoteFromDocument(
            document,
            extractedData,
            null
          );
          processedItem = sessionNote;
        }
      } else if (itemType === 'chart_note' || itemType === 'progress_note') {
        // Process existing session note
        const sessionNote = await storage.getSessionNote(itemId);
        
        if (!sessionNote) {
          return res.status(404).json({ error: 'Session note not found' });
        }

        if (!sessionNote.appointmentId && reconcileCalendar) {
          // Try to find matching appointment or calendar event
          const noteDate = sessionNote.sessionDate || sessionNote.createdAt;
          const matchResult = await findMatchingAppointmentOrEvent(
            therapistId,
            sessionNote.clientId,
            noteDate
          );

          if (matchResult.appointment) {
            // Link to existing appointment
            await storage.updateSessionNote(sessionNote.id, {
              appointmentId: matchResult.appointment.id
            });
            processedItem = { ...sessionNote, appointmentId: matchResult.appointment.id };
          } else if (matchResult.calendarEvent && createAppointment) {
            // Create appointment from calendar event
            createdAppointment = await createAppointmentFromCalendarEvent(
              matchResult.calendarEvent,
              therapistId,
              sessionNote.clientId
            );
            
            await storage.updateSessionNote(sessionNote.id, {
              appointmentId: createdAppointment.id,
              eventId: matchResult.calendarEvent.googleEventId
            });
            
            processedItem = { 
              ...sessionNote, 
              appointmentId: createdAppointment.id,
              eventId: matchResult.calendarEvent.googleEventId
            };
            linkedCalendarEvent = matchResult.calendarEvent;
          }
        } else {
          processedItem = sessionNote;
        }
      }

      res.json({
        success: true,
        processedItem,
        createdAppointment,
        linkedCalendarEvent,
        action: createdAppointment ? 'created_appointment' : 
                linkedCalendarEvent ? 'linked_to_calendar' : 
                processedItem?.appointmentId ? 'linked_to_existing' : 'created_chart_note'
      });

    } catch (error) {
      console.error('❌ Error processing item for reconciliation:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to process and reconcile item',
        details: error.message 
      });
    }
  });

  /**
   * Batch process all unlinked documents and notes
   */
  app.post('/api/timeline/batch-reconcile', async (req: Request, res: Response) => {
    try {
      const { therapistId, autoCreate = true } = req.body;

      console.log('🔄 Starting batch reconciliation for therapist:', therapistId);

      // Get all unlinked session notes
      const unlinkedNotes = await db.select()
        .from(sessionNotes)
        .where(and(
          eq(sessionNotes.therapistId, therapistId),
          isNull(sessionNotes.appointmentId)
        ));

      // Get all unprocessed documents
      const unprocessedDocs = await db.select()
        .from(documents)
        .where(and(
          eq(documents.therapistId, therapistId),
          or(
            isNull(documents.processedAt),
            eq(documents.processingStatus, 'pending')
          )
        ));

      const results = {
        processedNotes: 0,
        processedDocuments: 0,
        createdAppointments: 0,
        linkedToExisting: 0,
        createdChartNotes: 0,
        errors: []
      };

      // Process unlinked notes
      for (const note of unlinkedNotes) {
        try {
          const noteDate = note.sessionDate || note.createdAt;
          const matchResult = await findMatchingAppointmentOrEvent(
            therapistId,
            note.clientId,
            noteDate
          );

          if (matchResult.appointment) {
            await storage.updateSessionNote(note.id, {
              appointmentId: matchResult.appointment.id
            });
            results.linkedToExisting++;
          } else if (matchResult.calendarEvent && autoCreate) {
            const appointment = await createAppointmentFromCalendarEvent(
              matchResult.calendarEvent,
              therapistId,
              note.clientId
            );
            await storage.updateSessionNote(note.id, {
              appointmentId: appointment.id,
              eventId: matchResult.calendarEvent.googleEventId
            });
            results.createdAppointments++;
          } else {
            results.createdChartNotes++;
          }
          results.processedNotes++;
        } catch (error) {
          results.errors.push({
            type: 'note',
            id: note.id,
            error: error.message
          });
        }
      }

      // Process documents
      for (const doc of unprocessedDocs) {
        try {
          const extractedData = await extractDocumentMetadata(doc);
          
          if (extractedData.sessionDate) {
            const matchResult = await findMatchingAppointmentOrEvent(
              therapistId,
              doc.clientId,
              extractedData.sessionDate
            );

            if (matchResult.appointment || (matchResult.calendarEvent && autoCreate)) {
              const appointmentId = matchResult.appointment?.id || 
                (await createAppointmentFromCalendarEvent(
                  matchResult.calendarEvent,
                  therapistId,
                  doc.clientId
                )).id;
              
              await createSessionNoteFromDocument(doc, extractedData, appointmentId);
              
              if (matchResult.appointment) {
                results.linkedToExisting++;
              } else {
                results.createdAppointments++;
              }
            } else {
              await createSessionNoteFromDocument(doc, extractedData, null);
              results.createdChartNotes++;
            }
          } else {
            await createSessionNoteFromDocument(doc, extractedData, null);
            results.createdChartNotes++;
          }
          
          // Mark document as processed
          await db.update(documents)
            .set({ 
              processedAt: new Date(),
              processingStatus: 'completed'
            })
            .where(eq(documents.id, doc.id));
          
          results.processedDocuments++;
        } catch (error) {
          results.errors.push({
            type: 'document',
            id: doc.id,
            error: error.message
          });
        }
      }

      console.log('✅ Batch reconciliation completed:', results);

      res.json({
        success: true,
        results,
        message: `Processed ${results.processedNotes} notes and ${results.processedDocuments} documents`
      });

    } catch (error) {
      console.error('❌ Error in batch reconciliation:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to complete batch reconciliation',
        details: error.message 
      });
    }
  });
}

// Helper functions

async function getClientName(clientId: string): Promise<string> {
  if (!clientId) return 'Unknown Client';
  
  try {
    const client = await storage.getClient(clientId);
    return client ? `${client.firstName} ${client.lastName}` : 'Unknown Client';
  } catch {
    return 'Unknown Client';
  }
}

function calculateDuration(startTime: any, endTime: any): number {
  if (!startTime || !endTime) return 60; // Default 1 hour
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return Math.round((end - start) / (1000 * 60)); // Duration in minutes
}

function extractClientNameFromEvent(summary: string): string {
  // Try to extract client name from calendar event summary
  // Common patterns: "Therapy - John Doe", "John Doe - Session", etc.
  const patterns = [
    /(?:therapy|session|appointment)[\s-]+(.+?)(?:\s*[-]|$)/i,
    /(.+?)[\s-]+(?:therapy|session|appointment)/i,
    /^(.+?)(?:\s*[-])/
  ];

  for (const pattern of patterns) {
    const match = summary.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return summary.replace(/therapy|session|appointment/gi, '').trim();
}

async function extractDocumentMetadata(document: any): Promise<any> {
  try {
    // Use AI to extract metadata from document content
    const prompt = `Extract the following information from this clinical document:
    1. Client name
    2. Session date
    3. Type of document (progress note, assessment, treatment plan, etc.)
    
    Document content:
    ${document.extractedText || document.contentSummary || ''}
    
    Respond in JSON format: { "clientName": "", "sessionDate": "", "documentType": "" }`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0
    });

    const content = response.choices[0]?.message?.content || '{}';
    const extracted = JSON.parse(content.replace(/```json|```/g, '').trim());

    return {
      clientId: document.clientId,
      clientName: extracted.clientName || document.clientName,
      sessionDate: extracted.sessionDate || document.sessionDate,
      documentType: extracted.documentType || 'progress_note'
    };
  } catch (error) {
    console.error('Error extracting document metadata:', error);
    return {
      clientId: document.clientId,
      clientName: document.clientName,
      sessionDate: document.sessionDate || document.uploadDate,
      documentType: 'document'
    };
  }
}

async function findMatchingAppointmentOrEvent(
  therapistId: string, 
  clientId: string, 
  targetDate: any
): Promise<{ appointment?: any; calendarEvent?: any }> {
  const date = new Date(targetDate);
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // First, check for existing appointments
  const appointments = await storage.getAppointments(therapistId);
  const matchingAppointment = appointments.find(apt => {
    const aptDate = new Date(apt.startTime);
    return apt.clientId === clientId && 
           aptDate >= dayStart && 
           aptDate <= dayEnd;
  });

  if (matchingAppointment) {
    return { appointment: matchingAppointment };
  }

  // Check calendar events
  try {
    const calendarEvents = await storage.getCalendarEventsByTherapist(therapistId, {
      startDate: dayStart.toISOString(),
      endDate: dayEnd.toISOString()
    });

    const matchingEvent = calendarEvents.find(event => {
      const eventDate = new Date(event.startTime);
      return eventDate >= dayStart && eventDate <= dayEnd;
    });

    if (matchingEvent) {
      return { calendarEvent: matchingEvent };
    }
  } catch (error) {
    console.error('Error checking calendar events:', error);
  }

  return {};
}

async function createAppointmentFromCalendarEvent(
  calendarEvent: any,
  therapistId: string,
  clientId: string
): Promise<any> {
  const appointment = {
    id: randomUUID(),
    therapistId,
    clientId,
    googleEventId: calendarEvent.googleEventId,
    startTime: calendarEvent.startTime,
    endTime: calendarEvent.endTime,
    type: 'therapy_session',
    status: new Date(calendarEvent.startTime) < new Date() ? 'completed' : 'scheduled',
    location: calendarEvent.location || 'Office',
    notes: `Created from calendar event: ${calendarEvent.summary}`,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return await storage.createAppointment(appointment);
}

async function createSessionNoteFromDocument(
  document: any,
  extractedData: any,
  appointmentId: string | null
): Promise<any> {
  // Parse document content to create structured progress note
  let progressNoteData: any = {
    id: randomUUID(),
    therapistId: document.therapistId,
    clientId: extractedData.clientId || document.clientId,
    appointmentId,
    documentId: document.id,
    title: `Progress Note - ${extractedData.clientName || document.clientName || 'Unknown'}`,
    content: document.extractedText || document.contentSummary,
    sessionDate: extractedData.sessionDate || document.uploadDate,
    source: 'document_import',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Try to extract SOAP components if possible
  try {
    const soapPrompt = `Extract SOAP note components from this clinical document. 
    Return in JSON format with keys: subjective, objective, assessment, plan.
    If any section is not found, leave it empty.
    
    Document:
    ${document.extractedText || document.contentSummary}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: soapPrompt }],
      max_tokens: 1000,
      temperature: 0
    });

    const soapContent = response.choices[0]?.message?.content || '{}';
    const soap = JSON.parse(soapContent.replace(/```json|```/g, '').trim());

    progressNoteData = {
      ...progressNoteData,
      subjective: soap.subjective || '',
      objective: soap.objective || '',
      assessment: soap.assessment || '',
      plan: soap.plan || ''
    };
  } catch (error) {
    console.error('Error extracting SOAP components:', error);
  }

  return await storage.createSessionNote(progressNoteData);
}

function generateRecommendations(stats: any): string[] {
  const recommendations = [];

  if (stats.unlinkedProgressNotes > 0) {
    recommendations.push(`You have ${stats.unlinkedProgressNotes} unlinked progress notes that should be reconciled with appointments`);
  }

  if (stats.documentProgressNotes > 0) {
    recommendations.push(`${stats.documentProgressNotes} documents need to be processed and converted to progress notes`);
  }

  if (stats.needsReconciliation > 0) {
    recommendations.push(`${stats.needsReconciliation} calendar events need reconciliation with your appointment system`);
  }

  if (stats.chartNotes > 5) {
    recommendations.push(`Consider linking some of your ${stats.chartNotes} chart notes to specific appointments for better organization`);
  }

  return recommendations;
}