/**
 * AI Orchestrator - Intelligent Load Balancing and Failover System
 * 
 * This module manages AI service selection with:
 * - OpenAI as primary (fastest, most reliable)
 * - Anthropic as secondary (detailed analysis)
 * - Load balancing based on task type
 * - Automatic failover on errors
 * - Cost optimization
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Logger } from './fixes/critical-bugs-and-improvements';

interface AIProvider {
  name: string;
  priority: number;
  costPerToken: number;
  isAvailable: boolean;
  lastError?: Date;
  successRate: number;
  avgResponseTime: number;
}

interface AITask {
  type: 'analysis' | 'summary' | 'extraction' | 'generation' | 'classification';
  complexity: 'simple' | 'moderate' | 'complex';
  maxTokens?: number;
  temperature?: number;
  requiresCitations?: boolean;
}

export class AIOrchestrator {
  private static instance: AIOrchestrator;
  
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  
  private providers: Map<string, AIProvider> = new Map();
  private taskQueue: Array<{ task: any; resolve: any; reject: any }> = [];
  private processing = false;
  
  // Performance tracking
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalResponseTime: 0,
    costEstimate: 0
  };

  private constructor() {
    this.initializeProviders();
  }

  static getInstance(): AIOrchestrator {
    if (!AIOrchestrator.instance) {
      AIOrchestrator.instance = new AIOrchestrator();
    }
    return AIOrchestrator.instance;
  }

  private initializeProviders() {
    // Initialize OpenAI (Primary)
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.providers.set('openai', {
        name: 'OpenAI GPT-4o',
        priority: 1,
        costPerToken: 0.00003, // $0.03 per 1K tokens
        isAvailable: true,
        successRate: 1.0,
        avgResponseTime: 0
      });
    }

    // Initialize Anthropic (Secondary)
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      this.providers.set('anthropic', {
        name: 'Claude 3 Sonnet',
        priority: 2,
        costPerToken: 0.00002, // $0.02 per 1K tokens
        isAvailable: true,
        successRate: 1.0,
        avgResponseTime: 0
      });
    }

    if (!this.openai && !this.anthropic) {
      throw new Error('No AI providers configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY');
    }
  }

  /**
   * Select the best provider based on task requirements and provider availability
   */
  private selectProvider(task: AITask): string {
    const availableProviders = Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.isAvailable)
      .sort((a, b) => {
        // Sort by priority, then by success rate, then by response time
        if (a[1].priority !== b[1].priority) {
          return a[1].priority - b[1].priority;
        }
        if (a[1].successRate !== b[1].successRate) {
          return b[1].successRate - a[1].successRate;
        }
        return a[1].avgResponseTime - b[1].avgResponseTime;
      });

    if (availableProviders.length === 0) {
      throw new Error('No AI providers available');
    }

    // Task-based routing
    if (task.type === 'extraction' && task.complexity === 'complex') {
      // Claude is better at complex extraction
      const claude = availableProviders.find(([name]) => name === 'anthropic');
      if (claude) return claude[0];
    }

    if (task.requiresCitations) {
      // OpenAI is better for citations
      const openai = availableProviders.find(([name]) => name === 'openai');
      if (openai) return openai[0];
    }

    // Default to highest priority available
    return availableProviders[0][0];
  }

  /**
   * Execute AI task with automatic failover
   */
  async executeTask(
    prompt: string,
    task: AITask,
    context?: Record<string, any>
  ): Promise<{ content: string; provider: string; metadata: any }> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    let lastError: any;
    const attemptedProviders: string[] = [];

    // Try each provider in order of selection
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const providerName = this.selectProvider(task);
        
        // Skip if already attempted
        if (attemptedProviders.includes(providerName)) continue;
        attemptedProviders.push(providerName);

        const provider = this.providers.get(providerName)!;
        
        Logger.info(`Using ${provider.name} for ${task.type} task`);

        let content: string;
        let metadata: any = {};

        if (providerName === 'openai' && this.openai) {
          content = await this.executeOpenAI(prompt, task, context);
          metadata.model = 'gpt-4o';
        } else if (providerName === 'anthropic' && this.anthropic) {
          content = await this.executeAnthropic(prompt, task, context);
          metadata.model = 'claude-3-sonnet';
        } else {
          throw new Error(`Provider ${providerName} not initialized`);
        }

        // Update metrics
        const responseTime = Date.now() - startTime;
        provider.avgResponseTime = 
          (provider.avgResponseTime * (this.metrics.successfulRequests || 1) + responseTime) / 
          (this.metrics.successfulRequests + 1);
        provider.successRate = 
          (provider.successRate * (this.metrics.totalRequests - 1) + 1) / 
          this.metrics.totalRequests;
        
        this.metrics.successfulRequests++;
        this.metrics.totalResponseTime += responseTime;
        
        // Estimate cost (rough calculation)
        const tokenCount = Math.ceil(content.length / 4);
        this.metrics.costEstimate += tokenCount * provider.costPerToken;

        return {
          content,
          provider: provider.name,
          metadata: {
            ...metadata,
            responseTime,
            tokenCount,
            estimatedCost: tokenCount * provider.costPerToken
          }
        };

      } catch (error) {
        lastError = error;
        Logger.error(`Provider ${attemptedProviders[attemptedProviders.length - 1]} failed`, error);
        
        // Mark provider as temporarily unavailable
        const provider = this.providers.get(attemptedProviders[attemptedProviders.length - 1]);
        if (provider) {
          provider.isAvailable = false;
          provider.lastError = new Date();
          provider.successRate = 
            (provider.successRate * (this.metrics.totalRequests - 1)) / 
            this.metrics.totalRequests;
          
          // Re-enable after 30 seconds
          setTimeout(() => {
            provider.isAvailable = true;
          }, 30000);
        }
      }
    }

    this.metrics.failedRequests++;
    throw new Error(`All AI providers failed. Last error: ${lastError?.message}`);
  }

  private async executeOpenAI(
    prompt: string,
    task: AITask,
    context?: Record<string, any>
  ): Promise<string> {
    if (!this.openai) throw new Error('OpenAI not initialized');

    const systemPrompt = this.buildSystemPrompt(task, context);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: task.maxTokens || 2000,
      temperature: task.temperature || 0.7
    });

    return response.choices[0]?.message?.content || '';
  }

  private async executeAnthropic(
    prompt: string,
    task: AITask,
    context?: Record<string, any>
  ): Promise<string> {
    if (!this.anthropic) throw new Error('Anthropic not initialized');

    const systemPrompt = this.buildSystemPrompt(task, context);
    
    const response = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      messages: [
        { 
          role: 'user', 
          content: `${systemPrompt}\n\n${prompt}`
        }
      ],
      max_tokens: task.maxTokens || 2000
    });

    if (Array.isArray(response.content)) {
      return response.content
        .filter(c => c.type === 'text')
        .map(c => (c as any).text)
        .join('\n');
    }
    
    return response.content as string;
  }

  private buildSystemPrompt(task: AITask, context?: Record<string, any>): string {
    const basePrompts = {
      analysis: 'You are an expert clinical therapist providing detailed, evidence-based analysis.',
      summary: 'You are a medical documentation specialist creating concise, accurate summaries.',
      extraction: 'You are a data extraction specialist identifying and structuring key information.',
      generation: 'You are a clinical documentation expert generating professional therapeutic content.',
      classification: 'You are a classification specialist categorizing clinical content accurately.'
    };

    let prompt = basePrompts[task.type];

    if (context?.clientName) {
      prompt += `\nClient: ${context.clientName}`;
    }
    if (context?.sessionDate) {
      prompt += `\nSession Date: ${context.sessionDate}`;
    }
    if (context?.therapistName) {
      prompt += `\nTherapist: ${context.therapistName}`;
    }

    return prompt;
  }

  /**
   * Batch process multiple tasks efficiently
   */
  async batchProcess(
    tasks: Array<{ prompt: string; task: AITask; context?: Record<string, any> }>
  ): Promise<Array<{ content: string; provider: string; metadata: any }>> {
    // Group by task type for potential batching
    const grouped = new Map<string, typeof tasks>();
    
    for (const item of tasks) {
      const key = `${item.task.type}-${item.task.complexity}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
    }

    const results: Array<{ content: string; provider: string; metadata: any }> = [];

    // Process groups in parallel with concurrency limit
    const concurrencyLimit = 3;
    const groups = Array.from(grouped.values());
    
    for (let i = 0; i < groups.length; i += concurrencyLimit) {
      const batch = groups.slice(i, i + concurrencyLimit);
      const batchPromises = batch.flatMap(group =>
        group.map(item => this.executeTask(item.prompt, item.task, item.context))
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          Logger.error('Batch processing error', result.reason);
          results.push({
            content: 'Processing failed',
            provider: 'none',
            metadata: { error: result.reason.message }
          });
        }
      }
    }

    return results;
  }

  /**
   * Get current metrics and health status
   */
  getMetrics() {
    const providers = Array.from(this.providers.entries()).map(([name, provider]) => ({
      name,
      ...provider,
      status: provider.isAvailable ? 'healthy' : 'unhealthy'
    }));

    return {
      providers,
      metrics: {
        ...this.metrics,
        avgResponseTime: this.metrics.totalResponseTime / (this.metrics.successfulRequests || 1),
        successRate: this.metrics.successfulRequests / (this.metrics.totalRequests || 1),
        estimatedCostPerRequest: this.metrics.costEstimate / (this.metrics.totalRequests || 1)
      }
    };
  }

  /**
   * Process document with AI analysis
   */
  async processDocument(
    content: string,
    metadata: {
      fileName: string;
      fileType: string;
      clientId?: string;
      clientName?: string;
    }
  ): Promise<{
    summary: string;
    keyPoints: string[];
    clientInfo: any;
    sessionInfo: any;
    recommendations: string[];
    tags: string[];
    sentiment: string;
    provider: string;
  }> {
    const prompt = `Analyze this clinical document and extract:
1. Brief summary (2-3 sentences)
2. Key clinical points (bullet list)
3. Client information (name, DOB, diagnosis if present)
4. Session information (date, duration, type)
5. Clinical recommendations
6. Relevant tags for categorization
7. Overall sentiment/tone

Document: ${content}`;

    const result = await this.executeTask(prompt, {
      type: 'extraction',
      complexity: 'complex',
      maxTokens: 2000
    }, metadata);

    // Parse the response
    try {
      const sections = result.content.split('\n\n');
      return {
        summary: sections[0] || '',
        keyPoints: sections[1]?.split('\n').filter(p => p.startsWith('-')).map(p => p.substring(2)) || [],
        clientInfo: this.parseClientInfo(sections[2] || ''),
        sessionInfo: this.parseSessionInfo(sections[3] || ''),
        recommendations: sections[4]?.split('\n').filter(p => p.trim()) || [],
        tags: sections[5]?.split(',').map(t => t.trim()) || [],
        sentiment: sections[6]?.trim() || 'neutral',
        provider: result.provider
      };
    } catch (error) {
      Logger.error('Error parsing AI response', error);
      return {
        summary: result.content.substring(0, 200),
        keyPoints: [],
        clientInfo: {},
        sessionInfo: {},
        recommendations: [],
        tags: [],
        sentiment: 'unknown',
        provider: result.provider
      };
    }
  }

  private parseClientInfo(text: string): any {
    // Extract client information using regex patterns
    const nameMatch = text.match(/name[:\s]+([^\n,]+)/i);
    const dobMatch = text.match(/(?:dob|date of birth)[:\s]+([^\n,]+)/i);
    const diagnosisMatch = text.match(/diagnosis[:\s]+([^\n,]+)/i);

    return {
      name: nameMatch?.[1]?.trim(),
      dateOfBirth: dobMatch?.[1]?.trim(),
      diagnosis: diagnosisMatch?.[1]?.trim()
    };
  }

  private parseSessionInfo(text: string): any {
    const dateMatch = text.match(/date[:\s]+([^\n,]+)/i);
    const durationMatch = text.match(/duration[:\s]+([^\n,]+)/i);
    const typeMatch = text.match(/type[:\s]+([^\n,]+)/i);

    return {
      date: dateMatch?.[1]?.trim(),
      duration: durationMatch?.[1]?.trim(),
      type: typeMatch?.[1]?.trim()
    };
  }
}

// Export singleton instance
export const aiOrchestrator = AIOrchestrator.getInstance();