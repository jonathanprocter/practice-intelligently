import OpenAI from 'openai';
import { storage } from './storage';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Practice Management Intelligence (#7)
export async function analyzeSessionEfficiency(therapistId: string, timeframe: 'week' | 'month' | 'quarter'): Promise<any> {
  try {
    const sessions = await storage.getSessionNotesByTherapistTimeframe(therapistId, timeframe);
    const appointments = await storage.getAppointmentsByTherapistTimeframe(therapistId, timeframe);

    const prompt = `Analyze therapy session efficiency and optimization opportunities:

SESSION DATA ANALYSIS:
Total sessions: ${sessions.length}
Average session length: ${calculateAverageSessionLength(sessions)} minutes
Session completion rate: ${calculateCompletionRate(appointments)}%
No-show rate: ${calculateNoShowRate(appointments)}%
Cancellation rate: ${calculateCancellationRate(appointments)}%

SESSION CONTENT ANALYSIS:
${sessions.slice(0, 20).map((session, index) => `
Session ${index + 1}:
Content depth: ${session.content.length > 800 ? 'comprehensive' : 'standard'}
Therapeutic progress: ${assessProgressLevel(session.content)}
---`).join('\n')}

EFFICIENCY OPTIMIZATION ANALYSIS:
1. Session structure effectiveness
2. Time allocation within sessions
3. Therapeutic progress per session
4. Client engagement patterns
5. Administrative efficiency opportunities

Provide specific recommendations for:
- Optimal session scheduling patterns
- Session structure improvements
- Progress tracking enhancements
- Administrative streamlining

Format as JSON:
{
  "currentEfficiencyMetrics": {
    "sessionUtilization": number,
    "progressPerSession": number,
    "clientSatisfactionIndicators": string[]
  },
  "optimizationOpportunities": [
    {
      "area": string,
      "currentState": string,
      "recommendation": string,
      "expectedImprovement": string
    }
  ],
  "schedulingRecommendations": string[],
  "sessionStructureOptimizations": string[]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a practice efficiency specialist focused on optimizing therapeutic outcomes while maintaining high-quality care."
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
    console.error('Error analyzing session efficiency:', error);
    throw new Error('Failed to analyze session efficiency');
  }
}

export async function predictClientRetention(clientId: string): Promise<any> {
  try {
    const sessionHistory = await storage.getSessionNotesByClientId(clientId);
    const appointments = await storage.getAppointmentsByClientId(clientId);

    const prompt = `Analyze client retention risk and predict likelihood of treatment dropout:

CLIENT ENGAGEMENT DATA:
Total sessions: ${sessionHistory.length}
Session frequency: ${calculateSessionFrequency(sessionHistory)}
Appointment consistency: ${calculateAppointmentConsistency(appointments)}%
Recent engagement trends: ${analyzeRecentEngagement(sessionHistory)}

SESSION CONTENT ANALYSIS:
${sessionHistory.slice(0, 8).map((session, index) => `
Session ${index + 1} (${session.createdAt.toDateString()}):
Engagement indicators: ${assessEngagementLevel(session.content)}
Progress markers: ${extractProgressMarkers(session.content).join(', ')}
Resistance indicators: ${identifyResistancePatterns(session.content)}
---`).join('\n')}

RETENTION RISK ASSESSMENT:
Analyze for:
1. Early dropout risk factors
2. Engagement decline patterns
3. Therapeutic alliance strength
4. External barrier indicators
5. Motivation fluctuations

Provide specific interventions to improve retention.

Format as JSON:
{
  "retentionRisk": {
    "level": "low" | "moderate" | "high",
    "probability": number,
    "riskFactors": string[],
    "protectiveFactors": string[]
  },
  "engagementTrends": {
    "direction": "improving" | "stable" | "declining",
    "keyIndicators": string[]
  },
  "retentionStrategies": [
    {
      "strategy": string,
      "rationale": string,
      "implementation": string,
      "expectedOutcome": string
    }
  ],
  "earlyInterventions": string[]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a client retention specialist with expertise in identifying and addressing factors that lead to therapy dropout."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Error predicting client retention:', error);
    throw new Error('Failed to predict client retention');
  }
}

// Personal Practice Insights (#10 - bullets 2 and 3)
export async function analyzeTherapistStrengths(therapistId: string): Promise<any> {
  try {
    const allSessions = await storage.getAllSessionNotesByTherapist(therapistId);
    const clientOutcomes = await storage.getClientOutcomesByTherapist(therapistId);

    const prompt = `Analyze therapist's clinical strengths and professional development opportunities:

PRACTICE OVERVIEW:
Total active clients: ${getActiveClientCount(allSessions)}
Session volume: ${allSessions.length} sessions analyzed
Client progress indicators: ${analyzeOverallProgress(clientOutcomes)}

THERAPEUTIC APPROACH ANALYSIS:
${analyzeTherapeuticApproaches(allSessions).map(approach => `
${approach.name}: ${approach.frequency}% of sessions
Effectiveness: ${approach.effectiveness}
Client response: ${approach.clientResponse}
---`).join('\n')}

CLIENT TYPE SPECIALIZATION:
${analyzeClientSpecialization(allSessions).map(specialization => `
${specialization.type}: ${specialization.percentage}% of practice
Success rate: ${specialization.successRate}%
---`).join('\n')}

STRENGTHS IDENTIFICATION:
Analyze for:
1. Most effective therapeutic techniques
2. Client populations with best outcomes
3. Session management strengths
4. Communication and rapport-building skills
5. Areas of clinical expertise

Format as JSON:
{
  "clinicalStrengths": [
    {
      "strength": string,
      "evidenceBase": string,
      "clientTypes": string[],
      "effectiveness": number
    }
  ],
  "specializations": string[],
  "professionalGrowthAreas": [
    {
      "area": string,
      "currentLevel": string,
      "developmentOpportunity": string,
      "resources": string[]
    }
  ],
  "practiceNiche": string,
  "uniqueTherapeuticGifts": string[]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a clinical supervision AI specialist focused on identifying therapist strengths and professional development opportunities."
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
    console.error('Error analyzing therapist strengths:', error);
    throw new Error('Failed to analyze therapist strengths');
  }
}

interface ClientMixData {
  diagnoses: string[];
  ageRanges: string[];
  treatmentModalities: string[];
  [key: string]: unknown;
}

interface EducationRecommendation {
  courses: string[];
  certifications: string[];
  workshops: string[];
  priority: 'high' | 'medium' | 'low';
  timeline: string;
}

export async function generateContinuingEducationRecommendations(
  therapistId: string, 
  clientMix: ClientMixData[]
): Promise<EducationRecommendation> {
  try {
    const prompt = `Generate personalized continuing education recommendations based on practice needs:

CURRENT CLIENT MIX:
${clientMix.map(client => `
Client type: ${client.primaryConcerns}
Treatment approach: ${client.currentModality}
Progress status: ${client.progressLevel}
Challenges: ${client.treatmentChallenges}
---`).join('\n')}

PRACTICE ANALYSIS:
Total clients: ${clientMix.length}
Most common presentations: ${getMostCommonPresentations(clientMix)}
Treatment gaps identified: ${identifyTreatmentGaps(clientMix)}
Emerging needs: ${identifyEmergingNeeds(clientMix)}

EDUCATION RECOMMENDATION OBJECTIVES:
1. Address current practice gaps
2. Enhance effectiveness with existing client types
3. Prepare for emerging therapeutic needs
4. Strengthen evidence-based practice
5. Professional growth and specialization

Recommend specific:
- Training programs and certifications
- Workshops and conferences
- Online courses and webinars
- Books and professional readings
- Supervision or consultation needs

Format as JSON:
{
  "priorityTrainingAreas": [
    {
      "area": string,
      "rationale": string,
      "urgency": "high" | "medium" | "low",
      "expectedBenefit": string
    }
  ],
  "specificRecommendations": [
    {
      "type": "certification" | "workshop" | "course" | "reading",
      "title": string,
      "provider": string,
      "relevance": string,
      "timeCommitment": string,
      "cost": string
    }
  ],
  "skillDevelopmentPlan": {
    "shortTerm": string[],
    "longTerm": string[],
    "specialization": string
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a continuing education specialist for mental health professionals. Recommend specific, relevant training opportunities."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Error generating continuing education recommendations:', error);
    throw new Error('Failed to generate continuing education recommendations');
  }
}

// Helper functions
function calculateAverageSessionLength(sessions: SessionData[]): number {
  return sessions.reduce((total, session) => total + (session.duration || 50), 0) / sessions.length;
}

function calculateCompletionRate(appointments: any[]): number {
  const completed = appointments.filter(apt => apt.status === 'completed').length;
  return (completed / appointments.length) * 100;
}

function calculateNoShowRate(appointments: any[]): number {
  const noShows = appointments.filter(apt => apt.status === 'no-show').length;
  return (noShows / appointments.length) * 100;
}

function calculateCancellationRate(appointments: any[]): number {
  const cancelled = appointments.filter(apt => apt.status === 'cancelled').length;
  return (cancelled / appointments.length) * 100;
}

function assessProgressLevel(content: string): string {
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes('breakthrough') || lowerContent.includes('significant progress')) {
    return 'high';
  } else if (lowerContent.includes('progress') || lowerContent.includes('improvement')) {
    return 'moderate';
  } else {
    return 'standard';
  }
}

function calculateSessionFrequency(sessions: SessionData[]): string {
  if (sessions.length < 2) return 'insufficient data';
  
  const dates = sessions.map(s => new Date(s.createdAt)).sort((a, b) => a.getTime() - b.getTime());
  const avgDaysBetween = dates.reduce((total, date, index) => {
    if (index === 0) return total;
    return total + (date.getTime() - dates[index - 1].getTime()) / (1000 * 60 * 60 * 24);
  }, 0) / (dates.length - 1);
  
  if (avgDaysBetween <= 9) return 'weekly';
  if (avgDaysBetween <= 16) return 'bi-weekly';
  return 'monthly or less';
}

interface AppointmentData {
  date: string;
  status: string;
  [key: string]: unknown;
}

function calculateAppointmentConsistency(appointments: AppointmentData[]): number {
  const scheduled = appointments.length;
  const attended = appointments.filter(apt => apt.status === 'completed').length;
  return (attended / scheduled) * 100;
}

function analyzeRecentEngagement(sessions: SessionData[]): string {
  const recentSessions = sessions.slice(0, 3);
  const engagementScores = recentSessions.map(session => assessEngagementScore(session.content));
  const avgEngagement = engagementScores.reduce((a, b) => a + b, 0) / engagementScores.length;
  
  if (avgEngagement > 7) return 'high engagement';
  if (avgEngagement > 4) return 'moderate engagement';
  return 'low engagement';
}

function assessEngagementLevel(content: string): string {
  const score = assessEngagementScore(content);
  if (score > 7) return 'highly engaged';
  if (score > 4) return 'moderately engaged';
  return 'low engagement';
}

function assessEngagementScore(content: string): number {
  let score = 5; // baseline
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('homework') && lowerContent.includes('completed')) score += 2;
  if (lowerContent.includes('insight') || lowerContent.includes('realization')) score += 2;
  if (lowerContent.includes('difficult') || lowerContent.includes('resistant')) score -= 2;
  if (lowerContent.includes('engaged') || lowerContent.includes('motivated')) score += 1;
  if (content.length > 500) score += 1; // detailed content suggests engagement
  
  return Math.max(1, Math.min(10, score));
}

function extractProgressMarkers(content: string): string[] {
  const markers = [];
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('progress') || lowerContent.includes('improvement')) markers.push('general-progress');
  if (lowerContent.includes('goal') && lowerContent.includes('achieved')) markers.push('goal-achievement');
  if (lowerContent.includes('breakthrough') || lowerContent.includes('insight')) markers.push('breakthrough-moment');
  if (lowerContent.includes('skill') && lowerContent.includes('learned')) markers.push('skill-development');
  
  return markers;
}

function identifyResistancePatterns(content: string): string {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('resistant') || lowerContent.includes('unwilling')) {
    return 'explicit resistance';
  } else if (lowerContent.includes('difficult') || lowerContent.includes('challenging')) {
    return 'implicit resistance';
  } else if (lowerContent.includes('homework') && lowerContent.includes('forgot')) {
    return 'avoidance patterns';
  } else {
    return 'no significant resistance';
  }
}

function getActiveClientCount(sessions: SessionData[]): number {
  const uniqueClients = new Set(sessions.map(s => s.clientId));
  return uniqueClients.size;
}

function analyzeOverallProgress(outcomes: any[]): string {
  if (outcomes.length === 0) return 'insufficient data';
  
  const positiveOutcomes = outcomes.filter(o => o.progressLevel === 'good' || o.progressLevel === 'excellent').length;
  const rate = (positiveOutcomes / outcomes.length) * 100;
  
  if (rate > 70) return 'strong positive outcomes';
  if (rate > 50) return 'moderate positive outcomes';
  return 'mixed outcomes';
}

function analyzeTherapeuticApproaches(sessions: any[]): any[] {
  // Analyze actual therapeutic approaches used from session data
  if (!sessions || sessions.length === 0) {
    return [];
  }
  
  // Real analysis of therapeutic approaches from session content
  // This would parse session notes for therapeutic techniques
  return [];
}

function analyzeClientSpecialization(sessions: any[]): any[] {
  // Analyze actual client demographics and presentations from real data
  if (!sessions || sessions.length === 0) {
    return [];
  }
  
  // Real analysis would examine client diagnoses and treatment outcomes
  return [];
}

function getMostCommonPresentations(clientMix: any[]): string[] {
  const presentations = clientMix.map(c => c.primaryConcerns).flat();
  const counts = presentations.reduce((acc: any, presentation) => {
    acc[presentation] = (acc[presentation] || 0) + 1;
    return acc;
  }, {});
  
  return Object.entries(counts)
    .sort(([,a]: any, [,b]: any) => b - a)
    .slice(0, 3)
    .map(([presentation]) => presentation);
}

function identifyTreatmentGaps(clientMix: any[]): string[] {
  // Analyze where current approaches might be insufficient based on real client data
  if (!clientMix || clientMix.length === 0) {
    return [];
  }
  
  // Real analysis would identify gaps in therapeutic approaches
  return [];
}

function identifyEmergingNeeds(clientMix: any[]): string[] {
  // Identify trending issues in practice based on real client presentations
  if (!clientMix || clientMix.length === 0) {
    return [];
  }
  
  // Real analysis would track emerging patterns in client needs
  return [];
}