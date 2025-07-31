import OpenAI from 'openai';
import { storage } from './storage';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Advanced Pattern Recognition (#3)
export async function analyzeCrossClientPatterns(therapistId: string): Promise<any> {
  try {
    // Get anonymized patterns across all clients for this therapist
    const allSessions = await storage.getAllSessionNotesByTherapist(therapistId);
    
    // Anonymize data for pattern analysis
    const anonymizedPatterns = allSessions.map(session => ({
      sessionNumber: Math.floor(Math.random() * 20) + 1, // Randomize to protect privacy
      contentLength: session.content.length,
      keyThemes: extractKeyThemes(session.content),
      progressMarkers: extractProgressMarkers(session.content)
    }));

    const prompt = `Analyze anonymized therapy session patterns to identify successful intervention strategies:

ANONYMIZED SESSION DATA:
${anonymizedPatterns.slice(0, 50).map((session, index) => `
Pattern ${index + 1}:
- Session depth: ${session.sessionNumber}
- Content complexity: ${session.contentLength > 500 ? 'detailed' : 'brief'}
- Key themes: ${session.keyThemes.join(', ')}
- Progress markers: ${session.progressMarkers.join(', ')}
---`).join('\n')}

PATTERN ANALYSIS OBJECTIVES:
1. Identify intervention strategies with highest success rates
2. Recognize common therapeutic breakthrough patterns
3. Detect early indicators of positive treatment response
4. Map client engagement patterns to outcomes
5. Identify therapist techniques associated with progress

Format as JSON:
{
  "successfulInterventionPatterns": [
    {
      "pattern": string,
      "successRate": number,
      "optimalTiming": string,
      "clientTypes": string[]
    }
  ],
  "breakthroughIndicators": string[],
  "engagementSuccessFactors": string[],
  "recommendedTechniques": string[]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a therapeutic pattern analysis AI. Analyze anonymized data to identify successful treatment approaches while maintaining complete client confidentiality."
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
    console.error('Error analyzing cross-client patterns:', error);
    throw new Error('Failed to analyze cross-client patterns');
  }
}

export async function detectSeasonalCyclicalPatterns(clientId: string): Promise<any> {
  try {
    const sessionHistory = await storage.getSessionNotesByClientId(clientId);
    
    // Organize sessions by date patterns
    const sessionsByMonth = groupSessionsByTimePattern(sessionHistory, 'month');
    const sessionsByDayOfWeek = groupSessionsByTimePattern(sessionHistory, 'dayOfWeek');
    const sessionsBySeasonalEvents = analyzeAroundMajorEvents(sessionHistory);

    const prompt = `Analyze temporal patterns in client's therapy progression:

TEMPORAL SESSION DISTRIBUTION:
Monthly patterns: ${JSON.stringify(sessionsByMonth, null, 2)}
Day of week patterns: ${JSON.stringify(sessionsByDayOfWeek, null, 2)}
Seasonal event correlations: ${JSON.stringify(sessionsBySeasonalEvents, null, 2)}

SESSION CONTENT BY TIME PERIODS:
${sessionHistory.slice(0, 15).map((session, index) => `
${session.createdAt.toDateString()} (${session.createdAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long' })}):
Content themes: ${extractKeyThemes(session.content).join(', ')}
Mood indicators: ${extractMoodIndicators(session.content).join(', ')}
---`).join('\n')}

PATTERN DETECTION OBJECTIVES:
1. Seasonal depression or anxiety patterns
2. Anniversary reactions and trauma responses
3. Holiday/birthday emotional impacts
4. Work/school cycle correlations
5. Weather/daylight sensitivity patterns

Format as JSON:
{
  "seasonalPatterns": {
    "detectedCycles": string[],
    "riskPeriods": string[],
    "protectiveFactors": string[]
  },
  "anniversaryReactions": string[],
  "cyclicalTriggers": string[],
  "preventiveRecommendations": string[]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a temporal pattern analysis specialist for therapeutic treatment. Identify meaningful cyclical patterns that can inform treatment planning."
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
    console.error('Error detecting seasonal/cyclical patterns:', error);
    throw new Error('Failed to detect seasonal/cyclical patterns');
  }
}

export async function mapTherapeuticRelationship(clientId: string, therapistId: string): Promise<any> {
  try {
    const sessionHistory = await storage.getSessionNotesByClientId(clientId);
    
    const prompt = `Analyze therapeutic relationship dynamics and interaction patterns:

THERAPEUTIC INTERACTION DATA:
${sessionHistory.slice(0, 10).map((session, index) => `
Session ${index + 1} (${session.createdAt.toDateString()}):
Content: ${session.content.substring(0, 600)}
---`).join('\n')}

RELATIONSHIP ANALYSIS OBJECTIVES:
1. Therapeutic alliance strength indicators
2. Client engagement and resistance patterns
3. Communication style compatibility
4. Trust development progression
5. Optimal therapist approach adjustments

Analyze for:
- Rapport building success
- Communication preferences
- Response to different therapeutic approaches
- Alliance rupture and repair patterns
- Optimal session structure for this relationship

Format as JSON:
{
  "allianceStrength": {
    "currentLevel": number,
    "trendDirection": "improving" | "stable" | "declining",
    "strengthIndicators": string[]
  },
  "communicationPatterns": {
    "clientPreferences": string[],
    "effectiveApproaches": string[],
    "lessEffectiveApproaches": string[]
  },
  "relationshipOptimization": {
    "recommendations": string[],
    "adjustments": string[]
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a therapeutic relationship analysis specialist. Focus on optimizing the therapeutic alliance for maximum treatment effectiveness."
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
    console.error('Error mapping therapeutic relationship:', error);
    throw new Error('Failed to map therapeutic relationship');
  }
}

// Helper functions
function extractKeyThemes(content: string): string[] {
  const themes = [];
  const lowerContent = content.toLowerCase();
  
  // Basic theme detection - could be enhanced with NLP
  if (lowerContent.includes('anxiety') || lowerContent.includes('worry')) themes.push('anxiety');
  if (lowerContent.includes('depress') || lowerContent.includes('sad')) themes.push('depression');
  if (lowerContent.includes('relationship') || lowerContent.includes('family')) themes.push('relationships');
  if (lowerContent.includes('work') || lowerContent.includes('job')) themes.push('work-stress');
  if (lowerContent.includes('trauma') || lowerContent.includes('ptsd')) themes.push('trauma');
  
  return themes;
}

function extractProgressMarkers(content: string): string[] {
  const markers = [];
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('better') || lowerContent.includes('improv')) markers.push('improvement');
  if (lowerContent.includes('breakthrough') || lowerContent.includes('insight')) markers.push('breakthrough');
  if (lowerContent.includes('setback') || lowerContent.includes('difficult')) markers.push('setback');
  if (lowerContent.includes('goal') || lowerContent.includes('progress')) markers.push('goal-oriented');
  
  return markers;
}

function extractMoodIndicators(content: string): string[] {
  const moods = [];
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('happy') || lowerContent.includes('joy')) moods.push('positive');
  if (lowerContent.includes('sad') || lowerContent.includes('down')) moods.push('low');
  if (lowerContent.includes('angry') || lowerContent.includes('frustrated')) moods.push('irritable');
  if (lowerContent.includes('calm') || lowerContent.includes('peaceful')) moods.push('stable');
  
  return moods;
}

function groupSessionsByTimePattern(sessions: any[], pattern: 'month' | 'dayOfWeek'): any {
  const grouped: any = {};
  
  sessions.forEach(session => {
    const date = new Date(session.createdAt);
    let key: string;
    
    if (pattern === 'month') {
      key = date.toLocaleDateString('en-US', { month: 'long' });
    } else {
      key = date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    
    if (!grouped[key]) grouped[key] = 0;
    grouped[key]++;
  });
  
  return grouped;
}

function analyzeAroundMajorEvents(sessions: any[]): any {
  const events = ['holiday', 'birthday', 'anniversary', 'seasonal'];
  const eventAnalysis: any = {};
  
  // Basic event correlation - could be enhanced with calendar integration
  sessions.forEach(session => {
    const date = new Date(session.createdAt);
    const month = date.getMonth();
    
    // Holiday seasons
    if (month === 11 || month === 0) { // December/January
      eventAnalysis['winter-holidays'] = (eventAnalysis['winter-holidays'] || 0) + 1;
    }
    if (month === 9) { // October
      eventAnalysis['halloween'] = (eventAnalysis['halloween'] || 0) + 1;
    }
  });
  
  return eventAnalysis;
}