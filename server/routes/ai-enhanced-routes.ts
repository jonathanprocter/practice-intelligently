/**
 * AI-Enhanced Routes
 * 
 * Comprehensive AI integration throughout the application
 * Using OpenAI as primary, Anthropic as secondary with intelligent load balancing
 */

import { Express, Request, Response } from 'express';
import { aiOrchestrator } from '../ai-orchestrator';
import { storage } from '../storage';
import { Logger } from '../fixes/critical-bugs-and-improvements';
import { z } from 'zod';

// Schemas for validation
const generateInsightsSchema = z.object({
  clientId: z.string(),
  includeDocuments: z.boolean().default(true),
  includeSessionNotes: z.boolean().default(true),
  includeAppointments: z.boolean().default(true),
  timeRange: z.enum(['last_month', 'last_3_months', 'last_6_months', 'all']).default('last_6_months')
});

const suggestInterventionsSchema = z.object({
  clientId: z.string(),
  symptoms: z.array(z.string()),
  currentInterventions: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional()
});

export function registerAIEnhancedRoutes(app: Express) {
  
  /**
   * Generate comprehensive client insights using AI
   */
  app.post('/api/ai/generate-client-insights', async (req: Request, res: Response) => {
    try {
      const params = generateInsightsSchema.parse(req.body);
      
      Logger.info('Generating AI insights for client', { clientId: params.clientId });
      
      // Fetch all relevant data
      const [client, sessionNotes, appointments, documents] = await Promise.all([
        storage.getClient(params.clientId),
        params.includeSessionNotes ? storage.getSessionNotesByClientId(params.clientId) : [],
        params.includeAppointments ? storage.getClientAppointments(params.clientId) : [],
        params.includeDocuments ? storage.getClientDocuments(params.clientId) : []
      ]);

      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Prepare context for AI analysis
      const context = {
        clientName: `${client.firstName} ${client.lastName}`,
        age: calculateAge(client.dateOfBirth),
        diagnosis: client.diagnosis || [],
        treatmentGoals: client.treatmentGoals || [],
        sessionCount: sessionNotes.length,
        appointmentCount: appointments.length,
        documentCount: documents.length
      };

      // Filter data by time range
      const cutoffDate = getCutoffDate(params.timeRange);
      const recentNotes = sessionNotes.filter((n: any) => new Date(n.createdAt) >= cutoffDate);
      const recentAppointments = appointments.filter((a: any) => new Date(a.startTime) >= cutoffDate);

      // Prepare comprehensive prompt
      const analysisPrompt = buildComprehensiveAnalysisPrompt(
        client,
        recentNotes,
        recentAppointments,
        documents
      );

      // Generate insights using AI orchestrator
      const insights = await aiOrchestrator.executeTask(
        analysisPrompt,
        {
          type: 'analysis',
          complexity: 'complex',
          maxTokens: 3000
        },
        context
      );

      // Parse and structure the response
      const structuredInsights = parseAIInsights(insights.content);
      
      // Generate additional specialized insights
      const [treatmentProgress, riskAssessment, recommendations] = await Promise.all([
        generateTreatmentProgress(recentNotes, context),
        assessRiskFactors(recentNotes, client, context),
        generateRecommendations(structuredInsights, client, context)
      ]);

      const finalInsights = {
        ...structuredInsights,
        treatmentProgress,
        riskAssessment,
        recommendations,
        metadata: {
          generatedAt: new Date(),
          provider: insights.provider,
          dataRange: params.timeRange,
          notesAnalyzed: recentNotes.length,
          appointmentsAnalyzed: recentAppointments.length
        }
      };

      // Cache the insights
      await storage.cacheClientInsights(params.clientId, finalInsights);

      res.json(finalInsights);
      
    } catch (error) {
      Logger.error('Error generating client insights', error);
      res.status(500).json({ 
        error: 'Failed to generate insights',
        details: error.message 
      });
    }
  });

  /**
   * Get cached AI insights for a client
   */
  app.get('/api/ai/client-insights/:clientId', async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      
      const cached = await storage.getCachedClientInsights(clientId);
      
      if (!cached) {
        return res.status(404).json({ 
          error: 'No insights available',
          message: 'Generate insights first using POST /api/ai/generate-client-insights'
        });
      }

      res.json(cached);
      
    } catch (error) {
      Logger.error('Error fetching cached insights', error);
      res.status(500).json({ error: 'Failed to fetch insights' });
    }
  });

  /**
   * AI-powered session preparation
   */
  app.post('/api/ai/prepare-session', async (req: Request, res: Response) => {
    try {
      const { clientId, appointmentId } = req.body;
      
      // Fetch relevant data
      const [client, recentNotes, lastAppointment] = await Promise.all([
        storage.getClient(clientId),
        storage.getRecentSessionNotes(clientId, 5),
        appointmentId ? storage.getAppointment(appointmentId) : null
      ]);

      const prompt = `Prepare a therapy session briefing for ${client.firstName} ${client.lastName}.
      
Recent session themes:
${recentNotes.map((n: any) => `- ${n.title || 'Session'}: ${n.assessment || n.content?.substring(0, 100)}`).join('\n')}

Treatment goals: ${client.treatmentGoals?.join(', ') || 'Not specified'}

Provide:
1. Key topics to address
2. Suggested interventions
3. Questions to ask
4. Progress indicators to monitor
5. Potential challenges`;

      const preparation = await aiOrchestrator.executeTask(
        prompt,
        {
          type: 'generation',
          complexity: 'moderate',
          maxTokens: 1500
        },
        { clientName: `${client.firstName} ${client.lastName}` }
      );

      res.json({
        clientName: `${client.firstName} ${client.lastName}`,
        sessionDate: lastAppointment?.startTime || new Date(),
        preparation: parseSessionPrep(preparation.content),
        provider: preparation.provider
      });
      
    } catch (error) {
      Logger.error('Error preparing session', error);
      res.status(500).json({ error: 'Failed to prepare session' });
    }
  });

  /**
   * AI-powered intervention suggestions
   */
  app.post('/api/ai/suggest-interventions', async (req: Request, res: Response) => {
    try {
      const params = suggestInterventionsSchema.parse(req.body);
      
      const client = await storage.getClient(params.clientId);
      
      const prompt = `Suggest evidence-based therapeutic interventions for a client with:
      
Symptoms: ${params.symptoms.join(', ')}
Current interventions: ${params.currentInterventions?.join(', ') || 'None'}
Contraindications: ${params.contraindications?.join(', ') || 'None'}
Diagnosis: ${client.diagnosis?.join(', ') || 'Not specified'}

Provide 5-7 specific, actionable interventions with:
1. Intervention name
2. Brief description
3. Evidence base
4. Implementation steps
5. Expected outcomes
6. Potential risks or considerations`;

      const suggestions = await aiOrchestrator.executeTask(
        prompt,
        {
          type: 'generation',
          complexity: 'complex',
          requiresCitations: true
        },
        { clientName: `${client.firstName} ${client.lastName}` }
      );

      res.json({
        interventions: parseInterventions(suggestions.content),
        provider: suggestions.provider
      });
      
    } catch (error) {
      Logger.error('Error suggesting interventions', error);
      res.status(500).json({ error: 'Failed to suggest interventions' });
    }
  });

  /**
   * AI-powered document analysis and tagging
   */
  app.post('/api/ai/analyze-document', async (req: Request, res: Response) => {
    try {
      const { documentId, content, fileName, clientId } = req.body;
      
      const analysis = await aiOrchestrator.processDocument(
        content,
        {
          fileName,
          fileType: getFileType(fileName),
          clientId,
          clientName: clientId ? (await storage.getClient(clientId))?.firstName : undefined
        }
      );

      // Store analysis results
      if (documentId) {
        await storage.updateDocumentAnalysis(documentId, analysis);
      }

      res.json(analysis);
      
    } catch (error) {
      Logger.error('Error analyzing document', error);
      res.status(500).json({ error: 'Failed to analyze document' });
    }
  });

  /**
   * AI-powered treatment plan generation
   */
  app.post('/api/ai/generate-treatment-plan', async (req: Request, res: Response) => {
    try {
      const { clientId, duration = '3_months', focus } = req.body;
      
      const [client, recentNotes, insights] = await Promise.all([
        storage.getClient(clientId),
        storage.getRecentSessionNotes(clientId, 10),
        storage.getCachedClientInsights(clientId)
      ]);

      const prompt = `Create a comprehensive treatment plan for ${client.firstName} ${client.lastName}.

Client Information:
- Diagnosis: ${client.diagnosis?.join(', ') || 'Not specified'}
- Treatment Goals: ${client.treatmentGoals?.join(', ') || 'Not specified'}
- Current Medications: ${client.medications?.join(', ') || 'None'}

Recent Progress:
${insights?.treatmentProgress?.summary || 'No recent insights available'}

Duration: ${duration.replace('_', ' ')}
Focus Areas: ${focus?.join(', ') || 'General mental health'}

Generate a detailed treatment plan including:
1. Primary objectives (SMART goals)
2. Intervention strategies
3. Session frequency and structure
4. Homework assignments
5. Progress measurement criteria
6. Risk management strategies
7. Collaboration with other providers
8. Discharge criteria`;

      const plan = await aiOrchestrator.executeTask(
        prompt,
        {
          type: 'generation',
          complexity: 'complex',
          maxTokens: 2500
        },
        { clientName: `${client.firstName} ${client.lastName}` }
      );

      const structuredPlan = parseTreatmentPlan(plan.content);
      
      // Save the treatment plan
      await storage.saveTreatmentPlan({
        clientId,
        plan: structuredPlan,
        createdAt: new Date(),
        createdBy: req.session?.therapistId || 'system'
      });

      res.json(structuredPlan);
      
    } catch (error) {
      Logger.error('Error generating treatment plan', error);
      res.status(500).json({ error: 'Failed to generate treatment plan' });
    }
  });

  /**
   * AI-powered progress note generation from session audio/transcript
   */
  app.post('/api/ai/generate-progress-note', async (req: Request, res: Response) => {
    try {
      const { transcript, clientId, sessionDate, duration } = req.body;
      
      const client = await storage.getClient(clientId);
      
      const prompt = `Convert this therapy session transcript into a professional SOAP progress note.

Client: ${client.firstName} ${client.lastName}
Session Date: ${sessionDate}
Duration: ${duration} minutes

Transcript:
${transcript}

Generate a comprehensive SOAP note with:
- Subjective: Client's reported experiences, feelings, and concerns
- Objective: Observable behaviors, affect, appearance, engagement
- Assessment: Clinical impressions, progress toward goals, risk assessment
- Plan: Interventions used, homework assigned, next session focus

Also identify:
- Key therapeutic moments
- Progress indicators
- Risk factors
- Recommendations for next session`;

      const progressNote = await aiOrchestrator.executeTask(
        prompt,
        {
          type: 'extraction',
          complexity: 'complex',
          maxTokens: 2000
        },
        { 
          clientName: `${client.firstName} ${client.lastName}`,
          sessionDate 
        }
      );

      const structured = parseProgressNote(progressNote.content);
      
      res.json({
        ...structured,
        clientId,
        sessionDate,
        duration,
        provider: progressNote.provider
      });
      
    } catch (error) {
      Logger.error('Error generating progress note', error);
      res.status(500).json({ error: 'Failed to generate progress note' });
    }
  });

  /**
   * AI-powered crisis risk assessment
   */
  app.post('/api/ai/assess-crisis-risk', async (req: Request, res: Response) => {
    try {
      const { clientId, indicators, recentEvents } = req.body;
      
      const [client, recentNotes] = await Promise.all([
        storage.getClient(clientId),
        storage.getRecentSessionNotes(clientId, 3)
      ]);

      const prompt = `Perform a crisis risk assessment for ${client.firstName} ${client.lastName}.

Current Indicators:
${indicators.join('\n')}

Recent Events:
${recentEvents.join('\n')}

Recent Session Content:
${recentNotes.map((n: any) => n.assessment || n.content?.substring(0, 200)).join('\n\n')}

Assess:
1. Immediate risk level (Low/Moderate/High/Critical)
2. Specific risk factors present
3. Protective factors
4. Recommended immediate actions
5. Safety plan components
6. Follow-up requirements

Provide evidence-based assessment following clinical best practices.`;

      const assessment = await aiOrchestrator.executeTask(
        prompt,
        {
          type: 'analysis',
          complexity: 'complex',
          maxTokens: 1500
        },
        { clientName: `${client.firstName} ${client.lastName}` }
      );

      const structured = parseCrisisAssessment(assessment.content);
      
      // Log high-risk assessments
      if (structured.riskLevel === 'High' || structured.riskLevel === 'Critical') {
        Logger.warn('High risk assessment generated', {
          clientId,
          riskLevel: structured.riskLevel
        });
        
        // Create alert for therapist
        await storage.createAlert({
          type: 'crisis_risk',
          clientId,
          severity: structured.riskLevel.toLowerCase(),
          message: `Crisis risk assessment: ${structured.riskLevel}`,
          data: structured
        });
      }

      res.json(structured);
      
    } catch (error) {
      Logger.error('Error assessing crisis risk', error);
      res.status(500).json({ error: 'Failed to assess crisis risk' });
    }
  });

  /**
   * Get AI service health and metrics
   */
  app.get('/api/ai/health', async (req: Request, res: Response) => {
    try {
      const metrics = aiOrchestrator.getMetrics();
      
      res.json({
        status: 'healthy',
        ...metrics,
        recommendations: [
          metrics.metrics.avgResponseTime > 5000 && 'Consider caching frequent requests',
          metrics.metrics.estimatedCostPerRequest > 0.10 && 'High cost per request - consider optimizing prompts',
          metrics.metrics.successRate < 0.95 && 'Low success rate - check API keys and quotas'
        ].filter(Boolean)
      });
      
    } catch (error) {
      res.status(500).json({ 
        status: 'unhealthy',
        error: error.message 
      });
    }
  });
}

// Helper functions

function calculateAge(dateOfBirth: string | undefined): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getCutoffDate(timeRange: string): Date {
  const now = new Date();
  switch (timeRange) {
    case 'last_month':
      return new Date(now.setMonth(now.getMonth() - 1));
    case 'last_3_months':
      return new Date(now.setMonth(now.getMonth() - 3));
    case 'last_6_months':
      return new Date(now.setMonth(now.getMonth() - 6));
    default:
      return new Date(0); // All time
  }
}

function buildComprehensiveAnalysisPrompt(
  client: any,
  notes: any[],
  appointments: any[],
  documents: any[]
): string {
  return `Analyze the comprehensive clinical data for ${client.firstName} ${client.lastName}.

Client Profile:
- Age: ${calculateAge(client.dateOfBirth) || 'Unknown'}
- Diagnosis: ${client.diagnosis?.join(', ') || 'Not specified'}
- Treatment Goals: ${client.treatmentGoals?.join(', ') || 'Not specified'}

Session History (${notes.length} recent sessions):
${notes.slice(0, 10).map(n => `
- ${n.sessionDate || n.createdAt}: ${n.title || 'Session'}
  Assessment: ${n.assessment || 'N/A'}
  Key Points: ${n.keyPoints?.join(', ') || 'N/A'}
`).join('\n')}

Appointments (${appointments.length} total):
- Completed: ${appointments.filter((a: any) => a.status === 'completed').length}
- Scheduled: ${appointments.filter((a: any) => a.status === 'scheduled').length}
- No-shows: ${appointments.filter((a: any) => a.status === 'no_show').length}

Documents: ${documents.length} total

Provide a comprehensive analysis including:
1. Treatment Progress Summary
2. Key Themes and Patterns
3. Strengths Identified
4. Risk Factors
5. Clinical Recommendations
6. Suggested Next Steps`;
}

function parseAIInsights(content: string): any {
  // Parse AI response into structured format
  const sections = content.split(/\n\d+\.\s+/);
  
  return {
    treatmentProgress: {
      summary: sections[1]?.trim() || '',
      trend: detectTrend(sections[1] || ''),
      confidence: 0.85
    },
    keyThemes: extractBulletPoints(sections[2] || ''),
    strengths: extractBulletPoints(sections[3] || ''),
    riskFactors: extractBulletPoints(sections[4] || ''),
    recommendations: extractBulletPoints(sections[5] || ''),
    nextSteps: extractBulletPoints(sections[6] || '')
  };
}

function detectTrend(text: string): 'improving' | 'stable' | 'declining' | 'unknown' {
  const improving = /improv|progress|better|positive|gain/i;
  const declining = /declin|worse|deteriorat|concern|regress/i;
  const stable = /stable|maintain|consistent|steady/i;
  
  if (improving.test(text)) return 'improving';
  if (declining.test(text)) return 'declining';
  if (stable.test(text)) return 'stable';
  return 'unknown';
}

function extractBulletPoints(text: string): string[] {
  return text
    .split(/[\n•\-*]/)
    .map(line => line.trim())
    .filter(line => line.length > 10);
}

async function generateTreatmentProgress(notes: any[], context: any): Promise<any> {
  // Analyze notes for progress indicators
  const progressIndicators = notes.map(n => ({
    date: n.sessionDate || n.createdAt,
    mood: n.objective?.includes('mood') || n.assessment?.includes('mood'),
    engagement: n.objective?.includes('engaged') || n.objective?.includes('cooperative'),
    homework: n.plan?.includes('homework') || n.plan?.includes('assignment')
  }));

  return {
    sessionFrequency: calculateSessionFrequency(notes),
    consistency: calculateConsistency(progressIndicators),
    engagementLevel: calculateEngagement(progressIndicators),
    homeworkCompliance: calculateHomeworkCompliance(progressIndicators)
  };
}

function calculateSessionFrequency(notes: any[]): string {
  if (notes.length < 2) return 'Insufficient data';
  
  const dates = notes.map(n => new Date(n.sessionDate || n.createdAt)).sort();
  const intervals = [];
  
  for (let i = 1; i < dates.length; i++) {
    intervals.push(dates[i].getTime() - dates[i-1].getTime());
  }
  
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const avgDays = avgInterval / (1000 * 60 * 60 * 24);
  
  if (avgDays < 7) return 'Multiple times per week';
  if (avgDays <= 7) return 'Weekly';
  if (avgDays <= 14) return 'Bi-weekly';
  if (avgDays <= 30) return 'Monthly';
  return 'Irregular';
}

function calculateConsistency(indicators: any[]): number {
  // Calculate consistency score 0-1
  return 0.75; // Placeholder
}

function calculateEngagement(indicators: any[]): string {
  const engaged = indicators.filter(i => i.engagement).length;
  const ratio = engaged / indicators.length;
  
  if (ratio > 0.8) return 'High';
  if (ratio > 0.5) return 'Moderate';
  return 'Low';
}

function calculateHomeworkCompliance(indicators: any[]): string {
  const completed = indicators.filter(i => i.homework).length;
  const ratio = completed / indicators.length;
  
  if (ratio > 0.7) return 'Good';
  if (ratio > 0.4) return 'Fair';
  return 'Poor';
}

async function assessRiskFactors(notes: any[], client: any, context: any): Promise<any> {
  const riskKeywords = [
    'suicide', 'self-harm', 'harm', 'danger', 'crisis',
    'hospital', 'emergency', 'safety', 'risk'
  ];
  
  const risks = [];
  
  for (const note of notes) {
    const content = `${note.content} ${note.assessment} ${note.plan}`.toLowerCase();
    for (const keyword of riskKeywords) {
      if (content.includes(keyword)) {
        risks.push({
          date: note.sessionDate || note.createdAt,
          keyword,
          context: content.substring(content.indexOf(keyword) - 50, content.indexOf(keyword) + 50)
        });
      }
    }
  }
  
  return {
    identified: risks.length > 0,
    count: risks.length,
    recent: risks.slice(0, 3),
    level: risks.length === 0 ? 'Low' : risks.length < 3 ? 'Moderate' : 'High'
  };
}

async function generateRecommendations(insights: any, client: any, context: any): Promise<string[]> {
  const recommendations = [];
  
  if (insights.treatmentProgress?.trend === 'declining') {
    recommendations.push('Consider adjusting treatment approach or increasing session frequency');
  }
  
  if (insights.riskFactors?.length > 2) {
    recommendations.push('Develop or update safety plan with client');
  }
  
  if (context.sessionCount < 5) {
    recommendations.push('Continue building therapeutic rapport and gathering assessment data');
  }
  
  if (!client.treatmentGoals || client.treatmentGoals.length === 0) {
    recommendations.push('Collaborate with client to establish clear, measurable treatment goals');
  }
  
  return recommendations;
}

function parseSessionPrep(content: string): any {
  const sections = content.split(/\n\d+\.\s+/);
  
  return {
    keyTopics: extractBulletPoints(sections[1] || ''),
    suggestedInterventions: extractBulletPoints(sections[2] || ''),
    questionsToAsk: extractBulletPoints(sections[3] || ''),
    progressIndicators: extractBulletPoints(sections[4] || ''),
    potentialChallenges: extractBulletPoints(sections[5] || '')
  };
}

function parseInterventions(content: string): any[] {
  // Parse intervention suggestions
  const interventions = content.split(/\n\d+\.\s+/).slice(1);
  
  return interventions.map(int => {
    const lines = int.split('\n');
    return {
      name: lines[0]?.trim() || '',
      description: lines[1]?.trim() || '',
      evidenceBase: lines[2]?.trim() || '',
      steps: lines[3]?.split(',').map(s => s.trim()) || [],
      expectedOutcomes: lines[4]?.trim() || '',
      considerations: lines[5]?.trim() || ''
    };
  });
}

function getFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const typeMap: Record<string, string> = {
    pdf: 'pdf',
    doc: 'word',
    docx: 'word',
    txt: 'text',
    jpg: 'image',
    jpeg: 'image',
    png: 'image'
  };
  return typeMap[ext || ''] || 'unknown';
}

function parseTreatmentPlan(content: string): any {
  const sections = content.split(/\n\d+\.\s+/);
  
  return {
    objectives: extractBulletPoints(sections[1] || ''),
    interventions: extractBulletPoints(sections[2] || ''),
    sessionStructure: sections[3]?.trim() || '',
    homework: extractBulletPoints(sections[4] || ''),
    measurementCriteria: extractBulletPoints(sections[5] || ''),
    riskManagement: sections[6]?.trim() || '',
    collaboration: sections[7]?.trim() || '',
    dischargeCriteria: extractBulletPoints(sections[8] || '')
  };
}

function parseProgressNote(content: string): any {
  // Parse SOAP note format
  const sections = content.toLowerCase().split(/subjective:|objective:|assessment:|plan:/);
  
  return {
    subjective: sections[1]?.trim() || '',
    objective: sections[2]?.trim() || '',
    assessment: sections[3]?.trim() || '',
    plan: sections[4]?.trim() || '',
    keyMoments: extractBulletPoints(content.split('Key therapeutic moments:')[1] || ''),
    progressIndicators: extractBulletPoints(content.split('Progress indicators:')[1] || ''),
    riskFactors: extractBulletPoints(content.split('Risk factors:')[1] || ''),
    nextSessionFocus: content.split('Recommendations for next session:')[1]?.trim() || ''
  };
}

function parseCrisisAssessment(content: string): any {
  const riskLevelMatch = content.match(/risk level[:\s]+(\w+)/i);
  
  return {
    riskLevel: riskLevelMatch?.[1] || 'Unknown',
    riskFactors: extractBulletPoints(content.split('risk factors')[1] || ''),
    protectiveFactors: extractBulletPoints(content.split('protective factors')[1] || ''),
    immediateActions: extractBulletPoints(content.split('immediate actions')[1] || ''),
    safetyPlan: content.split('safety plan')[1]?.split('follow-up')[0]?.trim() || '',
    followUpRequirements: extractBulletPoints(content.split('follow-up')[1] || '')
  };
}