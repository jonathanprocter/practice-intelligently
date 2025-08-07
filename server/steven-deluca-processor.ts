import OpenAI from 'openai';
import { storage } from './storage';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface StevenProgressNote {
  sessionDate: string;
  sessionType: string;
  content: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  keyPoints: string[];
  significantQuotes: string[];
  narrativeSummary: string;
}

export class StevenDelucaProgressNotesProcessor {
  
  async processProgressNotesManually(
    progressNotesData: StevenProgressNote[], 
    clientId: string, 
    therapistId: string
  ): Promise<{ success: boolean; createdNotes: number; appointments: any[] }> {
    
    let createdNotesCount = 0;
    const createdAppointments: any[] = [];
    
    try {
      for (const noteData of progressNotesData) {
        // Create appointment first if it doesn't exist
        const sessionDate = new Date(noteData.sessionDate);
        const appointment = await this.createAppointmentForSession(
          clientId, 
          therapistId, 
          sessionDate, 
          noteData.sessionType
        );
        
        if (appointment) {
          createdAppointments.push(appointment);
        }
        
        // Create progress note
        const progressNote = {
          id: `pn_steven_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          clientId,
          therapistId,
          appointmentId: appointment?.id,
          sessionDate,
          sessionType: noteData.sessionType || 'Individual Therapy',
          duration: 50,
          content: noteData.content,
          subjective: noteData.subjective,
          objective: noteData.objective,
          assessment: noteData.assessment,
          plan: noteData.plan,
          keyPoints: noteData.keyPoints || [],
          significantQuotes: noteData.significantQuotes || [],
          narrativeSummary: noteData.narrativeSummary,
          aiTags: await this.generateAITags(noteData.content),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await storage.createProgressNote(progressNote);
        createdNotesCount++;
        
        console.log(`Created progress note for Steven Deluca: ${noteData.sessionDate}`);
      }
      
      return {
        success: true,
        createdNotes: createdNotesCount,
        appointments: createdAppointments
      };
      
    } catch (error) {
      console.error('Error processing Steven Deluca progress notes:', error);
      throw error;
    }
  }
  
  private async createAppointmentForSession(
    clientId: string, 
    therapistId: string, 
    sessionDate: Date, 
    sessionType: string
  ): Promise<any> {
    
    try {
      // Check if appointment already exists for this date
      const existingAppointments = await storage.getAppointmentsByClient(clientId);
      const existingAppointment = existingAppointments.find(apt => {
        const aptDate = new Date(apt.startTime);
        return aptDate.toDateString() === sessionDate.toDateString();
      });
      
      if (existingAppointment) {
        return existingAppointment;
      }
      
      // Create new appointment
      const startTime = new Date(sessionDate);
      startTime.setHours(10, 0, 0, 0); // Default to 10:00 AM
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 50); // 50-minute session
      
      const appointment = {
        id: `apt_steven_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        clientId,
        therapistId,
        startTime,
        endTime,
        type: sessionType || 'Individual Therapy',
        status: 'completed',
        location: 'Woodbury Office',
        notes: `Retroactively created appointment for progress note - ${sessionType}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const createdAppointment = await storage.createAppointment(appointment);
      console.log(`Created appointment for Steven Deluca: ${sessionDate.toDateString()}`);
      
      return createdAppointment;
      
    } catch (error) {
      console.error('Error creating appointment for Steven Deluca:', error);
      return null;
    }
  }
  
  private async generateAITags(content: string): Promise<string[]> {
    try {
      const prompt = `
        Analyze this therapy session content and generate 5-8 relevant AI tags for clinical tracking and categorization.
        
        Focus on:
        - Therapeutic themes and interventions
        - Client's emotional state and progress indicators  
        - Clinical topics and treatment approaches
        - Behavioral patterns and insights
        
        Return only a JSON array of strings (tags):
        
        Content: ${content.substring(0, 2000)}...
      `;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a clinical AI assistant. Return only a JSON array of therapeutic tags."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: "json_object" }
      });
      
      const result = JSON.parse(response.choices[0]?.message?.content || '{"tags": []}');
      return result.tags || [];
      
    } catch (error) {
      console.error('Error generating AI tags:', error);
      return ['therapy-session', 'individual-therapy', 'progress-note'];
    }
  }
}

export const stevenDelucaProcessor = new StevenDelucaProgressNotesProcessor();