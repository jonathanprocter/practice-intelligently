import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface AppointmentData {
  title: string;
  clientName?: string;
  date: string;
  startTime: string | Date;
  endTime?: string | Date;
  status?: string;
  notes?: string;
  location?: string;
  sessionNotes?: string;
}

export async function generateAppointmentInsights(appointment: AppointmentData) {
  try {
    const prompt = `
As an AI therapy assistant, analyze this appointment and provide helpful insights:

Appointment Details:
- Client: ${appointment.clientName || 'Unknown'}
- Date: ${new Date(appointment.date).toLocaleDateString()}
- Time: ${new Date(appointment.startTime).toLocaleTimeString()} - ${appointment.endTime ? new Date(appointment.endTime).toLocaleTimeString() : 'Open'}
- Location: ${appointment.location || 'Not specified'}
- Status: ${appointment.status || 'Scheduled'}
- Previous Notes: ${appointment.notes || 'No previous notes'}
- Current Session Notes: ${appointment.sessionNotes || 'No session notes yet'}

Please provide a JSON response with the following structure:
{
  "summary": "Brief summary of the session or appointment",
  "keyPoints": ["Key therapeutic points or observations"],
  "suggestedQuestions": ["Contextual questions for next session based on client progress"],
  "recommendedFollowUp": ["Specific follow-up actions or interventions"],
  "progressIndicators": ["Signs of progress or areas of improvement"]
}

Focus on therapeutic insights, client progress patterns, and actionable recommendations for continued care.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an experienced therapy practice AI assistant. Provide thoughtful, professional insights while maintaining client confidentiality and therapeutic best practices."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1000
    });

    const insights = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      summary: insights.summary || '',
      keyPoints: insights.keyPoints || [],
      suggestedQuestions: insights.suggestedQuestions || [],
      recommendedFollowUp: insights.recommendedFollowUp || [],
      progressIndicators: insights.progressIndicators || []
    };
  } catch (error) {
    console.error('Error generating appointment insights:', error);
    return {
      summary: 'Unable to generate insights at this time.',
      keyPoints: [],
      suggestedQuestions: [],
      recommendedFollowUp: [],
      progressIndicators: []
    };
  }
}