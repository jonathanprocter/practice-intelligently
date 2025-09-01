import { Express, Request, Response } from 'express';
import { storage } from '../storage';
import { randomUUID } from 'crypto';
import { z } from 'zod';

// Schema for timeline document processing
const timelineDocumentSchema = z.object({
  documentContent: z.string(),
  fileName: z.string(),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  sessionDate: z.string().optional(),
  therapistId: z.string(),
  documentType: z.enum(['progress_note', 'chart_note', 'session_transcript', 'clinical_document']).optional(),
  source: z.enum(['upload', 'manual', 'google_calendar', 'auto_generated']).optional(),
  createAppointmentIfMissing: z.boolean().default(true),
  reconcileWithCalendar: z.boolean().default(true)
});

export function registerTimelineRoutes(app: Express) {
  
  /**
   * Get unified timeline data for a therapist or client
   * Combines appointments, session notes, documents, and calendar events
   */
  app.get('/api/timeline/:therapistId', async (req: Request, res: Response) => {
    try {
      const { therapistId } = req.params;
      const { clientId, startDate, endDate, includeUnlinked = true } = req.query;

      // Fetch all related data
      const [appointments, sessionNotes, calendarEvents] = await Promise.all([
        storage.getAppointments(therapistId),
        clientId 
          ? storage.getSessionNotesByClientId(clientId as string)
          : storage.getAllSessionNotesByTherapist(therapistId),
        storage.getCalendarEventsByTherapist(therapistId, {
          startDate: startDate as string,
          endDate: endDate as string
        })
      ]);

      // Process and combine all timeline items
      const timelineItems = [];

      // Add appointments
      for (const appointment of appointments) {
        if (!clientId || appointment.clientId === clientId) {
          timelineItems.push({
            id: appointment.id,
            type: 'appointment',
            date: appointment.startTime,
            endDate: appointment.endTime,
            title: `Appointment`,
            clientId: appointment.clientId,
            clientName: await getClientName(appointment.clientId),
            status: appointment.status,
            googleEventId: appointment.googleEventId,
            source: appointment.googleEventId ? 'google_calendar' : 'manual',
            metadata: {
              location: appointment.location,
              duration: calculateDuration(appointment.startTime, appointment.endTime),
              hasSessionNote: await hasLinkedSessionNote(appointment.id)
            }
          });
        }
      }

      // Add session notes
      for (const note of sessionNotes) {
        const isChartNote = !note.appointmentId && !note.eventId;
        timelineItems.push({
          id: note.id,
          type: isChartNote ? 'chart_note' : 'session_note',
          date: note.sessionDate || note.createdAt,
          title: note.title || (isChartNote ? 'Chart Note' : 'Progress Note'),
          content: note.content,
          clientId: note.clientId,
          clientName: await getClientName(note.clientId),
          appointmentId: note.appointmentId,
          googleEventId: note.eventId,
          tags: note.tags || note.aiTags,
          status: note.appointmentId ? 'linked' : 'unlinked',
          source: note.source || 'manual',
          metadata: {
            subjective: note.subjective,
            objective: note.objective,
            assessment: note.assessment,
            plan: note.plan
          }
        });
      }

      // Add unmatched calendar events
      if (includeUnlinked) {
        for (const event of calendarEvents) {
          const hasMatch = appointments.some(apt => apt.googleEventId === event.googleEventId);
          if (!hasMatch) {
            timelineItems.push({
              id: `cal-${event.googleEventId}`,
              type: 'calendar_event',
              date: event.startTime,
              endDate: event.endTime,
              title: event.summary,
              googleEventId: event.googleEventId,
              status: 'unreconciled',
              source: 'google_calendar',
              metadata: {
                location: event.location,
                description: event.description,
                needsReconciliation: true
              }
            });
          }
        }
      }

      // Sort by date (most recent first)
      timelineItems.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      res.json({
        success: true,
        items: timelineItems,
        totalCount: timelineItems.length,
        stats: {
          appointments: timelineItems.filter(i => i.type === 'appointment').length,
          sessionNotes: timelineItems.filter(i => i.type === 'session_note').length,
          chartNotes: timelineItems.filter(i => i.type === 'chart_note').length,
          unreconciled: timelineItems.filter(i => i.status === 'unreconciled').length
        }
      });

    } catch (error) {
      console.error('Error fetching timeline:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch timeline data' 
      });
    }
  });

  /**
   * Process a document and add it to the timeline
   * Automatically creates appointments if missing and reconciles with calendar
   */
  app.post('/api/timeline/process-document', async (req: Request, res: Response) => {
    try {
      const validatedData = timelineDocumentSchema.parse(req.body);
      
      // Extract or determine client ID
      let clientId = validatedData.clientId;
      if (!clientId && validatedData.clientName) {
        clientId = await storage.getClientIdByName(validatedData.clientName);
        if (!clientId) {
          // Create a new client if not found
          const newClient = await storage.createClient({
            firstName: validatedData.clientName.split(' ')[0],
            lastName: validatedData.clientName.split(' ').slice(1).join(' ') || 'Unknown',
            therapistId: validatedData.therapistId,
            email: `${validatedData.clientName.toLowerCase().replace(/\s+/g, '.')}@placeholder.com`,
            status: 'active'
          });
          clientId = newClient.id;
        }
      }

      if (!clientId) {
        return res.status(400).json({
          success: false,
          error: 'Client ID or name is required'
        });
      }

      // Check for existing appointment on the session date
      let appointmentId = null;
      let googleEventId = null;
      
      if (validatedData.sessionDate) {
        const sessionDate = new Date(validatedData.sessionDate);
        const appointments = await storage.getAppointmentsByClient(clientId);
        
        // Find appointment within same day
        const matchingAppointment = appointments.find(apt => {
          const aptDate = new Date(apt.startTime);
          return aptDate.toDateString() === sessionDate.toDateString();
        });

        if (matchingAppointment) {
          appointmentId = matchingAppointment.id;
          googleEventId = matchingAppointment.googleEventId;
        } else if (validatedData.createAppointmentIfMissing) {
          // Create a new appointment
          const newAppointment = await storage.createAppointment({
            clientId,
            therapistId: validatedData.therapistId,
            startTime: sessionDate,
            endTime: new Date(sessionDate.getTime() + 60 * 60 * 1000), // 1 hour duration
            type: 'therapy_session',
            status: 'completed',
            location: 'Office',
            notes: 'Auto-created from document upload'
          });
          appointmentId = newAppointment.id;

          // Try to reconcile with calendar events
          if (validatedData.reconcileWithCalendar) {
            const calendarEvents = await storage.getCalendarEventsByTherapist(
              validatedData.therapistId,
              {
                startDate: sessionDate.toISOString(),
                endDate: new Date(sessionDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
              }
            );

            // Find best matching calendar event
            const matchingEvent = calendarEvents.find(event => {
              const eventClientName = extractClientNameFromEvent(event.summary);
              return eventClientName.toLowerCase().includes(
                validatedData.clientName?.toLowerCase() || ''
              );
            });

            if (matchingEvent) {
              googleEventId = matchingEvent.googleEventId;
              // Update appointment with Google Event ID
              await storage.updateAppointment(appointmentId, {
                googleEventId: matchingEvent.googleEventId,
                googleCalendarId: matchingEvent.googleCalendarId
              });
            }
          }
        }
      }

      // Create the session note
      const sessionNote = await storage.createSessionNote({
        clientId,
        therapistId: validatedData.therapistId,
        content: validatedData.documentContent,
        appointmentId,
        eventId: googleEventId,
        title: validatedData.fileName || 'Imported Document',
        sessionDate: validatedData.sessionDate ? new Date(validatedData.sessionDate) : new Date(),
        source: validatedData.source || 'upload',
        tags: []
      });

      // Generate AI tags for the note
      try {
        const tags = await generateAITags(validatedData.documentContent);
        await storage.updateSessionNote(sessionNote.id, { tags });
      } catch (tagError) {
        console.error('Error generating AI tags:', tagError);
      }

      res.json({
        success: true,
        sessionNote,
        appointmentCreated: !!appointmentId && !googleEventId,
        calendarReconciled: !!googleEventId,
        message: appointmentId 
          ? (googleEventId 
            ? 'Document processed and linked to calendar appointment'
            : 'Document processed and appointment created')
          : 'Document processed as chart note (no appointment)'
      });

    } catch (error) {
      console.error('Error processing timeline document:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid document data',
          details: error.errors
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to process document'
        });
      }
    }
  });

  /**
   * Reconcile unlinked documents with calendar events
   */
  app.post('/api/timeline/reconcile/:therapistId', async (req: Request, res: Response) => {
    try {
      const { therapistId } = req.params;
      const { startDate, endDate, autoCreate = true } = req.body;

      // Get all unlinked session notes
      const sessionNotes = await storage.getAllSessionNotesByTherapist(therapistId);
      const unlinkedNotes = sessionNotes.filter(note => !note.appointmentId);

      // Get calendar events for the period
      const calendarEvents = await storage.getCalendarEventsByTherapist(therapistId, {
        startDate,
        endDate
      });

      let reconciled = 0;
      let created = 0;

      for (const note of unlinkedNotes) {
        const noteDate = new Date(note.sessionDate || note.createdAt);
        const clientName = await getClientName(note.clientId);
        
        // Find matching calendar event
        const matchingEvent = calendarEvents.find(event => {
          const eventDate = new Date(event.startTime);
          const eventClientName = extractClientNameFromEvent(event.summary);
          
          return eventDate.toDateString() === noteDate.toDateString() &&
                 eventClientName.toLowerCase().includes(clientName.toLowerCase());
        });

        if (matchingEvent) {
          // Check if appointment exists for this event
          let appointment = await storage.getAppointmentByEventId(matchingEvent.googleEventId);
          
          if (!appointment && autoCreate) {
            // Create appointment from calendar event
            appointment = await storage.createAppointment({
              clientId: note.clientId,
              therapistId,
              startTime: new Date(matchingEvent.startTime),
              endTime: new Date(matchingEvent.endTime),
              type: 'therapy_session',
              status: 'completed',
              location: matchingEvent.location || 'Office',
              googleEventId: matchingEvent.googleEventId,
              googleCalendarId: matchingEvent.googleCalendarId,
              notes: 'Auto-created during reconciliation'
            });
            created++;
          }

          if (appointment) {
            // Link the note to the appointment
            await storage.updateSessionNote(note.id, {
              appointmentId: appointment.id,
              eventId: matchingEvent.googleEventId
            });
            reconciled++;
          }
        }
      }

      res.json({
        success: true,
        message: `Reconciliation complete: ${reconciled} notes linked, ${created} appointments created`,
        stats: {
          totalUnlinked: unlinkedNotes.length,
          reconciled,
          appointmentsCreated: created,
          remaining: unlinkedNotes.length - reconciled
        }
      });

    } catch (error) {
      console.error('Error reconciling timeline:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reconcile timeline'
      });
    }
  });
}

// Helper functions
async function getClientName(clientId: string): Promise<string> {
  try {
    const client = await storage.getClient(clientId);
    return client ? `${client.firstName} ${client.lastName}` : 'Unknown Client';
  } catch {
    return 'Unknown Client';
  }
}

async function hasLinkedSessionNote(appointmentId: string): Promise<boolean> {
  try {
    const notes = await storage.getSessionNotesByAppointmentId(appointmentId);
    return notes && notes.length > 0;
  } catch {
    return false;
  }
}

function calculateDuration(startTime: Date | string, endTime: Date | string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // Duration in minutes
}

function extractClientNameFromEvent(summary: string): string {
  const patterns = [
    /^🔒\s*(.+?)\s+(Appointment|Session|Therapy|Meeting)$/i,
    /^(.+?)\s+(Appointment|Session|Therapy|Meeting)$/i,
    /^(?:Appointment|Session|Therapy|Meeting)\s+with\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = summary.match(pattern);
    if (match && match[1]) {
      return match[1].trim().replace(/^[^\w\s]+\s*/, '');
    }
  }

  return summary;
}

async function generateAITags(content: string): Promise<string[]> {
  // This would call your AI service to generate tags
  // For now, returning placeholder tags
  return ['therapy', 'progress-note', 'clinical'];
}