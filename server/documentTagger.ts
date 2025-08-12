import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface DocumentTaggingResult {
  category: string;
  subcategory: string;
  aiTags: Array<{ tag: string; confidence: number; type: 'clinical' | 'administrative' | 'therapeutic' | 'assessment' }>;
  clinicalKeywords: string[];
  contentSummary: string;
  confidenceScore: number;
  sensitivityLevel: 'low' | 'standard' | 'high' | 'confidential';
}

export class DocumentTagger {
  private static readonly DOCUMENT_CATEGORIES = {
    'clinical-notes': {
      subcategories: ['progress-notes', 'therapy-session', 'intake-session', 'discharge-summary', 'crisis-notes'],
      sensitivity: 'high'
    },
    'assessments': {
      subcategories: ['psychological-assessment', 'risk-assessment', 'diagnostic-assessment', 'outcome-measure'],
      sensitivity: 'high'
    },
    'administrative': {
      subcategories: ['consent-forms', 'intake-forms', 'insurance-documents', 'billing-records', 'correspondence'],
      sensitivity: 'standard'
    },
    'treatment-planning': {
      subcategories: ['treatment-plan', 'care-plan', 'safety-plan', 'goals-objectives'],
      sensitivity: 'high'
    },
    'legal-compliance': {
      subcategories: ['court-reports', 'mandated-reporting', 'legal-correspondence', 'subpoena-response'],
      sensitivity: 'confidential'
    },
    'referrals': {
      subcategories: ['referral-letters', 'consultation-reports', 'medical-records', 'specialist-reports'],
      sensitivity: 'high'
    }
  };

  private static readonly CLINICAL_KEYWORDS = [
    // Mental health conditions
    'anxiety', 'depression', 'PTSD', 'trauma', 'bipolar', 'schizophrenia', 'OCD', 'ADHD', 'autism',
    'borderline personality disorder', 'narcissistic', 'dissociative', 'eating disorder', 'substance abuse',
    
    // Therapeutic approaches
    'CBT', 'cognitive behavioral therapy', 'DBT', 'dialectical behavior therapy', 'EMDR', 
    'mindfulness', 'psychodynamic', 'humanistic', 'family therapy', 'group therapy',
    
    // Clinical terminology
    'diagnosis', 'prognosis', 'treatment plan', 'therapeutic alliance', 'transference', 'countertransference',
    'psychoeducation', 'coping strategies', 'behavioral intervention', 'medication compliance',
    
    // Risk factors
    'suicidal ideation', 'self-harm', 'violence risk', 'substance use', 'domestic violence',
    'child abuse', 'neglect', 'crisis intervention', 'safety plan',
    
    // Assessment tools
    'PHQ-9', 'GAD-7', 'Beck Depression Inventory', 'MMPI', 'Rorschach', 'WAIS', 'mental status exam'
  ];

  static async analyzeDocument(content: string, fileName: string, fileType: string): Promise<DocumentTaggingResult> {
    try {
      console.log('🏷️ Starting AI document analysis for:', fileName);
      
      const prompt = this.createAnalysisPrompt(content, fileName, fileType);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert clinical document analyst specializing in healthcare and therapy practice documentation. Analyze documents for proper categorization, tagging, and sensitivity classification. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2, // Lower temperature for consistent categorization
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });

      const analysisText = response.choices[0]?.message?.content;
      if (!analysisText) {
        throw new Error('No analysis received from AI');
      }

      const analysis = JSON.parse(analysisText);
      
      // Post-process and validate the results
      const result = this.processAnalysisResults(analysis, content);
      
      console.log('✅ Document analysis complete:', result.category, '/', result.subcategory);
      return result;
      
    } catch (error) {
      console.error('❌ Error analyzing document:', error);
      
      // Return fallback analysis
      return this.createFallbackAnalysis(content, fileName, fileType);
    }
  }

  private static createAnalysisPrompt(content: string, fileName: string, fileType: string): string {
    return `
Analyze this clinical/therapy document and provide comprehensive categorization and tagging.

Document Details:
- File Name: ${fileName}
- File Type: ${fileType}
- Content Preview: ${content.substring(0, 2000)}...

Available Categories and Subcategories:
${JSON.stringify(this.DOCUMENT_CATEGORIES, null, 2)}

Please provide a JSON response with this exact structure:
{
  "category": "primary category from the list above",
  "subcategory": "specific subcategory from the chosen category",
  "contentSummary": "2-3 sentence summary of document content",
  "aiTags": [
    {"tag": "depression", "confidence": 0.95, "type": "clinical"},
    {"tag": "intake-session", "confidence": 0.88, "type": "administrative"},
    {"tag": "CBT", "confidence": 0.75, "type": "therapeutic"}
  ],
  "clinicalKeywords": ["anxiety", "coping strategies", "treatment plan"],
  "sensitivityLevel": "high",
  "confidenceScore": 0.92
}

Analysis Guidelines:
1. Choose the most appropriate category and subcategory
2. Generate 5-10 relevant tags with confidence scores (0.0-1.0)
3. Tag types: "clinical", "administrative", "therapeutic", "assessment"  
4. Extract clinical keywords found in content
5. Set sensitivity level based on content type:
   - "low": General information, public documents
   - "standard": Administrative forms, basic correspondence
   - "high": Clinical notes, assessments, treatment plans
   - "confidential": Legal documents, crisis notes, sensitive reports
6. Provide overall confidence score for the categorization

Focus on:
- Clinical terminology and therapeutic concepts
- Document structure (SOAP notes, assessments, forms)
- Patient information and privacy considerations
- Therapeutic modalities and interventions mentioned
- Risk factors and safety concerns
`;
  }

  private static processAnalysisResults(analysis: any, content: string): DocumentTaggingResult {
    // Validate and clean the AI response
    const category = analysis.category || 'administrative';
    const subcategory = analysis.subcategory || 'general-document';
    
    // Ensure tags have proper structure
    const aiTags = (analysis.aiTags || []).map((tag: any) => ({
      tag: tag.tag || 'untagged',
      confidence: Math.min(Math.max(tag.confidence || 0.5, 0), 1),
      type: ['clinical', 'administrative', 'therapeutic', 'assessment'].includes(tag.type) 
        ? tag.type : 'administrative'
    }));

    // Add automatic tags based on content analysis
    const automaticTags = this.generateAutomaticTags(content);
    const mergedTags = [...aiTags, ...automaticTags].slice(0, 15); // Limit to 15 tags

    // Extract clinical keywords with fuzzy matching
    const clinicalKeywords = this.extractClinicalKeywords(content);
    
    return {
      category,
      subcategory,
      aiTags: mergedTags,
      clinicalKeywords,
      contentSummary: analysis.contentSummary || 'Document analysis summary not available',
      confidenceScore: Math.min(Math.max(analysis.confidenceScore || 0.7, 0), 1),
      sensitivityLevel: ['low', 'standard', 'high', 'confidential'].includes(analysis.sensitivityLevel) 
        ? analysis.sensitivityLevel : 'standard'
    };
  }

  private static generateAutomaticTags(content: string): Array<{ tag: string; confidence: number; type: string }> {
    const automaticTags: Array<{ tag: string; confidence: number; type: string }> = [];
    const contentLower = content.toLowerCase();

    // Check for SOAP note structure
    if (contentLower.includes('subjective:') && contentLower.includes('objective:') && 
        contentLower.includes('assessment:') && contentLower.includes('plan:')) {
      automaticTags.push({ tag: 'soap-notes', confidence: 0.95, type: 'clinical' });
    }

    // Check for session indicators
    if (contentLower.includes('session') && (contentLower.includes('therapy') || contentLower.includes('counseling'))) {
      automaticTags.push({ tag: 'therapy-session', confidence: 0.85, type: 'therapeutic' });
    }

    // Check for assessment indicators
    if (contentLower.includes('assessment') || contentLower.includes('evaluation')) {
      automaticTags.push({ tag: 'assessment', confidence: 0.80, type: 'assessment' });
    }

    // Check for crisis/risk indicators
    const riskTerms = ['crisis', 'suicide', 'self-harm', 'danger', 'risk assessment'];
    if (riskTerms.some(term => contentLower.includes(term))) {
      automaticTags.push({ tag: 'high-risk', confidence: 0.90, type: 'clinical' });
    }

    return automaticTags;
  }

  private static extractClinicalKeywords(content: string): string[] {
    const foundKeywords = new Set<string>();
    const contentLower = content.toLowerCase();

    // Extract keywords using fuzzy matching
    this.CLINICAL_KEYWORDS.forEach(keyword => {
      if (contentLower.includes(keyword.toLowerCase())) {
        foundKeywords.add(keyword);
      }
    });

    // Extract additional clinical terms using pattern matching
    const clinicalPatterns = [
      /(?:diagnosis|diagnosed with|presents with)\s+([a-z\s]{3,30})/gi,
      /(?:treatment for|treating|therapy for)\s+([a-z\s]{3,30})/gi,
      /(?:symptoms of|experiencing)\s+([a-z\s]{3,30})/gi
    ];

    clinicalPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const extracted = match.replace(pattern, '$1').trim();
          if (extracted.length > 3 && extracted.length < 30) {
            foundKeywords.add(extracted);
          }
        });
      }
    });

    return Array.from(foundKeywords).slice(0, 20); // Limit to 20 keywords
  }

  private static createFallbackAnalysis(content: string, fileName: string, fileType: string): DocumentTaggingResult {
    // Provide basic categorization when AI fails
    let category = 'administrative';
    let subcategory = 'general-document';
    let sensitivityLevel: 'low' | 'standard' | 'high' | 'confidential' = 'standard';

    const contentLower = content.toLowerCase();
    const fileNameLower = fileName.toLowerCase();

    // Basic pattern matching for categorization
    if (contentLower.includes('progress note') || contentLower.includes('soap') || 
        contentLower.includes('session note')) {
      category = 'clinical-notes';
      subcategory = 'progress-notes';
      sensitivityLevel = 'high';
    } else if (contentLower.includes('assessment') || contentLower.includes('evaluation')) {
      category = 'assessments';
      subcategory = 'psychological-assessment';
      sensitivityLevel = 'high';
    } else if (fileNameLower.includes('consent') || fileNameLower.includes('intake')) {
      category = 'administrative';
      subcategory = fileNameLower.includes('consent') ? 'consent-forms' : 'intake-forms';
    }

    return {
      category,
      subcategory,
      aiTags: [
        { tag: 'imported-document', confidence: 0.8, type: 'administrative' },
        { tag: fileType.replace('.', ''), confidence: 0.9, type: 'administrative' }
      ],
      clinicalKeywords: this.extractClinicalKeywords(content),
      contentSummary: `${fileType.toUpperCase()} document uploaded for client records`,
      confidenceScore: 0.6,
      sensitivityLevel
    };
  }

  // Utility method to get available categories for UI
  static getAvailableCategories() {
    return Object.keys(this.DOCUMENT_CATEGORIES).map(category => ({
      category,
      subcategories: this.DOCUMENT_CATEGORIES[category as keyof typeof this.DOCUMENT_CATEGORIES].subcategories,
      defaultSensitivity: this.DOCUMENT_CATEGORIES[category as keyof typeof this.DOCUMENT_CATEGORIES].sensitivity
    }));
  }

  // Method to re-analyze existing documents
  static async reanalyzeDocument(documentId: string, content: string, fileName: string, fileType: string): Promise<DocumentTaggingResult> {
    console.log('🔄 Re-analyzing document:', documentId);
    return await this.analyzeDocument(content, fileName, fileType);
  }
}