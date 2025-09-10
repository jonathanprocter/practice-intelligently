import { analyzeContent, analyzeSessionTranscript, generateTherapeuticInsights } from './ai-services';
import { multiModelAI } from './ai-multi-model';
import { storage } from './storage';
import { randomUUID } from 'crypto';
import type { 
  SessionNote, InsertSessionNote, InsertAiInsight, 
  InsertSessionRecommendation, InsertSessionSummary,
  InsertTreatmentPlan, Client, Appointment
} from '../shared/schema';

/*
<important_code_snippet_instructions>
This service handles all automatic AI integrations in the therapy practice management system.
It is triggered automatically when data is created or updated, providing seamless AI insights.
</important_code_snippet_instructions>
*/

export class AIIntegrationService {
  /**
   * Automatically generate AI insights when a session note is created
   */
  async generateSessionNoteInsights(
    sessionNote: SessionNote,
    clientId: string,
    therapistId: string
  ): Promise<void> {
    try {
      console.log(`🤖 Generating AI insights for session note ${sessionNote.id}...`);
      
      // Prepare content for analysis
      const content = this.prepareSessionContent(sessionNote);
      
      // Get client context for better insights
      const client = await storage.getClient(clientId);
      const recentNotes = await storage.getSessionNotes(clientId);
      const context = this.buildClientContext(client, recentNotes);
      
      // Generate insights using multiple AI models
      const [openaiInsights, claudeInsights] = await Promise.allSettled([
        analyzeContent(content, 'session'),
        multiModelAI.generateDetailedInsights(content, 'clinical_session')
      ]);
      
      // Combine insights from different models
      const combinedInsights = this.combineInsights(openaiInsights, claudeInsights);
      
      // Store AI insights
      await storage.createAiInsight({
        therapistId,
        clientId,
        insightType: 'session_analysis',
        content: combinedInsights.summary,
        recommendations: combinedInsights.recommendations,
        priority: combinedInsights.priority || 'medium',
        actionRequired: combinedInsights.actionRequired || false,
        metadata: {
          sessionNoteId: sessionNote.id,
          themes: combinedInsights.themes,
          riskFactors: combinedInsights.riskFactors,
          progressIndicators: combinedInsights.progressIndicators,
          models: combinedInsights.modelsUsed
        }
      });
      
      // Generate treatment recommendations if patterns detected
      if (combinedInsights.patterns?.length > 0) {
        await this.generateTreatmentRecommendations(
          clientId,
          therapistId,
          combinedInsights.patterns
        );
      }
      
      console.log(`✅ AI insights generated for session note ${sessionNote.id}`);
    } catch (error) {
      console.error('Error generating session note insights:', error);
      // Don't throw - AI insights are supplementary, shouldn't break main flow
    }
  }

  /**
   * Generate predictive recommendations for next session
   */
  async generateNextSessionRecommendations(
    clientId: string,
    therapistId: string,
    appointmentId?: string
  ): Promise<any> {
    try {
      console.log(`🔮 Generating next session recommendations for client ${clientId}...`);
      
      // Get comprehensive client history
      const [client, sessionNotes, appointments, treatmentPlans] = await Promise.all([
        storage.getClient(clientId),
        storage.getSessionNotes(clientId),
        storage.getAppointmentsByClient(clientId),
        storage.getTreatmentPlansByClient(clientId)
      ]);
      
      // Analyze patterns and progress
      const analysisPrompt = this.buildSessionPrepPrompt(
        client,
        sessionNotes,
        treatmentPlans
      );
      
      // Generate recommendations using AI
      const recommendations = await multiModelAI.generateClinicalAnalysis(
        analysisPrompt,
        'session_preparation'
      );
      
      // Parse AI response
      const parsedRecommendations = this.parseRecommendations(recommendations.content);
      
      // Store session recommendation
      const sessionRecommendation = await storage.createSessionRecommendation({
        clientId,
        therapistId,
        appointmentId: appointmentId || null,
        focusAreas: parsedRecommendations.focusAreas || [],
        suggestedInterventions: parsedRecommendations.interventions || [],
        goalsToAddress: parsedRecommendations.goals || [],
        riskFactors: parsedRecommendations.riskFactors || [],
        preparationNotes: parsedRecommendations.summary || '',
        metadata: {
          analysisDate: new Date().toISOString(),
          modelUsed: recommendations.model,
          confidence: recommendations.confidence
        }
      });
      
      console.log(`✅ Next session recommendations generated for client ${clientId}`);
      return sessionRecommendation;
    } catch (error) {
      console.error('Error generating next session recommendations:', error);
      throw error;
    }
  }

  /**
   * Generate or update AI-powered treatment plan
   */
  async generateTreatmentPlan(
    clientId: string,
    therapistId: string,
    updateExisting: boolean = false
  ): Promise<any> {
    try {
      console.log(`📋 Generating treatment plan for client ${clientId}...`);
      
      // Gather comprehensive client data
      const [client, sessionNotes, assessments, existingPlans] = await Promise.all([
        storage.getClient(clientId),
        storage.getSessionNotes(clientId),
        storage.getAssessmentsByClient(clientId),
        storage.getTreatmentPlansByClient(clientId)
      ]);
      
      // Build treatment planning prompt
      const planningPrompt = this.buildTreatmentPlanPrompt(
        client,
        sessionNotes,
        assessments,
        existingPlans
      );
      
      // Generate treatment plan using AI
      const aiPlan = await multiModelAI.generateDetailedInsights(
        planningPrompt,
        'treatment_planning'
      );
      
      // Parse and structure the treatment plan
      const structuredPlan = this.parseTreatmentPlan(aiPlan.content);
      
      // Create or update treatment plan
      if (updateExisting && existingPlans.length > 0) {
        // Update the most recent plan
        const latestPlan = existingPlans[0];
        return await storage.updateTreatmentPlan(latestPlan.id, {
          goals: structuredPlan.goals,
          interventions: structuredPlan.interventions,
          progressMetrics: structuredPlan.metrics,
          reviewDate: structuredPlan.nextReview,
          notes: `AI-updated: ${structuredPlan.summary}`,
          updatedAt: new Date()
        });
      } else {
        // Create new treatment plan
        return await storage.createTreatmentPlan({
          clientId,
          therapistId,
          goals: structuredPlan.goals || [],
          interventions: structuredPlan.interventions || [],
          startDate: new Date(),
          reviewDate: structuredPlan.nextReview || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active',
          progressMetrics: structuredPlan.metrics || {},
          notes: structuredPlan.summary || ''
        });
      }
    } catch (error) {
      console.error('Error generating treatment plan:', error);
      throw error;
    }
  }

  /**
   * Auto-generate session summary after appointment completion
   */
  async generateSessionSummary(
    appointmentId: string,
    therapistId: string
  ): Promise<void> {
    try {
      console.log(`📝 Generating session summary for appointment ${appointmentId}...`);
      
      // Get appointment and related data
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        console.error(`Appointment ${appointmentId} not found`);
        return;
      }
      
      // Get session notes for this appointment
      const sessionNotes = await storage.getSessionNotesByAppointmentId(appointmentId);
      if (sessionNotes.length === 0) {
        console.log(`No session notes found for appointment ${appointmentId}`);
        return;
      }
      
      // Get client information
      const client = await storage.getClient(appointment.clientId);
      
      // Prepare content for summary
      const summaryContent = this.prepareSummaryContent(
        appointment,
        sessionNotes,
        client
      );
      
      // Generate summary using AI
      const aiSummary = await analyzeSessionTranscript(summaryContent);
      
      // Create session summary
      await storage.createSessionSummary({
        appointmentId,
        clientId: appointment.clientId,
        therapistId,
        summary: aiSummary.summary,
        keyThemes: aiSummary.keyPoints || [],
        breakthroughs: this.extractBreakthroughs(aiSummary),
        concerns: aiSummary.concernFlags || [],
        progressIndicators: aiSummary.progressIndicators || [],
        nextSteps: aiSummary.actionItems || [],
        metadata: {
          generatedAt: new Date().toISOString(),
          sessionDuration: this.calculateDuration(appointment),
          emotionalTone: aiSummary.emotionalTone
        }
      });
      
      console.log(`✅ Session summary generated for appointment ${appointmentId}`);
    } catch (error) {
      console.error('Error generating session summary:', error);
      // Don't throw - summaries are supplementary
    }
  }

  /**
   * Analyze uploaded documents in real-time
   */
  async analyzeUploadedDocument(
    documentId: string,
    content: string,
    metadata: any
  ): Promise<any> {
    try {
      console.log(`📄 Analyzing uploaded document ${documentId}...`);
      
      // Determine document type and context
      const documentType = this.detectDocumentType(content, metadata);
      
      // Generate appropriate analysis based on type
      const analysis = await multiModelAI.generateClinicalAnalysis(
        content,
        `document_analysis_${documentType}`
      );
      
      // Extract key information
      const extractedInfo = await this.extractDocumentInsights(
        content,
        documentType,
        analysis
      );
      
      // Check for urgent issues
      const urgentIssues = this.detectUrgentIssues(extractedInfo);
      
      // Store analysis results
      const aiAnalysis = {
        documentType,
        insights: extractedInfo.insights,
        clinicalRelevance: extractedInfo.clinicalRelevance,
        keyPoints: extractedInfo.keyPoints,
        urgentFlags: urgentIssues,
        metadata: {
          analyzedAt: new Date().toISOString(),
          modelUsed: analysis.model,
          confidence: analysis.confidence
        }
      };
      
      // Create AI insight if urgent issues detected
      if (urgentIssues.length > 0) {
        await storage.createAiInsight({
          therapistId: metadata.therapistId,
          clientId: metadata.clientId,
          insightType: 'urgent_document_flag',
          content: `Urgent issues detected in uploaded document: ${urgentIssues.join(', ')}`,
          recommendations: ['Review document immediately', 'Consider immediate intervention'],
          priority: 'high',
          actionRequired: true,
          metadata: {
            documentId,
            urgentIssues
          }
        });
      }
      
      console.log(`✅ Document ${documentId} analyzed successfully`);
      return aiAnalysis;
    } catch (error) {
      console.error('Error analyzing document:', error);
      throw error;
    }
  }

  // Helper methods
  private prepareSessionContent(sessionNote: SessionNote): string {
    let content = sessionNote.content || '';
    
    if (sessionNote.subjective || sessionNote.objective || sessionNote.assessment || sessionNote.plan) {
      content = `
        Title: ${sessionNote.title || 'Session Note'}
        Subjective: ${sessionNote.subjective || 'N/A'}
        Objective: ${sessionNote.objective || 'N/A'}
        Assessment: ${sessionNote.assessment || 'N/A'}
        Plan: ${sessionNote.plan || 'N/A'}
      `;
    }
    
    return content;
  }

  private buildClientContext(client: Client | undefined, recentNotes: SessionNote[]): string {
    if (!client) return '';
    
    const recentThemes = recentNotes
      .slice(0, 5)
      .map(note => note.aiTags || [])
      .flat()
      .filter(Boolean);
    
    return `
      Client: ${client.firstName} ${client.lastName}
      Primary Concerns: ${JSON.stringify(client.primaryConcerns || [])}
      Recent Session Themes: ${recentThemes.join(', ')}
      Risk Level: ${client.riskLevel || 'unknown'}
    `;
  }

  private combineInsights(openaiResult: PromiseSettledResult<any>, claudeResult: PromiseSettledResult<any>): any {
    const insights = {
      summary: '',
      recommendations: [] as string[],
      themes: [] as string[],
      priority: 'medium' as 'low' | 'medium' | 'high',
      actionRequired: false,
      riskFactors: [] as string[],
      progressIndicators: [] as string[],
      patterns: [] as string[],
      modelsUsed: [] as string[]
    };
    
    // Collect from OpenAI
    if (openaiResult.status === 'fulfilled' && openaiResult.value) {
      insights.recommendations.push(...(openaiResult.value.recommendations || []));
      insights.themes.push(...(openaiResult.value.themes || []));
      insights.priority = openaiResult.value.priority || insights.priority;
      insights.modelsUsed.push('OpenAI GPT-4o');
      
      if (openaiResult.value.insights?.length > 0) {
        insights.summary = openaiResult.value.insights.join(' ');
      }
    }
    
    // Collect from Claude
    if (claudeResult.status === 'fulfilled' && claudeResult.value) {
      const claudeContent = typeof claudeResult.value.content === 'string' 
        ? claudeResult.value.content 
        : JSON.stringify(claudeResult.value.content);
      
      // Try to parse if it's JSON
      try {
        const parsed = JSON.parse(claudeContent);
        insights.recommendations.push(...(parsed.recommendations || []));
        insights.themes.push(...(parsed.themes || []));
        insights.riskFactors.push(...(parsed.riskFactors || []));
        insights.progressIndicators.push(...(parsed.progressIndicators || []));
      } catch {
        // If not JSON, add as summary
        if (!insights.summary) {
          insights.summary = claudeContent;
        }
      }
      
      insights.modelsUsed.push('Claude Sonnet 4');
    }
    
    // Remove duplicates
    insights.recommendations = [...new Set(insights.recommendations)];
    insights.themes = [...new Set(insights.themes)];
    insights.riskFactors = [...new Set(insights.riskFactors)];
    insights.progressIndicators = [...new Set(insights.progressIndicators)];
    
    // Determine if action is required
    insights.actionRequired = insights.priority === 'high' || insights.riskFactors.length > 0;
    
    return insights;
  }

  private async generateTreatmentRecommendations(
    clientId: string,
    therapistId: string,
    patterns: string[]
  ): Promise<void> {
    try {
      const recommendations = patterns.map(pattern => ({
        pattern,
        recommendation: `Consider addressing pattern: ${pattern}`
      }));
      
      await storage.createAiInsight({
        therapistId,
        clientId,
        insightType: 'treatment_recommendation',
        content: `Patterns detected that may benefit from targeted interventions`,
        recommendations: recommendations.map(r => r.recommendation),
        priority: 'medium',
        actionRequired: false,
        metadata: { patterns }
      });
    } catch (error) {
      console.error('Error generating treatment recommendations:', error);
    }
  }

  private buildSessionPrepPrompt(
    client: Client | undefined,
    sessionNotes: SessionNote[],
    treatmentPlans: any[]
  ): string {
    const recentNotes = sessionNotes.slice(0, 5);
    const activePlan = treatmentPlans.find(p => p.status === 'active');
    
    return `
      Prepare recommendations for the next therapy session with:
      
      Client: ${client?.firstName} ${client?.lastName}
      Primary Concerns: ${JSON.stringify(client?.primaryConcerns || [])}
      Risk Level: ${client?.riskLevel || 'unknown'}
      
      Recent Session Themes:
      ${recentNotes.map(note => `- ${note.aiTags?.join(', ') || 'No tags'}`).join('\n')}
      
      Current Treatment Goals:
      ${activePlan ? JSON.stringify(activePlan.goals) : 'No active treatment plan'}
      
      Please provide:
      1. Focus areas for next session
      2. Suggested therapeutic interventions
      3. Goals to address
      4. Any risk factors to monitor
      5. Preparation notes for the therapist
    `;
  }

  private parseRecommendations(content: string): any {
    // Try to parse JSON response
    try {
      return JSON.parse(content);
    } catch {
      // Parse text response
      const recommendations = {
        focusAreas: [] as string[],
        interventions: [] as string[],
        goals: [] as string[],
        riskFactors: [] as string[],
        summary: content
      };
      
      // Extract sections using regex
      const focusMatch = content.match(/focus areas?:?(.*?)(?:suggested|goals|risk|$)/is);
      const interventionMatch = content.match(/interventions?:?(.*?)(?:goals|risk|preparation|$)/is);
      const goalsMatch = content.match(/goals?:?(.*?)(?:risk|preparation|$)/is);
      const riskMatch = content.match(/risk factors?:?(.*?)(?:preparation|$)/is);
      
      if (focusMatch) {
        recommendations.focusAreas = this.extractListItems(focusMatch[1]);
      }
      if (interventionMatch) {
        recommendations.interventions = this.extractListItems(interventionMatch[1]);
      }
      if (goalsMatch) {
        recommendations.goals = this.extractListItems(goalsMatch[1]);
      }
      if (riskMatch) {
        recommendations.riskFactors = this.extractListItems(riskMatch[1]);
      }
      
      return recommendations;
    }
  }

  private extractListItems(text: string): string[] {
    const items = text
      .split(/[\n•\-\d\.]+/)
      .map(item => item.trim())
      .filter(item => item.length > 5);
    
    return items;
  }

  private buildTreatmentPlanPrompt(
    client: Client | undefined,
    sessionNotes: SessionNote[],
    assessments: any[],
    existingPlans: any[]
  ): string {
    return `
      Generate a comprehensive treatment plan for:
      
      Client: ${client?.firstName} ${client?.lastName}
      Primary Concerns: ${JSON.stringify(client?.primaryConcerns || [])}
      
      Session History Summary:
      Total Sessions: ${sessionNotes.length}
      Recent Themes: ${sessionNotes.slice(0, 5).map(n => n.aiTags?.join(', ')).join('; ')}
      
      Assessment Results:
      ${assessments.map(a => `${a.assessmentType}: Score ${a.score}`).join('\n')}
      
      Previous Treatment Plans:
      ${existingPlans.map(p => `Goals: ${JSON.stringify(p.goals)}`).join('\n')}
      
      Please provide:
      1. Treatment goals (short-term and long-term)
      2. Recommended interventions
      3. Progress metrics to track
      4. Suggested review date
      5. Overall treatment approach summary
    `;
  }

  private parseTreatmentPlan(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      // Parse text response
      const plan = {
        goals: [] as any[],
        interventions: [] as any[],
        metrics: {} as any,
        nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        summary: content
      };
      
      // Extract goals
      const goalsMatch = content.match(/goals?:?(.*?)(?:interventions|metrics|review|$)/is);
      if (goalsMatch) {
        const goalItems = this.extractListItems(goalsMatch[1]);
        plan.goals = goalItems.map(goal => ({
          description: goal,
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          status: 'active'
        }));
      }
      
      // Extract interventions
      const interventionsMatch = content.match(/interventions?:?(.*?)(?:metrics|review|$)/is);
      if (interventionsMatch) {
        plan.interventions = this.extractListItems(interventionsMatch[1]);
      }
      
      return plan;
    }
  }

  private prepareSummaryContent(
    appointment: Appointment,
    sessionNotes: SessionNote[],
    client: Client | undefined
  ): string {
    const noteContent = sessionNotes
      .map(note => this.prepareSessionContent(note))
      .join('\n\n');
    
    return `
      Session Summary for ${client?.firstName} ${client?.lastName}
      Date: ${appointment.startTime}
      Type: ${appointment.type}
      
      Session Notes:
      ${noteContent}
      
      Please provide:
      1. Executive summary of the session
      2. Key themes discussed
      3. Any breakthroughs or significant moments
      4. Concerns to monitor
      5. Progress indicators
      6. Recommended next steps
    `;
  }

  private extractBreakthroughs(aiSummary: any): string[] {
    const breakthroughs: string[] = [];
    
    // Look for positive indicators in the summary
    if (aiSummary.progressIndicators?.length > 0) {
      breakthroughs.push(...aiSummary.progressIndicators.filter((indicator: string) => 
        indicator.toLowerCase().includes('breakthrough') ||
        indicator.toLowerCase().includes('significant') ||
        indicator.toLowerCase().includes('major progress')
      ));
    }
    
    // Check emotional tone for positive shifts
    if (aiSummary.emotionalTone?.includes('positive')) {
      breakthroughs.push('Positive emotional shift observed');
    }
    
    return breakthroughs;
  }

  private calculateDuration(appointment: Appointment): number {
    const start = new Date(appointment.startTime).getTime();
    const end = new Date(appointment.endTime).getTime();
    return Math.round((end - start) / (1000 * 60)); // Duration in minutes
  }

  private detectDocumentType(content: string, metadata: any): string {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('assessment') || lowerContent.includes('evaluation')) {
      return 'assessment';
    }
    if (lowerContent.includes('progress note') || lowerContent.includes('session note')) {
      return 'progress_note';
    }
    if (lowerContent.includes('treatment plan') || lowerContent.includes('care plan')) {
      return 'treatment_plan';
    }
    if (lowerContent.includes('discharge') || lowerContent.includes('termination')) {
      return 'discharge_summary';
    }
    if (metadata.fileType?.includes('image')) {
      return 'clinical_image';
    }
    
    return 'general_document';
  }

  private async extractDocumentInsights(
    content: string,
    documentType: string,
    analysis: any
  ): Promise<any> {
    const insights = {
      insights: [] as string[],
      clinicalRelevance: '',
      keyPoints: [] as string[],
      extractedData: {} as any
    };
    
    // Parse AI analysis
    const analysisContent = typeof analysis.content === 'string' 
      ? analysis.content 
      : JSON.stringify(analysis.content);
    
    // Extract insights based on document type
    switch (documentType) {
      case 'assessment':
        insights.clinicalRelevance = 'High - Assessment results impact treatment planning';
        insights.keyPoints.push('New assessment data available for review');
        break;
      
      case 'progress_note':
        insights.clinicalRelevance = 'High - Contains session information';
        insights.keyPoints.push('Progress note requires review and integration');
        break;
      
      case 'treatment_plan':
        insights.clinicalRelevance = 'Critical - Defines treatment approach';
        insights.keyPoints.push('Treatment plan document uploaded');
        break;
      
      default:
        insights.clinicalRelevance = 'Medium - General clinical document';
    }
    
    // Add AI-generated insights
    try {
      const parsed = JSON.parse(analysisContent);
      insights.insights.push(...(parsed.insights || []));
      insights.keyPoints.push(...(parsed.keyPoints || []));
    } catch {
      insights.insights.push(analysisContent.substring(0, 500));
    }
    
    return insights;
  }

  private detectUrgentIssues(extractedInfo: any): string[] {
    const urgentIssues: string[] = [];
    const urgentKeywords = [
      'suicide', 'self-harm', 'danger', 'crisis', 'emergency',
      'abuse', 'violence', 'threat', 'immediate', 'urgent'
    ];
    
    const contentToCheck = [
      ...extractedInfo.insights,
      ...extractedInfo.keyPoints,
      extractedInfo.clinicalRelevance
    ].join(' ').toLowerCase();
    
    for (const keyword of urgentKeywords) {
      if (contentToCheck.includes(keyword)) {
        urgentIssues.push(`Document contains reference to: ${keyword}`);
      }
    }
    
    return urgentIssues;
  }
}

// Export singleton instance
export const aiIntegrationService = new AIIntegrationService();