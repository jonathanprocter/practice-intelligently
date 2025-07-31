import { GoogleGenAI } from "@google/genai";

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

export async function getAllApiStatuses(): Promise<ApiHealthStatus[]> {
  const [perplexityStatus, geminiStatus] = await Promise.all([
    checkPerplexityHealth(),
    checkGeminiHealth()
  ]);

  return [perplexityStatus, geminiStatus];
}