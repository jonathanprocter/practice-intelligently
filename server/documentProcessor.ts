import fetch from 'node-fetch';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface DocumentAnalysis {
  content: string;
  extractedDate?: string;
  suggestedAppointments: Array<{
    id: string;
    title: string;
    date: string;
    confidence: number;
  }>;
  aiTags: string[];
  sessionType?: string;
  keyTopics: string[];
  mood?: string;
  progressIndicators?: string[];
}

export class DocumentProcessor {
  async processSessionPDF(filePath: string, filename: string, clientId: string, clientName: string): Promise<DocumentAnalysis> {
    try {
      // Step 1: Extract PDF content from file path
      const pdfContent = await this.extractPDFContent(filePath, filename);
      
      // Step 2: Analyze content with AI
      const analysis = await this.analyzeSessionContent(pdfContent, clientName);
      
      // Step 3: Find matching appointments
      const suggestedAppointments = await this.findMatchingAppointments(
        analysis.extractedDate,
        clientId,
        clientName
      );
      
      return {
        content: pdfContent,
        extractedDate: analysis.extractedDate,
        suggestedAppointments,
        aiTags: analysis.aiTags,
        sessionType: analysis.sessionType,
        keyTopics: analysis.keyTopics,
        mood: analysis.mood,
        progressIndicators: analysis.progressIndicators
      };
      
    } catch (error) {
      console.error('Error processing PDF:', error);
      throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractPDFContent(filePath: string, filename: string): Promise<string> {
    try {
      // For now, return a placeholder text indicating PDF processing is available
      // This can be expanded with proper PDF parsing when needed
      return `PDF document uploaded: ${filename}
File path: ${filePath}
      
This is a placeholder for PDF content extraction. The document has been uploaded successfully and can be processed with AI analysis for:
- Session content analysis
- Date extraction
- Therapeutic themes identification
- Progress indicators

The full PDF parsing functionality will extract actual text content from uploaded PDFs.`;
    } catch (error) {
      console.error('Error extracting PDF content:', error);
      throw new Error('Failed to extract content from PDF');
    }
  }

  private async analyzeSessionContent(content: string, clientName: string): Promise<Partial<DocumentAnalysis>> {
    try {
      const prompt = `
You are an expert clinical psychologist analyzing session notes. Please analyze the following session content and extract key information.

Client Name: ${clientName}

Session Content:
${content}

Please provide a JSON response with the following structure:
{
  "extractedDate": "YYYY-MM-DD format if found, null if not found",
  "sessionType": "individual therapy | group therapy | intake | assessment | follow-up",
  "aiTags": ["array of 5-10 relevant clinical tags like anxiety, depression, CBT, behavioral-intervention, etc."],
  "keyTopics": ["array of 3-5 main topics discussed in session"],
  "mood": "client's overall mood/emotional state",
  "progressIndicators": ["array of progress indicators or improvements noted"]
}

Focus on:
1. Finding any dates mentioned in the content
2. Identifying the type of therapeutic session
3. Extracting relevant clinical tags and themes
4. Noting the client's emotional state and progress
5. Identifying key therapeutic interventions or topics

Be precise and clinical in your analysis.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a clinical psychologist expert at analyzing session notes and extracting structured data. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const analysisText = response.choices[0]?.message?.content;
      if (!analysisText) {
        throw new Error('No analysis received from AI');
      }

      // Parse the JSON response
      const analysis = JSON.parse(analysisText);
      
      return {
        extractedDate: analysis.extractedDate,
        sessionType: analysis.sessionType,
        aiTags: analysis.aiTags || [],
        keyTopics: analysis.keyTopics || [],
        mood: analysis.mood,
        progressIndicators: analysis.progressIndicators || []
      };
      
    } catch (error) {
      console.error('Error analyzing session content:', error);
      // Return basic analysis if AI fails
      return {
        aiTags: ['session-notes', 'imported-document'],
        keyTopics: [],
        progressIndicators: []
      };
    }
  }

  private async findMatchingAppointments(
    extractedDate: string | undefined,
    clientId: string,
    clientName: string
  ): Promise<Array<{ id: string; title: string; date: string; confidence: number }>> {
    try {
      const suggestions: Array<{ id: string; title: string; date: string; confidence: number }> = [];
      
      // If we have an extracted date, look for appointments on that date
      if (extractedDate) {
        // Search for appointments on the extracted date
        const exactDateAppointments = await this.searchAppointmentsByDate(extractedDate, clientName);
        suggestions.push(...exactDateAppointments.map(apt => ({ ...apt, confidence: 95 })));
      }
      
      // Look for appointments within the last 30 days for this client
      const recentAppointments = await this.searchRecentAppointments(clientName, 30);
      
      // Add recent appointments with lower confidence if not already included
      for (const apt of recentAppointments) {
        if (!suggestions.find(s => s.id === apt.id)) {
          suggestions.push({ ...apt, confidence: 60 });
        }
      }
      
      // Sort by confidence and return top 5
      return suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);
        
    } catch (error) {
      console.error('Error finding matching appointments:', error);
      return [];
    }
  }

  private async searchAppointmentsByDate(
    date: string,
    clientName: string
  ): Promise<Array<{ id: string; title: string; date: string }>> {
    try {
      // This would integrate with your calendar API
      // For now, returning mock data structure
      const response = await fetch(`${process.env.BASE_URL || 'http://localhost:5000'}/api/calendar/events?date=${date}&client=${encodeURIComponent(clientName)}`);
      
      if (response.ok) {
        const events = await response.json();
        return events.map((event: any) => ({
          id: event.id,
          title: event.title || event.summary,
          date: event.start?.dateTime || event.start?.date || date
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error searching appointments by date:', error);
      return [];
    }
  }

  private async searchRecentAppointments(
    clientName: string,
    days: number
  ): Promise<Array<{ id: string; title: string; date: string }>> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // This would integrate with your calendar API
      const response = await fetch(
        `${process.env.BASE_URL || 'http://localhost:5000'}/api/calendar/events?` +
        `start=${startDate.toISOString()}&end=${endDate.toISOString()}&client=${encodeURIComponent(clientName)}`
      );
      
      if (response.ok) {
        const events = await response.json();
        return events.map((event: any) => ({
          id: event.id,
          title: event.title || event.summary,
          date: event.start?.dateTime || event.start?.date
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error searching recent appointments:', error);
      return [];
    }
  }
}