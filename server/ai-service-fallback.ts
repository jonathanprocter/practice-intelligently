// AI Service Fallback System with Multi-Provider Support
import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface AIProvider {
  name: string;
  priority: number;
  isAvailable: () => Promise<boolean>;
  generateResponse: (prompt: string, options?: any) => Promise<string>;
  generateEmbedding?: (text: string) => Promise<number[]>;
}

interface AIServiceOptions {
  maxRetries?: number;
  timeout?: number;
  fallbackToCache?: boolean;
  costLimit?: number;
}

export class AIServiceFallbackSystem {
  private static instance: AIServiceFallbackSystem;
  private providers: AIProvider[] = [];
  private responseCache: Map<string, { response: string; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private costTracker: Map<string, number> = new Map();
  private dailyCostLimit: number = 100; // $100 daily limit
  private providerStatus: Map<string, boolean> = new Map();

  private constructor() {
    this.initializeProviders();
    this.startHealthCheck();
  }

  static getInstance(): AIServiceFallbackSystem {
    if (!AIServiceFallbackSystem.instance) {
      AIServiceFallbackSystem.instance = new AIServiceFallbackSystem();
    }
    return AIServiceFallbackSystem.instance;
  }

  private initializeProviders() {
    // OpenAI Provider
    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      this.providers.push({
        name: 'OpenAI',
        priority: 1,
        isAvailable: async () => {
          try {
            const response = await openai.models.list();
            this.providerStatus.set('OpenAI', true);
            return true;
          } catch (error) {
            console.error('OpenAI availability check failed:', error);
            this.providerStatus.set('OpenAI', false);
            return false;
          }
        },
        generateResponse: async (prompt: string, options?: any) => {
          try {
            const completion = await openai.chat.completions.create({
              model: options?.model || 'gpt-4',
              messages: [{ role: 'user', content: prompt }],
              temperature: options?.temperature || 0.7,
              max_tokens: options?.maxTokens || 2000,
            });

            const response = completion.choices[0]?.message?.content || '';
            this.trackCost('OpenAI', this.estimateOpenAICost(prompt, response));
            return response;
          } catch (error: any) {
            console.error('OpenAI generation failed:', error);
            throw new Error(`OpenAI failed: ${error.message}`);
          }
        },
        generateEmbedding: async (text: string) => {
          try {
            const embedding = await openai.embeddings.create({
              model: 'text-embedding-ada-002',
              input: text,
            });
            return embedding.data[0].embedding;
          } catch (error: any) {
            console.error('OpenAI embedding failed:', error);
            throw new Error(`OpenAI embedding failed: ${error.message}`);
          }
        }
      });
    }

    // Anthropic Provider
    if (process.env.ANTHROPIC_API_KEY) {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      this.providers.push({
        name: 'Anthropic',
        priority: 2,
        isAvailable: async () => {
          try {
            // Simple availability check
            this.providerStatus.set('Anthropic', true);
            return true;
          } catch (error) {
            console.error('Anthropic availability check failed:', error);
            this.providerStatus.set('Anthropic', false);
            return false;
          }
        },
        generateResponse: async (prompt: string, options?: any) => {
          try {
            const message = await anthropic.messages.create({
              model: options?.model || 'claude-3-sonnet-20240229',
              max_tokens: options?.maxTokens || 2000,
              messages: [{ role: 'user', content: prompt }],
            });

            const response = message.content[0]?.text || '';
            this.trackCost('Anthropic', this.estimateAnthropicCost(prompt, response));
            return response;
          } catch (error: any) {
            console.error('Anthropic generation failed:', error);
            throw new Error(`Anthropic failed: ${error.message}`);
          }
        }
      });
    }

    // Google Gemini Provider
    if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(
        process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY!
      );

      this.providers.push({
        name: 'Gemini',
        priority: 3,
        isAvailable: async () => {
          try {
            const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
            this.providerStatus.set('Gemini', true);
            return true;
          } catch (error) {
            console.error('Gemini availability check failed:', error);
            this.providerStatus.set('Gemini', false);
            return false;
          }
        },
        generateResponse: async (prompt: string, options?: any) => {
          try {
            const model = genAI.getGenerativeModel({ 
              model: options?.model || 'gemini-pro' 
            });
            
            const result = await model.generateContent(prompt);
            const response = result.response.text();
            
            this.trackCost('Gemini', this.estimateGeminiCost(prompt, response));
            return response;
          } catch (error: any) {
            console.error('Gemini generation failed:', error);
            throw new Error(`Gemini failed: ${error.message}`);
          }
        }
      });
    }

    // Sort providers by priority
    this.providers.sort((a, b) => a.priority - b.priority);
    
    console.log(`Initialized ${this.providers.length} AI providers:`, 
      this.providers.map(p => p.name).join(', '));
  }

  async generateWithFallback(
    prompt: string,
    options?: AIServiceOptions
  ): Promise<{ response: string; provider: string; fromCache: boolean }> {
    const cacheKey = this.getCacheKey(prompt);
    
    // Check cache first if enabled
    if (options?.fallbackToCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('Returning cached AI response');
        return { response: cached, provider: 'cache', fromCache: true };
      }
    }

    // Check cost limit
    if (!this.isBelowCostLimit()) {
      console.error('Daily AI cost limit exceeded');
      
      // Try to return from cache even if not requested
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { response: cached, provider: 'cache', fromCache: true };
      }
      
      throw new Error('AI service cost limit exceeded and no cached response available');
    }

    // Try each provider in order
    const errors: Map<string, string> = new Map();

    for (const provider of this.providers) {
      try {
        // Check if provider is available
        const isAvailable = await this.withTimeout(
          provider.isAvailable(),
          options?.timeout || 5000
        );

        if (!isAvailable) {
          errors.set(provider.name, 'Provider not available');
          continue;
        }

        // Try to generate response
        console.log(`Attempting AI generation with ${provider.name}...`);
        const response = await this.withTimeout(
          provider.generateResponse(prompt, options),
          options?.timeout || 30000
        );

        if (response) {
          // Cache successful response
          this.addToCache(cacheKey, response);
          
          console.log(`Successfully generated response with ${provider.name}`);
          return { response, provider: provider.name, fromCache: false };
        }
      } catch (error: any) {
        console.error(`${provider.name} failed:`, error.message);
        errors.set(provider.name, error.message);
        
        // Continue to next provider
        continue;
      }
    }

    // All providers failed - try cache as last resort
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log('All providers failed, returning stale cached response');
      return { response: cached, provider: 'cache (stale)', fromCache: true };
    }

    // Complete failure - provide helpful error message
    const errorSummary = Array.from(errors.entries())
      .map(([provider, error]) => `${provider}: ${error}`)
      .join(', ');

    throw new Error(`All AI providers failed. ${errorSummary}`);
  }

  async generateEmbeddingWithFallback(
    text: string
  ): Promise<{ embedding: number[]; provider: string }> {
    for (const provider of this.providers) {
      if (!provider.generateEmbedding) continue;

      try {
        const embedding = await provider.generateEmbedding(text);
        return { embedding, provider: provider.name };
      } catch (error) {
        console.error(`${provider.name} embedding failed:`, error);
        continue;
      }
    }

    // Fallback to simple hash-based embedding
    console.warn('All embedding providers failed, using fallback hash-based embedding');
    return {
      embedding: this.generateFallbackEmbedding(text),
      provider: 'fallback'
    };
  }

  private generateFallbackEmbedding(text: string): number[] {
    // Simple deterministic embedding based on text hash
    const embedding = new Array(384).fill(0);
    for (let i = 0; i < text.length; i++) {
      const idx = i % embedding.length;
      embedding[idx] = (embedding[idx] + text.charCodeAt(i)) / 256;
    }
    return embedding;
  }

  private withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), timeout)
      )
    ]);
  }

  private getCacheKey(prompt: string): string {
    // Create a simple hash of the prompt for cache key
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `ai_response_${hash}`;
  }

  private getFromCache(key: string): string | null {
    const cached = this.responseCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_DURATION) {
      this.responseCache.delete(key);
      return null;
    }

    return cached.response;
  }

  private addToCache(key: string, response: string) {
    // Limit cache size
    if (this.responseCache.size > 1000) {
      const firstKey = this.responseCache.keys().next().value;
      this.responseCache.delete(firstKey);
    }

    this.responseCache.set(key, {
      response,
      timestamp: Date.now()
    });
  }

  private trackCost(provider: string, cost: number) {
    const today = new Date().toDateString();
    const key = `${provider}_${today}`;
    const currentCost = this.costTracker.get(key) || 0;
    this.costTracker.set(key, currentCost + cost);
  }

  private isBelowCostLimit(): boolean {
    const today = new Date().toDateString();
    let totalCost = 0;

    for (const [key, cost] of this.costTracker.entries()) {
      if (key.endsWith(today)) {
        totalCost += cost;
      }
    }

    return totalCost < this.dailyCostLimit;
  }

  // Cost estimation methods (rough estimates)
  private estimateOpenAICost(prompt: string, response: string): number {
    const promptTokens = prompt.length / 4; // Rough estimate
    const responseTokens = response.length / 4;
    const costPerThousandTokens = 0.03; // GPT-4 pricing estimate
    return ((promptTokens + responseTokens) / 1000) * costPerThousandTokens;
  }

  private estimateAnthropicCost(prompt: string, response: string): number {
    const promptTokens = prompt.length / 4;
    const responseTokens = response.length / 4;
    const costPerThousandTokens = 0.025; // Claude pricing estimate
    return ((promptTokens + responseTokens) / 1000) * costPerThousandTokens;
  }

  private estimateGeminiCost(prompt: string, response: string): number {
    const promptTokens = prompt.length / 4;
    const responseTokens = response.length / 4;
    const costPerThousandTokens = 0.001; // Gemini pricing estimate
    return ((promptTokens + responseTokens) / 1000) * costPerThousandTokens;
  }

  private startHealthCheck() {
    // Check provider health every 5 minutes
    setInterval(async () => {
      for (const provider of this.providers) {
        try {
          const isAvailable = await provider.isAvailable();
          this.providerStatus.set(provider.name, isAvailable);
        } catch {
          this.providerStatus.set(provider.name, false);
        }
      }
    }, 5 * 60 * 1000);
  }

  getProviderStatus(): Map<string, boolean> {
    return new Map(this.providerStatus);
  }

  getCostReport(): { provider: string; cost: number }[] {
    const today = new Date().toDateString();
    const report: { provider: string; cost: number }[] = [];

    for (const [key, cost] of this.costTracker.entries()) {
      if (key.endsWith(today)) {
        const provider = key.split('_')[0];
        report.push({ provider, cost });
      }
    }

    return report;
  }

  clearCache() {
    this.responseCache.clear();
  }

  setCostLimit(limit: number) {
    this.dailyCostLimit = limit;
  }
}

// Export singleton instance
export const aiServiceFallback = AIServiceFallbackSystem.getInstance();

export default aiServiceFallback;