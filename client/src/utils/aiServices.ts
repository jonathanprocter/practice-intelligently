// AI Services - Client-side integration
// Note: AI processing should be done on the backend for security
// This is a client-side interface that will make calls to backend endpoints

import { ApiClient } from '../lib/api';

interface Appointment {
  id: string;
  type: string;
  status: string;
  startTime: string;
  endTime?: string;
  notes?: string;
}

interface ClientData {
  id: string;
  name: string;
  sessions: Session[];
  appointments: Appointment[];
  notes?: string;
}

interface Session {
  id: string;
  date: string;
  notes: string;
  duration: number;
}

export interface AIAnalysisResult {
  insights: string[];
  recommendations: string[];
  themes: string[];
  priority: 'low' | 'medium' | 'high';
  nextSteps: string[];
}

export interface SessionTranscriptAnalysis {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  emotionalTone: string;
  progressIndicators: string[];
  concernFlags: string[];
}

// Primary AI service using OpenAI via backend
async function analyzeWithOpenAI(content: string, type: 'session' | 'appointment' | 'progress'): Promise<AIAnalysisResult> {
  try {
    const response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        type,
        provider: 'openai'
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI analysis failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('OpenAI analysis failed:', error);
    throw error;
  }
}

// Secondary AI service using Claude via backend
async function analyzeWithClaude(content: string, type: 'session' | 'appointment' | 'progress'): Promise<AIAnalysisResult> {
  try {
    const response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        type,
        provider: 'claude'
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude analysis failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Claude analysis failed:', error);
    throw error;
  }
}

// Additional AI services using Gemini via backend
async function analyzeWithGemini(content: string, type: 'session' | 'appointment' | 'progress'): Promise<AIAnalysisResult> {
  try {
    const response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        type,
        provider: 'gemini'
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini analysis failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Gemini analysis failed:', error);
    throw error;
  }
}

function getSystemPrompt(type: 'session' | 'appointment' | 'progress'): string {
  const basePrompt = `You are a professional therapy practice AI assistant. Analyze the provided content and return insights in JSON format with the following structure:
{
  "insights": ["insight 1", "insight 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "themes": ["theme 1", "theme 2"],
  "priority": "low|medium|high",
  "nextSteps": ["step 1", "step 2"]
}`;

  switch (type) {
    case 'session':
      return `${basePrompt} Focus on therapeutic progress, client engagement, and treatment plan adherence.`;
    case 'appointment':
      return `${basePrompt} Focus on appointment patterns, scheduling optimization, and client retention.`;
    case 'progress':
      return `${basePrompt} Focus on overall treatment progress, goal achievement, and outcome prediction.`;
    default:
      return basePrompt;
  }
}

// Main AI analysis function with OpenAI primary, Claude secondary, others as needed
export async function analyzeContent(content: string, type: 'session' | 'appointment' | 'progress' = 'session'): Promise<AIAnalysisResult> {
  try {
    // Try OpenAI first (PRIMARY)
    return await analyzeWithOpenAI(content, type);
  } catch (openaiError) {try {
      // Fallback to Claude (SECONDARY)
      return await analyzeWithClaude(content, type);
    } catch (claudeError) {try {
        // Further fallback to Gemini (TERTIARY)
        return await analyzeWithGemini(content, type);
      } catch (geminiError) {
        console.error('All AI services failed:', { openaiError, claudeError, geminiError });

        // Return default analysis if all fail
        return {
          insights: ['Analysis temporarily unavailable'],
          recommendations: ['Please try again later'],
          themes: ['Service unavailable'],
          priority: 'low',
          nextSteps: ['Retry analysis when services are available']
        };
      }
    }
  }
}

// Analyze session transcript specifically (uses OpenAI primary)
export async function analyzeSessionTranscript(transcript: string): Promise<SessionTranscriptAnalysis> {
  try {
    const response = await fetch('/api/ai/analyze-transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        transcript,
        provider: 'openai' // Prefer OpenAI for transcript analysis
      }),
    });

    if (!response.ok) {
      throw new Error(`Transcript analysis failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Transcript analysis failed:', error);

    return {
      summary: 'Analysis temporarily unavailable',
      keyPoints: ['Transcript received but analysis failed'],
      actionItems: ['Retry analysis when services are available'],
      emotionalTone: 'Unable to assess',
      progressIndicators: ['Analysis pending'],
      concernFlags: []
    };
  }
}

// Generate appointment insights (uses OpenAI primary)
export async function generateAppointmentInsights(appointments: Appointment[]): Promise<AIAnalysisResult> {
  const appointmentData = appointments.map(apt => ({
    type: apt.type,
    status: apt.status,
    date: apt.startTime,
    duration: apt.endTime ? new Date(apt.endTime).getTime() - new Date(apt.startTime).getTime() : 0,
    notes: apt.notes
  }));

  const content = `Appointment data for analysis: ${JSON.stringify(appointmentData, null, 2)}`;
  return analyzeContent(content, 'appointment');
}

// Generate progress insights for client (uses OpenAI primary)
export async function generateProgressInsights(clientData: ClientData): Promise<AIAnalysisResult> {
  const content = `Client progress data: ${JSON.stringify(clientData, null, 2)}`;
  return analyzeContent(content, 'progress');
}

// Ensemble analysis using multiple models (OpenAI-first approach)
export async function generateEnsembleAnalysis(content: string, analysisType: string): Promise<AIAnalysisResult> {
  try {
    const response = await fetch('/api/ai/ensemble-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        analysisType,
        priorityOrder: ['openai', 'claude', 'gemini', 'perplexity']
      }),
    });

    if (!response.ok) {
      throw new Error(`Ensemble analysis failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Ensemble analysis failed, falling back to single model:', error);
    // Fallback to regular analysis with primary model
    return analyzeContent(content, 'session');
  }
}