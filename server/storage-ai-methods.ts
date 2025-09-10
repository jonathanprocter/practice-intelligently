// Additional AI-related storage methods for enhanced automation
// This file extends the storage.ts with missing methods needed by ai-automation-enhanced.ts

import { db, pool } from "./db";
import { 
  clients, appointments, sessionNotes, treatmentPlans, aiInsights, 
  assessments, sessionSummaries, billingRecords
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql, or, isNull } from "drizzle-orm";

export class AIStorageMethods {
  // Get count of session notes for a client
  async getSessionNoteCount(clientId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(sessionNotes)
      .where(eq(sessionNotes.clientId, clientId));
    return result[0]?.count || 0;
  }

  // Get recent session notes for a client with limit
  async getRecentSessionNotes(clientId: string, limit: number): Promise<any[]> {
    return await db
      .select()
      .from(sessionNotes)
      .where(eq(sessionNotes.clientId, clientId))
      .orderBy(desc(sessionNotes.createdAt))
      .limit(limit);
  }

  // Get AI insights by client
  async getAiInsightsByClient(clientId: string): Promise<any[]> {
    return await db
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.clientId, clientId))
      .orderBy(desc(aiInsights.createdAt));
  }

  // Get session notes by appointment ID
  async getSessionNotesByAppointmentId(appointmentId: string): Promise<any[]> {
    return await db
      .select()
      .from(sessionNotes)
      .where(eq(sessionNotes.appointmentId, appointmentId));
  }

  // Get treatment plans by client
  async getTreatmentPlansByClient(clientId: string): Promise<any[]> {
    return await db
      .select()
      .from(treatmentPlans)
      .where(eq(treatmentPlans.clientId, clientId))
      .orderBy(desc(treatmentPlans.createdAt));
  }

  // Get assessments by client
  async getAssessmentsByClient(clientId: string): Promise<any[]> {
    return await db
      .select()
      .from(assessments)
      .where(eq(assessments.clientId, clientId))
      .orderBy(desc(assessments.createdAt));
  }

  // Get active treatment plan for client
  async getActiveTreatmentPlan(clientId: string): Promise<any> {
    const plans = await db
      .select()
      .from(treatmentPlans)
      .where(
        and(
          eq(treatmentPlans.clientId, clientId),
          eq(treatmentPlans.status, 'active')
        )
      )
      .orderBy(desc(treatmentPlans.createdAt))
      .limit(1);
    return plans[0];
  }

  // Get session summaries by client
  async getSessionSummariesByClient(clientId: string): Promise<any[]> {
    return await db
      .select()
      .from(sessionSummaries)
      .where(eq(sessionSummaries.clientId, clientId))
      .orderBy(desc(sessionSummaries.createdAt));
  }

  // Get active clients for a therapist
  async getActiveClients(therapistId: string): Promise<any[]> {
    return await db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.therapistId, therapistId),
          or(
            eq(clients.status, 'active'),
            isNull(clients.status)
          )
        )
      );
  }

  // Get appointments by date range
  async getAppointmentsByDateRange(therapistId: string, startDate: Date, endDate: Date): Promise<any[]> {
    return await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.therapistId, therapistId),
          gte(appointments.startTime, startDate),
          lte(appointments.startTime, endDate)
        )
      )
      .orderBy(appointments.startTime);
  }

  // Get session notes by date range
  async getSessionNotesByDateRange(therapistId: string, startDate: Date, endDate: Date): Promise<any[]> {
    return await db
      .select()
      .from(sessionNotes)
      .where(
        and(
          eq(sessionNotes.therapistId, therapistId),
          gte(sessionNotes.createdAt, startDate),
          lte(sessionNotes.createdAt, endDate)
        )
      )
      .orderBy(desc(sessionNotes.createdAt));
  }

  // Get new clients by date range
  async getNewClientsByDateRange(therapistId: string, startDate: Date, endDate: Date): Promise<any[]> {
    return await db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.therapistId, therapistId),
          gte(clients.createdAt, startDate),
          lte(clients.createdAt, endDate)
        )
      )
      .orderBy(desc(clients.createdAt));
  }

  // Get AI insights by date range
  async getAiInsightsByDateRange(therapistId: string, startDate: Date, endDate: Date): Promise<any[]> {
    return await db
      .select()
      .from(aiInsights)
      .where(
        and(
          eq(aiInsights.therapistId, therapistId),
          gte(aiInsights.createdAt, startDate),
          lte(aiInsights.createdAt, endDate)
        )
      )
      .orderBy(desc(aiInsights.createdAt));
  }

  // Get monthly revenue
  async getMonthlyRevenue(therapistId: string, month: number, year: number): Promise<any> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const records = await db
      .select()
      .from(billingRecords)
      .where(
        and(
          eq(billingRecords.therapistId, therapistId),
          gte(billingRecords.createdAt, startDate),
          lte(billingRecords.createdAt, endDate)
        )
      );

    const total = records.reduce((sum, record) => sum + (record.amount || 0), 0);
    const paid = records.filter(r => r.status === 'paid').reduce((sum, r) => sum + (r.amount || 0), 0);
    const outstanding = records.filter(r => r.status === 'pending').reduce((sum, r) => sum + (r.amount || 0), 0);

    return {
      total,
      paid,
      outstanding,
      averageRate: records.length > 0 ? total / records.length : 0,
      recordCount: records.length
    };
  }

  // Get client metrics
  async getClientMetrics(therapistId: string, month: number, year: number): Promise<any> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get all clients
    const allClients = await db
      .select()
      .from(clients)
      .where(eq(clients.therapistId, therapistId));

    // Get new clients this month
    const newClients = allClients.filter(c => 
      c.createdAt && c.createdAt >= startDate && c.createdAt <= endDate
    );

    // Get active clients
    const activeClients = allClients.filter(c => 
      c.status === 'active' || !c.status
    );

    // Get discharged clients this month
    const dischargedClients = allClients.filter(c => 
      c.status === 'inactive' && c.updatedAt && 
      c.updatedAt >= startDate && c.updatedAt <= endDate
    );

    // Calculate retention rate
    const previousMonthActiveCount = allClients.filter(c => {
      const created = c.createdAt ? new Date(c.createdAt) : new Date();
      return created < startDate && (c.status === 'active' || !c.status);
    }).length;

    const retentionRate = previousMonthActiveCount > 0 
      ? Math.round((activeClients.length / previousMonthActiveCount) * 100)
      : 100;

    // Get average sessions per client
    const appointmentCounts = await db
      .select({ 
        clientId: appointments.clientId,
        count: count()
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.therapistId, therapistId),
          gte(appointments.startTime, startDate),
          lte(appointments.startTime, endDate)
        )
      )
      .groupBy(appointments.clientId);

    const averageSessionsPerClient = appointmentCounts.length > 0
      ? appointmentCounts.reduce((sum, a) => sum + a.count, 0) / appointmentCounts.length
      : 0;

    return {
      activeClients: activeClients.length,
      newClients: newClients.length,
      dischargedClients: dischargedClients.length,
      retentionRate,
      averageSessionsPerClient: Math.round(averageSessionsPerClient * 10) / 10
    };
  }

  // Get treatment outcomes
  async getTreatmentOutcomes(therapistId: string, month: number, year: number): Promise<any> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get all session notes this month
    const monthlyNotes = await db
      .select()
      .from(sessionNotes)
      .where(
        and(
          eq(sessionNotes.therapistId, therapistId),
          gte(sessionNotes.createdAt, startDate),
          lte(sessionNotes.createdAt, endDate)
        )
      );

    // Get AI insights this month
    const monthlyInsights = await db
      .select()
      .from(aiInsights)
      .where(
        and(
          eq(aiInsights.therapistId, therapistId),
          gte(aiInsights.createdAt, startDate),
          lte(aiInsights.createdAt, endDate)
        )
      );

    // Analyze progress indicators
    let improving = 0;
    let stable = 0;
    let needingReview = 0;

    // Group insights by client
    const clientInsights = new Map<string, any[]>();
    monthlyInsights.forEach(insight => {
      if (insight.clientId) {
        if (!clientInsights.has(insight.clientId)) {
          clientInsights.set(insight.clientId, []);
        }
        clientInsights.get(insight.clientId)?.push(insight);
      }
    });

    // Analyze each client's progress
    clientInsights.forEach((insights, clientId) => {
      const progressInsights = insights.filter(i => 
        i.metadata?.progressIndicators?.length > 0 ||
        i.insightType === 'progress_report'
      );

      const riskInsights = insights.filter(i => 
        i.priority === 'high' || 
        i.metadata?.riskFactors?.length > 0
      );

      if (progressInsights.length > 0) {
        improving++;
      } else if (riskInsights.length > 0) {
        needingReview++;
      } else {
        stable++;
      }
    });

    return {
      improving,
      stable,
      needingReview,
      totalClients: clientInsights.size,
      insightsGenerated: monthlyInsights.length,
      sessionNotesCreated: monthlyNotes.length
    };
  }

  // Get progress reports for a client
  async getProgressReports(clientId: string): Promise<any[]> {
    return await db
      .select()
      .from(aiInsights)
      .where(
        and(
          eq(aiInsights.clientId, clientId),
          eq(aiInsights.insightType, 'progress_report')
        )
      )
      .orderBy(desc(aiInsights.createdAt));
  }
}

// Export singleton instance
export const aiStorageMethods = new AIStorageMethods();