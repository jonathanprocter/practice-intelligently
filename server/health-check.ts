import { GoogleGenAI } from "@google/generative-ai";
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

interface ApiHealthStatus {
  service: string;
  status: 'online' | 'offline' | 'checking';
  lastChecked: string;
  error?: string;
}

export async function checkPerplexityHealth(): Promise<ApiHealthStatus> {
  const status: ApiHealthStatus = {
    service: 'perplexity',
    status: 'checking',
    lastChecked: new Date().toISOString()
  };

  try {
    if (!process.env.PERPLEXITY_API_KEY) {
      return { ...status, status: 'offline', error: 'API key not configured' };
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      })
    });

    if (response.ok || response.status === 400) { // 400 is expected for minimal test
      return { ...status, status: 'online' };
    } else {
      return { ...status, status: 'offline', error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { 
      ...status, 
      status: 'offline', 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

export async function checkGeminiHealth(): Promise<ApiHealthStatus> {
  const status: ApiHealthStatus = {
    service: 'gemini',
    status: 'checking',
    lastChecked: new Date().toISOString()
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      return { ...status, status: 'offline', error: 'API key not configured' };
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Simple test call
    await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "test",
    });

    return { ...status, status: 'online' };
  } catch (error) {
    return { 
      ...status, 
      status: 'offline', 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

export async function checkOpenAIHealth(): Promise<ApiHealthStatus> {
  const status: ApiHealthStatus = {
    service: 'openai',
    status: 'checking',
    lastChecked: new Date().toISOString()
  };

  try {
    if (!process.env.OPENAI_API_KEY) {
      return { ...status, status: 'offline', error: 'API key not configured' };
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Simple test call
    await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 1
    });

    return { ...status, status: 'online' };
  } catch (error) {
    return { 
      ...status, 
      status: 'offline', 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

export async function checkAnthropicHealth(): Promise<ApiHealthStatus> {
  const status: ApiHealthStatus = {
    service: 'anthropic',
    status: 'checking',
    lastChecked: new Date().toISOString()
  };

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return { ...status, status: 'offline', error: 'API key not configured' };
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    // Simple test call
    await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'test' }]
    });

    return { ...status, status: 'online' };
  } catch (error) {
    return { 
      ...status, 
      status: 'offline', 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

export async function getAllApiStatuses(): Promise<ApiHealthStatus[]> {
  const [openaiStatus, anthropicStatus, perplexityStatus, geminiStatus] = await Promise.all([
    checkOpenAIHealth(),
    checkAnthropicHealth(),
    checkPerplexityHealth(),
    checkGeminiHealth()
  ]);

  return [openaiStatus, anthropicStatus, perplexityStatus, geminiStatus];
}