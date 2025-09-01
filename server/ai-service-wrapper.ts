// AI Service Wrapper - Provides fallback to mock services when API keys are not configured

import { mockAI } from './ai-mock-service';

class AIServiceWrapper {
  private useOpenAI: boolean = false;
  private useAnthropic: boolean = false;
  private useGemini: boolean = false;
  private usePerplexity: boolean = false;
  private openaiClient: any = null;
  private anthropicClient: any = null;

  constructor() {
    this.initializeServices();
  }

  private initializeServices() {
    // Check if API keys are real (not placeholders)
    const hasRealOpenAI = this.isRealApiKey(process.env.OPENAI_API_KEY);
    const hasRealAnthropic = this.isRealApiKey(process.env.ANTHROPIC_API_KEY);
    const hasRealGemini = this.isRealApiKey(process.env.GOOGLE_GEMINI_API_KEY);
    const hasRealPerplexity = this.isRealApiKey(process.env.PERPLEXITY_API_KEY);

    // Initialize OpenAI if available
    if (hasRealOpenAI) {
      try {
        const OpenAI = require('openai');
        this.openaiClient = new OpenAI.OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        this.useOpenAI = true;
        console.log('✓ OpenAI service initialized');
      } catch (error) {
        console.log('⚠ OpenAI initialization failed, using mock service');
      }
    }

    // Initialize Anthropic if available
    if (hasRealAnthropic) {
      try {
        const Anthropic = require('@anthropic-ai/sdk');
        this.anthropicClient = new Anthropic.Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
        this.useAnthropic = true;
        console.log('✓ Anthropic service initialized');
      } catch (error) {
        console.log('⚠ Anthropic initialization failed, using mock service');
      }
    }

    // Log service status
    if (!hasRealOpenAI && !hasRealAnthropic && !hasRealGemini && !hasRealPerplexity) {
      console.log('ℹ All AI services running in mock mode (no valid API keys configured)');
    }
  }

  private isRealApiKey(key: string | undefined): boolean {
    if (!key) return false;
    // Check if it's not a placeholder
    return !key.includes('your-') && 
           !key.includes('mock-') && 
           !key.includes('test-') &&
           key.length > 20; // Real API keys are typically longer
  }

  async analyzeContent(content: string, options: {
    type?: string;
    model?: string;
    temperature?: number;
  } = {}): Promise<any> {
    // Try OpenAI first
    if (this.useOpenAI && this.openaiClient) {
      try {
        const completion = await this.openaiClient.chat.completions.create({
          model: options.model || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant analyzing therapy-related documents.'
            },
            {
              role: 'user',
              content: `Analyze the following content and provide insights:\n\n${content}`
            }
          ],
          temperature: options.temperature || 0.7,
        });
        
        return {
          content: completion.choices[0].message.content,
          model: completion.model,
          mock: false
        };
      } catch (error) {
        console.error('OpenAI request failed:', error);
        // Fall through to mock service
      }
    }

    // Try Anthropic as fallback
    if (this.useAnthropic && this.anthropicClient) {
      try {
        const message = await this.anthropicClient.messages.create({
          model: options.model || 'claude-3-haiku-20240307',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `Analyze the following content and provide insights:\n\n${content}`
            }
          ],
        });
        
        return {
          content: message.content[0].text,
          model: message.model,
          mock: false
        };
      } catch (error) {
        console.error('Anthropic request failed:', error);
        // Fall through to mock service
      }
    }

    // Fallback to mock service
    return mockAI.analyzeContent(content, options.type || 'general');
  }

  async generateTags(content: string): Promise<string[]> {
    if (this.useOpenAI && this.openaiClient) {
      try {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Generate relevant tags for the following content. Return only a comma-separated list of tags.'
            },
            {
              role: 'user',
              content: content.substring(0, 2000) // Limit content length
            }
          ],
          temperature: 0.5,
        });
        
        const tagsString = completion.choices[0].message.content || '';
        return tagsString.split(',').map(tag => tag.trim()).filter(Boolean);
      } catch (error) {
        console.error('Tag generation failed:', error);
      }
    }

    // Fallback to mock service
    return mockAI.generateTags(content);
  }

  async summarize(content: string): Promise<string> {
    if (this.useOpenAI && this.openaiClient) {
      try {
        const completion = await this.openaiClient.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Provide a concise summary of the following content.'
            },
            {
              role: 'user',
              content: content.substring(0, 3000) // Limit content length
            }
          ],
          temperature: 0.3,
        });
        
        return completion.choices[0].message.content || 'Unable to generate summary';
      } catch (error) {
        console.error('Summarization failed:', error);
      }
    }

    // Fallback to mock service
    return mockAI.summarize(content);
  }

  async processDocument(document: {
    content: string;
    type: string;
    fileName: string;
  }): Promise<any> {
    // Try real AI services first
    if (this.useOpenAI || this.useAnthropic) {
      try {
        const [analysis, tags, summary] = await Promise.all([
          this.analyzeContent(document.content, { type: document.type }),
          this.generateTags(document.content),
          this.summarize(document.content)
        ]);

        return {
          analysis: typeof analysis === 'string' ? analysis : analysis.content,
          tags,
          summary,
          category: this.determineCategory(document.type, document.fileName),
          confidence: 0.85,
          mock: false
        };
      } catch (error) {
        console.error('Document processing failed:', error);
      }
    }

    // Fallback to mock service
    return mockAI.processDocument(document);
  }

  private determineCategory(type: string, fileName: string): string {
    const lowerFileName = fileName.toLowerCase();
    
    if (lowerFileName.includes('note') || lowerFileName.includes('session')) {
      return 'session_notes';
    }
    if (lowerFileName.includes('assess')) {
      return 'assessment';
    }
    if (lowerFileName.includes('intake')) {
      return 'intake';
    }
    if (lowerFileName.includes('consent')) {
      return 'consent';
    }
    if (lowerFileName.includes('treatment') || lowerFileName.includes('plan')) {
      return 'treatment_plan';
    }
    
    return 'general';
  }

  // Service status check
  getServiceStatus() {
    return {
      openai: this.useOpenAI,
      anthropic: this.useAnthropic,
      gemini: this.useGemini,
      perplexity: this.usePerplexity,
      mockMode: !this.useOpenAI && !this.useAnthropic && !this.useGemini && !this.usePerplexity
    };
  }
}

// Export singleton instance
export const aiService = new AIServiceWrapper();