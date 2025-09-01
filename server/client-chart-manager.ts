import { db } from './db';
import { 
  clients, sessionNotes, appointments, documents, 
  treatmentPlans, assessments, medications, aiInsights,
  sessionRecommendations, sessionSummaries, actionItems
} from '@shared/schema';
import { eq, desc, and, or, gte, lte, isNotNull } from 'drizzle-orm';
import { enhancedDocumentProcessor } from './enhanced-document-processor';

export interface ComprehensiveClientChart {
  client: any;
  demographics: {
    age: number;
    gender: string;
    contact: {
      email: string;
      phone: string;
      address: any;
    };
    emergencyContact: any;
    insurance: any;
  };
  clinicalOverview: {
    primaryDiagnoses: string[];
    currentMedications: any[];
    riskLevel: string;
    treatmentStatus: string;
    therapyDuration: {
      startDate: Date;
      totalSessions: number;
      frequency: string;
    };
  };
  longitudinalJourney: {
    timeline: Array<{
      date: Date;
      type: string;
      title: string;
      summary: string;
      tags: string[];
      significance: string;
    }>;
    progressMetrics: {
      overallTrend: string;
      domainScores: any[];
      milestones: any[];
    };
    treatmentPhases: any[];
    clinicalThemes: any[];
  };
  sessionHistory: {
    totalSessions: number;
    recentSessions: any[];
    missedSessions: number;
    sessionNotes: any[];
    keyInsights: string[];
  };
  documents: {
    byCategory: Map<string, any[]>;
    recent: any[];
    highPriority: any[];
    totalCount: number;
  };
  assessments: {
    completed: any[];
    pending: any[];
    scores: any[];
    trends: any[];
  };
  treatmentPlanning: {
    currentPlan: any;
    goals: any[];
    interventions: any[];
    progress: any[];
    recommendations: any[];
  };
  actionItems: {
    pending: any[];
    completed: any[];
    overdue: any[];
  };
  aiAnalysis: {
    insights: any[];
    recommendations: any[];
    riskAssessment: any;
    summaries: any[];
  };
}

export class ClientChartManager {
  /**
   * Get comprehensive client chart with all related data
   */
  async getComprehensiveChart(clientId: string): Promise<ComprehensiveClientChart> {
    try {
      // Fetch client base data
      const client = await db
        .select()
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);
      
      if (!client || client.length === 0) {
        throw new Error('Client not found');
      }

      const clientData = client[0];

      // Parallel fetch all related data
      const [
        sessionsData,
        appointmentsData,
        documentsData,
        treatmentPlansData,
        assessmentsData,
        medicationsData,
        aiInsightsData,
        recommendationsData,
        summariesData,
        actionItemsData
      ] = await Promise.all([
        this.fetchSessionData(clientId),
        this.fetchAppointmentData(clientId),
        this.fetchDocumentData(clientId),
        this.fetchTreatmentPlans(clientId),
        this.fetchAssessments(clientId),
        this.fetchMedications(clientId),
        this.fetchAIInsights(clientId),
        this.fetchRecommendations(clientId),
        this.fetchSummaries(clientId),
        this.fetchActionItems(clientId)
      ]);

      // Build longitudinal journey
      const longitudinalJourney = await enhancedDocumentProcessor.buildLongitudinalJourney(clientId);

      // Calculate demographics
      const demographics = this.extractDemographics(clientData);

      // Build clinical overview
      const clinicalOverview = await this.buildClinicalOverview(
        clientData,
        sessionsData,
        medicationsData,
        appointmentsData
      );

      // Organize documents by category
      const organizedDocuments = this.organizeDocuments(documentsData);

      // Build treatment planning section
      const treatmentPlanning = this.buildTreatmentPlanning(
        treatmentPlansData,
        recommendationsData
      );

      // Organize action items
      const organizedActionItems = this.organizeActionItems(actionItemsData);

      // Compile AI analysis
      const aiAnalysis = this.compileAIAnalysis(
        aiInsightsData,
        recommendationsData,
        summariesData
      );

      return {
        client: clientData,
        demographics,
        clinicalOverview,
        longitudinalJourney: {
          timeline: longitudinalJourney.timelineEvents,
          progressMetrics: {
            overallTrend: longitudinalJourney.progressTrajectory.overallTrend,
            domainScores: longitudinalJourney.progressTrajectory.domainProgress,
            milestones: []
          },
          treatmentPhases: longitudinalJourney.treatmentPhases,
          clinicalThemes: longitudinalJourney.clinicalThemes
        },
        sessionHistory: {
          totalSessions: sessionsData.length,
          recentSessions: sessionsData.slice(0, 5),
          missedSessions: appointmentsData.filter(a => a.status === 'no_show').length,
          sessionNotes: sessionsData,
          keyInsights: this.extractKeyInsights(sessionsData)
        },
        documents: organizedDocuments,
        assessments: {
          completed: assessmentsData.filter(a => a.status === 'completed'),
          pending: assessmentsData.filter(a => a.status !== 'completed'),
          scores: [],
          trends: []
        },
        treatmentPlanning,
        actionItems: organizedActionItems,
        aiAnalysis
      };
    } catch (error) {
      console.error('Error building comprehensive chart:', error);
      throw error;
    }
  }

  /**
   * Get client chart section for specific component
   */
  async getChartSection(
    clientId: string,
    section: 'overview' | 'sessions' | 'documents' | 'assessments' | 'treatment' | 'timeline'
  ): Promise<any> {
    switch (section) {
      case 'overview':
        return this.getClientOverview(clientId);
      case 'sessions':
        return this.getSessionSection(clientId);
      case 'documents':
        return this.getDocumentSection(clientId);
      case 'assessments':
        return this.getAssessmentSection(clientId);
      case 'treatment':
        return this.getTreatmentSection(clientId);
      case 'timeline':
        return this.getTimelineSection(clientId);
      default:
        throw new Error(`Invalid chart section: ${section}`);
    }
  }

  private async fetchSessionData(clientId: string) {
    return db
      .select()
      .from(sessionNotes)
      .where(eq(sessionNotes.clientId, clientId))
      .orderBy(desc(sessionNotes.sessionDate));
  }

  private async fetchAppointmentData(clientId: string) {
    return db
      .select()
      .from(appointments)
      .where(eq(appointments.clientId, clientId))
      .orderBy(desc(appointments.startTime));
  }

  private async fetchDocumentData(clientId: string) {
    return db
      .select()
      .from(documents)
      .where(eq(documents.clientId, clientId))
      .orderBy(desc(documents.createdAt));
  }

  private async fetchTreatmentPlans(clientId: string) {
    return db
      .select()
      .from(treatmentPlans)
      .where(eq(treatmentPlans.clientId, clientId))
      .orderBy(desc(treatmentPlans.createdAt));
  }

  private async fetchAssessments(clientId: string) {
    return db
      .select()
      .from(assessments)
      .where(eq(assessments.clientId, clientId))
      .orderBy(desc(assessments.createdAt));
  }

  private async fetchMedications(clientId: string) {
    return db
      .select()
      .from(medications)
      .where(eq(medications.clientId, clientId))
      .orderBy(desc(medications.startDate));
  }

  private async fetchAIInsights(clientId: string) {
    return db
      .select()
      .from(aiInsights)
      .where(eq(aiInsights.clientId, clientId))
      .orderBy(desc(aiInsights.createdAt));
  }

  private async fetchRecommendations(clientId: string) {
    return db
      .select()
      .from(sessionRecommendations)
      .where(eq(sessionRecommendations.clientId, clientId))
      .orderBy(desc(sessionRecommendations.createdAt));
  }

  private async fetchSummaries(clientId: string) {
    return db
      .select()
      .from(sessionSummaries)
      .where(eq(sessionSummaries.clientId, clientId))
      .orderBy(desc(sessionSummaries.createdAt));
  }

  private async fetchActionItems(clientId: string) {
    return db
      .select()
      .from(actionItems)
      .where(eq(actionItems.clientId, clientId))
      .orderBy(desc(actionItems.createdAt));
  }

  private extractDemographics(client: any) {
    const birthDate = client.dateOfBirth ? new Date(client.dateOfBirth) : null;
    const age = birthDate 
      ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    return {
      age,
      gender: client.gender || 'Not specified',
      contact: {
        email: client.email,
        phone: client.phone,
        address: client.address
      },
      emergencyContact: client.emergencyContact,
      insurance: client.insuranceInfo
    };
  }

  private async buildClinicalOverview(
    client: any,
    sessions: any[],
    medications: any[],
    appointments: any[]
  ) {
    // Extract diagnoses from session notes
    const diagnoses = new Set<string>();
    sessions.forEach(session => {
      if (session.assessment) {
        // Extract diagnoses from assessment text
        const diagnosisPattern = /(?:diagnosis|dx|diagnosed with):?\s*([^.;]+)/gi;
        const matches = session.assessment.matchAll(diagnosisPattern);
        for (const match of matches) {
          if (match[1]) diagnoses.add(match[1].trim());
        }
      }
    });

    // Get therapy duration
    const firstSession = sessions[sessions.length - 1];
    const startDate = firstSession?.sessionDate || firstSession?.createdAt;
    
    // Calculate frequency
    const recentSessions = sessions.slice(0, 8);
    let frequency = 'Unknown';
    if (recentSessions.length >= 2) {
      const daysBetween = recentSessions.map((s, i) => {
        if (i === recentSessions.length - 1) return null;
        const current = new Date(s.sessionDate || s.createdAt);
        const next = new Date(recentSessions[i + 1].sessionDate || recentSessions[i + 1].createdAt);
        return Math.abs(current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24);
      }).filter(d => d !== null);
      
      const avgDays = daysBetween.reduce((a, b) => a + b, 0) / daysBetween.length;
      if (avgDays <= 8) frequency = 'Weekly';
      else if (avgDays <= 16) frequency = 'Bi-weekly';
      else if (avgDays <= 35) frequency = 'Monthly';
      else frequency = 'As needed';
    }

    return {
      primaryDiagnoses: Array.from(diagnoses),
      currentMedications: medications.filter(m => m.status === 'active'),
      riskLevel: client.riskLevel || 'low',
      treatmentStatus: client.status,
      therapyDuration: {
        startDate,
        totalSessions: sessions.length,
        frequency
      }
    };
  }

  private organizeDocuments(documents: any[]) {
    const byCategory = new Map<string, any[]>();
    const highPriority: any[] = [];
    const recent = documents.slice(0, 10);

    documents.forEach(doc => {
      const category = doc.category || 'uncategorized';
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(doc);

      // Check for high priority based on sensitivity
      if (doc.sensitivityLevel === 'high' || doc.sensitivityLevel === 'confidential') {
        highPriority.push(doc);
      }
    });

    return {
      byCategory,
      recent,
      highPriority,
      totalCount: documents.length
    };
  }

  private buildTreatmentPlanning(treatmentPlans: any[], recommendations: any[]) {
    const currentPlan = treatmentPlans.find(p => p.status === 'active') || treatmentPlans[0];
    
    const goals = currentPlan?.goals || [];
    const interventions = currentPlan?.interventions || [];
    const progress = currentPlan?.progress || [];

    // Add AI recommendations
    const activeRecommendations = recommendations.filter(r => 
      r.status === 'pending' && r.priority === 'high'
    );

    return {
      currentPlan,
      goals,
      interventions,
      progress,
      recommendations: activeRecommendations
    };
  }

  private organizeActionItems(actionItems: any[]) {
    const now = new Date();
    
    const pending = actionItems.filter(item => item.status === 'pending');
    const completed = actionItems.filter(item => item.status === 'completed');
    const overdue = pending.filter(item => 
      item.dueDate && new Date(item.dueDate) < now
    );

    return { pending, completed, overdue };
  }

  private compileAIAnalysis(
    insights: any[],
    recommendations: any[],
    summaries: any[]
  ) {
    // Get recent insights
    const recentInsights = insights.slice(0, 10);
    
    // Get active recommendations
    const activeRecommendations = recommendations.filter(r => 
      r.status === 'pending' || r.status === 'accepted'
    );

    // Risk assessment from insights
    const riskInsights = insights.filter(i => 
      i.type === 'risk' || i.title?.toLowerCase().includes('risk')
    );
    
    const riskAssessment = riskInsights.length > 0 ? {
      level: this.determineRiskLevel(riskInsights),
      factors: riskInsights.map(i => i.content),
      lastAssessed: riskInsights[0]?.createdAt
    } : null;

    return {
      insights: recentInsights,
      recommendations: activeRecommendations,
      riskAssessment,
      summaries: summaries.slice(0, 5)
    };
  }

  private extractKeyInsights(sessions: any[]): string[] {
    const insights: string[] = [];
    
    // Extract key points from recent sessions
    sessions.slice(0, 5).forEach(session => {
      if (session.keyPoints && Array.isArray(session.keyPoints)) {
        insights.push(...session.keyPoints.slice(0, 2));
      }
    });

    return insights.slice(0, 10);
  }

  private determineRiskLevel(riskInsights: any[]): string {
    // Simple risk level determination based on insights
    const highRiskKeywords = ['immediate', 'crisis', 'danger', 'severe'];
    const hasHighRisk = riskInsights.some(i => 
      highRiskKeywords.some(keyword => 
        i.content?.toLowerCase().includes(keyword)
      )
    );

    if (hasHighRisk) return 'high';
    if (riskInsights.length > 3) return 'moderate';
    return 'low';
  }

  private async getClientOverview(clientId: string) {
    const chart = await this.getComprehensiveChart(clientId);
    return {
      demographics: chart.demographics,
      clinicalOverview: chart.clinicalOverview,
      recentActivity: {
        lastSession: chart.sessionHistory.recentSessions[0],
        upcomingAppointments: [],
        pendingActions: chart.actionItems.pending.length
      }
    };
  }

  private async getSessionSection(clientId: string) {
    const sessions = await this.fetchSessionData(clientId);
    const appointments = await this.fetchAppointmentData(clientId);
    
    return {
      sessions,
      appointments,
      statistics: {
        total: sessions.length,
        completed: appointments.filter(a => a.status === 'completed').length,
        cancelled: appointments.filter(a => a.status === 'cancelled').length,
        noShow: appointments.filter(a => a.status === 'no_show').length
      }
    };
  }

  private async getDocumentSection(clientId: string) {
    const documents = await this.fetchDocumentData(clientId);
    return this.organizeDocuments(documents);
  }

  private async getAssessmentSection(clientId: string) {
    const assessments = await this.fetchAssessments(clientId);
    return {
      assessments,
      completed: assessments.filter(a => a.status === 'completed'),
      pending: assessments.filter(a => a.status !== 'completed')
    };
  }

  private async getTreatmentSection(clientId: string) {
    const plans = await this.fetchTreatmentPlans(clientId);
    const recommendations = await this.fetchRecommendations(clientId);
    return this.buildTreatmentPlanning(plans, recommendations);
  }

  private async getTimelineSection(clientId: string) {
    return enhancedDocumentProcessor.buildLongitudinalJourney(clientId);
  }

  /**
   * Search across all client data
   */
  async searchClientData(clientId: string, query: string): Promise<any> {
    const searchLower = query.toLowerCase();
    
    // Search in multiple tables
    const [sessions, docs, notes] = await Promise.all([
      db.select()
        .from(sessionNotes)
        .where(
          and(
            eq(sessionNotes.clientId, clientId),
            or(
              like(sessionNotes.content, `%${query}%`),
              like(sessionNotes.subjective, `%${query}%`),
              like(sessionNotes.objective, `%${query}%`),
              like(sessionNotes.assessment, `%${query}%`),
              like(sessionNotes.plan, `%${query}%`)
            )
          )
        ),
      db.select()
        .from(documents)
        .where(
          and(
            eq(documents.clientId, clientId),
            or(
              like(documents.fileName, `%${query}%`),
              like(documents.contentSummary, `%${query}%`),
              like(documents.extractedText, `%${query}%`)
            )
          )
        ),
      []
    ]);

    return {
      sessions,
      documents: docs,
      totalResults: sessions.length + docs.length
    };
  }
}

// Export singleton instance
export const clientChartManager = new ClientChartManager();