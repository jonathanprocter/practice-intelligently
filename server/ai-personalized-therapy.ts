import OpenAI from 'openai';
import { storage } from './storage';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Personalized Therapeutic Recommendations (#5)
export async function generateEvidenceBasedInterventions(clientProfile: any, sessionHistory: any[]): Promise<any> {
  try {
    const prompt = `Generate evidence-based therapeutic interventions personalized to this specific client:

CLIENT PROFILE:
Age: ${clientProfile.age || 'Not specified'}
Primary concerns: ${clientProfile.primaryConcerns || 'General therapeutic support'}
Previous therapy experience: ${clientProfile.previousTherapy || 'Not specified'}
Trauma history: ${clientProfile.traumaHistory ? 'Present (details confidential)' : 'None reported'}
Current medications: ${clientProfile.medications || 'None reported'}
Support system: ${clientProfile.supportSystem || 'Not assessed'}

RECENT SESSION PATTERNS:
${sessionHistory.slice(0, 6).map((session, index) => `
Session ${index + 1}: Key themes - ${extractTherapeuticThemes(session.content).join(', ')}
Client response patterns: ${analyzeClientResponses(session.content)}
---`).join('\n')}

EVIDENCE-BASED INTERVENTION MATCHING:
Based on current research and client-specific factors, recommend:

1. Primary therapeutic modalities (CBT, DBT, EMDR, ACT, etc.) with evidence base
2. Specific techniques within chosen modalities
3. Adaptation recommendations for this client's unique needs
4. Contraindications or precautions to consider
5. Integration strategies for multiple approaches

Format as JSON:
{
  "primaryModalities": [
    {
      "approach": string,
      "evidenceLevel": "strong" | "moderate" | "emerging",
      "suitabilityScore": number,
      "rationale": string,
      "specificTechniques": string[]
    }
  ],
  "adaptationRecommendations": string[],
  "contraindications": string[],
  "integrationStrategy": string
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an evidence-based therapy specialist with expertise in matching interventions to client presentations. Base recommendations on current research literature and clinical best practices."
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
    console.error('Error generating evidence-based interventions:', error);
    throw new Error('Failed to generate evidence-based interventions');
  }
}

export async function createPersonalizedHomework(clientId: string, sessionContent: string, clientPreferences: any): Promise<any> {
  try {
    const sessionHistory = await storage.getSessionNotesByClientId(clientId);
    const recentSessions = sessionHistory.slice(0, 3);

    const prompt = `Create personalized between-session activities based on client's specific needs and preferences:

CURRENT SESSION FOCUS:
${sessionContent}

CLIENT PREFERENCES:
Learning style: ${clientPreferences.learningStyle || 'Not specified'}
Available time: ${clientPreferences.timeAvailable || '15-30 minutes daily'}
Technology comfort: ${clientPreferences.technologyComfort || 'Moderate'}
Physical activity level: ${clientPreferences.activityLevel || 'Moderate'}
Creative interests: ${clientPreferences.creativeInterests || 'None specified'}
Preferred homework types: ${clientPreferences.homeworkTypes || 'Mixed approaches'}

RECENT SESSION THEMES:
${recentSessions.map((session, index) => `
Session ${index + 1}: ${extractMainConcerns(session.content).join(', ')}
---`).join('\n')}

PERSONALIZED HOMEWORK CREATION:
Design 3-5 between-session activities that are:
1. Directly relevant to current therapeutic goals
2. Matched to client's learning style and preferences
3. Realistic for their time constraints
4. Progressive in difficulty
5. Engaging and sustainable

Include specific instructions, expected outcomes, and troubleshooting tips.

Format as JSON:
{
  "homeworkAssignments": [
    {
      "title": string,
      "type": "behavioral" | "cognitive" | "mindfulness" | "creative" | "physical",
      "description": string,
      "instructions": string[],
      "timeRequired": string,
      "frequency": string,
      "expectedOutcome": string,
      "troubleshooting": string[]
    }
  ],
  "priorityOrder": string[],
  "adaptationOptions": string[]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a therapeutic homework specialist. Create engaging, personalized between-session activities that support therapeutic progress."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.6
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Error creating personalized homework:', error);
    throw new Error('Failed to create personalized homework');
  }
}

export async function curateTherapeuticResources(clientProfile: any, currentChallenges: string[]): Promise<any> {
  try {
    const prompt = `Curate specific therapeutic resources (books, apps, exercises) tailored to this client:

CLIENT PROFILE:
Age range: ${clientProfile.ageRange || '25-45'}
Education level: ${clientProfile.educationLevel || 'College'}
Reading preference: ${clientProfile.readingPreference || 'Moderate reader'}
Technology use: ${clientProfile.technologyUse || 'Smartphone user'}
Budget constraints: ${clientProfile.budget || 'Moderate budget'}

CURRENT THERAPEUTIC CHALLENGES:
${currentChallenges.map(challenge => `- ${challenge}`).join('\n')}

RESOURCE CURATION REQUIREMENTS:
1. Self-help books specifically relevant to their challenges
2. Mobile apps with evidence-based approaches
3. Online resources and websites
4. Therapeutic exercises and worksheets
5. Audio/video content (podcasts, videos, meditations)

For each resource, provide:
- Specific title/name
- Brief description of relevance
- Cost (if any)
- How it supports current therapy goals
- Optimal timing for introduction

Format as JSON:
{
  "books": [
    {
      "title": string,
      "author": string,
      "relevance": string,
      "cost": string,
      "readingLevel": string,
      "timeToComplete": string
    }
  ],
  "apps": [
    {
      "name": string,
      "platform": string,
      "cost": string,
      "features": string[],
      "evidenceBase": string
    }
  ],
  "onlineResources": [
    {
      "name": string,
      "url": string,
      "type": string,
      "description": string
    }
  ],
  "exercises": [
    {
      "name": string,
      "type": string,
      "description": string,
      "timeRequired": string
    }
  ],
  "audioVisual": [
    {
      "title": string,
      "type": "podcast" | "video" | "meditation",
      "description": string,
      "duration": string
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a therapeutic resource curator with extensive knowledge of evidence-based self-help materials, apps, and resources. Recommend specific, real resources that exist and are relevant."
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
    console.error('Error curating therapeutic resources:', error);
    throw new Error('Failed to curate therapeutic resources');
  }
}

// Helper functions
function extractTherapeuticThemes(content: string): string[] {
  const themes = [];
  const lowerContent = content.toLowerCase();
  
  // Therapeutic theme detection
  if (lowerContent.includes('cognitive') || lowerContent.includes('thought')) themes.push('cognitive-patterns');
  if (lowerContent.includes('behavior') || lowerContent.includes('action')) themes.push('behavioral-change');
  if (lowerContent.includes('emotion') || lowerContent.includes('feeling')) themes.push('emotional-regulation');
  if (lowerContent.includes('mindful') || lowerContent.includes('present')) themes.push('mindfulness');
  if (lowerContent.includes('trauma') || lowerContent.includes('memory')) themes.push('trauma-processing');
  
  return themes;
}

function analyzeClientResponses(content: string): string {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('homework') && lowerContent.includes('completed')) {
    return 'High engagement with assignments';
  } else if (lowerContent.includes('difficult') || lowerContent.includes('struggle')) {
    return 'Needs additional support';
  } else if (lowerContent.includes('insight') || lowerContent.includes('understand')) {
    return 'Good therapeutic processing';
  } else {
    return 'Standard therapeutic engagement';
  }
}

function extractMainConcerns(content: string): string[] {
  const concerns = [];
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('anxiety') || lowerContent.includes('panic')) concerns.push('anxiety-management');
  if (lowerContent.includes('depression') || lowerContent.includes('hopeless')) concerns.push('mood-support');
  if (lowerContent.includes('relationship') || lowerContent.includes('conflict')) concerns.push('relationship-skills');
  if (lowerContent.includes('stress') || lowerContent.includes('overwhelm')) concerns.push('stress-management');
  if (lowerContent.includes('self-esteem') || lowerContent.includes('confidence')) concerns.push('self-worth');
  
  return concerns;
}