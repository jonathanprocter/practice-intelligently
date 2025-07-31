interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  citations: string[];
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class PerplexityClient {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(
    messages: PerplexityMessage[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      topP?: number;
      searchDomainFilter?: string[];
      returnImages?: boolean;
      returnRelatedQuestions?: boolean;
      searchRecencyFilter?: 'month' | 'week' | 'day' | 'year';
    } = {}
  ): Promise<PerplexityResponse> {
    const {
      model = 'llama-3.1-sonar-small-128k-online',
      maxTokens = 2000,
      temperature = 0.2,
      topP = 0.9,
      searchDomainFilter = [],
      returnImages = false,
      returnRelatedQuestions = false,
      searchRecencyFilter = 'month'
    } = options;

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          top_p: topP,
          search_domain_filter: searchDomainFilter,
          return_images: returnImages,
          return_related_questions: returnRelatedQuestions,
          search_recency_filter: searchRecencyFilter,
          stream: false,
          presence_penalty: 0,
          frequency_penalty: 1
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling Perplexity API:', error);
      throw error;
    }
  }

  // Clinical research and evidence-based recommendations
  async getClinicalResearch(query: string): Promise<string> {
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: 'You are a clinical research expert. Provide evidence-based information from peer-reviewed sources, focusing on current best practices in mental health treatment.'
      },
      {
        role: 'user',
        content: query
      }
    ];

    const response = await this.generateResponse(messages, {
      searchDomainFilter: ['pubmed.ncbi.nlm.nih.gov', 'apa.org', 'psychiatry.org'],
      searchRecencyFilter: 'year'
    });

    return response.choices[0]?.message?.content || '';
  }

  // Treatment protocol recommendations
  async getTreatmentProtocols(condition: string, clientProfile: any): Promise<string> {
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: 'You are an expert clinical psychologist. Provide evidence-based treatment protocols and interventions based on current research and clinical guidelines.'
      },
      {
        role: 'user',
        content: `Recommend evidence-based treatment protocols for ${condition}. Client profile: ${JSON.stringify(clientProfile)}`
      }
    ];

    const response = await this.generateResponse(messages, {
      searchDomainFilter: ['apa.org', 'nice.org.uk', 'psychiatry.org', 'cochranelibrary.com'],
      searchRecencyFilter: 'year'
    });

    return response.choices[0]?.message?.content || '';
  }

  // Continuing education recommendations
  async getContinuingEducation(therapistProfile: any, clientMix: any): Promise<string> {
    const messages: PerplexityMessage[] = [
      {
        role: 'system',
        content: 'You are a continuing education specialist for mental health professionals. Recommend relevant training, workshops, and certification programs based on therapist needs and client population.'
      },
      {
        role: 'user',
        content: `Recommend continuing education opportunities for a therapist with this profile: ${JSON.stringify(therapistProfile)} working with this client mix: ${JSON.stringify(clientMix)}`
      }
    ];

    const response = await this.generateResponse(messages, {
      searchDomainFilter: ['apa.org', 'psychologytoday.com', 'ceunits.com'],
      searchRecencyFilter: 'month'
    });

    return response.choices[0]?.message?.content || '';
  }
}

export const perplexityClient = new PerplexityClient(process.env.PERPLEXITY_API_KEY || '');