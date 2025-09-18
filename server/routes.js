// server/routes.js
import { Router } from "express";
import { storage } from './storage.js';

const AUTO_LINK_THRESHOLD_MINUTES = 180; // 3 hours
const SUGGESTION_THRESHOLD_MINUTES = 24 * 60; // 24 hours
const STOP_WORDS = new Set([
  'the', 'and', 'that', 'this', 'with', 'from', 'have', 'will', 'which', 'been', 'were', 'they', 'their',
  'about', 'your', 'into', 'there', 'here', 'when', 'what', 'where', 'while', 'client', 'session', 'therapist',
  'therapy', 'notes', 'note', 'plan', 'treatment', 'progress', 'insight', 'summary', 'because', 'during', 'after',
  'before', 'through', 'also', 'should', 'could', 'would', 'very', 'much', 'many', 'into', 'onto', 'been', 'over',
  'well', 'able', 'make', 'made', 'really', 'today', 'yesterday', 'tomorrow', 'week', 'month', 'year'
]);

const router = Router();

function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function extractTopTags(text, limit = 5) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const wordCounts = new Map();
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));

  for (const word of cleaned) {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }

  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function findClosestAppointment(appointments, noteDate) {
  if (!Array.isArray(appointments) || !noteDate) {
    return null;
  }

  let bestMatch = null;
  let smallestDifference = Infinity;

  for (const appointment of appointments) {
    const start = parseDate(appointment.startTime || appointment.start_time);
    if (!start) continue;

    const difference = Math.abs(start.getTime() - noteDate.getTime());
    if (difference < smallestDifference) {
      smallestDifference = difference;
      bestMatch = {
        appointment,
        start,
        differenceMinutes: difference / 60000
      };
    }
  }

  return bestMatch;
}

function calculateConfidence(diffMinutes) {
  if (!isFinite(diffMinutes)) return 0;
  if (diffMinutes <= 60) return 0.95;
  if (diffMinutes <= 120) return 0.85;
  if (diffMinutes <= 180) return 0.75;
  if (diffMinutes <= 360) return 0.6;
  if (diffMinutes <= 720) return 0.45;
  if (diffMinutes <= 1440) return 0.3;
  return 0.1;
}

function buildCreatePayload(body) {
  const sessionDate = parseDate(body.sessionDate) || parseDate(body.eventDate) || new Date();
  const payload = {
    appointmentId: body.appointmentId || null,
    eventId: body.eventId || null,
    clientId: body.clientId,
    therapistId: body.therapistId,
    content: body.content,
    transcript: body.transcript ?? null,
    aiSummary: body.aiSummary ?? null,
    tags: body.tags ?? null,
    title: body.title ?? null,
    subjective: body.subjective ?? null,
    objective: body.objective ?? null,
    assessment: body.assessment ?? null,
    plan: body.plan ?? null,
    tonalAnalysis: body.tonalAnalysis ?? null,
    keyPoints: body.keyPoints ?? null,
    significantQuotes: body.significantQuotes ?? null,
    narrativeSummary: body.narrativeSummary ?? null,
    aiTags: Array.isArray(body.aiTags) ? body.aiTags : body.aiTags ? [body.aiTags] : null,
    sessionDate,
    manualEntry: body.manualEntry ?? false,
    meetingType: body.meetingType ?? null,
    participants: body.participants ?? null,
    location: body.location ?? null,
    duration: typeof body.duration === 'number' ? body.duration : null,
    followUpRequired: body.followUpRequired ?? false,
    followUpNotes: body.followUpNotes ?? null,
    confidentialityLevel: body.confidentialityLevel ?? undefined
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  return payload;
}

function buildUpdatePayload(body) {
  const update = {};
  const fields = [
    'appointmentId', 'eventId', 'clientId', 'therapistId', 'content', 'transcript', 'aiSummary', 'tags',
    'title', 'subjective', 'objective', 'assessment', 'plan', 'tonalAnalysis', 'keyPoints', 'significantQuotes',
    'narrativeSummary', 'manualEntry', 'meetingType', 'participants', 'location', 'duration',
    'followUpRequired', 'followUpNotes', 'confidentialityLevel'
  ];

  for (const field of fields) {
    if (body[field] !== undefined) {
      update[field] = body[field];
    }
  }

  if (body.sessionDate !== undefined) {
    const parsed = parseDate(body.sessionDate);
    if (parsed) {
      update.sessionDate = parsed;
    }
  }

  if (body.aiTags !== undefined) {
    update.aiTags = Array.isArray(body.aiTags) ? body.aiTags : body.aiTags ? [body.aiTags] : null;
  }

  if (body.keyPoints !== undefined) {
    update.keyPoints = body.keyPoints;
  }

  if (body.significantQuotes !== undefined) {
    update.significantQuotes = body.significantQuotes;
  }

  return update;
}

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
      storage.getAllSessionNotesByTherapist(therapistId)
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
    
    // Transform appointments to SimplePractice format
    const formattedAppointments = (appointments || []).map(apt => ({
      id: apt.id,
      title: apt.clientName || 'Client Appointment',
      clientName: apt.clientName,
      clientId: apt.clientId,
      startTime: apt.startTime || apt.start_time,
      endTime: apt.endTime || apt.end_time,
      status: apt.status || 'confirmed',
      type: apt.type || 'therapy',
      location: apt.location || 'Office',
      notes: apt.notes,
      calendarName: 'SimplePractice',  // Mark as SimplePractice appointment
      isSimplePractice: true,  // Flag for styling
      backgroundColor: '#E8F4FD',
      borderColor: '#0056A6'
    }));
    
    res.json(formattedAppointments);
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

// Calendar events - includes SimplePractice appointments
router.get('/calendar/events', async (req, res) => {
  try {
    const { timeMin, timeMax } = req.query;
    const therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c'; // Should come from auth
    
    // Get appointments from database for the time range
    const appointments = await storage.getAppointmentsByDateRange(
      therapistId,
      new Date(timeMin),
      new Date(timeMax)
    );
    
    // Transform appointments to calendar event format
    const events = (appointments || []).map(apt => ({
      id: apt.id,
      googleEventId: `sp_${apt.id}`, // Prefix for SimplePractice
      title: apt.clientName || 'Client Appointment',
      clientName: apt.clientName,
      clientId: apt.clientId,
      startTime: apt.startTime || apt.start_time,
      endTime: apt.endTime || apt.end_time,
      start: { dateTime: apt.startTime || apt.start_time },
      end: { dateTime: apt.endTime || apt.end_time },
      status: apt.status || 'confirmed',
      type: apt.type || 'therapy',
      location: apt.location || 'Office',
      notes: apt.notes,
      summary: apt.clientName || 'Client Appointment',
      calendarName: 'SimplePractice',
      calendarId: 'simplepractice',
      isSimplePractice: true,
      backgroundColor: '#E8F4FD',
      borderColor: '#0056A6'
    }));
    
    res.json(events);
  } catch (error) {
    console.error('Calendar events error:', error);
    res.json([]);
  }
});

// Session notes - therapist level
router.get('/session-notes/therapist/:therapistId', async (req, res) => {
  try {
    const notes = await storage.getAllSessionNotesByTherapist(req.params.therapistId);
    res.json(notes || []);
  } catch (error) {
    console.error('Session notes (therapist) error:', error);
    res.status(500).json({ message: 'Failed to load session notes' });
  }
});

// Session notes by client
router.get('/session-notes/client/:clientId', async (req, res) => {
  try {
    const notes = await storage.getSessionNotesByClientId(req.params.clientId);
    res.json(notes || []);
  } catch (error) {
    console.error('Session notes (client) error:', error);
    res.status(500).json({ message: 'Failed to load client session notes' });
  }
});

// Session notes by calendar event
router.get('/session-notes/event/:eventId', async (req, res) => {
  try {
    const notes = await storage.getSessionNotesByEventId(req.params.eventId);
    res.json(notes || []);
  } catch (error) {
    console.error('Session notes (event) error:', error);
    res.status(500).json({ message: 'Failed to load session notes for event' });
  }
});

// Single session note
router.get('/session-notes/:id', async (req, res) => {
  try {
    const note = await storage.getSessionNote(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Session note not found' });
    }
    res.json(note);
  } catch (error) {
    console.error('Session note detail error:', error);
    res.status(500).json({ message: 'Failed to load session note' });
  }
});

// Create session note
router.post('/session-notes', async (req, res) => {
  try {
    const { clientId, therapistId, content } = req.body || {};
    if (!clientId || !therapistId || !content) {
      return res.status(400).json({ message: 'clientId, therapistId and content are required' });
    }

    const payload = buildCreatePayload(req.body);
    const note = await storage.createSessionNote(payload);
    res.status(201).json(note);
  } catch (error) {
    console.error('Create session note error:', error);
    res.status(500).json({ message: 'Failed to create session note' });
  }
});

const updateSessionNoteHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const note = await storage.getSessionNote(id);
    if (!note) {
      return res.status(404).json({ message: 'Session note not found' });
    }

    const update = buildUpdatePayload(req.body || {});
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update' });
    }

    const updated = await storage.updateSessionNote(id, update);
    res.json(updated);
  } catch (error) {
    console.error('Update session note error:', error);
    res.status(500).json({ message: 'Failed to update session note' });
  }
};

router.put('/session-notes/:id', updateSessionNoteHandler);
router.patch('/session-notes/:id', updateSessionNoteHandler);

router.delete('/session-notes/:id', async (req, res) => {
  try {
    const note = await storage.getSessionNote(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Session note not found' });
    }

    await storage.deleteSessionNote(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Delete session note error:', error);
    res.status(500).json({ message: 'Failed to delete session note' });
  }
});

router.post('/session-notes/:id/generate-tags', async (req, res) => {
  try {
    const { id } = req.params;
    const bodyContent = req.body?.content;
    const note = await storage.getSessionNote(id);
    const content = bodyContent || note?.content;

    if (!content) {
      return res.status(400).json({ message: 'No content available to generate tags' });
    }

    const tags = extractTopTags(content, 6);
    await storage.updateSessionNote(id, { aiTags: tags });

    res.json({ id, aiTags: tags });
  } catch (error) {
    console.error('Generate tags error:', error);
    res.status(500).json({ message: 'Failed to generate tags' });
  }
});

router.put('/session-notes/:id/link-appointment', async (req, res) => {
  try {
    const { appointmentId } = req.body || {};
    if (!appointmentId) {
      return res.status(400).json({ message: 'appointmentId is required' });
    }

    const [note, appointment] = await Promise.all([
      storage.getSessionNote(req.params.id),
      storage.getAppointment(appointmentId)
    ]);

    if (!note) {
      return res.status(404).json({ message: 'Session note not found' });
    }

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (note.clientId && appointment.clientId && note.clientId !== appointment.clientId) {
      return res.status(400).json({ message: 'Session note belongs to a different client' });
    }

    const existingNotes = await storage.getSessionNotesByAppointmentId(appointment.id);
    const conflictingNote = (existingNotes || []).find((entry) => entry.id !== note.id);
    if (conflictingNote) {
      return res.status(409).json({
        message: 'Appointment already linked to another session note',
        conflict: {
          noteId: conflictingNote.id,
          clientId: conflictingNote.clientId,
          therapistId: conflictingNote.therapistId
        }
      });
    }

    const appointmentStart = parseDate(appointment.startTime || appointment.start_time);
    const update = {
      appointmentId: appointment.id,
      eventId: appointment.googleEventId || appointment.eventId || note.eventId || null
    };

    if (!note.sessionDate && appointmentStart) {
      update.sessionDate = appointmentStart;
    }

    const updated = await storage.updateSessionNote(req.params.id, update);
    res.json(updated);
  } catch (error) {
    console.error('Link appointment error:', error);
    res.status(500).json({ message: 'Failed to link appointment' });
  }
});

router.put('/session-notes/:id/unlink-appointment', async (req, res) => {
  try {
    const note = await storage.getSessionNote(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Session note not found' });
    }

    const updated = await storage.updateSessionNote(req.params.id, {
      appointmentId: null,
      eventId: null
    });

    res.json(updated);
  } catch (error) {
    console.error('Unlink appointment error:', error);
    res.status(500).json({ message: 'Failed to unlink appointment' });
  }
});

router.post('/session-notes/auto-link/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const [notes, appointments] = await Promise.all([
      storage.getSessionNotesByClientId(clientId),
      storage.getAppointmentsByClient(clientId)
    ]);

    const notesList = notes || [];
    const unlinked = notesList.filter((note) => !note.appointmentId);
    if (unlinked.length === 0) {
      return res.json({ linkedCount: 0, totalUnlinked: 0, linkedNoteIds: [], suggestions: [] });
    }

    const linkedNoteIds = [];
    const suggestions = [];
    const notesById = new Map(notesList.map((sessionNote) => [sessionNote.id, sessionNote]));
    const appointmentAssignments = new Map();

    for (const existingNote of notesList) {
      if (existingNote.appointmentId) {
        appointmentAssignments.set(existingNote.appointmentId, existingNote.id);
      }
    }

    for (const note of unlinked) {
      const noteDate = parseDate(note.sessionDate || note.createdAt || note.created_at);
      if (!noteDate) {
        suggestions.push({
          noteId: note.id,
          appointmentId: null,
          confidence: 0,
          reason: 'No session date available for automatic matching',
          factors: [
            {
              type: 'date_proximity',
              weight: 0,
              description: 'Unable to compare dates because the session note has no timestamp'
            }
          ]
        });
        continue;
      }

      const match = findClosestAppointment(appointments, noteDate);
      if (!match) {
        continue;
      }

      if (match.differenceMinutes > SUGGESTION_THRESHOLD_MINUTES) {
        continue;
      }

      const appointmentId = match.appointment.id;
      const confidence = Number(calculateConfidence(match.differenceMinutes).toFixed(2));
      const baseFactor = {
        type: 'date_proximity',
        weight: 0.7,
        description: `Appointment on ${match.start.toISOString()} closely matches the note timestamp`
      };
      const conflictingNoteId = appointmentAssignments.get(appointmentId);
      if (conflictingNoteId && conflictingNoteId !== note.id) {
        const conflictNote = notesById.get(conflictingNoteId);
        suggestions.push({
          noteId: note.id,
          appointmentId,
          confidence,
          reason: 'Appointment already linked to another session note',
          factors: [
            baseFactor,
            {
              type: 'conflict',
              weight: 1,
              description: conflictNote
                ? `Appointment already linked to session note ${conflictNote.id}`
                : 'Appointment already linked to a different session note'
            }
          ]
        });
        continue;
      }

      if (match.differenceMinutes <= AUTO_LINK_THRESHOLD_MINUTES) {
        const update = {
          appointmentId,
          eventId: match.appointment.googleEventId || match.appointment.eventId || note.eventId || null
        };

        if (!note.sessionDate) {
          update.sessionDate = match.start;
        }

        await storage.updateSessionNote(note.id, update);
        appointmentAssignments.set(appointmentId, note.id);
        notesById.set(note.id, { ...note, appointmentId, sessionDate: note.sessionDate || match.start });
        linkedNoteIds.push(note.id);
      } else {
        suggestions.push({
          noteId: note.id,
          appointmentId,
          confidence,
          reason: `Session note timestamp is within ${Math.round(match.differenceMinutes)} minutes of appointment start`,
          factors: [baseFactor]
        });
      }
    }

    res.json({
      linkedCount: linkedNoteIds.length,
      totalUnlinked: unlinked.length,
      linkedNoteIds,
      suggestions
    });
  } catch (error) {
    console.error('Auto-link session notes error:', error);
    res.status(500).json({ message: 'Failed to auto-link session notes' });
  }
});

router.post('/session-notes/suggest-links/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const [notes, appointments] = await Promise.all([
      storage.getSessionNotesByClientId(clientId),
      storage.getAppointmentsByClient(clientId)
    ]);

    const suggestions = [];
    const appointmentAssignments = new Map();
    for (const note of notes || []) {
      if (note.appointmentId) {
        appointmentAssignments.set(note.appointmentId, note);
      }
    }

    for (const note of notes || []) {
      if (note.appointmentId) continue;
      const noteDate = parseDate(note.sessionDate || note.createdAt || note.created_at);
      if (!noteDate) continue;

      const match = findClosestAppointment(appointments, noteDate);
      if (!match || match.differenceMinutes > SUGGESTION_THRESHOLD_MINUTES) continue;

      const appointmentId = match.appointment.id;
      const confidence = Number(calculateConfidence(match.differenceMinutes).toFixed(2));
      const factors = [
        {
          type: 'date_proximity',
          weight: 0.7,
          description: `Appointment on ${match.start.toISOString()} is near the note timestamp`
        }
      ];
      const conflictingNote = appointmentAssignments.get(appointmentId);
      if (conflictingNote && conflictingNote.id !== note.id) {
        factors.push({
          type: 'conflict',
          weight: 1,
          description: `Appointment already linked to session note ${conflictingNote.id}`
        });
        suggestions.push({
          noteId: note.id,
          appointmentId,
          confidence,
          reason: 'Appointment already linked to another session note',
          factors
        });
        continue;
      }

      suggestions.push({
        noteId: note.id,
        appointmentId,
        confidence,
        reason: `Potential match within ${Math.round(match.differenceMinutes)} minutes`,
        factors
      });
    }

    res.json(suggestions);
  } catch (error) {
    console.error('Suggest session note links error:', error);
    res.status(500).json({ message: 'Failed to generate link suggestions' });
  }
});

router.post('/session-notes/validate-link', async (req, res) => {
  try {
    const { noteId, appointmentId } = req.body || {};
    if (!noteId || !appointmentId) {
      return res.status(400).json({ message: 'noteId and appointmentId are required' });
    }

    const [note, appointment] = await Promise.all([
      storage.getSessionNote(noteId),
      storage.getAppointment(appointmentId)
    ]);

    if (!note || !appointment) {
      return res.status(404).json({ message: 'Session note or appointment not found' });
    }

    const warnings = [];
    let confidence = 0;
    let isValid = true;

    if (note.clientId && appointment.clientId && note.clientId !== appointment.clientId) {
      warnings.push('Session note client does not match appointment client');
      isValid = false;
    }

    const existingLinks = await storage.getSessionNotesByAppointmentId(appointment.id);
    const conflictingNotes = (existingLinks || []).filter((existing) => existing.id !== note.id);
    if (conflictingNotes.length > 0) {
      const conflictIds = conflictingNotes.map((conflict) => conflict.id).join(', ');
      warnings.push(
        conflictingNotes.length > 1
          ? `Appointment already linked to other session notes (${conflictIds})`
          : `Appointment already linked to session note ${conflictIds}`
      );
      isValid = false;
    }

    const noteDate = parseDate(note.sessionDate || note.createdAt || note.created_at);
    const appointmentDate = parseDate(appointment.startTime || appointment.start_time);

    if (noteDate && appointmentDate) {
      const diffMinutes = Math.abs(noteDate.getTime() - appointmentDate.getTime()) / 60000;
      confidence = Number(calculateConfidence(diffMinutes).toFixed(2));
      if (diffMinutes > SUGGESTION_THRESHOLD_MINUTES) {
        warnings.push('Appointment is more than 24 hours from the session note timestamp');
        isValid = false;
      }
    } else {
      warnings.push('Unable to compare timestamps for session note and appointment');
      confidence = 0.2;
    }

    res.json({ isValid, confidence, warnings });
  } catch (error) {
    console.error('Validate session note link error:', error);
    res.status(500).json({ message: 'Failed to validate session note link' });
  }
});

// General catch-all for session notes with optional query parameters
router.get('/session-notes', async (req, res) => {
  const { therapistId, clientId } = req.query;

  try {
    if (typeof clientId === 'string') {
      const notes = await storage.getSessionNotesByClientId(clientId);
      return res.json(notes || []);
    }

    if (typeof therapistId === 'string') {
      const notes = await storage.getAllSessionNotesByTherapist(therapistId);
      return res.json(notes || []);
    }

    res.status(400).json({ message: 'Provide either therapistId or clientId to query session notes' });
  } catch (error) {
    console.error('Session notes listing error:', error);
    res.status(500).json({ message: 'Failed to load session notes' });
  }
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

var routes_default = router;
export {
  routes_default as default
};
