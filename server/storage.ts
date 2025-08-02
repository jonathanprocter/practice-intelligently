import { 
  users, clients, appointments, sessionNotes, sessionPrepNotes, clientCheckins, actionItems, treatmentPlans, aiInsights,
  billingRecords, assessments, progressNotes, medications, communicationLogs, documents, auditLogs,
  type User, type InsertUser, type Client, type InsertClient, type Appointment, type InsertAppointment,
  type SessionNote, type InsertSessionNote, type SessionPrepNote, type InsertSessionPrepNote, 
  type ClientCheckin, type InsertClientCheckin, type ActionItem, type InsertActionItem,
  type TreatmentPlan, type InsertTreatmentPlan, type AiInsight, type InsertAiInsight,
  type BillingRecord, type InsertBillingRecord, type Assessment, type InsertAssessment,
  type ProgressNote, type InsertProgressNote, type Medication, type InsertMedication,
  type CommunicationLog, type InsertCommunicationLog, type Document, type InsertDocument,
  type AuditLog, type InsertAuditLog
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, and, gte, lte, count, like, or, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

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
  deactivateClient(id: string): Promise<Client>;

  // Appointment methods
  getAppointments(therapistId: string, date?: Date): Promise<Appointment[]>;
  getTodaysAppointments(therapistId: string): Promise<Appointment[]>;
  getUpcomingAppointments(therapistId: string, days?: number): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<Appointment>): Promise<Appointment>;
  cancelAppointment(id: string, reason: string): Promise<Appointment>;

  // Session notes methods
  getSessionNotes(clientId: string): Promise<SessionNote[]>;
  getSessionNote(id: string): Promise<SessionNote | undefined>;
  getSessionNotesByEventId(eventId: string): Promise<SessionNote[]>;
  createSessionNote(note: InsertSessionNote): Promise<SessionNote>;
  updateSessionNote(id: string, note: Partial<SessionNote>): Promise<SessionNote>;

  // Session prep notes methods
  getSessionPrepNotes(eventId: string): Promise<SessionPrepNote[]>;
  getSessionPrepNote(id: string): Promise<SessionPrepNote | undefined>;
  getSessionPrepNoteByEventId(eventId: string): Promise<SessionPrepNote | undefined>;
  createSessionPrepNote(note: InsertSessionPrepNote): Promise<SessionPrepNote>;
  updateSessionPrepNote(id: string, note: Partial<SessionPrepNote>): Promise<SessionPrepNote>;
  generateAIInsightsForSession(eventId: string, clientId: string): Promise<string>;

  // Client check-ins methods
  getClientCheckins(therapistId: string, status?: string): Promise<ClientCheckin[]>;
  getClientCheckinsByClient(clientId: string): Promise<ClientCheckin[]>;
  getClientCheckin(id: string): Promise<ClientCheckin | undefined>;
  createClientCheckin(checkin: InsertClientCheckin): Promise<ClientCheckin>;
  updateClientCheckin(id: string, checkin: Partial<ClientCheckin>): Promise<ClientCheckin>;
  generateAICheckins(therapistId: string): Promise<ClientCheckin[]>;
  sendCheckin(id: string, method: 'email' | 'sms'): Promise<boolean>;
  cleanupExpiredCheckins(): Promise<number>;

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

  // Progress notes methods
  getProgressNotes(clientId: string): Promise<ProgressNote[]>;
  getRecentProgressNotes(therapistId: string, limit?: number): Promise<ProgressNote[]>;
  createProgressNote(note: InsertProgressNote): Promise<ProgressNote>;
  updateProgressNote(id: string, note: Partial<ProgressNote>): Promise<ProgressNote>;

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

  async updateClient(id: string, client: Partial<Client>): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async deactivateClient(id: string): Promise<Client> {
    return await this.updateClient(id, { status: 'inactive' });
  }

  async getAppointments(therapistId: string, date?: Date): Promise<Appointment[]> {
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      return await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.therapistId, therapistId),
            gte(appointments.startTime, startOfDay),
            lte(appointments.startTime, endOfDay)
          )
        )
        .orderBy(appointments.startTime);
    }

    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.therapistId, therapistId))
      .orderBy(appointments.startTime);
  }

  async getTodaysAppointments(therapistId: string): Promise<Appointment[]> {
    const today = new Date();
    return await this.getAppointments(therapistId, today);
  }

  async getUpcomingAppointments(therapistId: string, days: number = 7): Promise<Appointment[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

    return await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.therapistId, therapistId),
          gte(appointments.startTime, now),
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
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

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
    // Ensure dates are properly converted
    const updateData = { ...note, updatedAt: new Date() };
    if (updateData.createdAt && typeof updateData.createdAt === 'string') {
      updateData.createdAt = new Date(updateData.createdAt);
    }
    
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

  async getSessionNoteById(id: string): Promise<SessionNote | null> {
    const [note] = await db
      .select()
      .from(sessionNotes)
      .where(eq(sessionNotes.id, id))
      .limit(1);
    return note || null;
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

  async getClientIdByName(clientName: string): Promise<string | null> {
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(
        sql`LOWER(${clients.firstName} || ' ' || ${clients.lastName}) = LOWER(${clientName})`
      )
      .limit(1);
    return client?.id || null;
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
  async getProgressNotes(clientId: string): Promise<ProgressNote[]> {
    return await db
      .select()
      .from(progressNotes)
      .where(eq(progressNotes.clientId, clientId))
      .orderBy(desc(progressNotes.createdAt));
  }

  async getRecentProgressNotes(therapistId: string, limit: number = 10): Promise<ProgressNote[]> {
    return await db
      .select()
      .from(progressNotes)
      .where(eq(progressNotes.therapistId, therapistId))
      .orderBy(desc(progressNotes.createdAt))
      .limit(limit);
  }

  async createProgressNote(note: InsertProgressNote): Promise<ProgressNote> {
    const [newNote] = await db
      .insert(progressNotes)
      .values(note)
      .returning();
    return newNote;
  }

  async updateProgressNote(id: string, note: Partial<ProgressNote>): Promise<ProgressNote> {
    const [updatedNote] = await db
      .update(progressNotes)
      .set({ ...note, updatedAt: new Date() })
      .where(eq(progressNotes.id, id))
      .returning();
    return updatedNote;
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
    const appointments: any[] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.therapistId, therapistId));

    const totalSessions = appointments.filter(apt => apt.status === 'completed').length;
    const noShows = appointments.filter(apt => apt.status === 'no_show').length;
    const cancelled = appointments.filter(apt => apt.status === 'cancelled').length;

    const allClients = await this.getClients(therapistId);
    const activeClients = allClients.filter(client => client.status === 'active').length;

    const averageSessionsPerClient = activeClients > 0 ? totalSessions / activeClients : 0;
    const noShowRate = appointments.length > 0 ? (noShows / appointments.length) * 100 : 0;
    const cancellationRate = appointments.length > 0 ? (cancelled / appointments.length) * 100 : 0;

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
        updatedAt: new Date(row.updated_at)
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
        updatedAt: new Date(row.updated_at)
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
        updatedAt: new Date(row.updated_at)
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
        appointmentDate: new Date(row.start_time),
        status: row.status,
        type: row.type,
        duration: row.duration,
        notes: row.notes,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
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
        lastUpdatedBy: row.last_updated_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      console.error('Error in getSessionPrepNoteByEventId:', error);
      return undefined;
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
      // Get previous session notes for this client
      const previousNotes = await this.getSessionNotesByClientId(clientId);
      const progressNotes = await this.getProgressNotes(clientId);
      
      // Get current client information
      const client = await this.getClient(clientId);
      
      if (!client) {
        return this.getDefaultSessionPrepInsights();
      }

      // Use AI to generate comprehensive session prep
      const { generateClinicalAnalysis } = await import('./ai-services');
      
      const sessionContext = previousNotes.slice(0, 3).map(note => ({
        date: note.createdAt,
        content: note.content,
        duration: note.duration
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
            checkinType: analysis.checkinType,
            priority: analysis.priority,
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

  async getAppointmentsByClientId(clientId: string): Promise<Appointment[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM appointments WHERE client_id = $1 ORDER BY start_time DESC',
        [clientId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        appointmentDate: new Date(row.start_time),
        status: row.status,
        type: row.type,
        duration: row.duration,
        notes: row.notes,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error('Error in getAppointmentsByClientId:', error);
      return [];
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
  async generateAITags(unifiedNarrative: string): Promise<string[]> {
    try {
      // Use AI to generate tags for searchable clinical themes
      const { generateClinicalAnalysis } = await import('./ai-services');
      
      const prompt = `Analyze the following clinical session narrative and generate 5-8 searchable tags that capture the key clinical themes, modalities, and content areas. Focus on therapeutic modalities used, clinical presentations, intervention types, and major themes.

Clinical Narrative:
${unifiedNarrative}

Return only a JSON array of strings, like: ["CBT", "anxiety", "EMDR", "trauma processing", "behavioral activation"]`;

      const response = await generateClinicalAnalysis(prompt);
      
      try {
        const tags = JSON.parse(response);
        return Array.isArray(tags) ? tags : [];
      } catch (parseError) {
        console.warn('Could not parse AI tags, using fallback approach');
        return this.extractBasicTags(unifiedNarrative);
      }
    } catch (error) {
      console.warn('AI tag generation failed, using fallback approach');
      return this.extractBasicTags(unifiedNarrative);
    }
  }

  /**
   * Fallback method for basic tag extraction
   */
  private extractBasicTags(content: string): string[] {
    const commonTags = [
      'CBT', 'DBT', 'ACT', 'EMDR', 'anxiety', 'depression', 'trauma', 
      'mindfulness', 'behavioral activation', 'cognitive restructuring',
      'emotional regulation', 'coping skills', 'homework', 'progress'
    ];

    const extractedTags = commonTags.filter(tag => 
      content.toLowerCase().includes(tag.toLowerCase())
    );

    return extractedTags.slice(0, 8); // Limit to 8 tags
  }

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
      // Create the progress note
      const result = await pool.query(
        `INSERT INTO progress_notes 
         (client_id, therapist_id, title, subjective, objective, assessment, plan, 
          tonal_analysis, key_points, significant_quotes, narrative_summary, session_date, appointment_id, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()) 
         RETURNING *`,
        [
          data.clientId,
          data.therapistId,
          data.title,
          data.subjective,
          data.objective,
          data.assessment,
          data.plan,
          data.tonalAnalysis,
          JSON.stringify(data.keyPoints),
          JSON.stringify(data.significantQuotes),
          data.narrativeSummary,
          data.sessionDate,
          data.appointmentId || null
        ]
      );

      const progressNote = {
        id: result.rows[0].id,
        clientId: result.rows[0].client_id,
        therapistId: result.rows[0].therapist_id,
        title: result.rows[0].title,
        subjective: result.rows[0].subjective,
        objective: result.rows[0].objective,
        assessment: result.rows[0].assessment,
        plan: result.rows[0].plan,
        tonalAnalysis: result.rows[0].tonal_analysis,
        keyPoints: this.safeParseJSON(result.rows[0].key_points, []),
        significantQuotes: this.safeParseJSON(result.rows[0].significant_quotes, []),
        narrativeSummary: result.rows[0].narrative_summary,
        sessionDate: new Date(result.rows[0].session_date),
        appointmentId: result.rows[0].appointment_id,
        createdAt: new Date(result.rows[0].created_at),
        updatedAt: new Date(result.rows[0].updated_at)
      };

      // AUTOMATED WORKFLOW: Create unified narrative and session note
      try {
        console.log('🤖 Creating unified narrative from progress note sections...');
        
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

        // Create session note with unified narrative
        const sessionNoteResult = await pool.query(
          `INSERT INTO session_notes 
           (client_id, therapist_id, content, ai_summary, tags, appointment_id, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
           RETURNING *`,
          [
            data.clientId,
            data.therapistId,
            unifiedNarrative,
            `AI-generated unified narrative from progress note: ${data.title}`,
            JSON.stringify(aiTags),
            data.appointmentId || null
          ]
        );

        console.log('✅ Unified narrative created and saved to session notes');
        console.log(`📊 Generated ${aiTags.length} AI tags: ${aiTags.join(', ')}`);

        // Return progress note with session note reference
        return {
          ...progressNote,
          sessionNoteId: sessionNoteResult.rows[0].id,
          unifiedNarrativeCreated: true,
          aiTags
        };

      } catch (sessionError) {
        console.error('⚠️  Error creating unified narrative session note:', sessionError);
        // Progress note was created successfully, but session note creation failed
        return {
          ...progressNote,
          unifiedNarrativeCreated: false,
          sessionNoteError: sessionError.message
        };
      }

    } catch (error) {
      console.error('Error creating progress note:', error);
      throw error;
    }
  }

  async getProgressNotes(therapistId: string): Promise<ProgressNote[]> {
    try {
      const result = await pool.query(
        `SELECT pn.*, c.first_name, c.last_name 
         FROM progress_notes pn 
         LEFT JOIN clients c ON pn.client_id::text = c.id::text 
         WHERE pn.therapist_id::text = $1 
         ORDER BY pn.created_at DESC`,
        [therapistId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        title: row.title,
        subjective: row.subjective,
        objective: row.objective,
        assessment: row.assessment,
        plan: row.plan,
        tonalAnalysis: row.tonal_analysis,
        keyPoints: this.safeParseJSON(row.key_points, []),
        significantQuotes: this.safeParseJSON(row.significant_quotes, []),
        narrativeSummary: row.narrative_summary,
        sessionDate: new Date(row.session_date),
        clientName: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : 'Unknown Client',
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      }));
    } catch (error) {
      console.error('Error fetching progress notes:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();