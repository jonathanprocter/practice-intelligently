import {
  users, clients, appointments, sessionNotes, sessionPrepNotes, clientCheckins, actionItems, treatmentPlans, aiInsights,
  billingRecords, assessments, medications, communicationLogs, documents, auditLogs,
  compassConversations, compassMemory, sessionRecommendations, sessionSummaries, calendarEvents,
  assessmentCatalog, clientAssessments, assessmentResponses, assessmentScores, assessmentPackages, assessmentAuditLog,
  type User, type InsertUser, type Client, type InsertClient, type Appointment, type InsertAppointment,
  type SessionNote, type InsertSessionNote, type SessionPrepNote, type InsertSessionPrepNote,
  type ClientCheckin, type InsertClientCheckin, type ActionItem, type InsertActionItem,
  type TreatmentPlan, type InsertTreatmentPlan, type AiInsight, type InsertAiInsight,
  type BillingRecord, type InsertBillingRecord, type Assessment, type InsertAssessment,
  type Medication, type InsertMedication,
  type CommunicationLog, type InsertCommunicationLog, type Document, type InsertDocument,
  type AuditLog, type InsertAuditLog, type CompassConversation, type InsertCompassConversation,
  type CompassMemory, type InsertCompassMemory, type SessionRecommendation, type InsertSessionRecommendation,
  type SessionSummary, type InsertSessionSummary, type CalendarEvent, type InsertCalendarEvent,
  type AssessmentCatalog, type InsertAssessmentCatalog, type ClientAssessment, type InsertClientAssessment,
  type AssessmentResponse, type InsertAssessmentResponse, type AssessmentScore, type InsertAssessmentScore,
  type AssessmentPackage, type InsertAssessmentPackage, type AssessmentAuditLog, type InsertAssessmentAuditLog
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, and, gte, lte, count, like, or, sql, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import OpenAI from 'openai';

// Initialize OpenAI instance
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User>;

  // Client methods
  getClients(therapistId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<Client>): Promise<Client>;
  deleteClient(id: string): Promise<void>;
  deactivateClient(id: string): Promise<Client>;

  // Appointment methods
  getAppointments(therapistId: string, date?: Date): Promise<Appointment[]>;
  getTodaysAppointments(therapistId: string): Promise<Appointment[]>;
  getUpcomingAppointments(therapistId: string, days?: number): Promise<Appointment[]>;
  getUpcomingAppointmentsByClient(clientId: string): Promise<Appointment[]>;
  getAppointmentsByClient(clientId: string): Promise<Appointment[]>;
  getClientIdByName(clientName: string): Promise<string | null>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<Appointment>): Promise<Appointment>;
  cancelAppointment(id: string, reason: string): Promise<Appointment>;

  // Session notes methods
  getSessionNotes(clientId: string): Promise<SessionNote[]>;
  getSessionNote(id: string): Promise<SessionNote | undefined>;
  getSessionNoteById(sessionNoteId: string): Promise<SessionNote | null>;
  getSessionNotesByEventId(eventId: string): Promise<SessionNote[]>;
  createSessionNote(note: InsertSessionNote): Promise<SessionNote>;
  updateSessionNote(id: string, note: Partial<SessionNote>): Promise<SessionNote>;

  // Session prep notes methods
  getSessionPrepNotes(eventId: string): Promise<SessionPrepNote[]>;
  getSessionPrepNote(id: string): Promise<SessionPrepNote | undefined>;
  getSessionPrepNoteByEventId(eventId: string): Promise<SessionPrepNote | undefined>;
  createSessionPrepNote(note: InsertSessionPrepNote): Promise<SessionPrepNote>;
  updateSessionPrepNote(id: string, note: Partial<SessionPrepNote>): Promise<SessionPrepNote>;
  generateAIInsightsForSession(eventId: string, clientId: string): Promise<{
    insights: string;
    followUpQuestions: string[];
    psychoeducationalMaterials: {
      title: string;
      description: string;
      type: "handout" | "worksheet" | "reading" | "video" | "app";
      url?: string;
    }[];
  }>;

  // Client check-ins methods
  getClientCheckins(therapistId: string, status?: string): Promise<ClientCheckin[]>;
  getClientCheckinsByClient(clientId: string): Promise<ClientCheckin[]>;
  getClientCheckin(id: string): Promise<ClientCheckin | undefined>;
  createClientCheckin(checkin: InsertClientCheckin): Promise<ClientCheckin>;
  updateClientCheckin(id: string, checkin: Partial<ClientCheckin>): Promise<ClientCheckin>;
  generateAICheckins(therapistId: string): Promise<ClientCheckin[]>;
  sendCheckin(id: string, method: 'email' | 'sms'): Promise<boolean>;
  cleanupExpiredCheckins(): Promise<number>;
  deleteClientCheckin(id: string): Promise<void>;

  // Action items methods
  getActionItems(therapistId: string): Promise<ActionItem[]>;
  getUrgentActionItems(therapistId: string): Promise<ActionItem[]>;
  getClientActionItems(clientId: string): Promise<ActionItem[]>;
  getActionItemsByEventId(eventId: string): Promise<ActionItem[]>;
  createActionItem(item: InsertActionItem): Promise<ActionItem>;
  updateActionItem(id: string, item: Partial<ActionItem>): Promise<ActionItem>;
  completeActionItem(id: string): Promise<ActionItem>;

  // Treatment plans methods
  getTreatmentPlans(clientId: string): Promise<TreatmentPlan[]>;
  getActiveTreatmentPlan(clientId: string): Promise<TreatmentPlan | undefined>;
  createTreatmentPlan(plan: InsertTreatmentPlan): Promise<TreatmentPlan>;
  updateTreatmentPlan(id: string, plan: Partial<TreatmentPlan>): Promise<TreatmentPlan>;

  // AI insights methods
  getAiInsights(therapistId: string): Promise<AiInsight[]>;
  getClientAiInsights(clientId: string): Promise<AiInsight[]>;
  createAiInsight(insight: InsertAiInsight): Promise<AiInsight>;
  markInsightAsRead(id: string): Promise<AiInsight>;

  // Session recommendation methods
  getSessionRecommendations(clientId: string): Promise<SessionRecommendation[]>;
  getTherapistSessionRecommendations(therapistId: string): Promise<SessionRecommendation[]>;
  createSessionRecommendation(recommendation: InsertSessionRecommendation): Promise<SessionRecommendation>;
  updateSessionRecommendation(id: string, recommendation: Partial<SessionRecommendation>): Promise<SessionRecommendation>;
  markRecommendationAsImplemented(id: string, feedback?: string, effectiveness?: string): Promise<SessionRecommendation>;
  generateSessionRecommendations(clientId: string, therapistId: string): Promise<SessionRecommendation[]>;

  // Billing methods
  getBillingRecords(therapistId: string): Promise<BillingRecord[]>;
  getClientBillingRecords(clientId: string): Promise<BillingRecord[]>;
  getOverdueBills(therapistId: string): Promise<BillingRecord[]>;
  createBillingRecord(record: InsertBillingRecord): Promise<BillingRecord>;
  updateBillingRecord(id: string, record: Partial<BillingRecord>): Promise<BillingRecord>;
  markBillAsPaid(id: string, paymentInfo: { paymentMethod: string; transactionId: string }): Promise<BillingRecord>;

  // Assessment methods
  getAssessments(clientId: string): Promise<Assessment[]>;
  getAssessment(id: string): Promise<Assessment | undefined>;
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  updateAssessment(id: string, assessment: Partial<Assessment>): Promise<Assessment>;
  completeAssessment(id: string, responses: any, scores?: any): Promise<Assessment>;

  // Progress notes functionality merged into session notes methods above
  getProgressNotes(clientId: string): Promise<SessionNote[]>;
  getProgressNotesByAppointmentId(appointmentId: string): Promise<SessionNote[]>;
  getRecentProgressNotes(therapistId: string, limit?: number): Promise<SessionNote[]>;
  linkProgressNoteToAppointment(sessionNoteId: string, appointmentId: string): Promise<SessionNote>;
  findMatchingAppointment(clientId: string, sessionDate: Date): Promise<Appointment | null>;

  // Medication methods
  getClientMedications(clientId: string): Promise<Medication[]>;
  getActiveMedications(clientId: string): Promise<Medication[]>;
  createMedication(medication: InsertMedication): Promise<Medication>;
  updateMedication(id: string, medication: Partial<Medication>): Promise<Medication>;
  discontinueMedication(id: string): Promise<Medication>;

  // Communication methods
  getCommunicationLogs(clientId: string): Promise<CommunicationLog[]>;
  getUrgentCommunications(therapistId: string): Promise<CommunicationLog[]>;
  createCommunicationLog(log: InsertCommunicationLog): Promise<CommunicationLog>;
  markCommunicationAsRead(id: string): Promise<CommunicationLog>;

  // Document methods
  getClientDocuments(clientId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, document: Partial<Document>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;

  // Audit methods
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(entityType: string, entityId: string): Promise<AuditLog[]>;
  getUserAuditLogs(userId: string, limit?: number): Promise<AuditLog[]>;

  // Dashboard stats
  getDashboardStats(therapistId: string): Promise<{
    todaysSessions: number;
    activeClients: number;
    totalClients: number;
    totalAppointments: number;
    urgentActionItems: number;
    completionRate: number;
    monthlyRevenue: number;
    overduePayments: number;
    riskClients: number;
  }>;

  // Analytics methods
  getClientEngagementStats(therapistId: string): Promise<{
    totalSessions: number;
    averageSessionsPerClient: number;
    noShowRate: number;
    cancellationRate: number;
  }>;

  getFinancialSummary(therapistId: string, startDate?: Date, endDate?: Date): Promise<{
    totalRevenue: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
  }>;

  // Compass AI conversation and memory methods
  createCompassConversation(conversation: InsertCompassConversation): Promise<CompassConversation>;
  getCompassConversations(therapistId: string, sessionId?: string, limit?: number): Promise<CompassConversation[]>;
  getCompassConversationHistory(therapistId: string, limit?: number): Promise<CompassConversation[]>;

  // Compass memory methods
  setCompassMemory(memory: InsertCompassMemory): Promise<CompassMemory>;
  getCompassMemory(therapistId: string, contextType: string, contextKey?: string): Promise<CompassMemory[]>;
  updateCompassMemoryAccess(id: string): Promise<CompassMemory>;

  // Assessment Management System methods

  // Assessment Catalog methods
  getAssessmentCatalog(): Promise<AssessmentCatalog[]>;
  getAssessmentCatalogByCategory(category: string): Promise<AssessmentCatalog[]>;
  getAssessmentCatalogItem(id: string): Promise<AssessmentCatalog | undefined>;
  createAssessmentCatalogItem(item: InsertAssessmentCatalog): Promise<AssessmentCatalog>;
  updateAssessmentCatalogItem(id: string, item: Partial<AssessmentCatalog>): Promise<AssessmentCatalog>;
  deactivateAssessmentCatalogItem(id: string): Promise<AssessmentCatalog>;

  // Client Assessment methods
  getClientAssessments(clientId: string): Promise<ClientAssessment[]>;
  getTherapistAssignedAssessments(therapistId: string, status?: string): Promise<ClientAssessment[]>;
  getClientAssessment(id: string): Promise<ClientAssessment | undefined>;
  assignAssessmentToClient(assignment: InsertClientAssessment): Promise<ClientAssessment>;
  updateClientAssessment(id: string, update: Partial<ClientAssessment>): Promise<ClientAssessment>;
  startClientAssessment(id: string): Promise<ClientAssessment>;
  completeClientAssessment(id: string, completedDate: Date): Promise<ClientAssessment>;
  sendAssessmentReminder(id: string): Promise<ClientAssessment>;

  // Assessment Response methods
  getAssessmentResponses(clientAssessmentId: string): Promise<AssessmentResponse[]>;
  getAssessmentResponse(id: string): Promise<AssessmentResponse | undefined>;
  createAssessmentResponse(response: InsertAssessmentResponse): Promise<AssessmentResponse>;
  updateAssessmentResponse(id: string, response: Partial<AssessmentResponse>): Promise<AssessmentResponse>;

  // Assessment Score methods
  getAssessmentScores(clientAssessmentId: string): Promise<AssessmentScore[]>;
  getAssessmentScore(id: string): Promise<AssessmentScore | undefined>;
  createAssessmentScore(score: InsertAssessmentScore): Promise<AssessmentScore>;
  updateAssessmentScore(id: string, score: Partial<AssessmentScore>): Promise<AssessmentScore>;
  validateAssessmentScore(id: string, validatedBy: string): Promise<AssessmentScore>;

  // Assessment Package methods
  getAssessmentPackages(): Promise<AssessmentPackage[]>;
  getAssessmentPackage(id: string): Promise<AssessmentPackage | undefined>;
  createAssessmentPackage(pkg: InsertAssessmentPackage): Promise<AssessmentPackage>;

  // Recent Activity methods for dashboard
  getRecentSessionNotes(therapistId: string, days: number): Promise<SessionNote[]>;
  getRecentAppointments(therapistId: string, days: number): Promise<Appointment[]>;
  getRecentClients(therapistId: string, days: number): Promise<Client[]>;
  getRecentCompletedActionItems(therapistId: string, days: number): Promise<ActionItem[]>;
  getCalendarSyncStats(): Promise<{
    lastSyncAt?: string;
    appointmentsCount?: number;
  }>;
  updateAssessmentPackage(id: string, pkg: Partial<AssessmentPackage>): Promise<AssessmentPackage>;
  deactivateAssessmentPackage(id: string): Promise<AssessmentPackage>;

  // Assessment Audit methods
  createAssessmentAuditLog(log: InsertAssessmentAuditLog): Promise<AssessmentAuditLog>;
  getAssessmentAuditLogs(entityType: string, entityId: string): Promise<AssessmentAuditLog[]>;
  getClientAssessmentAuditLogs(clientAssessmentId: string): Promise<AssessmentAuditLog[]>;
  getCompassLearningContext(therapistId: string): Promise<{
    preferences: any;
    patterns: any;
    frequentQueries: any;
  }>;

  // Session summaries methods
  getSessionSummaries(clientId: string): Promise<SessionSummary[]>;
  getSessionSummariesByTherapist(therapistId: string): Promise<SessionSummary[]>;
  getSessionSummary(id: string): Promise<SessionSummary | undefined>;
  createSessionSummary(summary: InsertSessionSummary): Promise<SessionSummary>;
  updateSessionSummary(id: string, summary: Partial<SessionSummary>): Promise<SessionSummary>;
  generateAISessionSummary(sessionNoteIds: string[], clientId: string, therapistId: string, timeframe: string): Promise<SessionSummary>;

  // Calendar Events methods
  getCalendarEvents(therapistId: string, startDate?: Date, endDate?: Date): Promise<CalendarEvent[]>;
  getCalendarEvent(id: string): Promise<CalendarEvent | undefined>;
  getCalendarEventByGoogleId(googleEventId: string): Promise<CalendarEvent | undefined>;
  upsertCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  deleteCalendarEvent(id: string): Promise<void>;
  syncCalendarEvents(events: InsertCalendarEvent[]): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  private safeParseJSON(jsonString: any, defaultValue: any = null): any {
    if (!jsonString) return defaultValue;
    if (typeof jsonString === 'object') return jsonString; // Already parsed
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('Failed to parse JSON:', jsonString);
      return defaultValue;
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, user: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getClients(therapistId: string): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(eq(clients.therapistId, therapistId))
      .orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    // Handle calendar-generated client IDs that aren't UUIDs
    if (id.startsWith('calendar-') || !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      return undefined;
    }
    
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }



  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db
      .insert(clients)
      .values(client)
      .returning();
    return newClient;
  }

  async getClientIdByName(fullName: string): Promise<string | null> {
    const [firstName, ...lastNameParts] = fullName.split(' ');
    const lastName = lastNameParts.join(' ');

    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(
        and(
          eq(clients.firstName, firstName),
          eq(clients.lastName, lastName)
        )
      );

    return client?.id || null;
  }

  async getAppointmentsByClientAndDate(clientId: string, sessionDate: Date): Promise<Appointment[]> {
    const startOfDay = new Date(sessionDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(sessionDate);
    endOfDay.setHours(23, 59, 59, 999);

    return await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.clientId, clientId),
          gte(appointments.startTime, startOfDay),
          lte(appointments.startTime, endOfDay)
        )
      )
      .orderBy(appointments.startTime);
  }

  async updateClient(id: string, client: Partial<Client>): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: string): Promise<void> {
    // First, get all appointments for this client
    const clientAppointments = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(eq(appointments.clientId, id));

    // Delete session notes that reference these appointments
    for (const appointment of clientAppointments) {
      await db
        .delete(sessionNotes)
        .where(eq(sessionNotes.appointmentId, appointment.id));
    }

    // Delete session notes that reference the client directly
    await db
      .delete(sessionNotes)
      .where(eq(sessionNotes.clientId, id));

    // Delete appointments for this client
    await db
      .delete(appointments)
      .where(eq(appointments.clientId, id));

    // Delete any action items for this client
    await db
      .delete(actionItems)
      .where(eq(actionItems.clientId, id));

    // Delete any other related records
    await db
      .delete(treatmentPlans)
      .where(eq(treatmentPlans.clientId, id));

    await db
      .delete(medications)
      .where(eq(medications.clientId, id));

    await db
      .delete(assessments)
      .where(eq(assessments.clientId, id));

    await db
      .delete(billingRecords)
      .where(eq(billingRecords.clientId, id));

    await db
      .delete(communicationLogs)
      .where(eq(communicationLogs.clientId, id));

    await db
      .delete(documents)
      .where(eq(documents.clientId, id));

    // Finally, delete the client
    await db
      .delete(clients)
      .where(eq(clients.id, id));
  }

  async deactivateClient(id: string): Promise<Client> {
    return await this.updateClient(id, { status: 'inactive' });
  }

  async getAppointments(therapistId: string, date?: Date): Promise<Appointment[]> {
    if (date) {
      // Handle date filtering in Eastern Time
      const easternDateString = date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const startOfDay = new Date(easternDateString + 'T00:00:00.000-04:00'); // EDT offset
      const endOfDay = new Date(easternDateString + 'T23:59:59.999-04:00');

      const appointmentsWithClients = await db
        .select({
          ...appointments,
          clientName: sql<string>`${clients.firstName} || ' ' || ${clients.lastName}`.as('clientName'),
          clientFirstName: clients.firstName,
          clientLastName: clients.lastName,
        })
        .from(appointments)
        .leftJoin(clients, eq(appointments.clientId, clients.id))
        .where(
          and(
            eq(appointments.therapistId, therapistId),
            gte(appointments.startTime, startOfDay),
            lte(appointments.startTime, endOfDay)
          )
        )
        .orderBy(appointments.startTime);

      return appointmentsWithClients.map(apt => ({
        ...apt,
        clientName: apt.clientName || 'Unknown Client',
        client_name: apt.clientName || 'Unknown Client',
        start_time: apt.startTime,
        end_time: apt.endTime
      })) as any;
    }

    const appointmentsWithClients = await db
      .select({
        ...appointments,
        clientName: sql<string>`${clients.firstName} || ' ' || ${clients.lastName}`.as('clientName'),
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .where(eq(appointments.therapistId, therapistId))
      .orderBy(appointments.startTime);

    return appointmentsWithClients.map(apt => ({
      ...apt,
      clientName: apt.clientName || 'Unknown Client',
      client_name: apt.clientName || 'Unknown Client',
      start_time: apt.startTime,
      end_time: apt.endTime
    })) as any;
  }

  async getTodaysAppointments(therapistId: string): Promise<Appointment[]> {
    // Use SQL to filter appointments that fall on today's date in Eastern Time
    const appointmentsWithClients = await db
      .select({
        ...appointments,
        clientName: sql<string>`${clients.firstName} || ' ' || ${clients.lastName}`.as('clientName'),
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .where(
        and(
          eq(appointments.therapistId, therapistId),
          // Filter for appointments that occur on today's date in Eastern Time
          sql`DATE((${appointments.startTime} AT TIME ZONE 'UTC') AT TIME ZONE 'America/New_York') = CURRENT_DATE`
        )
      )
      .orderBy(appointments.startTime);

    return appointmentsWithClients.map(apt => ({
      ...apt,
      clientName: apt.clientName || 'Unknown Client',
      client_name: apt.clientName || 'Unknown Client',
      start_time: apt.startTime,
      end_time: apt.endTime
    })) as any;
  }

  async getUpcomingAppointments(therapistId: string, days: number = 7): Promise<Appointment[]> {
    // Use Eastern Time for consistent timezone handling
    const now = new Date();
    const easternNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const futureDate = new Date(easternNow.getTime() + (days * 24 * 60 * 60 * 1000));

    return await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.therapistId, therapistId),
          gte(appointments.startTime, easternNow),
          lte(appointments.startTime, futureDate),
          eq(appointments.status, 'scheduled')
        )
      )
      .orderBy(appointments.startTime);
  }

  async cancelAppointment(id: string, reason: string): Promise<Appointment> {
    return await this.updateAppointment(id, {
      status: 'cancelled',
      cancellationReason: reason
    });
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db
      .insert(appointments)
      .values(appointment)
      .returning();
    return newAppointment;
  }

  async updateAppointment(id: string, appointment: Partial<Appointment>): Promise<Appointment> {
    const [updatedAppointment] = await db
      .update(appointments)
      .set({ ...appointment, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return updatedAppointment;
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async rescheduleAppointment(id: string, newStartTime: Date, newEndTime: Date): Promise<Appointment> {
    return await this.updateAppointment(id, {
      startTime: newStartTime,
      endTime: newEndTime,
      status: 'scheduled'
    });
  }

  async completeAppointment(id: string): Promise<Appointment> {
    return await this.updateAppointment(id, {
      status: 'completed',
      completedAt: new Date()
    });
  }

  async checkInAppointment(id: string): Promise<Appointment> {
    return await this.updateAppointment(id, {
      status: 'checked_in',
      checkedInAt: new Date()
    });
  }

  async markNoShow(id: string, reason?: string): Promise<Appointment> {
    return await this.updateAppointment(id, {
      status: 'no_show',
      noShowReason: reason
    });
  }

  async getSessionNotes(clientId: string): Promise<SessionNote[]> {
    return await db
      .select()
      .from(sessionNotes)
      .where(eq(sessionNotes.clientId, clientId))
      .orderBy(desc(sessionNotes.createdAt));
  }

  async getAllSessionNotes(): Promise<SessionNote[]> {
    return await db
      .select()
      .from(sessionNotes)
      .orderBy(desc(sessionNotes.createdAt));
  }

  async getSessionNote(id: string): Promise<SessionNote | undefined> {
    const [note] = await db.select().from(sessionNotes).where(eq(sessionNotes.id, id));
    return note || undefined;
  }



  async getSessionNotesByEventId(eventId: string): Promise<SessionNote[]> {
    try {
      const notes = await db
        .select()
        .from(sessionNotes)
        .where(eq(sessionNotes.eventId, eventId))
        .orderBy(desc(sessionNotes.createdAt));

      return notes;
    } catch (error) {
      console.error('Error in getSessionNotesByEventId:', error);
      throw error;
    }
  }

  async createSessionNote(note: InsertSessionNote): Promise<SessionNote> {
    const [newNote] = await db
      .insert(sessionNotes)
      .values(note)
      .returning();
    return newNote;
  }

  async getTodaysSessionNotes(therapistId: string): Promise<SessionNote[]> {
    // Get today's date in Eastern Time
    const today = new Date();
    const easternToday = new Date(today.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const startOfDay = new Date(easternToday.getFullYear(), easternToday.getMonth(), easternToday.getDate());
    const endOfDay = new Date(easternToday.getFullYear(), easternToday.getMonth(), easternToday.getDate(), 23, 59, 59);

    return await db
      .select()
      .from(sessionNotes)
      .where(
        and(
          eq(sessionNotes.therapistId, therapistId),
          gte(sessionNotes.createdAt, startOfDay),
          lte(sessionNotes.createdAt, endOfDay)
        )
      )
      .orderBy(desc(sessionNotes.createdAt));
  }

  async updateSessionNote(id: string, note: Partial<SessionNote>): Promise<SessionNote> {
    // Ensure dates are properly converted and handle sessionDate
    const updateData: any = { ...note, updatedAt: new Date() };
    
    // Handle all date fields properly
    if (updateData.createdAt && typeof updateData.createdAt === 'string') {
      updateData.createdAt = new Date(updateData.createdAt);
    }
    
    if (updateData.sessionDate !== undefined) {
      if (typeof updateData.sessionDate === 'string') {
        // Handle date-only strings by appending time to avoid timezone issues
        const dateStr = updateData.sessionDate.includes('T') 
          ? updateData.sessionDate 
          : updateData.sessionDate + 'T12:00:00.000Z';
        updateData.sessionDate = new Date(dateStr);
      }
      // Ensure it's a valid date, otherwise remove it
      if (!updateData.sessionDate || isNaN(updateData.sessionDate.getTime())) {
        delete updateData.sessionDate;
      }
    }

    // Remove any undefined values that could cause issues
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const [updatedNote] = await db
      .update(sessionNotes)
      .set(updateData)
      .where(eq(sessionNotes.id, id))
      .returning();
    return updatedNote;
  }

  async deleteSessionNote(id: string): Promise<void> {
    await db
      .delete(sessionNotes)
      .where(eq(sessionNotes.id, id));
  }

  // Progress notes functionality (using session notes)
  async getProgressNotes(clientId: string): Promise<SessionNote[]> {
    return await this.getSessionNotes(clientId);
  }

  async getProgressNotesByAppointmentId(appointmentId: string): Promise<SessionNote[]> {
    return await db
      .select()
      .from(sessionNotes)
      .where(eq(sessionNotes.appointmentId, appointmentId))
      .orderBy(desc(sessionNotes.createdAt));
  }

  async getRecentProgressNotes(therapistId: string, limit: number = 10): Promise<SessionNote[]> {
    return await db
      .select()
      .from(sessionNotes)
      .where(eq(sessionNotes.therapistId, therapistId))
      .orderBy(desc(sessionNotes.createdAt))
      .limit(limit);
  }

  async linkProgressNoteToAppointment(sessionNoteId: string, appointmentId: string): Promise<SessionNote> {
    return await this.updateSessionNote(sessionNoteId, { appointmentId });
  }



  async getUpcomingAppointmentsByClient(clientId: string): Promise<Appointment[]> {
    const now = new Date();
    return await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.clientId, clientId),
          gte(appointments.startTime, now),
          eq(appointments.status, 'scheduled')
        )
      )
      .orderBy(appointments.startTime)
      .limit(5); // Limit to next 5 appointments
  }

  async getAppointmentsByClient(clientId: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.clientId, clientId))
      .orderBy(desc(appointments.startTime));
  }

  async getAppointmentByEventId(eventId: string): Promise<Appointment | null> {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.googleEventId, eventId))
      .limit(1);
    return appointment || null;
  }



  async updateAppointmentSessionPrep(appointmentId: string, sessionPrep: string): Promise<void> {
    await db
      .update(appointments)
      .set({
        // sessionPrep: sessionPrep, // Remove this line as sessionPrep doesn't exist in schema
        updatedAt: new Date()
      })
      .where(eq(appointments.id, appointmentId));
  }

  async getActionItems(therapistId: string): Promise<ActionItem[]> {
    return await db
      .select()
      .from(actionItems)
      .where(eq(actionItems.therapistId, therapistId))
      .orderBy(desc(actionItems.createdAt));
  }

  async getUrgentActionItems(therapistId: string): Promise<ActionItem[]> {
    return await db
      .select()
      .from(actionItems)
      .where(
        and(
          eq(actionItems.therapistId, therapistId),
          eq(actionItems.priority, 'high'),
          eq(actionItems.status, 'pending')
        )
      )
      .orderBy(actionItems.dueDate);
  }

  async getClientActionItems(clientId: string): Promise<ActionItem[]> {
    return await db
      .select()
      .from(actionItems)
      .where(eq(actionItems.clientId, clientId))
      .orderBy(desc(actionItems.createdAt));
  }

  async completeActionItem(id: string): Promise<ActionItem> {
    return await this.updateActionItem(id, {
      status: 'completed',
      completedAt: new Date()
    });
  }

  async createActionItem(item: InsertActionItem): Promise<ActionItem> {
    const [newItem] = await db
      .insert(actionItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateActionItem(id: string, item: Partial<ActionItem>): Promise<ActionItem> {
    const [updatedItem] = await db
      .update(actionItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(actionItems.id, id))
      .returning();
    return updatedItem;
  }

  async getTreatmentPlans(clientId: string): Promise<TreatmentPlan[]> {
    return await db
      .select()
      .from(treatmentPlans)
      .where(eq(treatmentPlans.clientId, clientId))
      .orderBy(desc(treatmentPlans.createdAt));
  }

  async getActiveTreatmentPlan(clientId: string): Promise<TreatmentPlan | undefined> {
    const [plan] = await db
      .select()
      .from(treatmentPlans)
      .where(
        and(
          eq(treatmentPlans.clientId, clientId),
          eq(treatmentPlans.status, 'active')
        )
      )
      .orderBy(desc(treatmentPlans.createdAt));
    return plan || undefined;
  }

  async createTreatmentPlan(plan: InsertTreatmentPlan): Promise<TreatmentPlan> {
    const [newPlan] = await db
      .insert(treatmentPlans)
      .values(plan)
      .returning();
    return newPlan;
  }

  async updateTreatmentPlan(id: string, plan: Partial<TreatmentPlan>): Promise<TreatmentPlan> {
    const [updatedPlan] = await db
      .update(treatmentPlans)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(treatmentPlans.id, id))
      .returning();
    return updatedPlan;
  }

  async getAiInsights(therapistId: string): Promise<AiInsight[]> {
    return await db
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.therapistId, therapistId))
      .orderBy(desc(aiInsights.createdAt))
      .limit(10);
  }

  async getClientAiInsights(clientId: string): Promise<AiInsight[]> {
    return await db
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.clientId, clientId))
      .orderBy(desc(aiInsights.createdAt));
  }

  async createAiInsight(insight: InsertAiInsight): Promise<AiInsight> {
    const [newInsight] = await db
      .insert(aiInsights)
      .values(insight)
      .returning();
    return newInsight;
  }

  async markInsightAsRead(id: string): Promise<AiInsight> {
    const [updatedInsight] = await db
      .update(aiInsights)
      .set({ isRead: true })
      .where(eq(aiInsights.id, id))
      .returning();
    return updatedInsight;
  }

  // Billing methods
  async getBillingRecords(therapistId: string): Promise<BillingRecord[]> {
    return await db
      .select()
      .from(billingRecords)
      .where(eq(billingRecords.therapistId, therapistId))
      .orderBy(desc(billingRecords.createdAt));
  }

  async getClientBillingRecords(clientId: string): Promise<BillingRecord[]> {
    return await db
      .select()
      .from(billingRecords)
      .where(eq(billingRecords.clientId, clientId))
      .orderBy(desc(billingRecords.createdAt));
  }

  async getOverdueBills(therapistId: string): Promise<BillingRecord[]> {
    const now = new Date();
    return await db
      .select()
      .from(billingRecords)
      .where(
        and(
          eq(billingRecords.therapistId, therapistId),
          eq(billingRecords.status, 'pending'),
          lte(billingRecords.dueDate, now)
        )
      )
      .orderBy(billingRecords.dueDate);
  }

  async createBillingRecord(record: InsertBillingRecord): Promise<BillingRecord> {
    const [newRecord] = await db
      .insert(billingRecords)
      .values(record)
      .returning();
    return newRecord;
  }

  async updateBillingRecord(id: string, record: Partial<BillingRecord>): Promise<BillingRecord> {
    const [updatedRecord] = await db
      .update(billingRecords)
      .set({ ...record, updatedAt: new Date() })
      .where(eq(billingRecords.id, id))
      .returning();
    return updatedRecord;
  }

  async markBillAsPaid(id: string, paymentInfo: { paymentMethod: string; transactionId: string }): Promise<BillingRecord> {
    return await this.updateBillingRecord(id, {
      status: 'paid',
      paidAt: new Date(),
      paymentMethod: paymentInfo.paymentMethod,
      transactionId: paymentInfo.transactionId
    });
  }

  // Assessment methods
  async getAssessments(clientId: string): Promise<Assessment[]> {
    return await db
      .select()
      .from(assessments)
      .where(eq(assessments.clientId, clientId))
      .orderBy(desc(assessments.createdAt));
  }

  async getAssessment(id: string): Promise<Assessment | undefined> {
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
    return assessment || undefined;
  }

  async createAssessment(assessment: InsertAssessment): Promise<Assessment> {
    const [newAssessment] = await db
      .insert(assessments)
      .values(assessment)
      .returning();
    return newAssessment;
  }

  async updateAssessment(id: string, assessment: Partial<Assessment>): Promise<Assessment> {
    const [updatedAssessment] = await db
      .update(assessments)
      .set({ ...assessment, updatedAt: new Date() })
      .where(eq(assessments.id, id))
      .returning();
    return updatedAssessment;
  }

  async completeAssessment(id: string, responses: any, scores?: any): Promise<Assessment> {
    return await this.updateAssessment(id, {
      responses,
      scores,
      status: 'completed',
      completedAt: new Date()
    });
  }

  // Progress notes methods
  // Progress note functionality merged into session notes methods above

  // Merged into getSessionNotes method - now uses session_notes table with SOAP fields



  // Merged into session notes - use getSessionNotes or getAllSessionNotes instead



  // Progress note updates merged into updateSessionNote method

  // Appointment linking is now handled within session notes via appointmentId field

  async findMatchingAppointment(clientId: string, sessionDate: Date): Promise<Appointment | null> {
    // Find appointments within 3 days of the session date for the client
    const startDate = new Date(sessionDate);
    startDate.setDate(startDate.getDate() - 3);
    const endDate = new Date(sessionDate);
    endDate.setDate(endDate.getDate() + 3);

    const [appointment] = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.clientId, clientId),
          gte(appointments.startTime, startDate),
          lte(appointments.startTime, endDate)
        )
      )
      .orderBy(sql`ABS(EXTRACT(EPOCH FROM (${appointments.startTime} - ${sessionDate})))`)
      .limit(1);

    return appointment || null;
  }

  // Medication methods
  async getClientMedications(clientId: string): Promise<Medication[]> {
    return await db
      .select()
      .from(medications)
      .where(eq(medications.clientId, clientId))
      .orderBy(desc(medications.createdAt));
  }

  async getActiveMedications(clientId: string): Promise<Medication[]> {
    return await db
      .select()
      .from(medications)
      .where(
        and(
          eq(medications.clientId, clientId),
          eq(medications.status, 'active')
        )
      )
      .orderBy(medications.name);
  }

  async createMedication(medication: InsertMedication): Promise<Medication> {
    const [newMedication] = await db
      .insert(medications)
      .values(medication)
      .returning();
    return newMedication;
  }

  async updateMedication(id: string, medication: Partial<Medication>): Promise<Medication> {
    const [updatedMedication] = await db
      .update(medications)
      .set({ ...medication, updatedAt: new Date() })
      .where(eq(medications.id, id))
      .returning();
    return updatedMedication;
  }

  async discontinueMedication(id: string): Promise<Medication> {
    return await this.updateMedication(id, {
      status: 'discontinued',
      endDate: new Date()
    });
  }

  // Communication methods
  async getCommunicationLogs(clientId: string): Promise<CommunicationLog[]> {
    return await db
      .select()
      .from(communicationLogs)
      .where(eq(communicationLogs.clientId, clientId))
      .orderBy(desc(communicationLogs.createdAt));
  }

  async getUrgentCommunications(therapistId: string): Promise<CommunicationLog[]> {
    return await db
      .select()
      .from(communicationLogs)
      .where(
        and(
          eq(communicationLogs.therapistId, therapistId),
          eq(communicationLogs.isUrgent, true)
        )
      )
      .orderBy(desc(communicationLogs.createdAt));
  }

  async createCommunicationLog(log: InsertCommunicationLog): Promise<CommunicationLog> {
    const [newLog] = await db
      .insert(communicationLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async markCommunicationAsRead(id: string): Promise<CommunicationLog> {
    const [updatedLog] = await db
      .update(communicationLogs)
      .set({ readAt: new Date() })
      .where(eq(communicationLogs.id, id))
      .returning();
    return updatedLog;
  }

  // Document methods
  async getClientDocuments(clientId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.clientId, clientId))
      .orderBy(desc(documents.uploadedAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    if (document) {
      // Update last accessed time
      await db
        .update(documents)
        .set({ lastAccessedAt: new Date() })
        .where(eq(documents.id, id));
    }
    return document || undefined;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values(document)
      .returning();
    return newDocument;
  }

  async updateDocument(id: string, document: Partial<Document>): Promise<Document> {
    const [updatedDocument] = await db
      .update(documents)
      .set(document)
      .where(eq(documents.id, id))
      .returning();
    return updatedDocument;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Enhanced document methods for AI tagging
  async updateDocumentWithTags(id: string, taggingData: {
    aiTags?: any;
    category?: string;
    subcategory?: string;
    contentSummary?: string;
    clinicalKeywords?: any;
    confidenceScore?: number;
    sensitivityLevel?: string;
    extractedText?: string;
  }): Promise<Document> {
    const updateData = {
      ...taggingData,
      confidenceScore: taggingData.confidenceScore ? String(taggingData.confidenceScore) : undefined,
      updatedAt: new Date()
    };
    
    const [updatedDocument] = await db
      .update(documents)
      .set(updateData)
      .where(eq(documents.id, id))
      .returning();
    return updatedDocument;
  }

  async getDocumentsByCategory(therapistId: string, category?: string, subcategory?: string): Promise<Document[]> {
    const whereConditions = [eq(documents.therapistId, therapistId)];
    
    if (category) {
      whereConditions.push(eq(documents.category, category));
    }
    
    if (subcategory) {
      whereConditions.push(eq(documents.subcategory, subcategory));
    }

    return await db
      .select()
      .from(documents)
      .where(and(...whereConditions))
      .orderBy(desc(documents.uploadedAt));
  }

  async getDocumentsBySensitivity(therapistId: string, sensitivityLevel: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.therapistId, therapistId),
          eq(documents.sensitivityLevel, sensitivityLevel)
        )
      )
      .orderBy(desc(documents.uploadedAt));
  }

  async searchDocumentsByTags(therapistId: string, searchTags: string[]): Promise<Document[]> {
    // Note: This is a simplified version. In production, you'd use full-text search or specialized queries
    return await db
      .select()
      .from(documents)
      .where(eq(documents.therapistId, therapistId))
      .orderBy(desc(documents.uploadedAt));
  }

  async getDocumentTagStatistics(therapistId: string): Promise<{
    categoryCounts: Array<{ category: string; count: number }>;
    sensitivityCounts: Array<{ level: string; count: number }>;
    totalDocuments: number;
  }> {
    // This would need raw SQL or more complex queries in production
    const allDocs = await db
      .select()
      .from(documents)
      .where(eq(documents.therapistId, therapistId));

    const categoryCounts = allDocs.reduce((acc, doc) => {
      const category = doc.category || 'uncategorized';
      const existing = acc.find(c => c.category === category);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ category, count: 1 });
      }
      return acc;
    }, [] as Array<{ category: string; count: number }>);

    const sensitivityCounts = allDocs.reduce((acc, doc) => {
      const level = doc.sensitivityLevel || 'standard';
      const existing = acc.find(c => c.level === level);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ level, count: 1 });
      }
      return acc;
    }, [] as Array<{ level: string; count: number }>);

    return {
      categoryCounts,
      sensitivityCounts,
      totalDocuments: allDocs.length
    };
  }

  // Audit methods
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db
      .insert(auditLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getAuditLogs(entityType: string, entityId: string): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, entityId)
        )
      )
      .orderBy(desc(auditLogs.timestamp));
  }

  async getUserAuditLogs(userId: string, limit: number = 50): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  }

  async getDashboardStats(therapistId: string): Promise<{
    todaysSessions: number;
    activeClients: number;
    totalClients: number;
    totalAppointments: number;
    urgentActionItems: number;
    completionRate: number;
    monthlyRevenue: number;
    overduePayments: number;
    riskClients: number;
  }> {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const [todaysSessions] = await db
      .select({ count: count() })
      .from(appointments)
      .where(
        and(
          eq(appointments.therapistId, therapistId),
          gte(appointments.startTime, startOfDay),
          lte(appointments.startTime, endOfDay),
          eq(appointments.status, 'completed')
        )
      );

    const [activeClients] = await db
      .select({ count: count() })
      .from(clients)
      .where(
        and(
          eq(clients.therapistId, therapistId),
          eq(clients.status, 'active')
        )
      );

    const [totalClients] = await db
      .select({ count: count() })
      .from(clients)
      .where(eq(clients.therapistId, therapistId));

    const [totalAppointments] = await db
      .select({ count: count() })
      .from(appointments)
      .where(eq(appointments.therapistId, therapistId));

    const [riskClients] = await db
      .select({ count: count() })
      .from(clients)
      .where(
        and(
          eq(clients.therapistId, therapistId),
          eq(clients.riskLevel, 'high')
        )
      );

    const [urgentItems] = await db
      .select({ count: count() })
      .from(actionItems)
      .where(
        and(
          eq(actionItems.therapistId, therapistId),
          eq(actionItems.priority, 'high'),
          eq(actionItems.status, 'pending')
        )
      );

    const [completedItems] = await db
      .select({ count: count() })
      .from(actionItems)
      .where(
        and(
          eq(actionItems.therapistId, therapistId),
          eq(actionItems.status, 'completed')
        )
      );

    const [totalItems] = await db
      .select({ count: count() })
      .from(actionItems)
      .where(eq(actionItems.therapistId, therapistId));

    // Calculate monthly revenue
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlyBills = await db
      .select()
      .from(billingRecords)
      .where(
        and(
          eq(billingRecords.therapistId, therapistId),
          gte(billingRecords.serviceDate, currentMonth),
          eq(billingRecords.status, 'paid')
        )
      );

    const monthlyRevenue = monthlyBills.reduce((sum, bill) =>
      sum + parseFloat(bill.totalAmount || '0'), 0);

    // Get overdue payments count
    const overdueBills = await this.getOverdueBills(therapistId);

    const completionRate = totalItems.count > 0
      ? Math.round((completedItems.count / totalItems.count) * 100)
      : 0;

    return {
      todaysSessions: todaysSessions.count,
      activeClients: activeClients.count,
      totalClients: totalClients.count,
      totalAppointments: totalAppointments.count,
      urgentActionItems: urgentItems.count,
      completionRate,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      overduePayments: overdueBills.length,
      riskClients: riskClients.count,
    };
  }

  // Analytics methods
  async getClientEngagementStats(therapistId: string): Promise<{
    totalSessions: number;
    averageSessionsPerClient: number;
    noShowRate: number;
    cancellationRate: number;
  }> {
    const appointmentsList = await db
      .select()
      .from(appointments)
      .where(eq(appointments.therapistId, therapistId));

    const totalSessions = appointmentsList.filter(apt => apt.status === 'completed').length;
    const noShows = appointmentsList.filter(apt => apt.status === 'no_show').length;
    const cancelled = appointmentsList.filter(apt => apt.status === 'cancelled').length;

    const allClients = await this.getClients(therapistId);
    const activeClients = allClients.filter(client => client.status === 'active').length;

    const averageSessionsPerClient = activeClients > 0 ? totalSessions / activeClients : 0;
    const noShowRate = appointmentsList.length > 0 ? (noShows / appointmentsList.length) * 100 : 0;
    const cancellationRate = appointmentsList.length > 0 ? (cancelled / appointmentsList.length) * 100 : 0;

    return {
      totalSessions,
      averageSessionsPerClient: Math.round(averageSessionsPerClient * 100) / 100,
      noShowRate: Math.round(noShowRate * 100) / 100,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
    };
  }

  async getFinancialSummary(therapistId: string, startDate?: Date, endDate?: Date): Promise<{
    totalRevenue: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
  }> {
    let query = db
      .select()
      .from(billingRecords)
      .where(eq(billingRecords.therapistId, therapistId));

    if (startDate && endDate) {
      query = (query as any).where(
        and(
          eq(billingRecords.therapistId, therapistId),
          gte(billingRecords.serviceDate, startDate),
          lte(billingRecords.serviceDate, endDate)
        )
      );
    }

    const bills = await query;

    const totalRevenue = bills.reduce((sum, bill) => sum + parseFloat(bill.totalAmount || '0'), 0);
    const paidAmount = bills
      .filter(bill => bill.status === 'paid')
      .reduce((sum, bill) => sum + parseFloat(bill.totalAmount || '0'), 0);
    const pendingAmount = bills
      .filter(bill => bill.status === 'pending')
      .reduce((sum, bill) => sum + parseFloat(bill.totalAmount || '0'), 0);

    const now = new Date();
    const overdueAmount = bills
      .filter(bill => bill.status === 'pending' && bill.dueDate && new Date(bill.dueDate) < now)
      .reduce((sum, bill) => sum + parseFloat(bill.totalAmount || '0'), 0);

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      paidAmount: Math.round(paidAmount * 100) / 100,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      overdueAmount: Math.round(overdueAmount * 100) / 100,
    };
  }

  async getSessionNoteById(sessionNoteId: string): Promise<SessionNote | null> {
    try {
      const [sessionNote] = await db.select().from(sessionNotes).where(eq(sessionNotes.id, sessionNoteId));
      return sessionNote || null;
    } catch (error) {
      console.error('Error in getSessionNoteById:', error);
      return null;
    }
  }

  async getSessionNotesByClientId(clientId: string): Promise<SessionNote[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM session_notes WHERE client_id = $1 ORDER BY created_at DESC',
        [clientId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        appointmentId: row.appointment_id || null,
        eventId: row.event_id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        content: row.content,
        transcript: row.transcript || null,
        aiSummary: row.ai_summary || null,
        tags: row.tags || [],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        // Add missing required fields with default values
        location: row.location || null,
        title: row.title || 'Session Note',
        subjective: row.subjective || '',
        objective: row.objective || '',
        assessment: row.assessment || '',
        plan: row.plan || '',
        sessionType: row.session_type || 'Individual Therapy',
        duration: row.duration || 50,
        sessionDate: row.session_date ? new Date(row.session_date) : null,
        keyPoints: this.safeParseJSON(row.key_points, []),
        significantQuotes: this.safeParseJSON(row.significant_quotes, []),
        narrativeSummary: row.narrative_summary || '',
        tonalAnalysis: row.tonal_analysis || '',
        manualEntry: row.manual_entry || false,
        meetingType: row.meeting_type || null,
        participants: this.safeParseJSON(row.participants, []),
        followUpNotes: row.follow_up_notes || '',
        aiTags: this.safeParseJSON(row.ai_tags, []),
        followUpRequired: row.follow_up_required || false,
        confidentialityLevel: row.confidentiality_level || null
      }));
    } catch (error) {
      console.error('Error in getSessionNotesByClientId:', error);
      return [];
    }
  }

  async getAllSessionNotesByTherapist(therapistId: string): Promise<SessionNote[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM session_notes WHERE therapist_id = $1 ORDER BY created_at DESC',
        [therapistId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        appointmentId: row.appointment_id || null,
        eventId: row.event_id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        content: row.content,
        transcript: row.transcript || null,
        aiSummary: row.ai_summary || null,
        tags: row.tags || [],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        // Add missing required fields with default values
        location: row.location || null,
        title: row.title || 'Session Note',
        subjective: row.subjective || '',
        objective: row.objective || '',
        assessment: row.assessment || '',
        plan: row.plan || '',
        sessionType: row.session_type || 'Individual Therapy',
        duration: row.duration || 50,
        sessionDate: row.session_date ? new Date(row.session_date) : null,
        keyPoints: this.safeParseJSON(row.key_points, []),
        significantQuotes: this.safeParseJSON(row.significant_quotes, []),
        narrativeSummary: row.narrative_summary || '',
        tonalAnalysis: row.tonal_analysis || '',
        manualEntry: row.manual_entry || false,
        meetingType: row.meeting_type || null,
        participants: this.safeParseJSON(row.participants, []),
        followUpNotes: row.follow_up_notes || '',
        confidentialityLevel: row.confidentiality_level || null
      }));
    } catch (error) {
      console.error('Error in getAllSessionNotesByTherapist:', error);
      return [];
    }
  }

  async getSessionNotesByTherapistTimeframe(therapistId: string, timeframe: 'week' | 'month' | 'quarter'): Promise<SessionNote[]> {
    try {
      let dateThreshold = new Date();
      switch (timeframe) {
        case 'week':
          dateThreshold.setDate(dateThreshold.getDate() - 7);
          break;
        case 'month':
          dateThreshold.setMonth(dateThreshold.getMonth() - 1);
          break;
        case 'quarter':
          dateThreshold.setMonth(dateThreshold.getMonth() - 3);
          break;
      }

      const result = await pool.query(
        'SELECT * FROM session_notes WHERE therapist_id = $1 AND created_at >= $2 ORDER BY created_at DESC',
        [therapistId, dateThreshold]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        appointmentId: row.appointment_id || null,
        eventId: row.event_id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        content: row.content,
        transcript: row.transcript || null,
        aiSummary: row.ai_summary || null,
        tags: row.tags || [],
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        // Add missing required fields with default values
        location: row.location || null,
        title: row.title || 'Session Note',
        subjective: row.subjective || '',
        objective: row.objective || '',
        assessment: row.assessment || '',
        plan: row.plan || '',
        sessionType: row.session_type || 'Individual Therapy',
        duration: row.duration || 50,
        sessionDate: row.session_date ? new Date(row.session_date) : null,
        keyPoints: this.safeParseJSON(row.key_points, []),
        significantQuotes: this.safeParseJSON(row.significant_quotes, []),
        narrativeSummary: row.narrative_summary || '',
        tonalAnalysis: row.tonal_analysis || '',
        manualEntry: row.manual_entry || false,
        meetingType: row.meeting_type || null,
        participants: this.safeParseJSON(row.participants, []),
        followUpNotes: row.follow_up_notes || '',
        confidentialityLevel: row.confidentiality_level || null
      }));
    } catch (error) {
      console.error('Error in getSessionNotesByTherapistTimeframe:', error);
      return [];
    }
  }

  async getAppointmentsByTherapistTimeframe(therapistId: string, timeframe: 'week' | 'month' | 'quarter'): Promise<Appointment[]> {
    try {
      let dateThreshold = new Date();
      switch (timeframe) {
        case 'week':
          dateThreshold.setDate(dateThreshold.getDate() - 7);
          break;
        case 'month':
          dateThreshold.setMonth(dateThreshold.getMonth() - 1);
          break;
        case 'quarter':
          dateThreshold.setMonth(dateThreshold.getMonth() - 3);
          break;
      }

      const result = await pool.query(
        'SELECT * FROM appointments WHERE therapist_id = $1 AND start_time >= $2 ORDER BY start_time DESC',
        [therapistId, dateThreshold]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        startTime: new Date(row.start_time),
        endTime: new Date(row.end_time),
        type: row.type,
        status: row.status,
        location: row.location || '',
        notes: row.notes || '',
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        // Add missing required fields with default values
        appointmentNumber: row.appointment_number || null,
        recurringId: row.recurring_id || null,
        recurringType: row.recurring_type || null,
        recurringEnd: row.recurring_end ? new Date(row.recurring_end) : null,
        reminderSent: row.reminder_sent || false,
        reminderTime: row.reminder_time ? new Date(row.reminder_time) : null,
        meetingType: row.meeting_type || 'in_person',
        sessionFee: row.session_fee || null,
        paymentStatus: row.payment_status || 'pending',
        cancellationReason: row.cancellation_reason || null,
        noShowFee: row.no_show_fee || null,
        attendanceStatus: row.attendance_status || 'scheduled',
        duration: row.duration || 50,
        googleEventId: row.google_event_id || null,
        lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at) : null,
        insuranceClaim: this.safeParseJSON(row.insurance_claim, {})
      }));
    } catch (error) {
      console.error('Error in getAppointmentsByTherapistTimeframe:', error);
      return [];
    }
  }

  // Session prep notes methods implementation
  async getSessionPrepNotes(eventId: string): Promise<SessionPrepNote[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM session_prep_notes WHERE event_id = $1 ORDER BY updated_at DESC',
        [eventId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        appointmentId: row.appointment_id,
        eventId: row.event_id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        prepContent: row.prep_content,
        keyFocusAreas: row.key_focus_areas || [],
        previousSessionSummary: row.previous_session_summary,
        suggestedInterventions: row.suggested_interventions || [],
        clientGoals: row.client_goals || [],
        riskFactors: row.risk_factors || [],
        homeworkReview: row.homework_review,
        sessionObjectives: row.session_objectives || [],
        aiGeneratedInsights: row.ai_generated_insights,
        followUpQuestions: row.follow_up_questions || [],
        psychoeducationalMaterials: row.psychoeducational_materials || [],
        lastUpdatedBy: row.last_updated_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error('Error in getSessionPrepNotes:', error);
      return [];
    }
  }

  async getSessionPrepNote(id: string): Promise<SessionPrepNote | undefined> {
    try {
      const result = await pool.query(
        'SELECT * FROM session_prep_notes WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) return undefined;

      const row = result.rows[0];
      return {
        id: row.id,
        appointmentId: row.appointment_id,
        eventId: row.event_id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        prepContent: row.prep_content,
        keyFocusAreas: row.key_focus_areas || [],
        previousSessionSummary: row.previous_session_summary,
        suggestedInterventions: row.suggested_interventions || [],
        clientGoals: row.client_goals || [],
        riskFactors: row.risk_factors || [],
        homeworkReview: row.homework_review,
        sessionObjectives: row.session_objectives || [],
        aiGeneratedInsights: row.ai_generated_insights,
        lastUpdatedBy: row.last_updated_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      console.error('Error in getSessionPrepNote:', error);
      return undefined;
    }
  }

  async getSessionPrepNoteByEventId(eventId: string): Promise<SessionPrepNote | undefined> {
    try {
      const result = await pool.query(
        'SELECT * FROM session_prep_notes WHERE event_id = $1 ORDER BY updated_at DESC LIMIT 1',
        [eventId]
      );

      if (result.rows.length === 0) return undefined;

      const row = result.rows[0];
      return {
        id: row.id,
        appointmentId: row.appointment_id,
        eventId: row.event_id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        prepContent: row.prep_content,
        keyFocusAreas: row.key_focus_areas || [],
        previousSessionSummary: row.previous_session_summary,
        suggestedInterventions: row.suggested_interventions || [],
        clientGoals: row.client_goals || [],
        riskFactors: row.risk_factors || [],
        homeworkReview: row.homework_review,
        sessionObjectives: row.session_objectives || [],
        aiGeneratedInsights: row.ai_generated_insights,
        followUpQuestions: row.follow_up_questions || [],
        psychoeducationalMaterials: row.psychoeducational_materials || [],
        lastUpdatedBy: row.last_updated_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      console.error('Error in getSessionPrepNoteByEventId:', error);
      return undefined;
    }
  }

  async getSessionPrepNotesByClient(clientId: string): Promise<SessionPrepNote[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM session_prep_notes WHERE client_id = $1 ORDER BY created_at DESC',
        [clientId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        appointmentId: row.appointment_id,
        eventId: row.event_id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        prepContent: row.prep_content,
        keyFocusAreas: row.key_focus_areas || [],
        previousSessionSummary: row.previous_session_summary,
        suggestedInterventions: row.suggested_interventions || [],
        clientGoals: row.client_goals || [],
        riskFactors: row.risk_factors || [],
        homeworkReview: row.homework_review,
        sessionObjectives: row.session_objectives || [],
        aiGeneratedInsights: row.ai_generated_insights,
        followUpQuestions: row.follow_up_questions || [],
        psychoeducationalMaterials: row.psychoeducational_materials || [],
        lastUpdatedBy: row.last_updated_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error('Error in getSessionPrepNotesByClient:', error);
      return [];
    }
  }

  async createSessionPrepNote(note: InsertSessionPrepNote): Promise<SessionPrepNote> {
    try {
      const result = await pool.query(
        `INSERT INTO session_prep_notes (
          appointment_id, event_id, client_id, therapist_id, prep_content,
          key_focus_areas, previous_session_summary, suggested_interventions,
          client_goals, risk_factors, homework_review, session_objectives,
          ai_generated_insights, last_updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          note.appointmentId,
          note.eventId,
          note.clientId,
          note.therapistId,
          note.prepContent,
          JSON.stringify(note.keyFocusAreas || []),
          note.previousSessionSummary,
          JSON.stringify(note.suggestedInterventions || []),
          JSON.stringify(note.clientGoals || []),
          JSON.stringify(note.riskFactors || []),
          note.homeworkReview,
          JSON.stringify(note.sessionObjectives || []),
          note.aiGeneratedInsights,
          note.lastUpdatedBy
        ]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        appointmentId: row.appointment_id,
        eventId: row.event_id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        prepContent: row.prep_content,
        keyFocusAreas: row.key_focus_areas || [],
        previousSessionSummary: row.previous_session_summary,
        suggestedInterventions: row.suggested_interventions || [],
        clientGoals: row.client_goals || [],
        riskFactors: row.risk_factors || [],
        homeworkReview: row.homework_review,
        sessionObjectives: row.session_objectives || [],
        aiGeneratedInsights: row.ai_generated_insights,
        lastUpdatedBy: row.last_updated_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      console.error('Error in createSessionPrepNote:', error);
      throw error;
    }
  }

  async updateSessionPrepNote(id: string, note: Partial<SessionPrepNote>): Promise<SessionPrepNote> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (note.prepContent !== undefined) {
        updateFields.push(`prep_content = $${paramIndex++}`);
        values.push(note.prepContent);
      }
      if (note.keyFocusAreas !== undefined) {
        updateFields.push(`key_focus_areas = $${paramIndex++}`);
        values.push(JSON.stringify(note.keyFocusAreas));
      }
      if (note.previousSessionSummary !== undefined) {
        updateFields.push(`previous_session_summary = $${paramIndex++}`);
        values.push(note.previousSessionSummary);
      }
      if (note.suggestedInterventions !== undefined) {
        updateFields.push(`suggested_interventions = $${paramIndex++}`);
        values.push(JSON.stringify(note.suggestedInterventions));
      }
      if (note.clientGoals !== undefined) {
        updateFields.push(`client_goals = $${paramIndex++}`);
        values.push(JSON.stringify(note.clientGoals));
      }
      if (note.riskFactors !== undefined) {
        updateFields.push(`risk_factors = $${paramIndex++}`);
        values.push(JSON.stringify(note.riskFactors));
      }
      if (note.homeworkReview !== undefined) {
        updateFields.push(`homework_review = $${paramIndex++}`);
        values.push(note.homeworkReview);
      }
      if (note.sessionObjectives !== undefined) {
        updateFields.push(`session_objectives = $${paramIndex++}`);
        values.push(JSON.stringify(note.sessionObjectives));
      }
      if (note.aiGeneratedInsights !== undefined) {
        updateFields.push(`ai_generated_insights = $${paramIndex++}`);
        values.push(note.aiGeneratedInsights);
      }
      if (note.lastUpdatedBy !== undefined) {
        updateFields.push(`last_updated_by = $${paramIndex++}`);
        values.push(note.lastUpdatedBy);
      }

      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());

      values.push(id);

      const result = await pool.query(
        `UPDATE session_prep_notes SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      const row = result.rows[0];
      return {
        id: row.id,
        appointmentId: row.appointment_id,
        eventId: row.event_id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        prepContent: row.prep_content,
        keyFocusAreas: row.key_focus_areas || [],
        previousSessionSummary: row.previous_session_summary,
        suggestedInterventions: row.suggested_interventions || [],
        clientGoals: row.client_goals || [],
        riskFactors: row.risk_factors || [],
        homeworkReview: row.homework_review,
        sessionObjectives: row.session_objectives || [],
        aiGeneratedInsights: row.ai_generated_insights,
        lastUpdatedBy: row.last_updated_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      console.error('Error in updateSessionPrepNote:', error);
      throw error;
    }
  }

  async generateAIInsightsForSession(eventId: string, clientId: string): Promise<{
    insights: string;
    followUpQuestions: string[];
    psychoeducationalMaterials: Array<{
      title: string;
      description: string;
      type: 'handout' | 'worksheet' | 'reading' | 'video' | 'app';
      url?: string;
    }>;
  }> {
    try {
      // Get previous session notes for this client (now includes former progress notes)
      const previousNotes = await this.getSessionNotesByClientId(clientId);

      // Get current client information
      const client = await this.getClient(clientId);

      if (!client) {
        return this.getDefaultSessionPrepInsights();
      }

      // Use AI to generate comprehensive session prep
      const { generateClinicalAnalysis } = await import('./ai-services');

      const sessionContext = previousNotes.slice(0, 3).map(note => ({
        date: note.createdAt || new Date(),
        content: note.content,
        duration: '50 minutes' // Default session duration
      }));

      const prompt = `As an expert clinical therapist, analyze the following client information and recent session notes to provide comprehensive session preparation guidance:

Client: ${client.firstName} ${client.lastName}
Recent Sessions:
${sessionContext.map((s, i) => `Session ${i + 1} (${new Date(s.date).toLocaleDateString()}): ${s.content}`).join('\n\n')}

Please provide:
1. Clinical insights and preparation notes
2. 5-7 specific follow-up questions that continue where previous sessions left off
3. 3-5 relevant psychoeducational materials/handouts appropriate for this client

Respond in JSON format:
{
  "insights": "Detailed clinical insights and session prep guidance...",
  "followUpQuestions": [
    "How has your anxiety been since we worked on breathing techniques?",
    "Were you able to practice the homework assignment we discussed?"
  ],
  "psychoeducationalMaterials": [
    {
      "title": "Anxiety Management Techniques",
      "description": "Practical strategies for managing anxiety symptoms",
      "type": "handout"
    }
  ]
}`;

      const analysis = await generateClinicalAnalysis(prompt);

      try {
        const result = JSON.parse(analysis);
        return {
          insights: result.insights || this.getDefaultInsights(),
          followUpQuestions: result.followUpQuestions || this.getDefaultQuestions(),
          psychoeducationalMaterials: result.psychoeducationalMaterials || this.getDefaultMaterials()
        };
      } catch (parseError) {
        console.error('Error parsing AI analysis:', parseError);
        return this.getDefaultSessionPrepInsights();
      }
    } catch (error) {
      console.error('Error generating AI insights:', error);
      return this.getDefaultSessionPrepInsights();
    }
  }

  private getDefaultSessionPrepInsights() {
    return {
      insights: `AI-Generated Session Preparation Insights:

1. Previous Session Review:
   - Review key themes from last session
   - Check on homework assignments and progress
   - Assess any risk factors or concerns

2. Client Background Context:
   - Consider current treatment goals
   - Review any medication changes
   - Note family/social dynamics

3. Recommended Focus Areas:
   - Continue working on coping strategies
   - Assess coping strategies effectiveness
   - Check medication compliance if applicable

4. Session Objectives:
   - Assess current mental state and progress
   - Reinforce positive coping strategies
   - Plan next steps in treatment

5. Homework Review:
   - Review completion of previous assignments
   - Discuss any challenges or successes
   - Adjust future assignments as needed`,
      followUpQuestions: this.getDefaultQuestions(),
      psychoeducationalMaterials: this.getDefaultMaterials()
    };
  }

  private getDefaultQuestions(): string[] {
    return [
      "How have you been feeling since our last session?",
      "Were you able to practice the techniques we discussed?",
      "What challenges did you face this week?",
      "How did the homework assignment go?",
      "Have you noticed any patterns in your thoughts or behaviors?",
      "What would you like to focus on today?",
      "How are your coping strategies working for you?"
    ];
  }

  private getDefaultMaterials() {
    return [
      {
        title: "Mindfulness and Relaxation Techniques",
        description: "Practical guide to mindfulness exercises and breathing techniques",
        type: "handout" as const
      },
      {
        title: "Thought Record Worksheet",
        description: "Tool for identifying and challenging negative thought patterns",
        type: "worksheet" as const
      },
      {
        title: "Anxiety Management Strategies",
        description: "Evidence-based techniques for managing anxiety symptoms",
        type: "handout" as const
      },
      {
        title: "Daily Mood Tracker",
        description: "Simple tool to track daily mood and identify patterns",
        type: "worksheet" as const
      }
    ];
  }

  private getDefaultInsights(): string {
    return `Session Preparation Insights:

1. Previous Session Review:
   - Review key themes from last session
   - Check on homework assignments and progress
   - Assess any risk factors or concerns

2. Recommended Focus Areas:
   - Continue working on coping strategies
   - Assess current mental state and progress
   - Plan next steps in treatment`;
  }

  // Client check-ins methods implementation
  async getClientCheckins(therapistId: string, status?: string): Promise<ClientCheckin[]> {
    try {
      let query = 'SELECT * FROM client_checkins WHERE therapist_id = $1';
      const params: any[] = [therapistId];

      if (status) {
        query += ' AND status = $2';
        params.push(status);
      }

      query += ' ORDER BY generated_at DESC';

      const result = await pool.query(query, params);

      return result.rows.map((row: any) => ({
        id: row.id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        eventId: row.event_id,
        sessionNoteId: row.session_note_id,
        checkinType: row.checkin_type,
        priority: row.priority,
        subject: row.subject,
        messageContent: row.message_content,
        aiReasoning: row.ai_reasoning,
        triggerContext: row.trigger_context || {},
        deliveryMethod: row.delivery_method,
        status: row.status,
        generatedAt: new Date(row.generated_at),
        reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
        sentAt: row.sent_at ? new Date(row.sent_at) : null,
        archivedAt: row.archived_at ? new Date(row.archived_at) : null,
        expiresAt: new Date(row.expires_at),
        clientResponse: row.client_response,
        responseReceivedAt: row.response_received_at ? new Date(row.response_received_at) : null,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error('Error in getClientCheckins:', error);
      return [];
    }
  }

  async getClientCheckinsByClient(clientId: string): Promise<ClientCheckin[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM client_checkins WHERE client_id = $1 ORDER BY generated_at DESC',
        [clientId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        eventId: row.event_id,
        sessionNoteId: row.session_note_id,
        checkinType: row.checkin_type,
        priority: row.priority,
        subject: row.subject,
        messageContent: row.message_content,
        aiReasoning: row.ai_reasoning,
        triggerContext: row.trigger_context || {},
        deliveryMethod: row.delivery_method,
        status: row.status,
        generatedAt: new Date(row.generated_at),
        reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
        sentAt: row.sent_at ? new Date(row.sent_at) : null,
        archivedAt: row.archived_at ? new Date(row.archived_at) : null,
        expiresAt: new Date(row.expires_at),
        clientResponse: row.client_response,
        responseReceivedAt: row.response_received_at ? new Date(row.response_received_at) : null,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error('Error in getClientCheckinsByClient:', error);
      return [];
    }
  }

  async getClientCheckin(id: string): Promise<ClientCheckin | undefined> {
    try {
      const result = await pool.query(
        'SELECT * FROM client_checkins WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) return undefined;

      const row = result.rows[0];
      return {
        id: row.id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        eventId: row.event_id,
        sessionNoteId: row.session_note_id,
        checkinType: row.checkin_type,
        priority: row.priority,
        subject: row.subject,
        messageContent: row.message_content,
        aiReasoning: row.ai_reasoning,
        triggerContext: row.trigger_context || {},
        deliveryMethod: row.delivery_method,
        status: row.status,
        generatedAt: new Date(row.generated_at),
        reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
        sentAt: row.sent_at ? new Date(row.sent_at) : null,
        archivedAt: row.archived_at ? new Date(row.archived_at) : null,
        expiresAt: new Date(row.expires_at),
        clientResponse: row.client_response,
        responseReceivedAt: row.response_received_at ? new Date(row.response_received_at) : null,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      console.error('Error in getClientCheckin:', error);
      return undefined;
    }
  }

  async createClientCheckin(checkin: InsertClientCheckin): Promise<ClientCheckin> {
    try {
      const result = await pool.query(
        `INSERT INTO client_checkins (
          client_id, therapist_id, event_id, session_note_id, checkin_type,
          priority, subject, message_content, ai_reasoning, trigger_context,
          delivery_method, status, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          checkin.clientId,
          checkin.therapistId,
          checkin.eventId,
          checkin.sessionNoteId,
          checkin.checkinType,
          checkin.priority,
          checkin.subject,
          checkin.messageContent,
          checkin.aiReasoning,
          JSON.stringify(checkin.triggerContext || {}),
          checkin.deliveryMethod,
          checkin.status,
          checkin.expiresAt
        ]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        eventId: row.event_id,
        sessionNoteId: row.session_note_id,
        checkinType: row.checkin_type,
        priority: row.priority,
        subject: row.subject,
        messageContent: row.message_content,
        aiReasoning: row.ai_reasoning,
        triggerContext: row.trigger_context || {},
        deliveryMethod: row.delivery_method,
        status: row.status,
        generatedAt: new Date(row.generated_at),
        reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
        sentAt: row.sent_at ? new Date(row.sent_at) : null,
        archivedAt: row.archived_at ? new Date(row.archived_at) : null,
        expiresAt: new Date(row.expires_at),
        clientResponse: row.client_response,
        responseReceivedAt: row.response_received_at ? new Date(row.response_received_at) : null,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      console.error('Error in createClientCheckin:', error);
      throw error;
    }
  }

  async updateClientCheckin(id: string, checkin: Partial<ClientCheckin>): Promise<ClientCheckin> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (checkin.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(checkin.status);

        if (checkin.status === 'reviewed') {
          updateFields.push(`reviewed_at = $${paramIndex++}`);
          values.push(new Date());
        } else if (checkin.status === 'sent') {
          updateFields.push(`sent_at = $${paramIndex++}`);
          values.push(new Date());
        } else if (checkin.status === 'archived') {
          updateFields.push(`archived_at = $${paramIndex++}`);
          values.push(new Date());
        }
      }

      if (checkin.clientResponse !== undefined) {
        updateFields.push(`client_response = $${paramIndex++}`);
        values.push(checkin.clientResponse);
        updateFields.push(`response_received_at = $${paramIndex++}`);
        values.push(new Date());
      }

      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());

      values.push(id);

      const result = await pool.query(
        `UPDATE client_checkins SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      const row = result.rows[0];
      return {
        id: row.id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        eventId: row.event_id,
        sessionNoteId: row.session_note_id,
        checkinType: row.checkin_type,
        priority: row.priority,
        subject: row.subject,
        messageContent: row.message_content,
        aiReasoning: row.ai_reasoning,
        triggerContext: row.trigger_context || {},
        deliveryMethod: row.delivery_method,
        status: row.status,
        generatedAt: new Date(row.generated_at),
        reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
        sentAt: row.sent_at ? new Date(row.sent_at) : null,
        archivedAt: row.archived_at ? new Date(row.archived_at) : null,
        expiresAt: new Date(row.expires_at),
        clientResponse: row.client_response,
        responseReceivedAt: row.response_received_at ? new Date(row.response_received_at) : null,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      console.error('Error in updateClientCheckin:', error);
      throw error;
    }
  }

  async generateAICheckins(therapistId: string): Promise<ClientCheckin[]> {
    try {
      // Get all active clients for this therapist
      const clients = await this.getClients(therapistId);
      const generatedCheckins: ClientCheckin[] = [];

      for (const client of clients) {
        // Get recent session notes for this client
        const sessionNotes = await this.getSessionNotesByClientId(client.id);
        const recentNotes = sessionNotes.slice(0, 3); // Last 3 sessions

        if (recentNotes.length === 0) continue;

        // Check if we've already generated a check-in for this client recently
        const existingCheckins = await this.getClientCheckinsByClient(client.id);
        const recentCheckin = existingCheckins.find(checkin =>
          checkin.status !== 'archived' && checkin.status !== 'deleted' &&
          new Date(checkin.generatedAt).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000) // Within 7 days
        );

        if (recentCheckin) continue; // Skip if already has recent check-in

        // Analyze session notes to determine if a check-in is needed
        const analysis = await this.analyzeSessionForCheckin(client, recentNotes);

        if (analysis.shouldGenerateCheckin) {
          const checkin = await this.createClientCheckin({
            clientId: client.id,
            therapistId,
            eventId: null,
            sessionNoteId: recentNotes[0]?.id || null,
            checkinType: analysis.checkinType as 'midweek' | 'followup' | 'crisis_support' | 'goal_reminder' | 'homework_reminder',
            priority: analysis.priority as 'low' | 'medium' | 'high' | 'urgent',
            subject: analysis.subject,
            messageContent: analysis.messageContent,
            aiReasoning: analysis.reasoning,
            triggerContext: analysis.triggerContext,
            deliveryMethod: 'email',
            status: 'generated',
            expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days from now
          });

          generatedCheckins.push(checkin);
        }
      }

      return generatedCheckins;
    } catch (error) {
      console.error('Error generating AI check-ins:', error);
      return [];
    }
  }

  private async analyzeSessionForCheckin(client: any, sessionNotes: any[]): Promise<{
    shouldGenerateCheckin: boolean;
    checkinType: string;
    priority: string;
    subject: string;
    messageContent: string;
    reasoning: string;
    triggerContext: any;
  }> {
    try {
      // Use OpenAI to analyze session notes for check-in opportunities
      const { generateClinicalAnalysis } = await import('./ai-services');

      const lastSession = sessionNotes[0];
      const daysSinceLastSession = Math.floor((Date.now() - new Date(lastSession.createdAt).getTime()) / (24 * 60 * 60 * 1000));

      // Prepare context for AI analysis
      const sessionContext = sessionNotes.slice(0, 2).map(note => ({
        date: note.createdAt,
        content: note.content,
        daysSince: Math.floor((Date.now() - new Date(note.createdAt).getTime()) / (24 * 60 * 60 * 1000))
      }));

      const prompt = `You are writing a check-in message on behalf of Jonathan, a licensed mental health counselor. Your tone must sound like Jonathan himself is speaking - warm, clear, professional, conversational but composed, with occasional dry wit when appropriate.

TONE GUIDELINES:
- Warm, clear, and professional but never stiff or corporate
- Use contractions (I'll, that's, you're)
- Conversational but composed (not too casual)
- Emotionally attuned, not sentimental
- Structured and efficient—but never cold or rushed
- Keep paragraphs short and balanced
- Vary sentence rhythm to avoid sounding robotic

AVOID:
- Overusing exclamation marks, emojis, or filler
- Stiff formality ("Dear Sir or Madam," "Pursuant to...")
- Vague corporate or "over-polished" phrasing
- Over-apologizing or sounding unsure
- Generic, ChatGPT-style AI responses

Analyze the following therapy session notes for ${client.firstName} ${client.lastName} and determine if a check-in message would be beneficial:

Recent Sessions:
${sessionContext.map(s => `- ${s.daysSince} days ago: ${s.content}`).join('\n')}

Days since last session: ${daysSinceLastSession}

Based on the session content, determine:
1. Should we generate a check-in? (consider: homework assignments, crisis indicators, progress milestones, emotional state)
2. What type of check-in? (midweek, followup, crisis_support, goal_reminder, homework_reminder)
3. Priority level? (low, medium, high, urgent)
4. Write a subject line and message that sounds like Jonathan's authentic voice

Example phrases to reference:
- "Hi [Name] — just wanted to check in briefly."
- "Hope things have been going okay since we last met."
- "No pressure to reply right away—just wanted to touch base."
- "Let me know if you'd like to chat about anything before our next session."

Respond with JSON:
{
  "shouldGenerateCheckin": boolean,
  "checkinType": string,
  "priority": string,
  "subject": string,
  "messageContent": string,
  "reasoning": string
}`;

      const analysis = await generateClinicalAnalysis(prompt);

      try {
        const result = JSON.parse(analysis);
        return {
          ...result,
          triggerContext: {
            daysSinceSession: daysSinceLastSession,
            lastSessionDate: lastSession.createdAt,
            sessionCount: sessionNotes.length
          }
        };
      } catch (parseError) {
        console.error('Error parsing AI analysis:', parseError);
        // Fallback to simple logic
        return this.getSimpleCheckinAnalysis(client, sessionNotes, daysSinceLastSession);
      }
    } catch (error) {
      console.error('Error in AI analysis:', error);
      // Fallback to simple logic
      const lastSession = sessionNotes[0];
      const daysSinceLastSession = Math.floor((Date.now() - new Date(lastSession.createdAt).getTime()) / (24 * 60 * 60 * 1000));
      return this.getSimpleCheckinAnalysis(client, sessionNotes, daysSinceLastSession);
    }
  }

  private getSimpleCheckinAnalysis(client: any, sessionNotes: any[], daysSinceLastSession: number) {
    const lastSession = sessionNotes[0];

    // Simple rule-based logic
    if (daysSinceLastSession >= 3 && daysSinceLastSession <= 5) {
      return {
        shouldGenerateCheckin: true,
        checkinType: 'midweek',
        priority: 'medium',
        subject: `Quick check-in`,
        messageContent: `Hi ${client.firstName} — just wanted to check in briefly.

Hope things have been going okay since we last met. No pressure to reply right away, but I'd love to hear how you're feeling about the things we discussed.

Let me know if you'd like to chat about anything before our next session.

Take care,
Jonathan`,
        reasoning: `Generated midweek check-in because it's been ${daysSinceLastSession} days since last session`,
        triggerContext: { daysSinceSession: daysSinceLastSession, lastSessionDate: lastSession.createdAt }
      };
    }

    return {
      shouldGenerateCheckin: false,
      checkinType: 'midweek',
      priority: 'low',
      subject: '',
      messageContent: '',
      reasoning: 'No check-in triggers detected',
      triggerContext: {}
    };
  }

  async sendCheckin(id: string, method: 'email' | 'sms'): Promise<boolean> {
    try {
      const checkin = await this.getClientCheckin(id);
      if (!checkin) return false;

      // Get client information for email
      const client = await this.getClient(checkin.clientId);
      if (!client?.email) {
        console.error('Client email not found');
        return false;
      }

      if (method === 'email') {
        // Import email service dynamically to avoid module resolution issues
        const { sendCheckInEmail } = await import('./email-service');
        const emailSent = await sendCheckInEmail(
          client.email,
          checkin.subject,
          checkin.messageContent
        );

        if (!emailSent) {
          console.error('Failed to send email');
          return false;
        }
      } else if (method === 'sms') {
        // SMS functionality would be implemented here with Twilio
        console.log('SMS functionality not yet implemented');
        return false;
      }

      await this.updateClientCheckin(id, { status: 'sent' });
      return true;
    } catch (error) {
      console.error('Error sending check-in:', error);
      return false;
    }
  }

  async cleanupExpiredCheckins(): Promise<number> {
    try {
      const result = await pool.query(
        `UPDATE client_checkins
         SET status = 'deleted', updated_at = NOW()
         WHERE expires_at < NOW() AND status = 'generated'
         RETURNING id`
      );

      return result.rowCount || 0;
    } catch (error) {
      console.error('Error cleaning up expired check-ins:', error);
      return 0;
    }
  }

  async deleteClientCheckin(id: string): Promise<void> {
    try {
      await pool.query('DELETE FROM client_checkins WHERE id = $1', [id]);
    } catch (error) {
      console.error('Error in deleteClientCheckin:', error);
      throw error;
    }
  }



  async getClientOutcomesByTherapist(therapistId: string): Promise<Assessment[]> {
    try {
      const result = await pool.query(
        'SELECT c.*, COUNT(sn.id) as session_count FROM clients c LEFT JOIN session_notes sn ON c.id::text = sn.client_id WHERE c.therapist_id::text = $1 GROUP BY c.id ORDER BY c.created_at DESC',
        [therapistId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        sessionCount: parseInt(row.session_count) || 0,
        progressLevel: this.assessClientProgress(row.status, parseInt(row.session_count) || 0),
        createdAt: new Date(row.created_at)
      }));
    } catch (error) {
      console.error('Error in getClientOutcomesByTherapist:', error);
      return [];
    }
  }

  private assessClientProgress(status: string, sessionCount: number): string {
    if (status === 'completed' && sessionCount > 8) return 'excellent';
    if (status === 'active' && sessionCount > 12) return 'good';
    if (status === 'active' && sessionCount > 6) return 'moderate';
    return 'early';
  }

  async getActionItemsByEventId(eventId: string): Promise<ActionItem[]> {
    try {
      // Querying for eventId

      const result = await pool.query(
        'SELECT * FROM action_items WHERE event_id = $1 ORDER BY created_at DESC',
        [eventId]
      );

      // Database query completed
      return result.rows.map((row: any) => ({
        id: row.id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        title: row.title,
        description: row.description,
        priority: row.priority as 'low' | 'medium' | 'high',
        status: row.status as 'pending' | 'in-progress' | 'completed',
        dueDate: row.due_date ? new Date(row.due_date) : null,
        completedAt: row.completed_at ? new Date(row.completed_at) : null,
        eventId: row.event_id,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error('Error in getActionItemsByEventId:', error);
      return [];
    }
  }

  /**
   * Creates a unified narrative from progress note sections (SOAP + Analysis + Insights + Summary)
   * Following the exact order: Subjective, Objective, Assessment, Plan, Analysis, Insights, Summary
   */
  createUnifiedNarrative(data: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    tonalAnalysis: string;
    narrativeSummary: string;
  }): string {
    const sections = [];

    if (data.subjective?.trim()) {
      sections.push('Subjective:\n' + data.subjective.trim());
    }

    if (data.objective?.trim()) {
      sections.push('Objective:\n' + data.objective.trim());
    }

    if (data.assessment?.trim()) {
      sections.push('Assessment:\n' + data.assessment.trim());
    }

    if (data.plan?.trim()) {
      sections.push('Plan:\n' + data.plan.trim());
    }

    if (data.tonalAnalysis?.trim()) {
      sections.push('Analysis:\n' + data.tonalAnalysis.trim());
    }

    // Extract insights from narrative summary if it contains them
    let insights = '';
    let summary = data.narrativeSummary?.trim() || '';

    // Try to separate insights and summary if they're combined
    if (summary.includes('Insights:') || summary.includes('Key Insights:')) {
      const insightMatch = summary.match(/(.*?)(Insights?:.*?)(?:Summary:.*?$|$)/s);
      if (insightMatch) {
        insights = insightMatch[2].trim();
        summary = summary.replace(insightMatch[2], '').trim();
      }
    }

    if (insights) {
      sections.push('Insights:\n' + insights);
    }

    if (summary) {
      sections.push('Summary:\n' + summary);
    }

    return sections.join('\n\n');
  }

  /**
   * Generates AI tags for session notes based on unified narrative content
   */
  async generateAITags(content: string): Promise<string[]> {
    try {
      console.log('🏷️  Generating AI tags for unified narrative...');

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an expert clinical AI assistant. Analyze the therapy session content and generate relevant therapeutic tags that will help with appointment and progress note organization.

            Focus on identifying:
            - Therapeutic modalities used (CBT, DBT, ACT, EMDR, Narrative Therapy, etc.)
            - Clinical presentations (Anxiety, Depression, PTSD, Bipolar, OCD, etc.)
            - Treatment components (Homework, Mindfulness, Coping Skills, Exposure, etc.)
            - Progress indicators (Improvement, Setback, Breakthrough, Maintenance, etc.)
            - Session focus (Crisis, Intake, Follow-up, Treatment Planning, etc.)
            - Therapeutic techniques (Cognitive Restructuring, Behavioral Activation, etc.)
            - Client demographics/context (Adult, Adolescent, Family, Couples, etc.)

            RESPOND ONLY WITH VALID JSON in this format:
            {"tags": ["tag1", "tag2", "tag3"]}

            Return 6-10 most relevant tags. Be specific and clinically accurate.`
          },
          {
            role: "user",
            content: `Generate therapeutic tags for this progress note content:\n\n${content.substring(0, 3000)}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 300
      });

      const result = JSON.parse(response.choices[0].message.content || '{"tags":[]}');
      const tags = result.tags || result.therapeuticTags || [];

      // Ensure tags are strings and filter out empty ones
      const validTags = tags.filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0)
        .slice(0, 10); // Limit to 10 tags

      console.log(`✅ Generated ${validTags.length} AI tags: ${validTags.join(', ')}`);
      return validTags;

    } catch (error) {
      console.error('❌ AI tag generation failed:', error);

      // Fallback: extract basic tags from content
      const fallbackTags = this.extractBasicTags(content);
      console.log(`🔄 Using fallback tags: ${fallbackTags.join(', ')}`);
      return fallbackTags;
    }
  }

  /**
   * Fallback method for basic tag extraction
   */
  private extractBasicTags(content: string): string[] {
    const tags: string[] = [];
    const lowerContent = content.toLowerCase();

    // Therapeutic modalities
    if (lowerContent.includes('cbt') || lowerContent.includes('cognitive behavioral')) tags.push('CBT');
    if (lowerContent.includes('dbt') || lowerContent.includes('dialectical')) tags.push('DBT');
    if (lowerContent.includes('act') || lowerContent.includes('acceptance commitment')) tags.push('ACT');
    if (lowerContent.includes('mindfulness') || lowerContent.includes('meditation')) tags.push('Mindfulness');
    if (lowerContent.includes('emdr')) tags.push('EMDR');
    if (lowerContent.includes('narrative therapy')) tags.push('Narrative Therapy');
    if (lowerContent.includes('exposure') || lowerContent.includes('systematic desensitization')) tags.push('Exposure Therapy');

    // Clinical presentations
    if (lowerContent.includes('anxiety') || lowerContent.includes('anxious') || lowerContent.includes('panic')) tags.push('Anxiety');
    if (lowerContent.includes('depression') || lowerContent.includes('depressed') || lowerContent.includes('mood')) tags.push('Depression');
    if (lowerContent.includes('trauma') || lowerContent.includes('ptsd') || lowerContent.includes('traumatic')) tags.push('Trauma');
    if (lowerContent.includes('grief') || lowerContent.includes('loss') || lowerContent.includes('bereavement')) tags.push('Grief/Loss');
    if (lowerContent.includes('relationship') || lowerContent.includes('couple') || lowerContent.includes('marriage')) tags.push('Relationships');
    if (lowerContent.includes('work') || lowerContent.includes('job') || lowerContent.includes('career') || lowerContent.includes('employment')) tags.push('Work Stress');
    if (lowerContent.includes('family') || lowerContent.includes('parent') || lowerContent.includes('child')) tags.push('Family Issues');
    if (lowerContent.includes('substance') || lowerContent.includes('addiction') || lowerContent.includes('alcohol')) tags.push('Substance Use');
    if (lowerContent.includes('sleep') || lowerContent.includes('insomnia') || lowerContent.includes('nightmare')) tags.push('Sleep Issues');
    if (lowerContent.includes('anger') || lowerContent.includes('aggression') || lowerContent.includes('irritability')) tags.push('Anger Management');

    // Treatment components and progress
    if (lowerContent.includes('improvement') || lowerContent.includes('progress') || lowerContent.includes('better') || lowerContent.includes('healing')) tags.push('Progress');
    if (lowerContent.includes('crisis') || lowerContent.includes('emergency') || lowerContent.includes('suicidal') || lowerContent.includes('risk')) tags.push('Crisis');
    if (lowerContent.includes('homework') || lowerContent.includes('assignment') || lowerContent.includes('practice')) tags.push('Homework');
    if (lowerContent.includes('coping') || lowerContent.includes('strategies') || lowerContent.includes('skills')) tags.push('Coping Skills');
    if (lowerContent.includes('medication') || lowerContent.includes('med') || lowerContent.includes('prescription') || lowerContent.includes('psychiatrist')) tags.push('Medication');
    if (lowerContent.includes('breakthrough') || lowerContent.includes('insight') || lowerContent.includes('awareness')) tags.push('Breakthrough');
    if (lowerContent.includes('setback') || lowerContent.includes('relapse') || lowerContent.includes('regression')) tags.push('Setback');

    // Session types
    if (lowerContent.includes('intake') || lowerContent.includes('initial') || lowerContent.includes('assessment')) tags.push('Intake');
    if (lowerContent.includes('follow-up') || lowerContent.includes('follow up') || lowerContent.includes('continuing')) tags.push('Follow-up');
    if (lowerContent.includes('termination') || lowerContent.includes('discharge') || lowerContent.includes('ending')) tags.push('Termination');

    return tags.slice(0, 10); // Allow up to 10 fallback tags
  }

  // MERGED FUNCTIONALITY: Progress notes now created directly as unified session notes
  async createProgressNote(data: {
    clientId: string;
    therapistId: string;
    title: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    tonalAnalysis: string;
    keyPoints: string[];
    significantQuotes: string[];
    narrativeSummary: string;
    sessionDate: Date;
    appointmentId?: string;
  }): Promise<any> {
    try {
      // Create unified narrative from all sections
      const unifiedNarrative = this.createUnifiedNarrative({
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        tonalAnalysis: data.tonalAnalysis,
        narrativeSummary: data.narrativeSummary
      });

      // Generate AI tags for the unified narrative
      const aiTags = await this.generateAITags(unifiedNarrative);

      // Create unified session note with all SOAP fields (replaces separate progress note)
      const [sessionNote] = await db
        .insert(sessionNotes)
        .values({
          clientId: data.clientId,
          therapistId: data.therapistId,
          appointmentId: data.appointmentId || null,
          content: unifiedNarrative,
          aiSummary: `Clinical progress note: ${data.title}`,
          tags: aiTags,
          // SOAP note fields (formerly in progress notes table)
          title: data.title,
          subjective: data.subjective,
          objective: data.objective,
          assessment: data.assessment,
          plan: data.plan,
          tonalAnalysis: data.tonalAnalysis,
          keyPoints: data.keyPoints,
          significantQuotes: data.significantQuotes,
          narrativeSummary: data.narrativeSummary,
          sessionDate: data.sessionDate,
          aiTags: aiTags
        })
        .returning();

      console.log('✅ Unified session note created with SOAP structure');
      console.log(`📊 Generated ${aiTags.length} AI tags: ${aiTags.join(', ')}`);

      return {
        id: sessionNote.id,
        clientId: sessionNote.clientId,
        therapistId: sessionNote.therapistId,
        title: sessionNote.title,
        subjective: sessionNote.subjective,
        objective: sessionNote.objective,
        assessment: sessionNote.assessment,
        plan: sessionNote.plan,
        tonalAnalysis: sessionNote.tonalAnalysis,
        keyPoints: sessionNote.keyPoints,
        significantQuotes: sessionNote.significantQuotes,
        narrativeSummary: sessionNote.narrativeSummary,
        sessionDate: sessionNote.sessionDate,
        appointmentId: sessionNote.appointmentId,
        createdAt: sessionNote.createdAt,
        updatedAt: sessionNote.updatedAt,
        unifiedNoteCreated: true,
        aiTags
      };

    } catch (error) {
      console.error('Error creating unified session note:', error);
      throw error;
    }
  }

  // Merged functionality: Use getSessionNotes with therapist filter instead

  // Compass AI conversation and memory methods implementation
  async createCompassConversation(conversation: InsertCompassConversation): Promise<CompassConversation> {
    try {
      const [newConversation] = await db
        .insert(compassConversations)
        .values(conversation)
        .returning();
      return newConversation;
    } catch (error) {
      console.error('Error creating compass conversation:', error);
      throw error;
    }
  }

  async getCompassConversations(therapistId: string, sessionId?: string, limit: number = 50): Promise<CompassConversation[]> {
    try {
      const whereConditions = [eq(compassConversations.therapistId, therapistId)];
      
      if (sessionId) {
        whereConditions.push(eq(compassConversations.sessionId, sessionId));
      }

      const conversations = await db
        .select()
        .from(compassConversations)
        .where(and(...whereConditions))
        .orderBy(desc(compassConversations.createdAt))
        .limit(limit);

      return conversations;
    } catch (error) {
      console.error('Error fetching compass conversations:', error);
      return [];
    }
  }

  async getCompassConversationHistory(therapistId: string, limit: number = 100): Promise<CompassConversation[]> {
    try {
      const conversations = await db
        .select()
        .from(compassConversations)
        .where(eq(compassConversations.therapistId, therapistId))
        .orderBy(desc(compassConversations.createdAt))
        .limit(limit);

      return conversations;
    } catch (error) {
      console.error('Error fetching compass conversation history:', error);
      return [];
    }
  }

  async setCompassMemory(memory: InsertCompassMemory): Promise<CompassMemory> {
    try {
      // Check if memory already exists for this context
      const [existing] = await db
        .select()
        .from(compassMemory)
        .where(
          and(
            eq(compassMemory.therapistId, memory.therapistId),
            eq(compassMemory.contextType, memory.contextType),
            eq(compassMemory.contextKey, memory.contextKey)
          )
        );

      if (existing) {
        // Update existing memory
        const [updated] = await db
          .update(compassMemory)
          .set({
            contextValue: memory.contextValue,
            confidence: memory.confidence || existing.confidence,
            lastAccessed: new Date(),
            accessCount: (existing.accessCount || 0) + 1,
            updatedAt: new Date()
          })
          .where(eq(compassMemory.id, existing.id))
          .returning();
        return updated;
      } else {
        // Create new memory
        const [newMemory] = await db
          .insert(compassMemory)
          .values(memory)
          .returning();
        return newMemory;
      }
    } catch (error) {
      console.error('Error setting compass memory:', error);
      throw error;
    }
  }

  async getCompassMemory(therapistId: string, contextType: string, contextKey?: string): Promise<CompassMemory[]> {
    try {
      const whereConditions = [
        eq(compassMemory.therapistId, therapistId),
        eq(compassMemory.contextType, contextType),
        eq(compassMemory.isActive, true)
      ];

      if (contextKey) {
        whereConditions.push(eq(compassMemory.contextKey, contextKey));
      }

      const memories = await db
        .select()
        .from(compassMemory)
        .where(and(...whereConditions))
        .orderBy(desc(compassMemory.lastAccessed));

      return memories;
    } catch (error) {
      console.error('Error fetching compass memory:', error);
      return [];
    }
  }

  async updateCompassMemoryAccess(id: string): Promise<CompassMemory> {
    try {
      const [updated] = await db
        .update(compassMemory)
        .set({
          lastAccessed: new Date(),
          accessCount: sql`${compassMemory.accessCount} + 1`
        })
        .where(eq(compassMemory.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating compass memory access:', error);
      throw error;
    }
  }

  async getCompassLearningContext(therapistId: string): Promise<{
    preferences: any;
    patterns: any;
    frequentQueries: any;
  }> {
    try {
      const [preferences, patterns, queries] = await Promise.all([
        this.getCompassMemory(therapistId, 'user_preference'),
        this.getCompassMemory(therapistId, 'workflow_pattern'),
        this.getCompassMemory(therapistId, 'frequent_query')
      ]);

      return {
        preferences: preferences.reduce((acc, p) => ({
          ...acc,
          [p.contextKey]: p.contextValue
        }), {}),
        patterns: patterns.reduce((acc, p) => ({
          ...acc,
          [p.contextKey]: p.contextValue
        }), {}),
        frequentQueries: queries.reduce((acc, q) => ({
          ...acc,
          [q.contextKey]: q.contextValue
        }), {})
      };
    } catch (error) {
      console.error('Error fetching compass learning context:', error);
      return {
        preferences: {},
        patterns: {},
        frequentQueries: {}
      };
    }
  }

  // Session Summaries Implementation
  async getSessionSummaries(clientId: string): Promise<SessionSummary[]> {
    return await db
      .select()
      .from(sessionSummaries)
      .where(eq(sessionSummaries.clientId, clientId))
      .orderBy(desc(sessionSummaries.createdAt));
  }

  async getSessionSummariesByTherapist(therapistId: string): Promise<SessionSummary[]> {
    return await db
      .select()
      .from(sessionSummaries)
      .where(eq(sessionSummaries.therapistId, therapistId))
      .orderBy(desc(sessionSummaries.createdAt));
  }

  async getSessionSummary(id: string): Promise<SessionSummary | undefined> {
    const [summary] = await db.select().from(sessionSummaries).where(eq(sessionSummaries.id, id));
    return summary || undefined;
  }

  async createSessionSummary(summary: InsertSessionSummary): Promise<SessionSummary> {
    const [newSummary] = await db
      .insert(sessionSummaries)
      .values(summary)
      .returning();
    return newSummary;
  }

  async updateSessionSummary(id: string, summary: Partial<SessionSummary>): Promise<SessionSummary> {
    const [updatedSummary] = await db
      .update(sessionSummaries)
      .set({ ...summary, updatedAt: new Date() })
      .where(eq(sessionSummaries.id, id))
      .returning();
    return updatedSummary;
  }

  async generateAISessionSummary(
    sessionNoteIds: string[], 
    clientId: string, 
    therapistId: string, 
    timeframe: string
  ): Promise<SessionSummary> {
    try {
      // Fetch session notes data
      const sessionNotes = await Promise.all(
        sessionNoteIds.map(id => this.getSessionNote(id))
      );
      
      // Get client information
      const client = await this.getClient(clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      // Filter out any null session notes
      const validSessionNotes = sessionNotes.filter(note => note != null);
      
      if (validSessionNotes.length === 0) {
        throw new Error('No valid session notes found');
      }

      // Prepare context for AI analysis
      const sessionContext = validSessionNotes.map(note => ({
        date: note.sessionDate,
        content: note.content,
        tags: note.tags || [],
        insights: (note as any).insights || {}
      }));

      const dateRange = {
        startDate: new Date(Math.min(...sessionContext.map(s => s.date ? new Date(s.date).getTime() : Date.now()))),
        endDate: new Date(Math.max(...sessionContext.map(s => s.date ? new Date(s.date).getTime() : Date.now())))
      };

      // Generate AI summary using OpenAI
      const aiPrompt = `As an expert clinical therapist, analyze the following session notes for ${client.firstName} ${client.lastName} and generate a comprehensive clinical summary with visual data insights.

Client Context:
- Name: ${client.firstName} ${client.lastName}  
- Primary Concerns: ${client.primaryConcerns || 'Not specified'}
- Risk Level: ${client.riskLevel || 'Low'}

Session Notes (${timeframe}):
${JSON.stringify(sessionContext, null, 2)}

Generate a comprehensive summary in the following JSON format:
{
  "keyInsights": [
    "Primary therapeutic insights and breakthroughs",
    "Behavioral patterns observed",
    "Progress indicators"
  ],
  "progressMetrics": {
    "therapyEngagement": 85,
    "goalProgress": 70,
    "symptomImprovement": 60,
    "functionalImprovement": 75
  },
  "moodTrends": {
    "averageMood": 6.5,
    "moodStability": "improving",
    "trendData": [
      {"session": 1, "mood": 5.0, "anxiety": 7.0, "energy": 4.0},
      {"session": 2, "mood": 6.0, "anxiety": 6.0, "energy": 5.0},
      {"session": 3, "mood": 7.0, "anxiety": 5.0, "energy": 6.0}
    ]
  },
  "goalProgress": [
    {
      "goal": "Reduce anxiety symptoms",
      "baseline": 8.0,
      "current": 5.5,
      "target": 3.0,
      "progressPercentage": 45
    }
  ],
  "interventionEffectiveness": {
    "mostEffective": ["CBT techniques", "Mindfulness exercises"],
    "leastEffective": ["Exposure therapy"],
    "effectivenessScores": {
      "CBT": 85,
      "Mindfulness": 78,
      "ExposureTherapy": 45
    }
  },
  "riskAssessment": {
    "currentRiskLevel": "low",
    "riskFactors": [],
    "protectiveFactors": ["Strong support system", "Medication compliance"]
  },
  "recommendedActions": [
    "Continue current CBT approach",
    "Increase mindfulness practice frequency",
    "Schedule medication review"
  ],
  "visualData": {
    "chartConfigurations": [
      {
        "type": "line",
        "title": "Mood Progression",
        "data": "moodTrends.trendData",
        "xAxis": "session",
        "yAxis": "mood"
      },
      {
        "type": "bar",
        "title": "Goal Progress",
        "data": "goalProgress",
        "xAxis": "goal",
        "yAxis": "progressPercentage"
      }
    ]
  },
  "clinicalNarrative": "Comprehensive clinical narrative summarizing the therapeutic journey, key themes, and overall progress assessment."
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert clinical therapist specializing in data analysis and progress tracking. Generate comprehensive session summaries with actionable insights."
          },
          {
            role: "user",
            content: aiPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 3000
      });

      const aiAnalysis = JSON.parse(response.choices[0].message.content || '{}');

      // Create session summary record
      const summaryData: InsertSessionSummary = {
        clientId,
        therapistId,
        sessionNoteIds,
        title: `${timeframe} Session Summary - ${client.firstName} ${client.lastName}`,
        timeframe,
        summaryType: 'comprehensive',
        keyInsights: aiAnalysis.keyInsights || [],
        progressMetrics: aiAnalysis.progressMetrics || {},
        moodTrends: aiAnalysis.moodTrends || null,
        goalProgress: aiAnalysis.goalProgress || null,
        interventionEffectiveness: aiAnalysis.interventionEffectiveness || null,
        riskAssessment: aiAnalysis.riskAssessment || null,
        recommendedActions: aiAnalysis.recommendedActions || null,
        visualData: aiAnalysis.visualData || {},
        aiGeneratedContent: aiAnalysis.clinicalNarrative || '',
        confidence: 0.85,
        dateRange: { startDate, endDate },
        sessionCount: validSessionNotes.length,
        avgSessionRating: null,
        aiModel: 'gpt-4o',
        status: 'generated'
      };

      return await this.createSessionSummary(summaryData);
    } catch (error) {
      console.error('Error generating AI session summary:', error);
      throw error;
    }
  }

  // Assessment Management System Implementation

  // Assessment Catalog methods
  async getAssessmentCatalog(): Promise<AssessmentCatalog[]> {
    return await db.select().from(assessmentCatalog).where(eq(assessmentCatalog.isActive, true));
  }

  async getAssessmentCatalogByCategory(category: string): Promise<AssessmentCatalog[]> {
    return await db.select().from(assessmentCatalog)
      .where(and(eq(assessmentCatalog.category, category), eq(assessmentCatalog.isActive, true)));
  }

  async getAssessmentCatalogItem(id: string): Promise<AssessmentCatalog | undefined> {
    const [item] = await db.select().from(assessmentCatalog).where(eq(assessmentCatalog.id, id));
    return item || undefined;
  }

  async createAssessmentCatalogItem(item: InsertAssessmentCatalog): Promise<AssessmentCatalog> {
    const [newItem] = await db.insert(assessmentCatalog).values(item).returning();
    return newItem;
  }

  async updateAssessmentCatalogItem(id: string, item: Partial<AssessmentCatalog>): Promise<AssessmentCatalog> {
    const [updatedItem] = await db
      .update(assessmentCatalog)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(assessmentCatalog.id, id))
      .returning();
    return updatedItem;
  }

  async deactivateAssessmentCatalogItem(id: string): Promise<AssessmentCatalog> {
    return await this.updateAssessmentCatalogItem(id, { isActive: false });
  }

  // Client Assessment methods
  async getClientAssessments(clientId: string): Promise<ClientAssessment[]> {
    return await db.select().from(clientAssessments)
      .where(eq(clientAssessments.clientId, clientId))
      .orderBy(desc(clientAssessments.assignedDate));
  }

  async getTherapistAssignedAssessments(therapistId: string, status?: string): Promise<ClientAssessment[]> {
    const conditions = [eq(clientAssessments.therapistId, therapistId)];
    if (status) {
      conditions.push(eq(clientAssessments.status, status));
    }
    return await db.select().from(clientAssessments)
      .where(and(...conditions))
      .orderBy(desc(clientAssessments.assignedDate));
  }

  async getClientAssessment(id: string): Promise<ClientAssessment | undefined> {
    const [assessment] = await db.select().from(clientAssessments).where(eq(clientAssessments.id, id));
    return assessment || undefined;
  }

  async assignAssessmentToClient(assignment: InsertClientAssessment): Promise<ClientAssessment> {
    const [newAssignment] = await db.insert(clientAssessments).values(assignment).returning();

    // Create audit log
    await this.createAssessmentAuditLog({
      userId: assignment.therapistId,
      clientId: assignment.clientId,
      clientAssessmentId: newAssignment.id,
      action: 'assign',
      entityType: 'client_assessment',
      entityId: newAssignment.id,
      details: { assessmentCatalogId: assignment.assessmentCatalogId }
    });

    return newAssignment;
  }

  async updateClientAssessment(id: string, update: Partial<ClientAssessment>): Promise<ClientAssessment> {
    const [updatedAssessment] = await db
      .update(clientAssessments)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(clientAssessments.id, id))
      .returning();
    return updatedAssessment;
  }

  async startClientAssessment(id: string): Promise<ClientAssessment> {
    return await this.updateClientAssessment(id, {
      status: 'in_progress',
      startedDate: new Date()
    });
  }

  async completeClientAssessment(id: string, completedDate: Date): Promise<ClientAssessment> {
    return await this.updateClientAssessment(id, {
      status: 'completed',
      completedDate,
      progressPercentage: 100
    });
  }

  async sendAssessmentReminder(id: string): Promise<ClientAssessment> {
    const assessment = await this.getClientAssessment(id);
    if (!assessment) throw new Error('Assessment not found');

    return await this.updateClientAssessment(id, {
      remindersSent: (assessment.remindersSent || 0) + 1,
      lastReminderSent: new Date()
    });
  }

  // Assessment Response methods
  async getAssessmentResponses(clientAssessmentId: string): Promise<AssessmentResponse[]> {
    return await db.select().from(assessmentResponses)
      .where(eq(assessmentResponses.clientAssessmentId, clientAssessmentId))
      .orderBy(desc(assessmentResponses.createdAt));
  }

  async getAssessmentResponse(id: string): Promise<AssessmentResponse | undefined> {
    const [response] = await db.select().from(assessmentResponses).where(eq(assessmentResponses.id, id));
    return response || undefined;
  }

  async createAssessmentResponse(response: InsertAssessmentResponse): Promise<AssessmentResponse> {
    const [newResponse] = await db.insert(assessmentResponses).values(response).returning();

    // Create audit log
    await this.createAssessmentAuditLog({
      clientAssessmentId: response.clientAssessmentId,
      action: 'submit_response',
      entityType: 'assessment_response',
      entityId: newResponse.id,
      details: { isPartialSubmission: response.isPartialSubmission }
    });

    return newResponse;
  }

  async updateAssessmentResponse(id: string, response: Partial<AssessmentResponse>): Promise<AssessmentResponse> {
    const [updatedResponse] = await db
      .update(assessmentResponses)
      .set({ ...response, updatedAt: new Date() })
      .where(eq(assessmentResponses.id, id))
      .returning();
    return updatedResponse;
  }

  // Assessment Score methods
  async getAssessmentScores(clientAssessmentId: string): Promise<AssessmentScore[]> {
    return await db.select().from(assessmentScores)
      .where(eq(assessmentScores.clientAssessmentId, clientAssessmentId))
      .orderBy(desc(assessmentScores.calculatedAt));
  }

  async getAssessmentScore(id: string): Promise<AssessmentScore | undefined> {
    const [score] = await db.select().from(assessmentScores).where(eq(assessmentScores.id, id));
    return score || undefined;
  }

  async createAssessmentScore(score: InsertAssessmentScore): Promise<AssessmentScore> {
    const [newScore] = await db.insert(assessmentScores).values(score).returning();

    // Create audit log
    await this.createAssessmentAuditLog({
      clientAssessmentId: score.clientAssessmentId,
      action: 'calculate_score',
      entityType: 'assessment_score',
      entityId: newScore.id,
      details: { scoreType: score.scoreType, scoreValue: score.scoreValue }
    });

    return newScore;
  }

  async updateAssessmentScore(id: string, score: Partial<AssessmentScore>): Promise<AssessmentScore> {
    const [updatedScore] = await db
      .update(assessmentScores)
      .set(score)
      .where(eq(assessmentScores.id, id))
      .returning();
    return updatedScore;
  }

  async validateAssessmentScore(id: string, validatedBy: string): Promise<AssessmentScore> {
    return await this.updateAssessmentScore(id, {
      validatedBy,
      validatedAt: new Date()
    });
  }

  // Assessment Package methods
  async getAssessmentPackages(): Promise<AssessmentPackage[]> {
    return await db.select().from(assessmentPackages).where(eq(assessmentPackages.isActive, true));
  }

  async getAssessmentPackage(id: string): Promise<AssessmentPackage | undefined> {
    const [pkg] = await db.select().from(assessmentPackages).where(eq(assessmentPackages.id, id));
    return pkg || undefined;
  }

  async createAssessmentPackage(pkg: InsertAssessmentPackage): Promise<AssessmentPackage> {
    const [newPackage] = await db.insert(assessmentPackages).values(pkg).returning();
    return newPackage;
  }

  async updateAssessmentPackage(id: string, pkg: Partial<AssessmentPackage>): Promise<AssessmentPackage> {
    const [updatedPackage] = await db
      .update(assessmentPackages)
      .set({ ...pkg, updatedAt: new Date() })
      .where(eq(assessmentPackages.id, id))
      .returning();
    return updatedPackage;
  }

  async deactivateAssessmentPackage(id: string): Promise<AssessmentPackage> {
    return await this.updateAssessmentPackage(id, { isActive: false });
  }

  // Assessment Audit methods
  async createAssessmentAuditLog(log: InsertAssessmentAuditLog): Promise<AssessmentAuditLog> {
    const [newLog] = await db.insert(assessmentAuditLog).values(log).returning();
    return newLog;
  }

  async getAssessmentAuditLogs(entityType: string, entityId: string): Promise<AssessmentAuditLog[]> {
    return await db.select().from(assessmentAuditLog)
      .where(and(eq(assessmentAuditLog.entityType, entityType), eq(assessmentAuditLog.entityId, entityId)))
      .orderBy(desc(assessmentAuditLog.timestamp));
  }

  async getClientAssessmentAuditLogs(clientAssessmentId: string): Promise<AssessmentAuditLog[]> {
    return await db.select().from(assessmentAuditLog)
      .where(eq(assessmentAuditLog.clientAssessmentId, clientAssessmentId))
      .orderBy(desc(assessmentAuditLog.timestamp));
  }

  // Recent Activity methods for dashboard
  async getRecentSessionNotes(therapistId: string, days: number): Promise<SessionNote[]> {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    return await db
      .select()
      .from(sessionNotes)
      .where(
        and(
          eq(sessionNotes.therapistId, therapistId),
          gte(sessionNotes.createdAt, daysAgo)
        )
      )
      .orderBy(desc(sessionNotes.createdAt))
      .limit(10);
  }

  async getRecentAppointments(therapistId: string, days: number): Promise<Appointment[]> {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    return await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.therapistId, therapistId),
          or(
            gte(appointments.createdAt, daysAgo),
            gte(appointments.startTime, daysAgo)
          )
        )
      )
      .orderBy(desc(appointments.createdAt))
      .limit(10);
  }

  async getRecentClients(therapistId: string, days: number): Promise<Client[]> {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    return await db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.therapistId, therapistId),
          gte(clients.createdAt, daysAgo)
        )
      )
      .orderBy(desc(clients.createdAt))
      .limit(5);
  }

  async getRecentCompletedActionItems(therapistId: string, days: number): Promise<ActionItem[]> {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    return await db
      .select()
      .from(actionItems)
      .where(
        and(
          eq(actionItems.therapistId, therapistId),
          eq(actionItems.status, 'completed'),
          gte(actionItems.updatedAt, daysAgo)
        )
      )
      .orderBy(desc(actionItems.updatedAt))
      .limit(5);
  }

  async getCalendarSyncStats(): Promise<{
    lastSyncAt?: string;
    appointmentsCount?: number;
  }> {
    try {
      // Get the most recent appointment created/updated to estimate last sync
      const [recentAppointment] = await db
        .select({
          createdAt: appointments.createdAt,
          updatedAt: appointments.updatedAt
        })
        .from(appointments)
        .where(sql`${appointments.googleEventId} IS NOT NULL`)
        .orderBy(desc(appointments.updatedAt))
        .limit(1);

      if (!recentAppointment) {
        return {};
      }

      // Count appointments with Google Calendar integration
      const [countResult] = await db
        .select({ count: count() })
        .from(appointments)
        .where(sql`${appointments.googleEventId} IS NOT NULL`);

      return {
        lastSyncAt: recentAppointment.updatedAt.toISOString(),
        appointmentsCount: countResult.count
      };
    } catch (error) {
      console.log('Error getting calendar sync stats:', error);
      return {};
    }
  }



  // Session recommendation methods
  async getSessionRecommendations(clientId: string): Promise<SessionRecommendation[]> {
    return await db
      .select()
      .from(sessionRecommendations)
      .where(eq(sessionRecommendations.clientId, clientId))
      .orderBy(desc(sessionRecommendations.priority), desc(sessionRecommendations.createdAt));
  }

  async getTherapistSessionRecommendations(therapistId: string): Promise<SessionRecommendation[]> {
    return await db
      .select()
      .from(sessionRecommendations)
      .where(eq(sessionRecommendations.therapistId, therapistId))
      .orderBy(desc(sessionRecommendations.priority), desc(sessionRecommendations.createdAt));
  }

  async createSessionRecommendation(recommendation: InsertSessionRecommendation): Promise<SessionRecommendation> {
    const [result] = await db
      .insert(sessionRecommendations)
      .values(recommendation)
      .returning();
    return result;
  }

  async updateSessionRecommendation(id: string, recommendation: Partial<SessionRecommendation>): Promise<SessionRecommendation> {
    const [result] = await db
      .update(sessionRecommendations)
      .set({ ...recommendation, updatedAt: new Date() })
      .where(eq(sessionRecommendations.id, id))
      .returning();
    return result;
  }

  async markRecommendationAsImplemented(id: string, feedback?: string, effectiveness?: string): Promise<SessionRecommendation> {
    const [result] = await db
      .update(sessionRecommendations)
      .set({
        isImplemented: true,
        implementedAt: new Date(),
        feedback,
        effectiveness,
        status: 'implemented',
        updatedAt: new Date()
      })
      .where(eq(sessionRecommendations.id, id))
      .returning();
    return result;
  }

  async generateSessionRecommendations(clientId: string, therapistId: string): Promise<SessionRecommendation[]> {
    try {
      // Gather client context data
      const [client, recentSessionNotes, recentAppointments, activeTreatmentPlan, activeActionItems] = await Promise.all([
        this.getClient(clientId),
        this.getSessionNotes(clientId),
        this.getAppointmentsByClient(clientId),
        this.getActiveTreatmentPlan(clientId),
        this.getActionItems(clientId)
      ]);

      if (!client) {
        throw new Error('Client not found');
      }

      // Prepare context for AI analysis
      const context = {
        client: {
          name: `${client.firstName} ${client.lastName}`,
          primaryConcerns: client.primaryConcerns,
          riskLevel: client.riskLevel,
          medications: client.medications
        },
        recentSessions: recentSessionNotes.slice(0, 5).map(note => ({
          date: note.createdAt,
          content: note.content,
          tags: note.tags
        })),
        treatmentPlan: activeTreatmentPlan ? {
          goals: activeTreatmentPlan.goals,
          interventions: activeTreatmentPlan.interventions,
          targetSymptoms: activeTreatmentPlan.targetSymptoms
        } : null,
        activeActionItems: activeActionItems.filter(item => item.status === 'pending').map(item => ({
          title: item.title,
          priority: item.priority,
          dueDate: item.dueDate
        }))
      };

      // Generate AI recommendations using OpenAI
      const aiPrompt = `As an expert clinical therapist, analyze the following client data and generate 3-5 specific, actionable session recommendations. Focus on evidence-based interventions and therapeutic techniques.

Client Context:
${JSON.stringify(context, null, 2)}

Generate recommendations in the following JSON format:
{
  "recommendations": [
    {
      "recommendationType": "intervention|topic|technique|assessment|homework",
      "title": "Brief descriptive title",
      "description": "Detailed description of the recommendation",
      "rationale": "Clinical reasoning and evidence base",
      "priority": "low|medium|high|urgent",
      "confidence": 0.85,
      "evidenceBase": ["supporting evidence from session notes"],
      "suggestedApproaches": ["specific techniques or interventions"],
      "expectedOutcomes": ["anticipated therapeutic outcomes"],
      "implementationNotes": "Practical guidance for implementation"
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert clinical therapist with extensive experience in evidence-based practice. Provide specific, actionable recommendations for therapy sessions."
          },
          {
            role: "user",
            content: aiPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2000
      });

      const aiResult = JSON.parse(response.choices[0].message.content || '{"recommendations": []}');
      const createdRecommendations: SessionRecommendation[] = [];

      // Create recommendation records in database
      for (const rec of aiResult.recommendations) {
        const recommendation: InsertSessionRecommendation = {
          clientId,
          therapistId,
          recommendationType: rec.recommendationType,
          title: rec.title,
          description: rec.description,
          rationale: rec.rationale,
          priority: rec.priority,
          confidence: rec.confidence.toString(),
          evidenceBase: rec.evidenceBase,
          suggestedApproaches: rec.suggestedApproaches,
          expectedOutcomes: rec.expectedOutcomes,
          implementationNotes: rec.implementationNotes,
          aiModel: 'gpt-4o',
          generationContext: context,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Valid for 30 days
        };

        const created = await this.createSessionRecommendation(recommendation);
        createdRecommendations.push(created);
      }

      return createdRecommendations;
    } catch (error) {
      console.error('Error generating session recommendations:', error);
      throw error;
    }
  }

  // Calendar Events methods
  async getCalendarEvents(therapistId: string, startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    let query = db.select().from(calendarEvents).where(eq(calendarEvents.therapistId, therapistId));
    
    if (startDate && endDate) {
      query = query.where(
        and(
          gte(calendarEvents.startTime, startDate),
          lte(calendarEvents.startTime, endDate)
        )
      );
    }
    
    return await query.orderBy(asc(calendarEvents.startTime));
  }

  async getCalendarEvent(id: string): Promise<CalendarEvent | undefined> {
    const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    return event || undefined;
  }

  async getCalendarEventByGoogleId(googleEventId: string): Promise<CalendarEvent | undefined> {
    const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.googleEventId, googleEventId));
    return event || undefined;
  }

  async upsertCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    // Try to find existing event by Google Event ID
    const existingEvent = await this.getCalendarEventByGoogleId(event.googleEventId);
    
    if (existingEvent) {
      // Update existing event
      const [updatedEvent] = await db
        .update(calendarEvents)
        .set({ 
          ...event,
          lastSyncTime: new Date(),
          updatedAt: new Date()
        })
        .where(eq(calendarEvents.id, existingEvent.id))
        .returning();
      return updatedEvent;
    } else {
      // Create new event
      const [newEvent] = await db
        .insert(calendarEvents)
        .values(event)
        .returning();
      return newEvent;
    }
  }

  async deleteCalendarEvent(id: string): Promise<void> {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  }

  async syncCalendarEvents(events: InsertCalendarEvent[]): Promise<number> {
    let syncedCount = 0;
    
    for (const event of events) {
      try {
        await this.upsertCalendarEvent(event);
        syncedCount++;
      } catch (error) {
        console.error('Error syncing calendar event:', error);
      }
    }
    
    return syncedCount;
  }
}

export const storage = new DatabaseStorage();