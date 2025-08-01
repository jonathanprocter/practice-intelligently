import OpenAI from 'openai';
import { storage } from './storage';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface EnhancedInsightsRequest {
  appointment: any;
  sessionHistory?: any[];
  clientProfile?: any;
  treatmentPlan?: any;
}

interface EnhancedInsights {
  summary: string;
  clinicalAssessment: {
    moodState: string;
    behavioralObservations: string[];
    cognitivePatterns: string[];
    riskFactors: string[];
    progressMarkers: string[];
  };
  therapeuticRecommendations: {
    interventions: string[];
    homeworkAssignments: string[];
    resourceRecommendations: string[];
    nextSessionFocus: string[];
  };
  longitudinalAnalysis: {
    progressTrends: string[];
    patternRecognition: string[];
    goalAlignment: string[];
    treatmentAdjustments: string[];
  };
  followUpActions: {
    immediateActions: { action: string; priority: 'high' | 'medium' | 'low'; dueDate: string }[];
    longTermGoals: string[];
    referralConsiderations: string[];
  };
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    mitigation: string[];
    monitoringNeeds: string[];
  };
  suggestedQuestions: {
    explorative: string[];
    therapeutic: string[];
    assessmentBased: string[];
  };
}

interface SessionHistoryItem {
  id: string;
  date: string;
  content: string;
  insights?: string[];
  mood?: string;
  progress?: number;
}

interface ProgressReport {
  clientId: string;
  timeframe: string;
  overallProgress: number;
  keyMilestones: string[];
  challengeAreas: string[];
  recommendations: string[];
  nextSteps: string[];
}

interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  protectiveFactors: string[];
  immediateActions: string[];
  followUpRecommendations: string[];
}

export async function generateEnhancedInsights(request: EnhancedInsightsRequest): Promise<EnhancedInsights> {
  try {
    // Gather comprehensive session history for context
    const clientHistory = request.sessionHistory || [];
    const recentSessions = clientHistory.slice(0, 5); // Last 5 sessions for context

    const prompt = `You are an experienced clinical therapist providing comprehensive AI-assisted insights for session documentation and treatment planning.

APPOINTMENT DETAILS:
- Client: ${request.appointment.clientName}
- Date: ${request.appointment.date}
- Duration: ${request.appointment.duration || '50 minutes'}
- Session Notes: ${request.appointment.sessionNotes || 'No notes provided'}
- Current Mood/Presentation: ${request.appointment.mood || 'Not specified'}

CLINICAL CONTEXT:
- Previous Sessions: ${recentSessions.length > 0 ? recentSessions.map(s => s.summary).join('; ') : 'First session or no history available'}
- Treatment Plan Focus: ${request.treatmentPlan?.goals || 'General therapeutic support'}
- Client Background: ${request.clientProfile?.background || 'Standard intake'}

Provide a comprehensive clinical analysis in the following structured format. Be specific, actionable, and evidence-based:

Clinical Assessment:
- Current mood state and emotional presentation
- Key behavioral observations from this session
- Cognitive patterns or thought processes noted
- Any risk factors or concerns identified
- Progress markers or positive developments

Therapeutic Recommendations:
- Specific interventions to use in future sessions
- Homework assignments or between-session activities
- Resource recommendations (books, apps, techniques)
- Primary focus areas for next session

Longitudinal Analysis:
- Progress trends compared to previous sessions
- Pattern recognition across multiple sessions
- Alignment with treatment goals
- Suggested treatment plan adjustments

Follow-up Actions:
- Immediate actions needed (high/medium/low priority)
- Long-term therapeutic goals to pursue
- Referral considerations if appropriate

Risk Assessment:
- Current risk level (low/medium/high)
- Specific risk factors present
- Mitigation strategies
- Ongoing monitoring needs

Suggested Questions for Next Session:
- Explorative questions to deepen understanding
- Therapeutic questions to promote insight
- Assessment-based questions to track progress

Format your response as a structured JSON object matching the EnhancedInsights interface.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a clinical AI assistant providing comprehensive therapeutic insights. Always respond with valid JSON matching the requested structure."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const insights = JSON.parse(response.choices[0].message.content || '{}');

    // Structure the response to match our interface
    return {
      summary: insights.summary || 'AI analysis completed',
      clinicalAssessment: {
        moodState: insights.clinicalAssessment?.moodState || 'Not assessed',
        behavioralObservations: insights.clinicalAssessment?.behavioralObservations || [],
        cognitivePatterns: insights.clinicalAssessment?.cognitivePatterns || [],
        riskFactors: insights.clinicalAssessment?.riskFactors || [],
        progressMarkers: insights.clinicalAssessment?.progressMarkers || []
      },
      therapeuticRecommendations: {
        interventions: insights.therapeuticRecommendations?.interventions || [],
        homeworkAssignments: insights.therapeuticRecommendations?.homeworkAssignments || [],
        resourceRecommendations: insights.therapeuticRecommendations?.resourceRecommendations || [],
        nextSessionFocus: insights.therapeuticRecommendations?.nextSessionFocus || []
      },
      longitudinalAnalysis: {
        progressTrends: insights.longitudinalAnalysis?.progressTrends || [],
        patternRecognition: insights.longitudinalAnalysis?.patternRecognition || [],
        goalAlignment: insights.longitudinalAnalysis?.goalAlignment || [],
        treatmentAdjustments: insights.longitudinalAnalysis?.treatmentAdjustments || []
      },
      followUpActions: {
        immediateActions: insights.followUpActions?.immediateActions || [],
        longTermGoals: insights.followUpActions?.longTermGoals || [],
        referralConsiderations: insights.followUpActions?.referralConsiderations || []
      },
      riskAssessment: {
        level: insights.riskAssessment?.level || 'low',
        factors: insights.riskAssessment?.factors || [],
        mitigation: insights.riskAssessment?.mitigation || [],
        monitoringNeeds: insights.riskAssessment?.monitoringNeeds || []
      },
      suggestedQuestions: {
        explorative: insights.suggestedQuestions?.explorative || [],
        therapeutic: insights.suggestedQuestions?.therapeutic || [],
        assessmentBased: insights.suggestedQuestions?.assessmentBased || []
      }
    };

  } catch (error) {
    console.error('Error generating enhanced insights:', error);
    throw new Error('Failed to generate enhanced insights');
  }
}

// Progress tracking and trend analysis
export async function generateProgressReport(clientId: string, timeframe: 'week' | 'month' | 'quarter'): Promise<any> {
  try {
    // Fetch session history for the specified timeframe
    const sessions = await storage.getSessionNotesByClientId(clientId);

    if (sessions.length === 0) {
      return { message: 'No session data available for progress analysis' };
    }

    const prompt = `Analyze the following therapy session progression for comprehensive progress reporting:

SESSION HISTORY (${timeframe.toUpperCase()}):
${sessions.map((session, index) => `
Session ${index + 1} (${session.createdAt}):
${session.content}
---`).join('\n')}

Provide a detailed progress analysis including:
1. Overall progress trends and trajectory
2. Key breakthrough moments or setbacks
3. Goal achievement status
4. Behavioral and emotional changes
5. Treatment plan effectiveness
6. Recommendations for next phase of treatment
7. Areas requiring additional focus
8. Quantitative progress metrics where applicable

Format as a comprehensive progress report suitable for clinical documentation.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a clinical supervisor providing comprehensive progress analysis for therapy cases."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.6
    });

    return {
      progressReport: response.choices[0].message.content,
      sessionCount: sessions.length,
      timeframe,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error generating progress report:', error);
    throw new Error('Failed to generate progress report');
  }
}

// Risk assessment and safety planning
export async function assessClientRisk(sessionContent: string, clientHistory?: string[]): Promise<any> {
  try {
    const prompt = `Conduct a comprehensive risk assessment based on the following therapy session content:

CURRENT SESSION:
${sessionContent}

PREVIOUS SESSIONS CONTEXT:
${clientHistory?.join('\n---\n') || 'No prior session data available'}

Provide a detailed risk assessment including:
1. Suicide risk level (low/moderate/high/imminent)
2. Self-harm risk indicators
3. Risk to others assessment
4. Substance abuse indicators
5. Crisis intervention needs
6. Safety planning recommendations
7. Immediate action items
8. Monitoring and follow-up requirements
9. Professional consultation recommendations
10. Emergency contact protocols

CRITICAL: If any high-risk indicators are present, clearly flag them for immediate clinical attention.

Format as a structured clinical risk assessment suitable for professional documentation.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a clinical risk assessment specialist. Prioritize client safety while providing comprehensive risk analysis."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3 // Lower temperature for consistency in risk assessment
    });

    return {
      riskAssessment: response.choices[0].message.content,
      assessmentDate: new Date().toISOString(),
      requiresImmediateAttention: response.choices[0].message.content?.toLowerCase().includes('high risk') || 
                                  response.choices[0].message.content?.toLowerCase().includes('imminent')
    };

  } catch (error) {
    console.error('Error conducting risk assessment:', error);
    throw new Error('Failed to conduct risk assessment');
  }
}