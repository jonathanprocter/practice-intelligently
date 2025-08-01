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
}

export const multiModelAI = new MultiModelAI();