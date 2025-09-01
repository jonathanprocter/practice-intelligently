// Mock AI Service for Development/Testing
// Provides fallback AI functionality when API keys are not configured

interface MockAIResponse {
  content: string;
  model: string;
  mock: boolean;
}

export class MockAIService {
  private static instance: MockAIService;
  
  static getInstance(): MockAIService {
    if (!MockAIService.instance) {
      MockAIService.instance = new MockAIService();
    }
    return MockAIService.instance;
  }

  async analyzeContent(content: string, type: string = 'general'): Promise<MockAIResponse> {
    console.log('Using mock AI service for content analysis');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const analyses: Record<string, string> = {
      session_note: `Mock Analysis: This appears to be a therapy session note. 
        Key themes identified: therapeutic progress, client engagement, treatment planning.
        Suggested tags: #session #progress #therapy`,
      
      document: `Mock Analysis: Document successfully processed.
        Content type: Clinical document
        Suggested category: General documentation`,
      
      general: `Mock Analysis: Content analyzed successfully.
        Type: ${type}
        Length: ${content.length} characters
        Processing complete.`
    };
    
    return {
      content: analyses[type] || analyses.general,
      model: 'mock-ai-model',
      mock: true
    };
  }

  async generateTags(content: string): Promise<string[]> {
    console.log('Generating mock tags');
    
    // Simple keyword extraction for mock tags
    const commonTags = ['clinical', 'therapy', 'session', 'client', 'treatment'];
    const extractedWords = content
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 5)
      .slice(0, 3);
    
    return [...commonTags.slice(0, 2), ...extractedWords].filter(Boolean);
  }

  async summarize(content: string): Promise<string> {
    console.log('Generating mock summary');
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const firstSentence = sentences[0] || 'Document content';
    const wordCount = content.split(/\s+/).length;
    
    return `Mock Summary: ${firstSentence.trim().substring(0, 100)}... 
      (Total content: ${wordCount} words, ${sentences.length} sentences)`;
  }

  async extractEntities(content: string): Promise<{
    clientName?: string;
    sessionDate?: string;
    topics?: string[];
  }> {
    console.log('Extracting mock entities');
    
    // Simple pattern matching for mock extraction
    const datePattern = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/;
    const dateMatch = content.match(datePattern);
    
    // Look for common name patterns
    const namePattern = /(?:client|patient|mr\.|mrs\.|ms\.)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i;
    const nameMatch = content.match(namePattern);
    
    return {
      clientName: nameMatch ? nameMatch[1] : 'Unknown Client',
      sessionDate: dateMatch ? dateMatch[0] : new Date().toLocaleDateString(),
      topics: ['mental health', 'therapy session', 'treatment progress']
    };
  }

  async processDocument(document: {
    content: string;
    type: string;
    fileName: string;
  }): Promise<{
    analysis: string;
    tags: string[];
    summary: string;
    category: string;
    confidence: number;
  }> {
    console.log(`Processing mock document: ${document.fileName}`);
    
    const [analysis, tags, summary] = await Promise.all([
      this.analyzeContent(document.content, document.type),
      this.generateTags(document.content),
      this.summarize(document.content)
    ]);
    
    return {
      analysis: analysis.content,
      tags,
      summary,
      category: this.determineCategory(document.type, document.fileName),
      confidence: 0.75 // Mock confidence score
    };
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
    
    return 'general';
  }

  async chat(messages: Array<{role: string; content: string}>): Promise<string> {
    const lastMessage = messages[messages.length - 1];
    return `Mock AI Response: I understand you're asking about "${lastMessage.content}". 
      In a production environment, this would provide a detailed AI-generated response. 
      Currently running in mock mode for testing.`;
  }
}

// Export singleton instance
export const mockAI = MockAIService.getInstance();