// Type definitions for Client Chart data structures

export interface ClientChartData {
  client: {
    id: string;
    firstName: string;
    lastName: string;
    clientNumber?: string;
    email?: string;
    phone?: string;
    status: string;
    therapistId: string;
  };
  demographics: {
    age: number;
    gender?: string;
    dateOfBirth?: string;
    address?: any;
    emergencyContact?: any;
  };
  clinicalOverview: {
    primaryDiagnoses: string[];
    currentMedications: Array<{
      name: string;
      dosage: string;
      prescriber?: string;
    }>;
    therapyDuration: {
      startDate: string;
      frequency: string;
      totalSessions?: number;
    };
    riskLevel: 'low' | 'moderate' | 'high';
    treatmentModalities?: string[];
  };
  sessionHistory: {
    totalSessions: number;
    recentSessions: Array<{
      id: string;
      sessionDate: string;
      title?: string;
      status: string;
      notes?: string;
    }>;
    missedSessions?: number;
    completedSessions?: number;
  };
  documents: {
    totalCount: number;
    highPriority: Array<{
      id: string;
      fileName: string;
      category: string;
      uploadDate: string;
      sensitivityLevel?: 'low' | 'medium' | 'high';
      aiTags?: Array<string | { tag: string; confidence?: number }>;
    }>;
    byCategory: Map<string, Array<{
      id: string;
      fileName: string;
      category: string;
      uploadDate: string;
      sensitivityLevel?: 'low' | 'medium' | 'high';
      aiTags?: Array<string | { tag: string; confidence?: number }>;
    }>>;
    recentDocuments?: Array<{
      id: string;
      fileName: string;
      uploadDate: string;
    }>;
  };
  treatmentPlanning: {
    currentGoals: Array<{
      id: string;
      goal: string;
      status: 'active' | 'completed' | 'on-hold';
      progress?: number;
      targetDate?: string;
    }>;
    interventions: Array<{
      id: string;
      type: string;
      description: string;
      effectiveness?: 'high' | 'medium' | 'low';
    }>;
    nextSteps?: string[];
  };
  actionItems: {
    pending: Array<{
      id: string;
      title: string;
      description: string;
      dueDate?: string;
      priority: 'low' | 'medium' | 'high';
    }>;
    overdue: Array<{
      id: string;
      title: string;
      description: string;
      dueDate: string;
      priority: 'low' | 'medium' | 'high';
    }>;
    completed?: Array<{
      id: string;
      title: string;
      completedDate: string;
    }>;
  };
  aiAnalysis: {
    insights: Array<{
      id: string;
      title: string;
      content: string;
      type: string;
      createdAt: string;
      confidence?: number;
    }>;
    recommendations: Array<{
      id: string;
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
      category: string;
    }>;
    riskAssessment: {
      level: 'low' | 'moderate' | 'high';
      factors: string[];
      lastAssessment: string;
      recommendations?: string[];
    };
    patterns?: Array<{
      id: string;
      pattern: string;
      significance: 'high' | 'medium' | 'low';
      occurrences: number;
    }>;
  };
}

export interface LongitudinalData {
  timelineEvents: Array<{
    id?: string;
    date: string;
    title: string;
    type: string;
    summary: string;
    clinicalSignificance: 'high' | 'medium' | 'low';
    sentiment: 'positive' | 'neutral' | 'negative';
    tags?: string[];
    linkedDocuments?: string[];
  }>;
  progressIndicators?: {
    overallTrend: 'improving' | 'stable' | 'declining';
    keyMilestones: Array<{
      date: string;
      milestone: string;
      achieved: boolean;
    }>;
  };
}

export interface SearchResults {
  totalResults: number;
  sessions?: Array<{
    id: string;
    sessionDate: string;
    title?: string;
    matchedContent?: string;
    relevance?: number;
  }>;
  documents?: Array<{
    id: string;
    fileName: string;
    matchedContent?: string;
    relevance?: number;
  }>;
  notes?: Array<{
    id: string;
    noteDate: string;
    matchedContent?: string;
    relevance?: number;
  }>;
}