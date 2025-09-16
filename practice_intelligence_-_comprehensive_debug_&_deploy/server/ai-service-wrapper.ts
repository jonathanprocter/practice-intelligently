import OpenAI from 'openai';

// Mock service for development when API keys are not available
const mockAiService = {
  chat: {
    completions: {
      create: async (params: any) => {
        console.log('🤖 Using Mock AI Service...');
        return {
          choices: [
            {
              message: {
                content: `This is a mock AI response for the prompt: "${params.messages[params.messages.length - 1].content}". In a real environment, this would be a generated insight.`,
              },
            },
          ],
        };
      },
    },
  },
};

let openai: OpenAI | null = null;

if (process.env.OPENAI_API_KEY) {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI service initialized.');
  } catch (error) {
    console.warn('⚠️ OpenAI API key found, but failed to initialize:', error.message);
    openai = null;
  }
} else {
  console.log('ℹ️ No OpenAI API key found. AI services will be mocked.');
}

export function getAiClient() {
  return openai || mockAiService;
}