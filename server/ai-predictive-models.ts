import OpenAI from 'openai';
import { storage } from './storage';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Predictive Clinical Modeling (#2)
export async function predictTreatmentOutcome(clientId: string, currentSessionCount: number): Promise<any> {
  try {
    const sessionHistory = await storage.getSessionNotesByClientId(clientId);
    const recentSessions = sessionHistory.slice(0, Math.min(10, sessionHistory.length));

    const prompt = `Analyze the following therapy progression to predict treatment outcomes and optimal intervention timing:

CLIENT PROFILE:
- Current session count: ${currentSessionCount}
- Session history available: ${recentSessions.length} sessions

SESSION PROGRESSION:
${recentSessions.map((session, index) => `
Session ${index + 1} (${session.createdAt.toDateString()}):
${session.content.substring(0, 500)}...
---`).join('\n')}

PREDICTIVE ANALYSIS REQUIRED:
1. Treatment Success Probability (0-100%): Based on current progress patterns
2. Estimated Sessions to Goal Achievement: Realistic timeline prediction
3. Risk Factors for Treatment Dropout: Early warning indicators
4. Optimal Intervention Timing: When to introduce specific techniques
5. Engagement Level Prediction: Client motivation and participation trends

Provide detailed analysis with specific recommendations and confidence intervals.

Format as JSON with the following structure:
{
  "treatmentOutcomePrediction": {
    "successProbability": number,
    "confidenceLevel": string,
    "estimatedSessionsToGoal": number,
    "keySuccessFactors": string[],
    "potentialBarriers": string[]
  },
  "riskEscalationAlerts": {
    "riskLevel": "low" | "moderate" | "high",
    "earlyWarningIndicators": string[],
    "preventiveActions": string[],
    "monitoringFrequency": string
  },
  "optimalInterventionTiming": {
    "currentPhase": string,
    "readinessForAdvancedTechniques": boolean,
    "recommendedNextInterventions": string[],
    "timingRationale": string
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a predictive therapy AI with access to evidence-based treatment outcome research. Provide accurate predictions with confidence intervals."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3 // Lower temperature for consistent predictions
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Error predicting treatment outcome:', error);
    throw new Error('Failed to generate treatment outcome prediction');
  }
}

export async function generateRiskEscalationAlert(clientId: string, currentSessionContent: string): Promise<any> {
  try {
    const sessionHistory = await storage.getSessionNotesByClientId(clientId);
    const recentSessions = sessionHistory.slice(0, 5);

    const prompt = `Conduct early warning risk assessment for potential crisis escalation:

CURRENT SESSION CONTENT:
${currentSessionContent}

RECENT SESSION HISTORY:
${recentSessions.map((session, index) => `
Session ${index + 1}: ${session.content.substring(0, 300)}...
---`).join('\n')}

EARLY WARNING ANALYSIS:
Detect subtle indicators that may predict crisis situations 24-72 hours before they become critical:

1. Language pattern changes (increased hopelessness, isolation themes)
2. Behavioral shift indicators (missed appointments, decreased engagement)
3. Emotional trajectory analysis (sustained negative trends)
4. Support system degradation markers
5. Coping mechanism breakdown indicators

Provide immediate actionable recommendations if any concerning patterns are detected.

Format as JSON:
{
  "riskLevel": "minimal" | "emerging" | "moderate" | "significant",
  "confidenceScore": number,
  "earlyWarningIndicators": string[],
  "timeToEscalation": string,
  "immediateActions": string[],
  "monitoringProtocol": string,
  "emergencyContacts": boolean
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a crisis prevention specialist AI. Prioritize client safety while providing early intervention recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Error generating risk escalation alert:', error);
    throw new Error('Failed to generate risk escalation alert');
  }
}

export async function determineOptimalInterventionTiming(clientId: string, potentialInterventions: string[]): Promise<any> {
  try {
    const sessionHistory = await storage.getSessionNotesByClientId(clientId);
    
    const prompt = `Analyze optimal timing for introducing specific therapeutic interventions:

POTENTIAL INTERVENTIONS TO EVALUATE:
${potentialInterventions.map(intervention => `- ${intervention}`).join('\n')}

CLIENT PROGRESSION DATA:
${sessionHistory.slice(0, 8).map((session, index) => `
Session ${index + 1}: ${session.content.substring(0, 400)}...
---`).join('\n')}

TIMING ANALYSIS REQUIRED:
For each intervention, determine:
1. Current client readiness level (1-10)
2. Optimal introduction timing (immediate, 2-3 sessions, 4-6 sessions, later)
3. Prerequisites that need to be established first
4. Success probability if introduced now vs. later
5. Risk factors for premature introduction

Format as JSON:
{
  "interventionTimingAnalysis": [
    {
      "intervention": string,
      "readinessScore": number,
      "optimalTiming": string,
      "prerequisites": string[],
      "successProbability": number,
      "risks": string[]
    }
  ],
  "overallRecommendation": string,
  "priorityOrder": string[]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a therapeutic intervention timing specialist. Base recommendations on evidence-based practice and client readiness indicators."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Error determining optimal intervention timing:', error);
    throw new Error('Failed to determine optimal intervention timing');
  }
}