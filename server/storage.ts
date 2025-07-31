import { 
  users, clients, appointments, sessionNotes, actionItems, treatmentPlans, aiInsights,
  type User, type InsertUser, type Client, type InsertClient, type Appointment, type InsertAppointment,
  type SessionNote, type InsertSessionNote, type ActionItem, type InsertActionItem,
  type TreatmentPlan, type InsertTreatmentPlan, type AiInsight, type InsertAiInsight
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, count } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Client methods
  getClients(therapistId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<Client>): Promise<Client>;

  // Appointment methods
  getAppointments(therapistId: string, date?: Date): Promise<Appointment[]>;
  getTodaysAppointments(therapistId: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<Appointment>): Promise<Appointment>;

  // Session notes methods
  getSessionNotes(clientId: string): Promise<SessionNote[]>;
  createSessionNote(note: InsertSessionNote): Promise<SessionNote>;

  // Action items methods
  getActionItems(therapistId: string): Promise<ActionItem[]>;
  getUrgentActionItems(therapistId: string): Promise<ActionItem[]>;
  createActionItem(item: InsertActionItem): Promise<ActionItem>;
  updateActionItem(id: string, item: Partial<ActionItem>): Promise<ActionItem>;

  // Treatment plans methods
  getTreatmentPlans(clientId: string): Promise<TreatmentPlan[]>;
  createTreatmentPlan(plan: InsertTreatmentPlan): Promise<TreatmentPlan>;

  // AI insights methods
  getAiInsights(therapistId: string): Promise<AiInsight[]>;
  createAiInsight(insight: InsertAiInsight): Promise<AiInsight>;

  // Dashboard stats
  getDashboardStats(therapistId: string): Promise<{
    todaysSessions: number;
    activeClients: number;
    urgentActionItems: number;
    completionRate: number;
  }>;
}

export class DatabaseStorage implements IStorage {
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

  async getSessionNotes(clientId: string): Promise<SessionNote[]> {
    return await db
      .select()
      .from(sessionNotes)
      .where(eq(sessionNotes.clientId, clientId))
      .orderBy(desc(sessionNotes.createdAt));
  }

  async createSessionNote(note: InsertSessionNote): Promise<SessionNote> {
    const [newNote] = await db
      .insert(sessionNotes)
      .values(note)
      .returning();
    return newNote;
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

  async createTreatmentPlan(plan: InsertTreatmentPlan): Promise<TreatmentPlan> {
    const [newPlan] = await db
      .insert(treatmentPlans)
      .values(plan)
      .returning();
    return newPlan;
  }

  async getAiInsights(therapistId: string): Promise<AiInsight[]> {
    return await db
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.therapistId, therapistId))
      .orderBy(desc(aiInsights.createdAt))
      .limit(10);
  }

  async createAiInsight(insight: InsertAiInsight): Promise<AiInsight> {
    const [newInsight] = await db
      .insert(aiInsights)
      .values(insight)
      .returning();
    return newInsight;
  }

  async getDashboardStats(therapistId: string): Promise<{
    todaysSessions: number;
    activeClients: number;
    urgentActionItems: number;
    completionRate: number;
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
          lte(appointments.startTime, endOfDay)
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

    const completionRate = totalItems.count > 0 
      ? Math.round((completedItems.count / totalItems.count) * 100)
      : 0;

    return {
      todaysSessions: todaysSessions.count,
      activeClients: activeClients.count,
      urgentActionItems: urgentItems.count,
      completionRate,
    };
  }
}

export const storage = new DatabaseStorage();
