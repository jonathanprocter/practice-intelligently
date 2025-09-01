import { storage } from './storage';
import { multiModelAI } from './ai-multi-model';
import { db } from './db';
import { documents, sessionNotes, clients, appointments } from '@shared/schema';
import { eq, and, desc, or, like } from 'drizzle-orm';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface DocumentCategory {
  primary: 'clinical-notes' | 'assessments' | 'administrative' | 'treatment-planning' | 'legal-compliance' | 'referrals' | 'correspondence';
  secondary: string;
  confidence: number;
}

export interface AITag {
  tag: string;
  category: 'clinical' | 'administrative' | 'therapeutic' | 'assessment' | 'risk' | 'progress';
  confidence: number;
  relevance: 'high' | 'medium' | 'low';
}

export interface ClinicalKeyword {
  keyword: string;
  type: 'diagnosis' | 'symptom' | 'intervention' | 'medication' | 'assessment-tool';
  frequency: number;
}

export interface DocumentAnalysis {
  category: DocumentCategory;
  aiTags: AITag[];
  clinicalKeywords: ClinicalKeyword[];
  contentSummary: string;
  sensitivityLevel: 'low' | 'standard' | 'high' | 'confidential';
  extractedEntities: {
    dates: string[];
    clientNames: string[];
    diagnoses: string[];
    medications: string[];
    interventions: string[];
  };
  temporalContext: {
    sessionDate?: Date;
    dateRange?: { start: Date; end: Date };
    sessionNumber?: number;
    treatmentPhase?: 'initial' | 'early' | 'middle' | 'late' | 'termination';
  };
  clinicalRelevance: {
    riskFactors: string[];
    protectiveFactors: string[];
    progressIndicators: string[];
    concernAreas: string[];
  };
  chartPlacement: {
    section: 'progress-notes' | 'assessments' | 'treatment-plans' | 'correspondence' | 'administrative';
    priority: 'immediate' | 'standard' | 'archive';
    linkedSessions: string[]; // Session note IDs
    linkedAppointments: string[]; // Appointment IDs
  };
}

export interface LongitudinalData {
  clientId: string;
  timelineEvents: Array<{
    date: Date;
    type: 'session' | 'assessment' | 'document' | 'milestone' | 'crisis' | 'termination';
    title: string;
    summary: string;
    tags: string[];
    sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
    clinicalSignificance: 'high' | 'medium' | 'low';
  }>;
  progressTrajectory: {
    overallTrend: 'improving' | 'stable' | 'declining' | 'variable';
    domainProgress: Array<{
      domain: string;
      baseline: number;
      current: number;
      trend: 'improving' | 'stable' | 'declining';
      lastUpdated: Date;
    }>;
  };
  treatmentPhases: Array<{
    phase: string;
    startDate: Date;
    endDate?: Date;
    goals: string[];
    interventions: string[];
    outcomes: string[];
  }>;
  clinicalThemes: Array<{
    theme: string;
    firstAppearance: Date;
    frequency: number;
    evolution: 'resolved' | 'improving' | 'persistent' | 'worsening';
    relatedSessions: string[];
  }>;
}

export class EnhancedDocumentProcessor {
  async processAndCategorizeDocument(
    fileContent: string,
    fileName: string,
    fileType: string,
    therapistId: string,
    clientId?: string
  ): Promise<DocumentAnalysis> {
    try {
      // Step 1: Extract basic entities and context
      const entities = await this.extractEntities(fileContent);
      
      // Step 2: Determine document category with high accuracy
      const category = await this.categorizeDocument(fileContent, fileName, entities);
      
      // Step 3: Generate comprehensive AI tags
      const aiTags = await this.generateAITags(fileContent, category, entities);
      
      // Step 4: Extract clinical keywords with context
      const clinicalKeywords = await this.extractClinicalKeywords(fileContent);
      
      // Step 5: Analyze temporal context
      const temporalContext = await this.analyzeTemporalContext(fileContent, entities);
      
      // Step 6: Assess clinical relevance
      const clinicalRelevance = await this.assessClinicalRelevance(fileContent, aiTags);
      
      // Step 7: Generate content summary
      const contentSummary = await this.generateContentSummary(fileContent, category);
      
      // Step 8: Determine sensitivity level
      const sensitivityLevel = this.determineSensitivityLevel(fileContent, aiTags, clinicalKeywords);
      
      // Step 9: Determine chart placement
      const chartPlacement = await this.determineChartPlacement(
        category,
        temporalContext,
        clientId,
        therapistId
      );
      
      return {
        category,
        aiTags,
        clinicalKeywords,
        contentSummary,
        sensitivityLevel,
        extractedEntities: entities,
        temporalContext,
        clinicalRelevance,
        chartPlacement
      };
    } catch (error) {
      console.error('Error processing document:', error);
      throw new Error(`Document processing failed: ${error.message}`);
    }
  }

  private async extractEntities(content: string): Promise<any> {
    const prompt = `Extract the following entities from this clinical document:
    1. All dates mentioned (in any format)
    2. Client/patient names
    3. Diagnoses (DSM-5 or ICD codes and descriptions)
    4. Medications mentioned
    5. Therapeutic interventions used
    
    Document content:
    ${content.substring(0, 3000)}
    
    Return as JSON with arrays for each category.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private async categorizeDocument(
    content: string,
    fileName: string,
    entities: any
  ): Promise<DocumentCategory> {
    const prompt = `Categorize this clinical document with high precision.
    
    Primary categories:
    - clinical-notes: Session notes, progress notes, therapy transcripts
    - assessments: Psychological assessments, screening tools, evaluation reports
    - administrative: Consent forms, insurance documents, scheduling
    - treatment-planning: Treatment plans, goals, intervention strategies
    - legal-compliance: HIPAA forms, court documents, mandated reporting
    - referrals: Referral letters, consultation requests
    - correspondence: Letters, emails, communication with other providers
    
    Document indicators:
    - Filename: ${fileName}
    - Contains dates: ${entities.dates?.length || 0}
    - Contains diagnoses: ${entities.diagnoses?.length || 0}
    - First 500 chars: ${content.substring(0, 500)}
    
    Return JSON with: primary, secondary (subcategory), confidence (0-1)`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.2
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private async generateAITags(
    content: string,
    category: DocumentCategory,
    entities: any
  ): Promise<AITag[]> {
    const prompt = `Generate comprehensive AI tags for this ${category.primary} document.
    
    Tag categories:
    - clinical: Diagnoses, symptoms, clinical observations
    - administrative: Scheduling, billing, documentation
    - therapeutic: Interventions, techniques, modalities
    - assessment: Tests, measures, evaluations
    - risk: Safety concerns, risk factors, crisis indicators
    - progress: Improvements, setbacks, milestones
    
    Document excerpt:
    ${content.substring(0, 2000)}
    
    Extracted entities: ${JSON.stringify(entities)}
    
    Generate 10-15 specific, relevant tags with category, confidence (0-1), and relevance (high/medium/low).
    Return as JSON array.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.tags || [];
  }

  private async extractClinicalKeywords(content: string): Promise<ClinicalKeyword[]> {
    const prompt = `Extract clinical keywords from this document.
    
    Keyword types:
    - diagnosis: DSM-5 diagnoses, ICD codes
    - symptom: Clinical symptoms, presenting problems
    - intervention: Therapeutic techniques, interventions
    - medication: Medications, dosages
    - assessment-tool: Psychological tests, screening tools
    
    Document content:
    ${content.substring(0, 2500)}
    
    For each keyword, provide: keyword, type, frequency (count in document).
    Return as JSON array.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.keywords || [];
  }

  private async analyzeTemporalContext(content: string, entities: any): Promise<any> {
    // Extract dates and determine session context
    const dates = entities.dates || [];
    const sessionDate = dates.length > 0 ? new Date(dates[0]) : undefined;
    
    // Look for session numbers
    const sessionNumberMatch = content.match(/session\s*#?\s*(\d+)/i);
    const sessionNumber = sessionNumberMatch ? parseInt(sessionNumberMatch[1]) : undefined;
    
    // Determine treatment phase based on content indicators
    let treatmentPhase: string = 'middle';
    if (content.toLowerCase().includes('initial') || content.toLowerCase().includes('intake')) {
      treatmentPhase = 'initial';
    } else if (content.toLowerCase().includes('termination') || content.toLowerCase().includes('discharge')) {
      treatmentPhase = 'termination';
    }
    
    return {
      sessionDate,
      sessionNumber,
      treatmentPhase,
      dateRange: dates.length > 1 ? {
        start: new Date(Math.min(...dates.map(d => new Date(d).getTime()))),
        end: new Date(Math.max(...dates.map(d => new Date(d).getTime())))
      } : undefined
    };
  }

  private async assessClinicalRelevance(content: string, aiTags: AITag[]): Promise<any> {
    const prompt = `Assess the clinical relevance of this document.
    
    Identify:
    1. Risk factors (safety concerns, warning signs)
    2. Protective factors (strengths, resources, support)
    3. Progress indicators (improvements, achievements)
    4. Concern areas (challenges, barriers, setbacks)
    
    Document content:
    ${content.substring(0, 2000)}
    
    AI Tags identified: ${aiTags.map(t => t.tag).join(', ')}
    
    Return as JSON with arrays for each category.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private async generateContentSummary(content: string, category: DocumentCategory): Promise<string> {
    const prompt = `Generate a concise clinical summary of this ${category.primary} document.
    
    Focus on:
    - Main purpose/topic
    - Key clinical information
    - Important findings or decisions
    - Action items or follow-up needed
    
    Document content:
    ${content.substring(0, 2000)}
    
    Provide a 2-3 sentence summary suitable for quick chart review.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    return response.choices[0].message.content || '';
  }

  private determineSensitivityLevel(
    content: string,
    aiTags: AITag[],
    keywords: ClinicalKeyword[]
  ): 'low' | 'standard' | 'high' | 'confidential' {
    // Check for high-sensitivity indicators
    const highSensitivityIndicators = [
      'suicide', 'self-harm', 'abuse', 'violence', 'mandated reporter',
      'court', 'legal', 'custody', 'forensic'
    ];
    
    const contentLower = content.toLowerCase();
    const hasHighSensitivity = highSensitivityIndicators.some(indicator => 
      contentLower.includes(indicator)
    );
    
    if (hasHighSensitivity) return 'confidential';
    
    // Check for risk-related tags
    const hasRiskTags = aiTags.some(tag => 
      tag.category === 'risk' && tag.confidence > 0.7
    );
    
    if (hasRiskTags) return 'high';
    
    // Check for standard clinical content
    const hasClinicalContent = keywords.some(kw => 
      kw.type === 'diagnosis' || kw.type === 'medication'
    );
    
    if (hasClinicalContent) return 'standard';
    
    return 'low';
  }

  private async determineChartPlacement(
    category: DocumentCategory,
    temporalContext: any,
    clientId?: string,
    therapistId?: string
  ): Promise<any> {
    // Determine section based on category
    const sectionMap = {
      'clinical-notes': 'progress-notes',
      'assessments': 'assessments',
      'treatment-planning': 'treatment-plans',
      'administrative': 'administrative',
      'legal-compliance': 'administrative',
      'referrals': 'correspondence',
      'correspondence': 'correspondence'
    };
    
    const section = sectionMap[category.primary] || 'administrative';
    
    // Determine priority
    let priority: 'immediate' | 'standard' | 'archive' = 'standard';
    if (temporalContext.sessionDate) {
      const daysSinceSession = Math.floor(
        (Date.now() - temporalContext.sessionDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceSession < 7) priority = 'immediate';
      else if (daysSinceSession > 90) priority = 'archive';
    }
    
    // Find linked sessions and appointments
    const linkedSessions: string[] = [];
    const linkedAppointments: string[] = [];
    
    if (clientId && temporalContext.sessionDate) {
      // Find matching session notes
      const sessions = await db
        .select()
        .from(sessionNotes)
        .where(
          and(
            eq(sessionNotes.clientId, clientId),
            eq(sessionNotes.sessionDate, temporalContext.sessionDate)
          )
        )
        .limit(5);
      
      linkedSessions.push(...sessions.map(s => s.id));
      
      // Find matching appointments
      const appts = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.clientId, clientId),
            eq(appointments.startTime, temporalContext.sessionDate)
          )
        )
        .limit(5);
      
      linkedAppointments.push(...appts.map(a => a.id));
    }
    
    return {
      section,
      priority,
      linkedSessions,
      linkedAppointments
    };
  }

  async buildLongitudinalJourney(clientId: string): Promise<LongitudinalData> {
    try {
      // Fetch all client data
      const [sessions, docs, appts] = await Promise.all([
        db.select().from(sessionNotes).where(eq(sessionNotes.clientId, clientId)).orderBy(desc(sessionNotes.sessionDate)),
        db.select().from(documents).where(eq(documents.clientId, clientId)).orderBy(desc(documents.createdAt)),
        db.select().from(appointments).where(eq(appointments.clientId, clientId)).orderBy(desc(appointments.startTime))
      ]);
      
      // Build timeline events
      const timelineEvents = [];
      
      // Add session events
      for (const session of sessions) {
        const sentiment = await this.analyzeSentiment(session.narrativeSummary || '');
        timelineEvents.push({
          date: session.sessionDate || session.createdAt,
          type: 'session' as const,
          title: session.title || `Session ${session.sessionDate}`,
          summary: session.narrativeSummary || session.subjective || '',
          tags: Array.isArray(session.aiTags) ? session.aiTags : [],
          sentiment,
          clinicalSignificance: this.assessClinicalSignificance(session)
        });
      }
      
      // Add document events
      for (const doc of docs) {
        if (doc.category === 'assessments') {
          timelineEvents.push({
            date: doc.createdAt,
            type: 'assessment' as const,
            title: doc.fileName,
            summary: doc.contentSummary || '',
            tags: Array.isArray(doc.aiTags) ? doc.aiTags.map(t => t.tag) : [],
            sentiment: 'neutral' as const,
            clinicalSignificance: 'medium' as const
          });
        }
      }
      
      // Sort timeline by date
      timelineEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      // Analyze progress trajectory
      const progressTrajectory = await this.analyzeProgressTrajectory(sessions);
      
      // Identify treatment phases
      const treatmentPhases = await this.identifyTreatmentPhases(sessions, docs);
      
      // Extract clinical themes
      const clinicalThemes = await this.extractClinicalThemes(sessions);
      
      return {
        clientId,
        timelineEvents,
        progressTrajectory,
        treatmentPhases,
        clinicalThemes
      };
    } catch (error) {
      console.error('Error building longitudinal journey:', error);
      throw error;
    }
  }

  private async analyzeSentiment(text: string): Promise<'positive' | 'neutral' | 'negative' | 'mixed'> {
    if (!text) return 'neutral';
    
    const prompt = `Analyze the overall emotional sentiment of this clinical text.
    Return one of: positive, neutral, negative, mixed
    
    Text: ${text.substring(0, 500)}`;
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 10
    });
    
    const sentiment = response.choices[0].message.content?.toLowerCase().trim();
    if (['positive', 'neutral', 'negative', 'mixed'].includes(sentiment || '')) {
      return sentiment as any;
    }
    return 'neutral';
  }

  private assessClinicalSignificance(session: any): 'high' | 'medium' | 'low' {
    // Check for high significance indicators
    if (session.assessment?.toLowerCase().includes('crisis') ||
        session.assessment?.toLowerCase().includes('risk') ||
        session.plan?.toLowerCase().includes('immediate')) {
      return 'high';
    }
    
    // Check for low significance
    if (session.assessment?.toLowerCase().includes('stable') ||
        session.assessment?.toLowerCase().includes('maintenance')) {
      return 'low';
    }
    
    return 'medium';
  }

  private async analyzeProgressTrajectory(sessions: any[]): Promise<any> {
    // Simple trajectory analysis based on recent sessions
    if (sessions.length < 3) {
      return {
        overallTrend: 'stable',
        domainProgress: []
      };
    }
    
    // Analyze last 5 sessions for trend
    const recentSessions = sessions.slice(0, 5);
    let positiveCount = 0;
    let negativeCount = 0;
    
    for (const session of recentSessions) {
      const sentiment = await this.analyzeSentiment(session.assessment || '');
      if (sentiment === 'positive') positiveCount++;
      else if (sentiment === 'negative') negativeCount++;
    }
    
    let overallTrend: 'improving' | 'stable' | 'declining' | 'variable' = 'stable';
    if (positiveCount > negativeCount + 1) overallTrend = 'improving';
    else if (negativeCount > positiveCount + 1) overallTrend = 'declining';
    else if (positiveCount > 0 && negativeCount > 0) overallTrend = 'variable';
    
    return {
      overallTrend,
      domainProgress: []
    };
  }

  private async identifyTreatmentPhases(sessions: any[], docs: any[]): Promise<any[]> {
    const phases = [];
    
    // Identify intake/initial phase
    if (sessions.length > 0) {
      const firstSession = sessions[sessions.length - 1];
      phases.push({
        phase: 'Initial Assessment',
        startDate: firstSession.sessionDate || firstSession.createdAt,
        goals: [],
        interventions: [],
        outcomes: []
      });
    }
    
    // Current/active phase
    if (sessions.length > 3) {
      const currentPhaseStart = sessions[Math.floor(sessions.length / 2)];
      phases.push({
        phase: 'Active Treatment',
        startDate: currentPhaseStart.sessionDate || currentPhaseStart.createdAt,
        goals: [],
        interventions: [],
        outcomes: []
      });
    }
    
    return phases;
  }

  private async extractClinicalThemes(sessions: any[]): Promise<any[]> {
    const themeMap = new Map<string, any>();
    
    for (const session of sessions) {
      const tags = Array.isArray(session.aiTags) ? session.aiTags : [];
      
      for (const tag of tags) {
        const tagStr = typeof tag === 'string' ? tag : tag.tag;
        if (!tagStr) continue;
        
        if (!themeMap.has(tagStr)) {
          themeMap.set(tagStr, {
            theme: tagStr,
            firstAppearance: session.sessionDate || session.createdAt,
            frequency: 0,
            evolution: 'persistent',
            relatedSessions: []
          });
        }
        
        const theme = themeMap.get(tagStr);
        theme.frequency++;
        theme.relatedSessions.push(session.id);
      }
    }
    
    return Array.from(themeMap.values())
      .filter(theme => theme.frequency > 1)
      .sort((a, b) => b.frequency - a.frequency);
  }
}

// Export singleton instance
export const enhancedDocumentProcessor = new EnhancedDocumentProcessor();