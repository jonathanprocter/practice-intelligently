import { 
  users, clients, appointments, sessionNotes, sessionPrepNotes, actionItems, treatmentPlans, aiInsights,
  billingRecords, assessments, progressNotes, medications, communicationLogs, documents, auditLogs,
  type User, type InsertUser, type Client, type InsertClient, type Appointment, type InsertAppointment,
  type SessionNote, type InsertSessionNote, type SessionPrepNote, type InsertSessionPrepNote, type ActionItem, type InsertActionItem,
  type TreatmentPlan, type InsertTreatmentPlan, type AiInsight, type InsertAiInsight,
  type BillingRecord, type InsertBillingRecord, type Assessment, type InsertAssessment,
  type ProgressNote, type InsertProgressNote, type Medication, type InsertMedication,
  type CommunicationLog, type InsertCommunicationLog, type Document, type InsertDocument,
  type AuditLog, type InsertAuditLog
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, and, gte, lte, count, like, or } from "drizzle-orm";
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
    const [updatedNote] = await db
      .update(sessionNotes)
      .set({ ...note, updatedAt: new Date() })
      .where(eq(sessionNotes.id, id))
      .returning();
    return updatedNote;
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
    const appointments = await db
      .select()
      .from(appointments)
      .where(eq(appointments.therapistId, therapistId));

    const totalSessions = appointments.filter(apt => apt.status === 'completed').length;
    const noShows = appointments.filter(apt => apt.status === 'no_show').length;
    const cancelled = appointments.filter(apt => apt.status === 'cancelled').length;

    const allClients = await this.getClients(therapistsId);
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
      query = query.where(
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

  async generateAIInsightsForSession(eventId: string, clientId: string): Promise<string> {
    try {
      // Get previous session notes for this client
      const previousNotes = await this.getSessionNotesByClientId(clientId);
      const progressNotes = await this.getProgressNotes(clientId);
      
      // Get current client information
      const client = await this.getClient(clientId);
      
      // Generate AI insights using OpenAI
      const context = {
        clientInfo: client,
        previousSessions: previousNotes.slice(0, 5), // Last 5 sessions
        progressNotes: progressNotes.slice(0, 3), // Last 3 progress notes
        eventId
      };

      const prompt = `Based on the following client information and session history, provide clinical insights and recommendations for the upcoming therapy session:

Client Information: ${JSON.stringify(context.clientInfo)}
Recent Session Notes: ${JSON.stringify(context.previousSessions)}
Recent Progress Notes: ${JSON.stringify(context.progressNotes)}

Please provide:
1. Key focus areas for this session
2. Suggested therapeutic interventions
3. Any risk factors to monitor
4. Session objectives
5. Homework/action items to review from previous sessions

Respond in a professional, clinical tone suitable for a licensed therapist.`;

      // This would integrate with your AI service
      // For now, return a structured response
      return `AI-Generated Session Insights:

1. Key Focus Areas:
   - Continue building on progress from previous sessions
   - Address any emerging concerns or stressors
   - Maintain therapeutic rapport and safety

2. Suggested Interventions:
   - Cognitive Behavioral Therapy techniques
   - Mindfulness and grounding exercises
   - Skill building based on client needs

3. Risk Factors:
   - Monitor for any changes in mood or behavior
   - Assess coping strategies effectiveness
   - Check medication compliance if applicable

4. Session Objectives:
   - Assess current mental state and progress
   - Reinforce positive coping strategies
   - Plan next steps in treatment

5. Homework Review:
   - Review completion of previous assignments
   - Discuss any challenges or successes
   - Adjust future assignments as needed`;

    } catch (error) {
      console.error('Error generating AI insights:', error);
      return 'Unable to generate AI insights at this time. Please refer to previous session notes and treatment plan.';
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
  }): Promise<any> {
    try {
      const result = await pool.query(
        `INSERT INTO progress_notes 
         (client_id, therapist_id, title, subjective, objective, assessment, plan, 
          tonal_analysis, key_points, significant_quotes, narrative_summary, session_date, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()) 
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
          data.sessionDate
        ]
      );

      return {
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
        createdAt: new Date(result.rows[0].created_at),
        updatedAt: new Date(result.rows[0].updated_at)
      };
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