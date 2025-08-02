import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MessageCircle, X, Send, Loader2, Minimize2, Maximize2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import compassAvatar from '@assets/generated-image (1)_1754094917944.png';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  aiProvider?: 'openai' | 'anthropic' | 'gemini' | 'perplexity';
}

interface CompassProps {
  className?: string;
}

export function Compass({ className }: CompassProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
        toast({
          title: "Voice input error",
          description: "Please try again or use text input.",
          variant: "destructive",
        });
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      setSpeechRecognition(recognition);
    }
  }, []);

  // Send welcome message when first opened
  useEffect(() => {
    if (isOpen && messages.length === 0 && !chatMutation.isPending) {
      sendWelcomeMessage();
    }
  }, [isOpen]);

  // Send welcome message when first opened
  const sendWelcomeMessage = () => {
    if (messages.length === 0) {
      chatMutation.mutate('Hello! Please give me a warm welcome and tell me what you can help with based on my current practice data.');
    }
  };

  // Generate contextual quick actions based on conversation history
  const getContextualQuickActions = () => {
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase());
    const hasAskedAbout = (topic: string) => userMessages.some(msg => msg.includes(topic));

    // Default quick actions for new conversations
    if (messages.length === 0) {
      return [
        { label: "Today's Focus", query: "What should I focus on today?" },
        { label: "Session Prep", query: "Help me prepare for today's sessions" },
        { label: "Client Insights", query: "Show me insights from recent client data" },
        { label: "Action Items", query: "Help me manage my action items" }
      ];
    }

    // Adaptive quick actions based on conversation context
    const actions: Array<{ label: string; query: string }> = [];

    if (!hasAskedAbout('appointment') && !hasAskedAbout('session')) {
      actions.push({ label: "Session Prep", query: "Help me prepare for today's sessions" });
    }

    if (!hasAskedAbout('insight') && !hasAskedAbout('pattern') && !hasAskedAbout('trend')) {
      actions.push({ label: "Client Patterns", query: "What patterns do you see in my recent client data?" });
    }

    if (!hasAskedAbout('action item') && !hasAskedAbout('task')) {
      actions.push({ label: "Priority Tasks", query: "What are my most important tasks today?" });
    }

    if (!hasAskedAbout('medication') && !hasAskedAbout('treatment')) {
      actions.push({ label: "Treatment Notes", query: "Help me review treatment progress for my clients" });
    }

    if (hasAskedAbout('client') || hasAskedAbout('session')) {
      actions.push({ label: "Documentation Help", query: "Help me with session documentation and notes" });
    }

    if (hasAskedAbout('schedule') || hasAskedAbout('appointment')) {
      actions.push({ label: "Schedule Review", query: "Review my upcoming appointments and suggest optimizations" });
    }

    // Ensure we always have at least 3 actions
    if (actions.length < 3) {
      const defaultActions = [
        { label: "Practice Overview", query: "Give me an overview of my practice status" },
        { label: "Weekly Summary", query: "Summarize this week's client progress" },
        { label: "Billing Check", query: "Help me review billing and administrative tasks" }
      ];
      
      defaultActions.forEach(action => {
        if (actions.length < 4 && !actions.some(a => a.label === action.label)) {
          actions.push(action);
        }
      });
    }

    return actions.slice(0, 4); // Limit to 4 actions
  };

  // Voice input functions
  const startListening = () => {
    if (speechRecognition && !isListening) {
      setIsListening(true);
      speechRecognition.start();
    } else if (!speechRecognition) {
      toast({
        title: "Voice input not supported",
        description: "Your browser doesn't support voice input. Please use text input.",
        variant: "destructive",
      });
    }
  };

  const stopListening = () => {
    if (speechRecognition && isListening) {
      speechRecognition.stop();
      setIsListening(false);
    }
  };

  // Voice output functions
  const speakText = async (text: string) => {
    try {
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }

      setIsSpeaking(true);
      
      const response = await fetch('/api/compass/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsSpeaking(false);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
        toast({
          title: "Voice playback error",
          description: "Please try again.",
          variant: "destructive",
        });
      };

      setCurrentAudio(audio);
      await audio.play();
      
    } catch (error) {
      console.error('Error playing speech:', error);
      setIsSpeaking(false);
      toast({
        title: "Voice generation failed",
        description: "Please try again or check your connection.",
        variant: "destructive",
      });
    }
  };

  const stopSpeaking = () => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setIsSpeaking(false);
    }
  };

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/compass/chat', { message });
      return response.json();
    },
    onSuccess: (response) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        aiProvider: response.aiProvider
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Automatically speak the response
      speakText(response.content);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to get response from Compass. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim() || chatMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    chatMutation.mutate(inputMessage);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getProviderBadge = (provider?: string) => {
    const providerColors = {
      openai: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      anthropic: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      gemini: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      perplexity: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
    };

    if (!provider) return null;

    return (
      <Badge className={cn('text-xs', providerColors[provider as keyof typeof providerColors])}>
        {provider.toUpperCase()}
      </Badge>
    );
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <div className={cn(
          'fixed right-6 top-1/2 transform -translate-y-1/2 z-50',
          className
        )}>
          <Button
            onClick={() => setIsOpen(true)}
            className="w-24 h-24 rounded-full bg-therapy-primary hover:bg-therapy-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            size="lg"
          >
            <Avatar className="w-20 h-20">
              <AvatarImage src={compassAvatar} alt="Compass AI Assistant" />
              <AvatarFallback className="bg-therapy-primary/10 text-therapy-primary">
                <MessageCircle className="w-10 h-10" />
              </AvatarFallback>
            </Avatar>
          </Button>
        </div>
      )}

      {/* Chat Interface */}
      {isOpen && (
        <div className={cn(
          'fixed right-6 top-1/2 transform -translate-y-1/2 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 transition-all duration-300 overflow-hidden',
          isMinimized ? 'w-80 h-16' : 'w-96 h-[600px] max-w-[calc(100vw-3rem)]',
          className
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={compassAvatar} alt="Compass AI Assistant" />
                <AvatarFallback className="bg-therapy-primary/10 text-therapy-primary">
                  C
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-sm">Compass</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">AI Assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-8 h-8 p-0"
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          {!isMinimized && (
            <>
              <ScrollArea className="flex-1 p-4" style={{ height: 'calc(600px - 200px)' }}>
                <div className="space-y-4">
                  {/* Welcome message when no messages */}
                  {messages.length === 0 && !chatMutation.isPending && (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-gray-400">
                        Hi! I'm Compass, your AI assistant. I have access to all your practice data and can help with clients, appointments, insights, and more.
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Try the quick suggestions below or ask me anything!
                      </p>
                    </div>
                  )}
                  
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                          message.role === 'user'
                            ? 'bg-therapy-primary text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="flex-1">{message.content}</p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {message.role === 'assistant' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => speakText(message.content)}
                                disabled={isSpeaking}
                                className="w-6 h-6 p-0 opacity-70 hover:opacity-100"
                              >
                                {isSpeaking ? (
                                  <VolumeX className="w-3 h-3" />
                                ) : (
                                  <Volume2 className="w-3 h-3" />
                                )}
                              </Button>
                            )}
                            {message.role === 'assistant' && getProviderBadge(message.aiProvider)}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs opacity-70">
                            {message.timestamp.toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                          {message.role === 'assistant' && isSpeaking && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={stopSpeaking}
                              className="text-xs h-auto p-0 opacity-70 hover:opacity-100"
                            >
                              Stop
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {chatMutation.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Compass is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="border-t border-gray-200 dark:border-gray-700">
                {/* Quick Action Buttons */}
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap gap-2 max-w-full overflow-hidden">
                    {getContextualQuickActions().map((action, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8 px-3 py-1 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 flex-shrink-0"
                        onClick={() => {
                          chatMutation.mutate(action.query);
                        }}
                        disabled={chatMutation.isPending}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 max-w-full">
                  <div className="flex gap-2 items-center max-w-full">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={isListening ? "Listening..." : "Ask Compass anything or use voice input"}
                        className="w-full min-w-0 max-w-full"
                        disabled={chatMutation.isPending || isListening}
                      />
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        onClick={isListening ? stopListening : startListening}
                        size="sm"
                        variant={isListening ? "destructive" : "outline"}
                        disabled={chatMutation.isPending}
                        className="w-9 h-9 p-0"
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </Button>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || chatMutation.isPending}
                        size="sm"
                        className="w-9 h-9 p-0"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}