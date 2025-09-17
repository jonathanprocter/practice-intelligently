import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

class AIServices {
  constructor() {
    // Initialize OpenAI client if API key is provided
    this.openai = null;
    if (process.env.OPENAI_API_KEY) {
      try {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          timeout: 12000, // 12 second timeout
          maxRetries: 0   // No retries for faster failure
        });
        console.log('✅ OpenAI service initialized');
      } catch (error) {
        console.warn('⚠️ Failed to initialize OpenAI:', error.message);
      }
    } else {
      console.log('⚠️ OpenAI API key not provided');
    }

    // Initialize Anthropic client if API key is provided
    this.anthropic = null;
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        this.anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
          timeout: 12000, // 12 second timeout
          maxRetries: 0   // No retries for faster failure
        });
        console.log('✅ Anthropic service initialized');
      } catch (error) {
        console.warn('⚠️ Failed to initialize Anthropic:', error.message);
      }
    } else {
      console.log('⚠️ Anthropic API key not provided');
    }
  }

  // Check if any AI service is available
  isAvailable() {
    return this.openai !== null || this.anthropic !== null;
  }

  // Get service status
  getStatus() {
    return {
      openai: {
        status: this.openai ? 'operational' : 'not-configured',
        message: this.openai ? 'OpenAI API configured' : 'OpenAI API key not provided'
      },
      anthropic: {
        status: this.anthropic ? 'operational' : 'not-configured',
        message: this.anthropic ? 'Anthropic API configured' : 'Anthropic API key not provided'
      },
      overall: this.isAvailable() ? 'operational' : 'not-configured'
    };
  }

  // Analyze document content
  async analyzeDocument(content, options = {}) {
    const prompt = `
You are an expert clinical therapist analyzing therapy session documentation. 
Please analyze the following content and provide structured information:

Content:
${content}

Please provide:
1. Session Summary (concise overview)
2. Key Themes (main topics discussed)
3. Client Presentation (emotional state, behaviors)
4. Interventions Used (therapeutic techniques applied)
5. Clinical Observations (important notes)
6. Follow-up Items (action items, homework)
7. Risk Assessment (any concerns noted)
8. Number of Sessions (if multiple sessions are detected, separate them)

Format the response in clear sections.`;

    try {
      // Try OpenAI first
      if (this.openai) {
        try {
          const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are an expert clinical therapist with extensive experience in documenting and analyzing therapy sessions.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.3,
            max_tokens: 1000
          });
          
          return {
            success: true,
            service: 'openai',
            analysis: response.choices[0].message.content,
            usage: response.usage
          };
        } catch (openaiError) {
          console.error('OpenAI error:', openaiError.message);
          // Fall through to try Anthropic
        }
      }

      // Fall back to Anthropic
      if (this.anthropic) {
        try {
          const response = await this.anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 1000,
            temperature: 0.3
          });
          
          return {
            success: true,
            service: 'anthropic',
            analysis: response.content[0].text,
            usage: {
              total_tokens: response.usage?.input_tokens + response.usage?.output_tokens
            }
          };
        } catch (anthropicError) {
          console.error('Anthropic error:', anthropicError.message);
          throw new Error('Both AI services failed: ' + anthropicError.message);
        }
      }

      throw new Error('No AI service is configured');
    } catch (error) {
      console.error('Document analysis error:', error);
      return {
        success: false,
        error: error.message,
        service: 'none'
      };
    }
  }

  // Generate SOAP notes from transcript
  async generateSessionNotes(transcript, clientInfo = {}) {
    const prompt = `
You are an expert clinical therapist creating session notes in SOAP format.
Please analyze this therapy session transcript and generate comprehensive notes.

Client Information:
${clientInfo.name ? `Name: ${clientInfo.name}` : ''}
${clientInfo.age ? `Age: ${clientInfo.age}` : ''}
${clientInfo.diagnosis ? `Diagnosis: ${clientInfo.diagnosis}` : ''}

Transcript:
${transcript}

Please generate session notes in the following format:

SUBJECTIVE:
- Client's reported feelings, thoughts, and experiences
- Direct quotes when significant
- Client's perception of progress

OBJECTIVE:
- Observable behaviors and presentation
- Mental status observations
- Engagement level
- Non-verbal communication

ASSESSMENT:
- Clinical impressions
- Progress toward treatment goals
- Risk assessment
- Therapeutic relationship quality
- Response to interventions

PLAN:
- Interventions used in session
- Homework assignments
- Follow-up plans
- Next session focus
- Any referrals or additional resources

Additional Sections:
- KEY THEMES: Main topics discussed
- CLINICAL INSIGHTS: Important observations
- RISK FACTORS: Any safety concerns
- SIGNIFICANT QUOTES: Important client statements`;

    try {
      // Try OpenAI first
      if (this.openai) {
        try {
          const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are an experienced clinical therapist creating detailed, professional session notes. Focus on clinical accuracy and therapeutic relevance.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.2,
            max_tokens: 1200
          });
          
          const content = response.choices[0].message.content;
          return {
            success: true,
            service: 'openai',
            notes: this.parseSOAPNotes(content),
            raw: content
          };
        } catch (openaiError) {
          console.error('OpenAI error generating notes:', openaiError.message);
        }
      }

      // Fall back to Anthropic
      if (this.anthropic) {
        try {
          const response = await this.anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 1200,
            temperature: 0.2
          });
          
          const content = response.content[0].text;
          return {
            success: true,
            service: 'anthropic',
            notes: this.parseSOAPNotes(content),
            raw: content
          };
        } catch (anthropicError) {
          console.error('Anthropic error generating notes:', anthropicError.message);
          throw new Error('Both AI services failed');
        }
      }

      throw new Error('No AI service is configured');
    } catch (error) {
      console.error('Session notes generation error:', error);
      return {
        success: false,
        error: error.message,
        service: 'none'
      };
    }
  }

  // Generate clinical insights
  async generateInsights(sessionData, historicalData = []) {
    const prompt = `
You are an expert clinical therapist providing insights based on session data.

Current Session:
${JSON.stringify(sessionData, null, 2)}

${historicalData.length > 0 ? `Previous Sessions (${historicalData.length}):
${JSON.stringify(historicalData.slice(0, 5), null, 2)}` : ''}

Please provide:

1. CLINICAL INSIGHTS:
   - Pattern recognition across sessions
   - Progress indicators
   - Areas of concern
   - Therapeutic relationship observations

2. RECOMMENDATIONS:
   - Suggested interventions
   - Treatment plan adjustments
   - Focus areas for next sessions
   - Potential therapeutic modalities

3. RISK ASSESSMENT:
   - Current risk level (low/medium/high)
   - Specific risk factors
   - Protective factors
   - Recommended monitoring

4. PROGRESS ANALYSIS:
   - Goals achieved
   - Areas showing improvement
   - Persistent challenges
   - Timeline expectations

5. ACTION ITEMS:
   - Immediate priorities
   - Follow-up needed
   - Resources to provide
   - Referrals to consider

Format as structured JSON for easy parsing.`;

    try {
      // Try OpenAI first
      if (this.openai) {
        try {
          const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a senior clinical therapist providing evidence-based insights and recommendations. Return valid JSON format.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.3,
            max_tokens: 800,
            response_format: { type: "json_object" }
          });
          
          const insights = JSON.parse(response.choices[0].message.content);
          return {
            success: true,
            service: 'openai',
            insights: insights
          };
        } catch (openaiError) {
          console.error('OpenAI error generating insights:', openaiError.message);
        }
      }

      // Fall back to Anthropic
      if (this.anthropic) {
        try {
          const response = await this.anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            messages: [
              {
                role: 'user',
                content: prompt + '\n\nPlease return valid JSON format.'
              }
            ],
            max_tokens: 800,
            temperature: 0.3
          });
          
          // Extract JSON from response
          const content = response.content[0].text;
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          const insights = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
          
          return {
            success: true,
            service: 'anthropic',
            insights: insights
          };
        } catch (anthropicError) {
          console.error('Anthropic error generating insights:', anthropicError.message);
          throw new Error('Both AI services failed');
        }
      }

      throw new Error('No AI service is configured');
    } catch (error) {
      console.error('Insights generation error:', error);
      return {
        success: false,
        error: error.message,
        service: 'none'
      };
    }
  }

  // Parse SOAP notes from text
  parseSOAPNotes(text) {
    const sections = {
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      keyThemes: [],
      clinicalInsights: '',
      riskFactors: [],
      significantQuotes: []
    };

    // Extract sections using regex patterns
    const subjectiveMatch = text.match(/SUBJECTIVE:?\s*([\s\S]*?)(?=OBJECTIVE:|$)/i);
    const objectiveMatch = text.match(/OBJECTIVE:?\s*([\s\S]*?)(?=ASSESSMENT:|$)/i);
    const assessmentMatch = text.match(/ASSESSMENT:?\s*([\s\S]*?)(?=PLAN:|$)/i);
    const planMatch = text.match(/PLAN:?\s*([\s\S]*?)(?=KEY THEMES:|CLINICAL INSIGHTS:|RISK FACTORS:|SIGNIFICANT QUOTES:|$)/i);
    const themesMatch = text.match(/KEY THEMES:?\s*([\s\S]*?)(?=CLINICAL INSIGHTS:|RISK FACTORS:|SIGNIFICANT QUOTES:|$)/i);
    const insightsMatch = text.match(/CLINICAL INSIGHTS:?\s*([\s\S]*?)(?=RISK FACTORS:|SIGNIFICANT QUOTES:|$)/i);
    const riskMatch = text.match(/RISK FACTORS:?\s*([\s\S]*?)(?=SIGNIFICANT QUOTES:|$)/i);
    const quotesMatch = text.match(/SIGNIFICANT QUOTES:?\s*([\s\S]*?)$/i);

    if (subjectiveMatch) sections.subjective = subjectiveMatch[1].trim();
    if (objectiveMatch) sections.objective = objectiveMatch[1].trim();
    if (assessmentMatch) sections.assessment = assessmentMatch[1].trim();
    if (planMatch) sections.plan = planMatch[1].trim();
    if (insightsMatch) sections.clinicalInsights = insightsMatch[1].trim();
    
    // Parse themes as array
    if (themesMatch) {
      const themesText = themesMatch[1].trim();
      sections.keyThemes = themesText
        .split(/[\n-•]/)
        .map(t => t.trim())
        .filter(t => t.length > 0);
    }
    
    // Parse risk factors as array
    if (riskMatch) {
      const riskText = riskMatch[1].trim();
      sections.riskFactors = riskText
        .split(/[\n-•]/)
        .map(r => r.trim())
        .filter(r => r.length > 0);
    }
    
    // Parse quotes as array
    if (quotesMatch) {
      const quotesText = quotesMatch[1].trim();
      sections.significantQuotes = quotesText
        .split(/[\n-•]/)
        .map(q => q.trim())
        .filter(q => q.length > 0 && (q.includes('"') || q.includes("'")));
    }

    return sections;
  }

  // Detect multiple sessions in a document
  async detectSessions(content) {
    const prompt = `
Analyze this document and determine if it contains multiple therapy sessions.
If multiple sessions are detected, separate them and provide:
1. Number of sessions found
2. Date/time of each session (if available)
3. Clear boundaries between sessions

Content:
${content}

Return as JSON with structure:
{
  "sessionCount": number,
  "sessions": [
    {
      "sessionNumber": number,
      "date": "date if found",
      "content": "session content",
      "startMarker": "text that indicates session start",
      "endMarker": "text that indicates session end"
    }
  ]
}`;

    try {
      if (this.openai) {
        try {
          const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are analyzing therapy documentation to identify and separate individual sessions. Return valid JSON.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.1,
            max_tokens: 1000,
            response_format: { type: "json_object" }
          });
          
          return JSON.parse(response.choices[0].message.content);
        } catch (openaiError) {
          console.error('OpenAI error detecting sessions:', openaiError.message);
        }
      }

      if (this.anthropic) {
        try {
          const response = await this.anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 1000,
            temperature: 0.1
          });
          
          const content = response.content[0].text;
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
        } catch (anthropicError) {
          console.error('Anthropic error detecting sessions:', anthropicError.message);
        }
      }

      // Default response if no AI service available
      return {
        sessionCount: 1,
        sessions: [{
          sessionNumber: 1,
          date: null,
          content: content,
          startMarker: null,
          endMarker: null
        }]
      };
    } catch (error) {
      console.error('Session detection error:', error);
      return {
        sessionCount: 1,
        sessions: [{
          sessionNumber: 1,
          content: content,
          error: error.message
        }]
      };
    }
  }
}

// Create and export singleton instance
const aiServices = new AIServices();
export default aiServices;