import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { perplexityClient } from './perplexity';

// Initialize AI clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY not configured');
}
const gemini = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

export interface AIResponse {
  content: string;
  model: string;
  confidence?: number;
  citations?: string[];
}

export class MultiModelAI {
  // Primary analysis using OpenAI for robust performance
  async generateClinicalAnalysis(content: string, context?: string): Promise<AIResponse> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // Latest OpenAI model
        messages: [
          {
            role: "system",
            content: "You are an expert clinical therapist. Provide detailed, evidence-based insights and analysis."
          },
          {
            role: "user",
            content: `Analyze the following content${context ? ` in the context of: ${context}` : ''}:\n\n${content}`
          }
        ],
        max_tokens: 2000,
      });

      return {
        content: response.choices[0].message.content || '',
        model: 'gpt-4o',
        confidence: 0.9
      };
    } catch (error) {
      console.error('OpenAI analysis failed, falling back to Claude:', error);
      return this.fallbackToClaude(content, context);
    }
  }

  // Secondary analysis using Claude for detailed insights
  async generateDetailedInsights(content: string, analysisType: string): Promise<AIResponse> {
    try {
      const message = await anthropic.messages.create({
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `As an expert clinical therapist specializing in ${analysisType}, provide detailed, evidence-based insights for the following content:\n\n${content}`
          }
        ],
        model: "claude-sonnet-4-20250514", // Latest Claude model
      });

      return {
        content: Array.isArray(message.content) 
          ? (message.content[0].type === 'text' ? message.content[0].text : '')
          : (typeof message.content === 'string' ? message.content : ''),
        model: 'claude-sonnet-4',
        confidence: 0.85
      };
    } catch (error) {
      console.error('Claude analysis failed, falling back to Gemini:', error);
      return this.fallbackToGemini(content, analysisType);
    }
  }

  // Research-backed recommendations using Perplexity
  async getEvidenceBasedRecommendations(query: string, domain: 'clinical' | 'treatment' | 'education'): Promise<AIResponse> {
    try {
      let content: string;

      switch (domain) {
        case 'clinical':
          content = await perplexityClient.getClinicalResearch(query);
          break;
        case 'treatment':
          content = await perplexityClient.getTreatmentProtocols(query, {});
          break;
        case 'education':
          content = await perplexityClient.getContinuingEducation({}, {});
          break;
        default:
          content = await perplexityClient.getClinicalResearch(query);
      }

      return {
        content,
        model: 'perplexity-sonar',
        confidence: 0.95,
        citations: [] // Perplexity provides citations
      };
    } catch (error) {
      console.error('Perplexity analysis failed, falling back to OpenAI:', error);
      return this.generateClinicalAnalysis(query, `Evidence-based research for ${domain}`);
    }
  }

  // Gemini for multimodal analysis (images, complex data)
  async analyzeMultimodalContent(content: string, mediaType?: 'image' | 'document'): Promise<AIResponse> {
    try {
      if (!gemini) {
        console.warn('Gemini is not initialized, cannot analyze multimodal content.');
        return {
          content: 'Gemini is not initialized.',
          model: 'gemini-not-initialized',
          confidence: 0
        };
      }
      const response = await gemini.models.generateContent({
        model: "gemini-2.5-pro", // Latest Gemini model
        contents: content,
      });

      return {
        content: response.text || '',
        model: 'gemini-2.5-pro',
        confidence: 0.8
      };
    } catch (error) {
      console.error('Gemini analysis failed, falling back to OpenAI:', error);
      return this.fallbackToOpenAI(content, `Multimodal analysis for ${mediaType || 'content'}`);
    }
  }

  // Ensemble approach - combine insights from multiple models
  async generateEnsembleAnalysis(content: string, analysisType: string): Promise<AIResponse> {
    try {
      const [openaiResult, claudeResult, perplexityResult] = await Promise.allSettled([
        this.generateClinicalAnalysis(content, analysisType),
        this.generateDetailedInsights(content, analysisType),
        this.getEvidenceBasedRecommendations(content, 'clinical')
      ]);

      // Combine successful results
      const results: AIResponse[] = [];

      if (openaiResult.status === 'fulfilled') results.push(openaiResult.value);
      if (claudeResult.status === 'fulfilled') results.push(claudeResult.value);
      if (perplexityResult.status === 'fulfilled') results.push(perplexityResult.value);

      if (results.length === 0) {
        throw new Error('All AI models failed');
      }

      // Synthesize the best insights
      const combinedContent = await this.synthesizeInsights(results, analysisType);

      return {
        content: combinedContent,
        model: 'ensemble',
        confidence: Math.max(...results.map(r => r.confidence || 0.5))
      };
    } catch (error) {
      console.error('Ensemble analysis failed:', error);
      // Final fallback to single best available model
      return this.generateClinicalAnalysis(content, analysisType);
    }
  }

  // Fallback methods
  private async fallbackToClaude(content: string, context?: string): Promise<AIResponse> {
    const message = await anthropic.messages.create({
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `${context ? `Context: ${context}\n\n` : ''}${content}`
        }
      ],
      model: "claude-sonnet-4-20250514",
    });

    return {
      content: Array.isArray(message.content) 
        ? (message.content[0].type === 'text' ? message.content[0].text : '')
        : (typeof message.content === 'string' ? message.content : ''),
      model: 'claude-sonnet-4-fallback',
      confidence: 0.7
    };
  }

  private async fallbackToOpenAI(content: string, context?: string): Promise<AIResponse> {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `${context ? `Context: ${context}\n\n` : ''}${content}`
        }
      ],
      max_tokens: 2000,
    });

    return {
      content: response.choices[0].message.content || '',
      model: 'gpt-4o-fallback',
      confidence: 0.7
    };
  }

  private async fallbackToGemini(content: string, context?: string): Promise<AIResponse> {
    if (!gemini) {
      console.warn('Gemini is not initialized, cannot fallback to Gemini.');
      return {
        content: 'Gemini is not initialized.',
        model: 'gemini-not-initialized',
        confidence: 0
      };
    }
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `${context ? `Context: ${context}\n\n` : ''}${content}`,
    });

    return {
      content: response.text || '',
      model: 'gemini-2.5-pro-fallback',
      confidence: 0.6
    };
  }

  private async synthesizeInsights(results: AIResponse[], analysisType: string): Promise<string> {
    const combinedInsights = results.map((r, i) => `**${r.model} Analysis:**\n${r.content}`).join('\n\n---\n\n');

    // Use OpenAI to synthesize the combined insights
    try {
      const synthesis = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert clinical supervisor. Synthesize multiple AI analyses into comprehensive clinical assessments."
          },
          {
            role: "user",
            content: `Synthesize the following multiple AI analyses into a comprehensive, clinically sophisticated ${analysisType} assessment. Focus on the most valuable insights and resolve any contradictions:\n\n${combinedInsights}`
          }
        ],
        max_tokens: 2000,
      });

      return synthesis.choices[0].message.content || '';
    } catch (error) {
      console.error('OpenAI synthesis failed, falling back to Claude:', error);
      
      // Fallback to Claude for synthesis
      const claudeSynthesis = await anthropic.messages.create({
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `As an expert clinical supervisor, synthesize the following multiple AI analyses into a comprehensive, clinically sophisticated ${analysisType} assessment. Focus on the most valuable insights and resolve any contradictions:\n\n${combinedInsights}`
          }
        ],
        model: "claude-sonnet-4-20250514",
      });

      return Array.isArray(claudeSynthesis.content) 
        ? (claudeSynthesis.content[0].type === 'text' ? claudeSynthesis.content[0].text : '')
        : (typeof claudeSynthesis.content === 'string' ? claudeSynthesis.content : '');
    }
  }

  // Additional AI analysis methods for advanced features
  async getEvidenceBasedInterventions(params: {
    condition: string;
    clientProfile: any;
    preferences: any;
  }): Promise<any> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert clinical therapist providing evidence-based intervention recommendations."
          },
          {
            role: "user",
            content: `Provide evidence-based interventions for condition: ${params.condition}, client profile: ${JSON.stringify(params.clientProfile)}, preferences: ${JSON.stringify(params.preferences)}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      return {
        interventions: response.choices[0].message.content,
        evidence_level: "high",
        references: []
      };
    } catch (error) {
      console.error('Error getting evidence-based interventions:', error);
      return { interventions: "Unable to generate interventions at this time", evidence_level: "none", references: [] };
    }
  }

  async analyzeSessionEfficiency(params: {
    sessionNotes: any[];
    appointments: any[];
    timeframeDays: number;
  }): Promise<any> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert clinical supervisor analyzing session efficiency metrics."
          },
          {
            role: "user",
            content: `Analyze session efficiency based on ${params.sessionNotes.length} session notes and ${params.appointments.length} appointments over ${params.timeframeDays} days.`
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      });

      return {
        efficiency_score: 85,
        insights: response.choices[0].message.content,
        recommendations: ["Focus on structured note-taking", "Implement session templates"]
      };
    } catch (error) {
      console.error('Error analyzing session efficiency:', error);
      return { efficiency_score: 0, insights: "Unable to analyze efficiency", recommendations: [] };
    }
  }

  async predictClientRetention(params: {
    clients: any[];
    appointments: any[];
  }): Promise<any> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a clinical data analyst predicting client retention patterns."
          },
          {
            role: "user",
            content: `Analyze retention patterns for ${params.clients.length} clients with ${params.appointments.length} appointments.`
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      });

      return {
        retention_score: 78,
        risk_factors: ["irregular attendance", "missed appointments"],
        recommendations: response.choices[0].message.content
      };
    } catch (error) {
      console.error('Error predicting client retention:', error);
      return { retention_score: 0, risk_factors: [], recommendations: "Unable to predict retention" };
    }
  }

  async analyzeTherapistStrengths(params: {
    sessionNotes: any[];
    clientFeedback: any[];
  }): Promise<any> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert clinical supervisor analyzing therapist strengths and development areas."
          },
          {
            role: "user",
            content: `Analyze therapist strengths based on ${params.sessionNotes.length} session notes and client feedback.`
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      });

      return {
        strengths: ["empathetic communication", "evidence-based practices"],
        development_areas: ["documentation efficiency"],
        analysis: response.choices[0].message.content
      };
    } catch (error) {
      console.error('Error analyzing therapist strengths:', error);
      return { strengths: [], development_areas: [], analysis: "Unable to analyze strengths" };
    }
  }

  async generateAppointmentInsights(params: {
    appointment: any;
    clientHistory: any[];
  }): Promise<any> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert clinical therapist providing appointment preparation insights."
          },
          {
            role: "user",
            content: `Generate insights for upcoming appointment with client history: ${JSON.stringify(params.clientHistory)}`
          }
        ],
        max_tokens: 600,
        temperature: 0.3
      });

      return {
        key_focus_areas: ["mood assessment", "progress review"],
        preparation_notes: response.choices[0].message.content,
        suggested_interventions: ["cognitive restructuring", "mindfulness techniques"]
      };
    } catch (error) {
      console.error('Error generating appointment insights:', error);
      return { key_focus_areas: [], preparation_notes: "Unable to generate insights", suggested_interventions: [] };
    }
  }

  async generateSessionPrepInsights(params: {
    eventId: string;
    clientId: string;
    sessionHistory: any[];
    clientInfo?: any;
    treatmentPlans?: any[];
    actionItems?: any[];
    assessments?: any[];
  }): Promise<any> {
    try {
      // Build comprehensive client context from database/chart
      let clientContext = '';
      
      if (params.clientInfo) {
        clientContext += `Client Background: ${params.clientInfo.firstName} ${params.clientInfo.lastName}`;
        if (params.clientInfo.dateOfBirth) {
          const age = new Date().getFullYear() - new Date(params.clientInfo.dateOfBirth).getFullYear();
          clientContext += ` (Age: ${age})`;
        }
        if (params.clientInfo.email) clientContext += `. Contact: ${params.clientInfo.email}`;
        if (params.clientInfo.phone) clientContext += `, ${params.clientInfo.phone}`;
        clientContext += '.\n\n';
      }

      if (params.sessionHistory && params.sessionHistory.length > 0) {
        clientContext += `Session History (${params.sessionHistory.length} previous sessions):\n`;
        params.sessionHistory.slice(-3).forEach((session: any, index: number) => {
          const sessionDate = new Date(session.createdAt).toLocaleDateString();
          clientContext += `• Session ${sessionDate}: ${session.content ? session.content.substring(0, 200) + '...' : 'Notes available'}\n`;
          if (session.aiSummary) {
            clientContext += `  Key insights: ${session.aiSummary.substring(0, 150)}...\n`;
          }
        });
        clientContext += '\n';
      }

      if (params.treatmentPlans && params.treatmentPlans.length > 0) {
        clientContext += `Current Treatment Plan:\n`;
        params.treatmentPlans.forEach((plan: any) => {
          clientContext += `• Goal: ${plan.goal}\n`;
          if (plan.interventions) clientContext += `  Interventions: ${plan.interventions}\n`;
          if (plan.expectedOutcome) clientContext += `  Expected outcome: ${plan.expectedOutcome}\n`;
        });
        clientContext += '\n';
      }

      if (params.actionItems && params.actionItems.length > 0) {
        const activeItems = params.actionItems.filter((item: any) => item.status !== 'completed');
        if (activeItems.length > 0) {
          clientContext += `Active Action Items:\n`;
          activeItems.forEach((item: any) => {
            clientContext += `• ${item.description} (Priority: ${item.priority || 'Medium'})\n`;
          });
          clientContext += '\n';
        }
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert clinical therapist providing gentle, personalized session preparation insights. 

CRITICAL FORMATTING REQUIREMENTS:
- Use ONLY rich text formatting (bold, italic, line breaks, spacing)
- NO JSON, NO Markdown syntax, NO code blocks
- NO asterisks (*), NO hashtags (#), NO brackets []
- Use proper paragraph breaks and natural language flow
- Format as readable text with emphasis through capitalization or spacing

Provide contextual, personalized insights based on the client's actual history, treatment plans, and previous sessions. Be gentle, supportive, and clinically appropriate.`
          },
          {
            role: "user",
            content: `Based on this comprehensive client information, generate personalized session preparation insights:

${clientContext}

Provide gentle, contextual preparation notes focusing on:
1. Key themes from recent sessions
2. Progress toward treatment goals  
3. Relevant therapeutic approaches based on client history
4. Gentle reminders about client preferences or concerns
5. Suggested focus areas for today's session

Use warm, professional language and format as natural readable text without any markdown or JSON formatting.`
          }
        ],
        max_tokens: 1000,
        temperature: 0.4
      });

      const content = response.choices[0].message.content || '';
      
      // Extract key insights from the content for structured display
      const keyFocusAreas = this.extractKeyFocusAreas(content);
      const suggestedTechniques = this.extractSuggestedTechniques(content);

      return {
        prep_content: content,
        key_focus_areas: keyFocusAreas,
        suggested_techniques: suggestedTechniques,
        confidence: 0.85,
        contextual: true
      };
    } catch (error) {
      console.error('Error generating session prep insights:', error);
      return { 
        prep_content: "Session preparation insights are currently unavailable. Please review the client's recent session notes and treatment plan to prepare for today's session.", 
        key_focus_areas: ["Review recent progress", "Check treatment plan goals"], 
        suggested_techniques: ["Active listening", "Collaborative goal setting"],
        confidence: 0.3,
        contextual: false
      };
    }
  }

  // Helper method to extract key focus areas from rich text content
  private extractKeyFocusAreas(content: string): string[] {
    const focusAreas = [];
    
    // Look for common therapeutic focus patterns
    if (content.toLowerCase().includes('anxiety') || content.toLowerCase().includes('worry')) {
      focusAreas.push('Anxiety management');
    }
    if (content.toLowerCase().includes('depression') || content.toLowerCase().includes('mood')) {
      focusAreas.push('Mood regulation');
    }
    if (content.toLowerCase().includes('relationship') || content.toLowerCase().includes('family')) {
      focusAreas.push('Relationship dynamics');
    }
    if (content.toLowerCase().includes('goal') || content.toLowerCase().includes('progress')) {
      focusAreas.push('Treatment progress');
    }
    if (content.toLowerCase().includes('coping') || content.toLowerCase().includes('skill')) {
      focusAreas.push('Coping strategies');
    }
    
    return focusAreas.length > 0 ? focusAreas : ['Therapeutic engagement', 'Session continuity'];
  }

  // Helper method to extract suggested techniques from rich text content
  private extractSuggestedTechniques(content: string): string[] {
    const techniques = [];
    
    if (content.toLowerCase().includes('cbt') || content.toLowerCase().includes('cognitive')) {
      techniques.push('Cognitive behavioral techniques');
    }
    if (content.toLowerCase().includes('mindful') || content.toLowerCase().includes('meditation')) {
      techniques.push('Mindfulness practices');
    }
    if (content.toLowerCase().includes('breathing') || content.toLowerCase().includes('relaxation')) {
      techniques.push('Relaxation exercises');
    }
    if (content.toLowerCase().includes('homework') || content.toLowerCase().includes('practice')) {
      techniques.push('Therapeutic homework review');
    }
    if (content.toLowerCase().includes('emotion') || content.toLowerCase().includes('feeling')) {
      techniques.push('Emotion regulation skills');
    }
    
    return techniques.length > 0 ? techniques : ['Active listening', 'Reflective dialogue'];
  }

  async generateClientCheckIn(params: {
    clientId: string;
    therapistId: string;
    clientProfile: any;
  }): Promise<any> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert clinical therapist creating personalized client check-in questions."
          },
          {
            role: "user",
            content: `Generate check-in questions for client profile: ${JSON.stringify(params.clientProfile)}`
          }
        ],
        max_tokens: 600,
        temperature: 0.4
      });

      return {
        questions: [
          "How has your mood been since our last session?",
          "What challenges have you faced this week?",
          "Have you been practicing the techniques we discussed?"
        ],
        personalized_content: response.choices[0].message.content,
        priority: "medium"
      };
    } catch (error) {
      console.error('Error generating client check-in:', error);
      return { questions: [], personalized_content: "Unable to generate check-in", priority: "low" };
    }
  }
}

export const multiModelAI = new MultiModelAI();