import { analyzeContent, analyzeSessionTranscript, generateTherapeuticInsights } from './ai-services';
import { multiModelAI } from './ai-multi-model';
import { storage } from './storage';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import type { 
  SessionNote, InsertSessionNote, InsertAiInsight, 
  InsertSessionRecommendation, InsertSessionSummary,
  InsertTreatmentPlan, Client, Appointment, Document,
  AiInsight
} from '../shared/schema';

/*
<important_code_snippet_instructions>
Enhanced AI Automation Service with comprehensive automatic generation, 
background processing, pattern detection, and intelligent queuing.
This service ensures AI insights are generated automatically for all relevant actions.
</important_code_snippet_instructions>
*/

// Priority levels for AI generation queue
export enum AIPriority {
  URGENT = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
  BATCH = 5
}

// AI task types
export enum AITaskType {
  NEW_CLIENT_ASSESSMENT = 'new_client_assessment',
  SESSION_NOTE_ANALYSIS = 'session_note_analysis',
  APPOINTMENT_SUMMARY = 'appointment_summary',
  DOCUMENT_ANALYSIS = 'document_analysis',
  PROGRESS_REPORT = 'progress_report',
  PATTERN_DETECTION = 'pattern_detection',
  WEEKLY_INSIGHTS = 'weekly_insights',
  MONTHLY_ANALYTICS = 'monthly_analytics',
  RISK_ASSESSMENT = 'risk_assessment',
  TREATMENT_PLAN_UPDATE = 'treatment_plan_update',
  CROSS_CLIENT_PATTERNS = 'cross_client_patterns',
  PRACTICE_ANALYTICS = 'practice_analytics'
}

interface AITask {
  id: string;
  type: AITaskType;
  priority: AIPriority;
  data: any;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  scheduledFor?: Date;
  metadata?: any;
}

export class EnhancedAIAutomationService extends EventEmitter {
  private queue: AITask[] = [];
  private processing: boolean = false;
  private batchQueue: Map<string, any[]> = new Map();
  private lastPatternCheck: Date = new Date();
  private insightCache: Map<string, any> = new Map();
  private cacheExpiry: number = 3600000; // 1 hour
  
  constructor() {
    super();
    this.initializeScheduledJobs();
    this.startQueueProcessor();
  }

  /**
   * Initialize scheduled jobs for periodic AI insights
   */
  private initializeScheduledJobs() {
    // Daily pattern detection (runs at 2 AM)
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 2 && now.getMinutes() === 0) {
        this.schedulePatternDetection();
      }
    }, 60000); // Check every minute

    // Weekly insights generation (runs on Mondays at 6 AM)
    setInterval(() => {
      const now = new Date();
      if (now.getDay() === 1 && now.getHours() === 6 && now.getMinutes() === 0) {
        this.scheduleWeeklyInsights();
      }
    }, 60000);

    // Monthly practice analytics (runs on 1st of month at 3 AM)
    setInterval(() => {
      const now = new Date();
      if (now.getDate() === 1 && now.getHours() === 3 && now.getMinutes() === 0) {
        this.scheduleMonthlyAnalytics();
      }
    }, 60000);

    // Process batch queue every 5 minutes
    setInterval(() => {
      this.processBatchQueue();
    }, 300000);
  }

  /**
   * Start the queue processor
   */
  private async startQueueProcessor() {
    setInterval(async () => {
      if (!this.processing && this.queue.length > 0) {
        await this.processQueue();
      }
    }, 5000); // Process every 5 seconds
  }

  /**
   * Add task to queue with priority
   */
  private addToQueue(task: AITask) {
    // Check if scheduled for future
    if (task.scheduledFor && task.scheduledFor > new Date()) {
      setTimeout(() => {
        this.addToQueue({ ...task, scheduledFor: undefined });
      }, task.scheduledFor.getTime() - Date.now());
      return;
    }

    // Add to queue based on priority
    const insertIndex = this.queue.findIndex(t => t.priority > task.priority);
    if (insertIndex === -1) {
      this.queue.push(task);
    } else {
      this.queue.splice(insertIndex, 0, task);
    }

    this.emit('taskQueued', task);
  }

  /**
   * Process the queue
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const task = this.queue.shift();
    
    if (!task) {
      this.processing = false;
      return;
    }

    try {
      console.log(`🤖 Processing AI task: ${task.type} (Priority: ${task.priority})`);
      
      switch (task.type) {
        case AITaskType.NEW_CLIENT_ASSESSMENT:
          await this.processNewClientAssessment(task.data);
          break;
        case AITaskType.SESSION_NOTE_ANALYSIS:
          await this.processSessionNoteAnalysis(task.data);
          break;
        case AITaskType.APPOINTMENT_SUMMARY:
          await this.processAppointmentSummary(task.data);
          break;
        case AITaskType.DOCUMENT_ANALYSIS:
          await this.processDocumentAnalysis(task.data);
          break;
        case AITaskType.PROGRESS_REPORT:
          await this.processProgressReport(task.data);
          break;
        case AITaskType.PATTERN_DETECTION:
          await this.processPatternDetection(task.data);
          break;
        case AITaskType.WEEKLY_INSIGHTS:
          await this.processWeeklyInsights(task.data);
          break;
        case AITaskType.MONTHLY_ANALYTICS:
          await this.processMonthlyAnalytics(task.data);
          break;
        case AITaskType.RISK_ASSESSMENT:
          await this.processRiskAssessment(task.data);
          break;
        case AITaskType.TREATMENT_PLAN_UPDATE:
          await this.processTreatmentPlanUpdate(task.data);
          break;
        case AITaskType.CROSS_CLIENT_PATTERNS:
          await this.processCrossClientPatterns(task.data);
          break;
        case AITaskType.PRACTICE_ANALYTICS:
          await this.processPracticeAnalytics(task.data);
          break;
      }
      
      this.emit('taskCompleted', task);
    } catch (error) {
      console.error(`Error processing AI task ${task.type}:`, error);
      
      // Retry logic
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        // Exponential backoff
        task.scheduledFor = new Date(Date.now() + Math.pow(2, task.retryCount) * 5000);
        this.addToQueue(task);
        console.log(`Retrying task ${task.id} (attempt ${task.retryCount}/${task.maxRetries})`);
      } else {
        this.emit('taskFailed', { task, error });
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Generate AI insights when a new client is created
   */
  async onNewClientCreated(client: Client, therapistId: string) {
    console.log(`🆕 New client created: ${client.firstName} ${client.lastName} - Generating initial assessment`);
    
    this.addToQueue({
      id: randomUUID(),
      type: AITaskType.NEW_CLIENT_ASSESSMENT,
      priority: AIPriority.HIGH,
      data: { client, therapistId },
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date()
    });

    // Also schedule a risk assessment
    this.addToQueue({
      id: randomUUID(),
      type: AITaskType.RISK_ASSESSMENT,
      priority: AIPriority.HIGH,
      data: { clientId: client.id, therapistId },
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
      scheduledFor: new Date(Date.now() + 60000) // 1 minute later
    });
  }

  /**
   * Process new client assessment
   */
  private async processNewClientAssessment(data: any) {
    const { client, therapistId } = data;
    
    // Build comprehensive initial assessment prompt
    const assessmentPrompt = `
      New client intake assessment for:
      
      Name: ${client.firstName} ${client.lastName}
      Date of Birth: ${client.dateOfBirth}
      Primary Concerns: ${JSON.stringify(client.primaryConcerns || [])}
      Insurance: ${client.insuranceProvider || 'Not provided'}
      Emergency Contact: ${client.emergencyContact || 'Not provided'}
      Medical History: ${client.medicalHistory || 'Not provided'}
      Medications: ${client.medications || 'None reported'}
      Previous Therapy: ${client.previousTherapy || 'No previous therapy reported'}
      
      Please provide:
      1. Initial clinical impressions
      2. Recommended assessment tools
      3. Potential treatment approaches
      4. Risk factors to monitor
      5. Suggested session frequency
      6. Important areas to explore in first sessions
      7. Any immediate concerns or red flags
    `;

    // Generate comprehensive assessment using multiple models
    const [openaiAssessment, claudeAssessment] = await Promise.allSettled([
      analyzeContent(assessmentPrompt, 'session'),
      multiModelAI.generateDetailedInsights(assessmentPrompt, 'initial_assessment')
    ]);

    // Combine and structure insights
    const combinedAssessment = this.combineAssessmentInsights(openaiAssessment, claudeAssessment);
    
    // Store initial assessment insights
    await storage.createAiInsight({
      therapistId,
      clientId: client.id,
      insightType: 'initial_assessment',
      content: combinedAssessment.summary,
      recommendations: combinedAssessment.recommendations,
      priority: combinedAssessment.priority || 'high',
      actionRequired: true,
      metadata: {
        assessmentDate: new Date().toISOString(),
        clinicalImpressions: combinedAssessment.clinicalImpressions,
        recommendedTools: combinedAssessment.assessmentTools,
        treatmentApproaches: combinedAssessment.treatmentApproaches,
        riskFactors: combinedAssessment.riskFactors,
        sessionFrequency: combinedAssessment.sessionFrequency,
        explorationAreas: combinedAssessment.explorationAreas,
        redFlags: combinedAssessment.redFlags,
        modelsUsed: combinedAssessment.modelsUsed
      }
    });

    console.log(`✅ Initial assessment generated for ${client.firstName} ${client.lastName}`);
  }

  /**
   * Generate AI insights when a session note is created
   */
  async onSessionNoteCreated(sessionNote: SessionNote, clientId: string, therapistId: string) {
    console.log(`📝 Session note created - Generating insights`);
    
    this.addToQueue({
      id: randomUUID(),
      type: AITaskType.SESSION_NOTE_ANALYSIS,
      priority: AIPriority.NORMAL,
      data: { sessionNote, clientId, therapistId },
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date()
    });

    // Check if we should generate a progress report
    const sessionCount = await storage.getSessionNoteCount(clientId);
    if (sessionCount % 5 === 0) { // Every 5 sessions
      this.addToQueue({
        id: randomUUID(),
        type: AITaskType.PROGRESS_REPORT,
        priority: AIPriority.NORMAL,
        data: { clientId, therapistId, sessionCount },
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        scheduledFor: new Date(Date.now() + 300000) // 5 minutes later
      });
    }
  }

  /**
   * Process session note analysis with enhanced context
   */
  private async processSessionNoteAnalysis(data: any) {
    const { sessionNote, clientId, therapistId } = data;
    
    // Get comprehensive context
    const [client, recentNotes, treatmentPlans, previousInsights] = await Promise.all([
      storage.getClient(clientId),
      storage.getSessionNotes(clientId),
      storage.getTreatmentPlansByClient(clientId),
      storage.getAiInsightsByClient(clientId)
    ]);

    // Build rich context
    const context = this.buildEnhancedContext(client, recentNotes, treatmentPlans, previousInsights);
    
    // Prepare content with context
    const analysisContent = `
      ${context}
      
      Current Session Note:
      ${this.prepareSessionContent(sessionNote)}
      
      Please analyze and provide:
      1. Key themes and patterns in this session
      2. Progress indicators compared to previous sessions
      3. Any concerning elements or risk factors
      4. Therapeutic interventions that were effective
      5. Recommendations for next session
      6. Connection to treatment goals
      7. Client engagement and readiness level
    `;

    // Generate multi-model analysis
    const insights = await this.generateMultiModelInsights(analysisContent, 'session_analysis');
    
    // Detect patterns across sessions
    const patterns = await this.detectSessionPatterns(clientId, sessionNote, insights);
    
    // Store enhanced insights
    await storage.createAiInsight({
      therapistId,
      clientId,
      insightType: 'session_analysis',
      content: insights.summary,
      recommendations: insights.recommendations,
      priority: insights.priority || 'medium',
      actionRequired: insights.actionRequired || false,
      metadata: {
        sessionNoteId: sessionNote.id,
        themes: insights.themes,
        progressIndicators: insights.progressIndicators,
        riskFactors: insights.riskFactors,
        interventionEffectiveness: insights.interventions,
        clientEngagement: insights.engagement,
        patterns: patterns,
        confidence: insights.confidence,
        modelsUsed: insights.modelsUsed
      }
    });

    // Check for urgent issues
    if (insights.urgentIssues?.length > 0) {
      await this.createUrgentAlert(therapistId, clientId, insights.urgentIssues);
    }
  }

  /**
   * Generate AI summary when appointment is completed
   */
  async onAppointmentCompleted(appointmentId: string, therapistId: string) {
    console.log(`✅ Appointment completed - Generating summary`);
    
    this.addToQueue({
      id: randomUUID(),
      type: AITaskType.APPOINTMENT_SUMMARY,
      priority: AIPriority.HIGH,
      data: { appointmentId, therapistId },
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date()
    });
  }

  /**
   * Process appointment summary with comprehensive analysis
   */
  private async processAppointmentSummary(data: any) {
    const { appointmentId, therapistId } = data;
    
    // Get appointment and related data
    const appointment = await storage.getAppointment(appointmentId);
    if (!appointment) {
      console.error(`Appointment ${appointmentId} not found`);
      return;
    }

    // Get all related session notes
    const sessionNotes = await storage.getSessionNotesByAppointmentId(appointmentId);
    if (sessionNotes.length === 0) {
      console.log(`No session notes for appointment ${appointmentId} - skipping summary`);
      return;
    }

    // Get client and treatment context
    const [client, treatmentPlan, previousSummaries] = await Promise.all([
      storage.getClient(appointment.clientId),
      storage.getActiveTreatmentPlan(appointment.clientId),
      storage.getSessionSummariesByClient(appointment.clientId)
    ]);

    // Build comprehensive summary prompt
    const summaryPrompt = `
      Session Summary Request:
      
      Client: ${client?.firstName} ${client?.lastName}
      Session Date: ${appointment.startTime}
      Session Type: ${appointment.type}
      Duration: ${this.calculateDuration(appointment)} minutes
      
      Session Notes:
      ${sessionNotes.map(note => this.prepareSessionContent(note)).join('\n\n')}
      
      Current Treatment Goals:
      ${treatmentPlan ? JSON.stringify(treatmentPlan.goals) : 'No active treatment plan'}
      
      Previous Session Themes:
      ${previousSummaries.slice(0, 3).map(s => s.keyThemes?.join(', ')).join('; ')}
      
      Please provide:
      1. Executive summary (2-3 sentences)
      2. Key themes discussed
      3. Breakthroughs or significant moments
      4. Progress toward treatment goals
      5. Client's emotional state and engagement
      6. Concerns to monitor
      7. Specific recommendations for next session
      8. Any homework or between-session tasks discussed
    `;

    // Generate comprehensive summary
    const summary = await this.generateMultiModelInsights(summaryPrompt, 'session_summary');
    
    // Store session summary
    await storage.createSessionSummary({
      appointmentId,
      clientId: appointment.clientId,
      therapistId,
      summary: summary.executiveSummary || summary.summary,
      keyThemes: summary.themes || [],
      breakthroughs: summary.breakthroughs || [],
      concerns: summary.concerns || [],
      progressIndicators: summary.progressIndicators || [],
      nextSteps: summary.recommendations || [],
      metadata: {
        generatedAt: new Date().toISOString(),
        sessionDuration: this.calculateDuration(appointment),
        emotionalTone: summary.emotionalTone,
        engagementLevel: summary.engagement,
        homeworkAssigned: summary.homework,
        confidence: summary.confidence,
        modelsUsed: summary.modelsUsed
      }
    });

    // Update appointment with session prep for next time
    if (summary.nextSessionPrep) {
      await storage.updateAppointmentSessionPrep(appointmentId, summary.nextSessionPrep);
    }

    console.log(`✅ Session summary generated for appointment ${appointmentId}`);
  }

  /**
   * Analyze document when uploaded
   */
  async onDocumentUploaded(document: Document, clientId: string, therapistId: string) {
    console.log(`📄 Document uploaded - Analyzing content`);
    
    this.addToQueue({
      id: randomUUID(),
      type: AITaskType.DOCUMENT_ANALYSIS,
      priority: AIPriority.HIGH,
      data: { document, clientId, therapistId },
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date()
    });
  }

  /**
   * Process document analysis with clinical relevance
   */
  private async processDocumentAnalysis(data: any) {
    const { document, clientId, therapistId } = data;
    
    // Get client context for better analysis
    const client = await storage.getClient(clientId);
    const treatmentPlan = await storage.getActiveTreatmentPlan(clientId);
    
    // Analyze document with context
    const analysisPrompt = `
      Document Analysis Request:
      
      Document Type: ${document.documentType}
      Upload Date: ${document.uploadDate}
      
      Client Context:
      Name: ${client?.firstName} ${client?.lastName}
      Primary Concerns: ${JSON.stringify(client?.primaryConcerns || [])}
      Current Treatment Focus: ${treatmentPlan ? JSON.stringify(treatmentPlan.goals) : 'No active plan'}
      
      Document Content:
      ${document.content || document.extractedText || 'Binary document - please analyze metadata'}
      
      Please analyze and provide:
      1. Document type and clinical relevance
      2. Key information extracted
      3. Relevance to current treatment
      4. Any concerning information or red flags
      5. How this information should inform treatment
      6. Specific follow-up actions needed
      7. Integration with existing client records
    `;

    const analysis = await this.generateMultiModelInsights(analysisPrompt, 'document_analysis');
    
    // Check for urgent issues in document
    const urgentIssues = this.detectUrgentIssuesInDocument(analysis, document);
    
    // Store document analysis insights
    await storage.createAiInsight({
      therapistId,
      clientId,
      insightType: urgentIssues.length > 0 ? 'urgent_document_flag' : 'document_analysis',
      content: analysis.summary,
      recommendations: analysis.recommendations,
      priority: urgentIssues.length > 0 ? 'high' : (analysis.priority || 'medium'),
      actionRequired: urgentIssues.length > 0 || analysis.actionRequired,
      metadata: {
        documentId: document.id,
        documentType: document.documentType,
        clinicalRelevance: analysis.clinicalRelevance,
        keyFindings: analysis.keyFindings,
        urgentIssues: urgentIssues,
        treatmentImpact: analysis.treatmentImpact,
        followUpActions: analysis.followUpActions,
        confidence: analysis.confidence,
        modelsUsed: analysis.modelsUsed
      }
    });

    // Create urgent alert if needed
    if (urgentIssues.length > 0) {
      await this.createUrgentAlert(therapistId, clientId, urgentIssues);
    }

    console.log(`✅ Document analysis completed for ${document.filename}`);
  }

  /**
   * Generate progress report after multiple sessions
   */
  async generateProgressReport(clientId: string, therapistId: string, sessionCount: number) {
    console.log(`📊 Generating progress report after ${sessionCount} sessions`);
    
    this.addToQueue({
      id: randomUUID(),
      type: AITaskType.PROGRESS_REPORT,
      priority: AIPriority.NORMAL,
      data: { clientId, therapistId, sessionCount },
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date()
    });
  }

  /**
   * Process comprehensive progress report
   */
  private async processProgressReport(data: any) {
    const { clientId, therapistId, sessionCount } = data;
    
    // Gather comprehensive data for progress analysis
    const [client, allNotes, treatmentPlan, assessments, previousReports] = await Promise.all([
      storage.getClient(clientId),
      storage.getSessionNotes(clientId),
      storage.getActiveTreatmentPlan(clientId),
      storage.getAssessmentsByClient(clientId),
      storage.getProgressReports(clientId)
    ]);

    // Analyze progress over time
    const progressPrompt = `
      Comprehensive Progress Report:
      
      Client: ${client?.firstName} ${client?.lastName}
      Total Sessions: ${sessionCount}
      Treatment Duration: ${this.calculateTreatmentDuration(allNotes)}
      
      Initial Concerns: ${JSON.stringify(client?.primaryConcerns || [])}
      
      Treatment Goals:
      ${treatmentPlan ? JSON.stringify(treatmentPlan.goals) : 'No formal treatment plan'}
      
      Session Themes Over Time:
      ${this.summarizeSessionThemes(allNotes)}
      
      Assessment Scores:
      ${assessments.map(a => `${a.assessmentType}: ${a.score} (${a.createdAt})`).join('\n')}
      
      Please provide:
      1. Overall progress assessment (significant/moderate/minimal)
      2. Goals achieved and goals in progress
      3. Positive changes observed
      4. Areas still needing attention
      5. Treatment effectiveness evaluation
      6. Recommendations for treatment adjustment
      7. Predicted trajectory and prognosis
      8. Suggested timeline for next progress review
    `;

    const progressAnalysis = await this.generateMultiModelInsights(progressPrompt, 'progress_report');
    
    // Store progress report
    await storage.createAiInsight({
      therapistId,
      clientId,
      insightType: 'progress_report',
      content: progressAnalysis.summary,
      recommendations: progressAnalysis.recommendations,
      priority: 'medium',
      actionRequired: progressAnalysis.treatmentAdjustmentNeeded || false,
      metadata: {
        sessionCount,
        progressLevel: progressAnalysis.progressLevel,
        goalsAchieved: progressAnalysis.goalsAchieved,
        goalsInProgress: progressAnalysis.goalsInProgress,
        positiveChanges: progressAnalysis.positiveChanges,
        areasNeedingAttention: progressAnalysis.areasNeedingAttention,
        treatmentEffectiveness: progressAnalysis.effectiveness,
        prognosis: progressAnalysis.prognosis,
        nextReviewDate: progressAnalysis.nextReview,
        confidence: progressAnalysis.confidence,
        modelsUsed: progressAnalysis.modelsUsed
      }
    });

    console.log(`✅ Progress report generated for ${client?.firstName} ${client?.lastName}`);
  }

  /**
   * Schedule pattern detection across all clients
   */
  private schedulePatternDetection() {
    console.log(`🔍 Scheduling daily pattern detection`);
    
    this.addToQueue({
      id: randomUUID(),
      type: AITaskType.PATTERN_DETECTION,
      priority: AIPriority.LOW,
      data: { scope: 'all_clients' },
      retryCount: 0,
      maxRetries: 2,
      createdAt: new Date()
    });
  }

  /**
   * Process pattern detection across practice
   */
  private async processPatternDetection(data: any) {
    const therapistId = process.env.PRIMARY_THERAPIST_ID || '';
    
    // Get all active clients
    const clients = await storage.getActiveClients(therapistId);
    
    // Analyze patterns for each client
    const clientPatterns = await Promise.all(
      clients.map(async (client) => {
        const notes = await storage.getRecentSessionNotes(client.id, 10);
        const insights = await storage.getAiInsightsByClient(client.id);
        
        return {
          clientId: client.id,
          patterns: this.extractPatterns(notes, insights),
          riskIndicators: this.assessRiskPatterns(notes, insights)
        };
      })
    );

    // Identify cross-client patterns
    const crossClientPatterns = this.identifyCrossClientPatterns(clientPatterns);
    
    // Store pattern detection results
    if (crossClientPatterns.length > 0) {
      await storage.createAiInsight({
        therapistId,
        clientId: null, // Practice-wide insight
        insightType: 'pattern_detection',
        content: `Identified ${crossClientPatterns.length} patterns across practice`,
        recommendations: this.generatePatternRecommendations(crossClientPatterns),
        priority: 'medium',
        actionRequired: false,
        metadata: {
          patterns: crossClientPatterns,
          affectedClients: clientPatterns.filter(p => p.patterns.length > 0).length,
          detectionDate: new Date().toISOString()
        }
      });
    }

    console.log(`✅ Pattern detection completed - ${crossClientPatterns.length} patterns found`);
  }

  /**
   * Schedule weekly insights generation
   */
  private scheduleWeeklyInsights() {
    console.log(`📅 Scheduling weekly insights generation`);
    
    this.addToQueue({
      id: randomUUID(),
      type: AITaskType.WEEKLY_INSIGHTS,
      priority: AIPriority.LOW,
      data: { week: this.getCurrentWeek() },
      retryCount: 0,
      maxRetries: 2,
      createdAt: new Date()
    });
  }

  /**
   * Process weekly insights
   */
  private async processWeeklyInsights(data: any) {
    const therapistId = process.env.PRIMARY_THERAPIST_ID || '';
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    
    // Gather weekly data
    const [appointments, sessionNotes, newClients, insights] = await Promise.all([
      storage.getAppointmentsByDateRange(therapistId, weekStart, new Date()),
      storage.getSessionNotesByDateRange(therapistId, weekStart, new Date()),
      storage.getNewClientsByDateRange(therapistId, weekStart, new Date()),
      storage.getAiInsightsByDateRange(therapistId, weekStart, new Date())
    ]);

    // Analyze weekly activity
    const weeklyPrompt = `
      Weekly Practice Summary:
      
      Period: ${weekStart.toDateString()} - ${new Date().toDateString()}
      
      Activity:
      - Total Appointments: ${appointments.length}
      - Completed Sessions: ${appointments.filter(a => a.status === 'completed').length}
      - No-shows: ${appointments.filter(a => a.status === 'no_show').length}
      - New Clients: ${newClients.length}
      - Session Notes Created: ${sessionNotes.length}
      
      Key Themes This Week:
      ${this.extractWeeklyThemes(sessionNotes)}
      
      High Priority Insights Generated:
      ${insights.filter(i => i.priority === 'high').map(i => i.content).join('\n')}
      
      Please provide:
      1. Week overview and highlights
      2. Practice efficiency metrics
      3. Client engagement trends
      4. Common themes or issues
      5. Recommendations for next week
      6. Areas requiring attention
      7. Scheduling optimization suggestions
    `;

    const weeklyAnalysis = await this.generateMultiModelInsights(weeklyPrompt, 'weekly_insights');
    
    // Store weekly insights
    await storage.createAiInsight({
      therapistId,
      clientId: null, // Practice-wide
      insightType: 'weekly_summary',
      content: weeklyAnalysis.summary,
      recommendations: weeklyAnalysis.recommendations,
      priority: 'low',
      actionRequired: false,
      metadata: {
        weekStart: weekStart.toISOString(),
        weekEnd: new Date().toISOString(),
        metrics: {
          totalAppointments: appointments.length,
          completedSessions: appointments.filter(a => a.status === 'completed').length,
          noShows: appointments.filter(a => a.status === 'no_show').length,
          newClients: newClients.length,
          sessionNotes: sessionNotes.length
        },
        themes: weeklyAnalysis.themes,
        efficiencyScore: weeklyAnalysis.efficiency,
        recommendations: weeklyAnalysis.recommendations
      }
    });

    console.log(`✅ Weekly insights generated for week of ${weekStart.toDateString()}`);
  }

  /**
   * Schedule monthly analytics
   */
  private scheduleMonthlyAnalytics() {
    console.log(`📊 Scheduling monthly practice analytics`);
    
    this.addToQueue({
      id: randomUUID(),
      type: AITaskType.MONTHLY_ANALYTICS,
      priority: AIPriority.LOW,
      data: { month: new Date().getMonth(), year: new Date().getFullYear() },
      retryCount: 0,
      maxRetries: 2,
      createdAt: new Date()
    });
  }

  /**
   * Process monthly analytics
   */
  private async processMonthlyAnalytics(data: any) {
    const { month, year } = data;
    const therapistId = process.env.PRIMARY_THERAPIST_ID || '';
    
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    
    // Comprehensive monthly data gathering
    const [appointments, revenue, clientMetrics, treatmentOutcomes] = await Promise.all([
      storage.getAppointmentsByDateRange(therapistId, monthStart, monthEnd),
      storage.getMonthlyRevenue(therapistId, month, year),
      storage.getClientMetrics(therapistId, month, year),
      storage.getTreatmentOutcomes(therapistId, month, year)
    ]);

    // Generate comprehensive monthly analysis
    const monthlyPrompt = `
      Monthly Practice Analytics:
      
      Period: ${monthStart.toDateString()} - ${monthEnd.toDateString()}
      
      Financial Metrics:
      - Total Revenue: ${revenue.total}
      - Average Session Rate: ${revenue.averageRate}
      - Outstanding Balances: ${revenue.outstanding}
      
      Client Metrics:
      - Active Clients: ${clientMetrics.activeClients}
      - New Clients: ${clientMetrics.newClients}
      - Discharged Clients: ${clientMetrics.dischargedClients}
      - Client Retention Rate: ${clientMetrics.retentionRate}%
      
      Treatment Outcomes:
      - Clients Showing Improvement: ${treatmentOutcomes.improving}
      - Clients Stable: ${treatmentOutcomes.stable}
      - Clients Needing Review: ${treatmentOutcomes.needingReview}
      
      Appointment Statistics:
      - Total Scheduled: ${appointments.length}
      - Completion Rate: ${(appointments.filter(a => a.status === 'completed').length / appointments.length * 100).toFixed(1)}%
      - Average Sessions per Client: ${clientMetrics.averageSessionsPerClient}
      
      Please provide:
      1. Practice health assessment
      2. Financial performance analysis
      3. Client satisfaction indicators
      4. Treatment effectiveness summary
      5. Growth opportunities
      6. Risk areas to address
      7. Strategic recommendations for next month
    `;

    const monthlyAnalysis = await this.generateMultiModelInsights(monthlyPrompt, 'monthly_analytics');
    
    // Store monthly analytics
    await storage.createAiInsight({
      therapistId,
      clientId: null, // Practice-wide
      insightType: 'monthly_analytics',
      content: monthlyAnalysis.summary,
      recommendations: monthlyAnalysis.recommendations,
      priority: 'medium',
      actionRequired: monthlyAnalysis.risksIdentified || false,
      metadata: {
        month,
        year,
        financialMetrics: revenue,
        clientMetrics,
        treatmentOutcomes,
        practiceHealth: monthlyAnalysis.practiceHealth,
        growthOpportunities: monthlyAnalysis.opportunities,
        riskAreas: monthlyAnalysis.risks,
        strategicRecommendations: monthlyAnalysis.strategic
      }
    });

    console.log(`✅ Monthly analytics generated for ${month}/${year}`);
  }

  /**
   * Process batch queue for non-urgent tasks
   */
  private async processBatchQueue() {
    for (const [key, items] of this.batchQueue.entries()) {
      if (items.length >= 10 || Date.now() - items[0].timestamp > 3600000) {
        // Process batch when it reaches 10 items or after 1 hour
        this.addToQueue({
          id: randomUUID(),
          type: AITaskType.CROSS_CLIENT_PATTERNS,
          priority: AIPriority.BATCH,
          data: { items, batchKey: key },
          retryCount: 0,
          maxRetries: 2,
          createdAt: new Date()
        });
        
        this.batchQueue.delete(key);
      }
    }
  }

  /**
   * Helper method to generate multi-model insights with caching
   */
  private async generateMultiModelInsights(prompt: string, analysisType: string): Promise<any> {
    // Check cache first
    const cacheKey = `${analysisType}_${this.hashPrompt(prompt)}`;
    const cached = this.insightCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      console.log(`📦 Using cached insights for ${analysisType}`);
      return cached.data;
    }

    // Generate fresh insights
    const [openaiResult, claudeResult] = await Promise.allSettled([
      analyzeContent(prompt, 'session'),
      multiModelAI.generateDetailedInsights(prompt, analysisType)
    ]);

    const combined = this.combineMultiModelResults(openaiResult, claudeResult);
    
    // Cache the results
    this.insightCache.set(cacheKey, {
      data: combined,
      timestamp: Date.now()
    });

    // Clean old cache entries
    if (this.insightCache.size > 100) {
      const oldestKey = this.insightCache.keys().next().value;
      this.insightCache.delete(oldestKey);
    }

    return combined;
  }

  // Utility methods
  private buildEnhancedContext(client: any, recentNotes: any[], treatmentPlans: any[], previousInsights: any[]): string {
    return `
      Client Context:
      Name: ${client?.firstName} ${client?.lastName}
      Age: ${this.calculateAge(client?.dateOfBirth)}
      Primary Concerns: ${JSON.stringify(client?.primaryConcerns || [])}
      Risk Level: ${client?.riskLevel || 'unknown'}
      Treatment Duration: ${this.calculateTreatmentDuration(recentNotes)}
      
      Recent Session Themes (last 5 sessions):
      ${recentNotes.slice(0, 5).map(n => n.aiTags?.join(', ') || 'No tags').join('\n')}
      
      Active Treatment Goals:
      ${treatmentPlans.find(p => p.status === 'active')?.goals.map((g: any) => g.description).join('\n') || 'No active plan'}
      
      Previous AI Insights (last 3):
      ${previousInsights.slice(0, 3).map(i => `${i.insightType}: ${i.content}`).join('\n')}
    `;
  }

  private prepareSessionContent(sessionNote: any): string {
    return `
      Title: ${sessionNote.title || 'Session Note'}
      Date: ${sessionNote.createdAt}
      ${sessionNote.subjective ? `Subjective: ${sessionNote.subjective}` : ''}
      ${sessionNote.objective ? `Objective: ${sessionNote.objective}` : ''}
      ${sessionNote.assessment ? `Assessment: ${sessionNote.assessment}` : ''}
      ${sessionNote.plan ? `Plan: ${sessionNote.plan}` : ''}
      ${sessionNote.content ? `Content: ${sessionNote.content}` : ''}
      Tags: ${sessionNote.aiTags?.join(', ') || 'None'}
    `;
  }

  private calculateDuration(appointment: any): number {
    const start = new Date(appointment.startTime).getTime();
    const end = new Date(appointment.endTime).getTime();
    return Math.round((end - start) / (1000 * 60));
  }

  private calculateAge(dateOfBirth: string | undefined): number {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  private calculateTreatmentDuration(notes: any[]): string {
    if (notes.length === 0) return 'New client';
    const firstNote = notes[notes.length - 1];
    const daysDiff = Math.floor((Date.now() - new Date(firstNote.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 30) return `${daysDiff} days`;
    if (daysDiff < 365) return `${Math.floor(daysDiff / 30)} months`;
    return `${Math.floor(daysDiff / 365)} years`;
  }

  private combineAssessmentInsights(openaiResult: any, claudeResult: any): any {
    const insights = {
      summary: '',
      recommendations: [] as string[],
      priority: 'high' as 'low' | 'medium' | 'high',
      clinicalImpressions: [] as string[],
      assessmentTools: [] as string[],
      treatmentApproaches: [] as string[],
      riskFactors: [] as string[],
      sessionFrequency: '',
      explorationAreas: [] as string[],
      redFlags: [] as string[],
      modelsUsed: [] as string[]
    };

    // Process OpenAI results
    if (openaiResult.status === 'fulfilled' && openaiResult.value) {
      insights.recommendations.push(...(openaiResult.value.recommendations || []));
      insights.modelsUsed.push('OpenAI GPT-4o');
      if (openaiResult.value.insights?.length > 0) {
        insights.summary = openaiResult.value.insights.join(' ');
      }
    }

    // Process Claude results
    if (claudeResult.status === 'fulfilled' && claudeResult.value) {
      const content = typeof claudeResult.value.content === 'string' 
        ? claudeResult.value.content 
        : JSON.stringify(claudeResult.value.content);
      
      try {
        const parsed = JSON.parse(content);
        Object.keys(parsed).forEach(key => {
          if (Array.isArray(parsed[key]) && Array.isArray(insights[key as keyof typeof insights])) {
            (insights[key as keyof typeof insights] as any[]).push(...parsed[key]);
          } else if (typeof parsed[key] === 'string' && !insights[key as keyof typeof insights]) {
            (insights as any)[key] = parsed[key];
          }
        });
      } catch {
        if (!insights.summary) insights.summary = content;
      }
      insights.modelsUsed.push('Claude Sonnet 4');
    }

    // Remove duplicates from arrays
    Object.keys(insights).forEach(key => {
      if (Array.isArray(insights[key as keyof typeof insights])) {
        (insights as any)[key] = [...new Set(insights[key as keyof typeof insights] as any[])];
      }
    });

    return insights;
  }

  private combineMultiModelResults(openaiResult: any, claudeResult: any): any {
    const combined = {
      summary: '',
      recommendations: [] as string[],
      themes: [] as string[],
      priority: 'medium' as 'low' | 'medium' | 'high',
      actionRequired: false,
      confidence: 0,
      modelsUsed: [] as string[]
    };

    let confidenceScores = [];

    // Process results from both models
    if (openaiResult.status === 'fulfilled' && openaiResult.value) {
      const value = openaiResult.value;
      combined.recommendations.push(...(value.recommendations || []));
      combined.themes.push(...(value.themes || []));
      combined.modelsUsed.push('OpenAI GPT-4o');
      confidenceScores.push(85); // Default confidence for OpenAI
      
      if (value.insights?.length > 0) {
        combined.summary = value.insights.join(' ');
      }
      
      if (value.priority) combined.priority = value.priority;
    }

    if (claudeResult.status === 'fulfilled' && claudeResult.value) {
      const content = typeof claudeResult.value.content === 'string' 
        ? claudeResult.value.content 
        : JSON.stringify(claudeResult.value.content);
      
      try {
        const parsed = JSON.parse(content);
        combined.recommendations.push(...(parsed.recommendations || []));
        combined.themes.push(...(parsed.themes || []));
        if (parsed.priority && parsed.priority === 'high') {
          combined.priority = 'high';
        }
        if (parsed.actionRequired) combined.actionRequired = true;
        if (parsed.summary && !combined.summary) {
          combined.summary = parsed.summary;
        }
        confidenceScores.push(parsed.confidence || 85);
      } catch {
        if (!combined.summary) combined.summary = content;
        confidenceScores.push(75); // Lower confidence for unparsed
      }
      
      combined.modelsUsed.push('Claude Sonnet 4');
    }

    // Calculate average confidence
    if (confidenceScores.length > 0) {
      combined.confidence = Math.round(
        confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      );
    }

    // Remove duplicates
    combined.recommendations = [...new Set(combined.recommendations)];
    combined.themes = [...new Set(combined.themes)];

    return combined;
  }

  private async detectSessionPatterns(clientId: string, currentNote: any, insights: any): Promise<string[]> {
    const recentNotes = await storage.getRecentSessionNotes(clientId, 10);
    const patterns: string[] = [];

    // Theme recurrence
    const themeCounts = new Map<string, number>();
    recentNotes.forEach(note => {
      (note.aiTags || []).forEach((tag: string) => {
        themeCounts.set(tag, (themeCounts.get(tag) || 0) + 1);
      });
    });

    themeCounts.forEach((count, theme) => {
      if (count >= 3) {
        patterns.push(`Recurring theme: ${theme} (${count} sessions)`);
      }
    });

    // Emotional patterns
    if (insights.emotionalTone) {
      const emotionalPattern = this.detectEmotionalPattern(recentNotes, insights.emotionalTone);
      if (emotionalPattern) patterns.push(emotionalPattern);
    }

    return patterns;
  }

  private detectEmotionalPattern(notes: any[], currentTone: string): string | null {
    // Simple emotional pattern detection
    const tones = notes.map(n => n.metadata?.emotionalTone).filter(Boolean);
    if (tones.length >= 3) {
      const lastThree = tones.slice(-3);
      if (lastThree.every((t: string) => t === currentTone)) {
        return `Consistent ${currentTone} emotional tone (last 3 sessions)`;
      }
    }
    return null;
  }

  private detectUrgentIssuesInDocument(analysis: any, document: any): string[] {
    const urgentKeywords = [
      'suicidal', 'self-harm', 'danger', 'crisis', 'emergency',
      'abuse', 'violence', 'threat', 'severe', 'immediate'
    ];

    const issues: string[] = [];
    const content = (analysis.summary + ' ' + JSON.stringify(analysis.keyFindings)).toLowerCase();

    urgentKeywords.forEach(keyword => {
      if (content.includes(keyword)) {
        issues.push(`Document contains reference to: ${keyword}`);
      }
    });

    return issues;
  }

  private async createUrgentAlert(therapistId: string, clientId: string, issues: string[]) {
    await storage.createAiInsight({
      therapistId,
      clientId,
      insightType: 'urgent_alert',
      content: `URGENT: ${issues.join(', ')}`,
      recommendations: ['Immediate review required', 'Consider crisis intervention protocols'],
      priority: 'high',
      actionRequired: true,
      metadata: {
        urgentIssues: issues,
        alertedAt: new Date().toISOString()
      }
    });
  }

  private extractPatterns(notes: any[], insights: any[]): string[] {
    const patterns: string[] = [];
    
    // Extract patterns from notes and insights
    // Implementation simplified for brevity
    
    return patterns;
  }

  private assessRiskPatterns(notes: any[], insights: any[]): string[] {
    const risks: string[] = [];
    
    // Assess risk patterns
    // Implementation simplified for brevity
    
    return risks;
  }

  private identifyCrossClientPatterns(clientPatterns: any[]): string[] {
    const patterns: string[] = [];
    
    // Identify patterns across multiple clients
    // Implementation simplified for brevity
    
    return patterns;
  }

  private generatePatternRecommendations(patterns: string[]): string[] {
    return patterns.map(pattern => `Review and address pattern: ${pattern}`);
  }

  private getCurrentWeek(): string {
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    return `${weekStart.getFullYear()}-W${Math.ceil((weekStart.getDate() + 6) / 7)}`;
  }

  private extractWeeklyThemes(notes: any[]): string {
    const themes = new Map<string, number>();
    notes.forEach(note => {
      (note.aiTags || []).forEach((tag: string) => {
        themes.set(tag, (themes.get(tag) || 0) + 1);
      });
    });

    return Array.from(themes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme, count]) => `${theme} (${count})`)
      .join(', ');
  }

  private summarizeSessionThemes(notes: any[]): string {
    const themesBySession = notes.slice(0, 10).map((note, index) => 
      `Session ${index + 1}: ${(note.aiTags || []).join(', ') || 'No themes'}`
    );
    return themesBySession.join('\n');
  }

  private hashPrompt(prompt: string): string {
    // Simple hash for caching
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  private async processCrossClientPatterns(data: any) {
    // Implementation for cross-client pattern analysis
    console.log('Processing cross-client patterns...');
  }

  private async processPracticeAnalytics(data: any) {
    // Implementation for practice-wide analytics
    console.log('Processing practice analytics...');
  }

  private async processRiskAssessment(data: any) {
    const { clientId, therapistId } = data;
    
    // Get comprehensive client data for risk assessment
    const [client, recentNotes, insights] = await Promise.all([
      storage.getClient(clientId),
      storage.getRecentSessionNotes(clientId, 5),
      storage.getAiInsightsByClient(clientId)
    ]);

    // Build risk assessment prompt
    const riskPrompt = `
      Risk Assessment for Client:
      
      Client: ${client?.firstName} ${client?.lastName}
      Age: ${this.calculateAge(client?.dateOfBirth)}
      Primary Concerns: ${JSON.stringify(client?.primaryConcerns || [])}
      Current Risk Level: ${client?.riskLevel || 'Not assessed'}
      
      Recent Session Content:
      ${recentNotes.map(n => this.prepareSessionContent(n)).join('\n\n')}
      
      Previous Risk Indicators:
      ${insights.filter(i => i.priority === 'high').map(i => i.content).join('\n')}
      
      Please assess:
      1. Current risk level (low/medium/high)
      2. Specific risk factors present
      3. Protective factors
      4. Recommended interventions
      5. Monitoring frequency needed
      6. Crisis plan recommendations
    `;

    const riskAssessment = await this.generateMultiModelInsights(riskPrompt, 'risk_assessment');
    
    // Store risk assessment
    await storage.createAiInsight({
      therapistId,
      clientId,
      insightType: 'risk_assessment',
      content: riskAssessment.summary,
      recommendations: riskAssessment.recommendations,
      priority: riskAssessment.riskLevel === 'high' ? 'high' : 'medium',
      actionRequired: riskAssessment.riskLevel === 'high',
      metadata: {
        riskLevel: riskAssessment.riskLevel,
        riskFactors: riskAssessment.riskFactors,
        protectiveFactors: riskAssessment.protectiveFactors,
        monitoringFrequency: riskAssessment.monitoringFrequency,
        crisisPlan: riskAssessment.crisisPlan
      }
    });
  }

  private async processTreatmentPlanUpdate(data: any) {
    // Implementation for treatment plan updates
    console.log('Processing treatment plan update...');
  }
}

// Export singleton instance
export const enhancedAIAutomation = new EnhancedAIAutomationService();