import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MessageCircle, X, Send, Loader2, Minimize2, Maximize2, Mic, MicOff, Volume2, VolumeX, Settings, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Function to format rich text content
const formatRichText = (content: string) => {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  
  lines.forEach((line, lineIndex) => {
    if (!line.trim()) {
      elements.push(<br key={`br-${lineIndex}`} />);
      return;
    }
    
    const processedLine = processFormattedText(line);
    elements.push(
      <div key={`line-${lineIndex}`} className="mb-1">
        {processedLine}
      </div>
    );
  });
  
  return <div>{elements}</div>;
};

// Helper function to process formatted text within a line
const processFormattedText = (text: string) => {
  const elements: (string | JSX.Element)[] = [];
  let currentIndex = 0;
  
  // Process **bold** text
  const boldRegex = /\*\*(.*?)\*\*/g;
  let match;
  
  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > currentIndex) {
      elements.push(text.slice(currentIndex, match.index));
    }
    
    elements.push(
      <strong key={`bold-${match.index}`} className="font-semibold">
        {match[1]}
      </strong>
    );
    
    currentIndex = match.index + match[0].length;
  }
  
  if (currentIndex < text.length) {
    let remainingText = text.slice(currentIndex);
    
    const italicRegex = /\*(.*?)\*/g;
    const italicElements: (string | JSX.Element)[] = [];
    let italicIndex = 0;
    
    while ((match = italicRegex.exec(remainingText)) !== null) {
      if (match.index > italicIndex) {
        italicElements.push(remainingText.slice(italicIndex, match.index));
      }
      
      italicElements.push(
        <em key={`italic-${match.index}`} className="italic">
          {match[1]}
        </em>
      );
      
      italicIndex = match.index + match[0].length;
    }
    
    if (italicIndex < remainingText.length) {
      italicElements.push(remainingText.slice(italicIndex));
    }
    
    if (remainingText.includes('•')) {
      const bulletText = remainingText.replace('•', '').trim();
      elements.push(
        <div key={`bullet-${currentIndex}`} className="flex items-start gap-2">
          <span className="text-therapy-primary font-bold">•</span>
          <span>{bulletText}</span>
        </div>
      );
    } else {
      elements.push(...italicElements);
    }
  }
  
  return <>{elements}</>;
};

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

// Compass CSS styles
const compassStyles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  @keyframes rotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes blink {
    0%, 90%, 100% { transform: scaleY(1); }
    95% { transform: scaleY(0.1); }
  }

  @keyframes statusPulse {
    0%, 100% { 
      box-shadow: 0 0 8px rgba(139, 92, 246, 0.4);
      transform: scale(1);
    }
    50% { 
      box-shadow: 0 0 16px rgba(139, 92, 246, 0.6);
      transform: scale(1.1);
    }
  }

  @keyframes listeningPulse {
    0%, 100% { 
      transform: scale(0.8);
      opacity: 0;
    }
    50% { 
      transform: scale(1.2);
      opacity: 1;
    }
  }

  @keyframes listeningDot {
    0%, 100% { 
      transform: scale(1);
      box-shadow: 0 0 8px rgba(167, 139, 250, 0.5);
    }
    50% { 
      transform: scale(1.3);
      box-shadow: 0 0 20px rgba(167, 139, 250, 0.9);
    }
  }

  @keyframes tickGlow {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }

  @keyframes thinkingDot {
    0%, 100% { 
      transform: scale(1) rotate(0deg);
      box-shadow: 0 0 8px rgba(147, 51, 234, 0.5);
    }
    50% { 
      transform: scale(1.2) rotate(180deg);
      box-shadow: 0 0 16px rgba(147, 51, 234, 0.9);
    }
  }

  .compass-float {
    animation: float 6s ease-in-out infinite;
    cursor: pointer;
    transition: transform 0.3s ease;
  }

  .compass-float:hover {
    transform: scale(1.05);
  }

  .compass-star {
    animation: rotate 20s linear infinite;
  }

  .compass-pulse {
    animation: pulse 2s ease-in-out infinite;
  }

  .compass-eye {
    animation: blink 4s infinite;
  }

  .compass-status {
    animation: statusPulse 2s ease-in-out infinite;
  }

  .compass-listening .compass-status {
    background: #a78bfa;
    animation: listeningDot 0.5s ease-in-out infinite;
  }

  .compass-thinking .compass-star {
    animation: rotate 1s linear infinite;
  }

  .compass-thinking .compass-tick {
    animation: tickGlow 2s ease-in-out infinite;
  }

  .compass-thinking .compass-status {
    background: #9333ea;
    animation: thinkingDot 0.3s ease-in-out infinite;
  }

  .compass-listening::before {
    content: '';
    position: absolute;
    top: -20px;
    left: -20px;
    right: -20px;
    bottom: -20px;
    border-radius: 50%;
    background: radial-gradient(circle, transparent 40%, rgba(139, 92, 246, 0.3) 70%, transparent 100%);
    animation: listeningPulse 1.5s ease-in-out infinite;
    pointer-events: none;
  }
`;

export function Compass({ className }: CompassProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [continuousMode, setContinuousMode] = useState(false);
  const [voiceActivation, setVoiceActivation] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('josh');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [compassState, setCompassState] = useState<'normal' | 'listening' | 'thinking'>('normal');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const compassRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
        const transcript = event.results[0][0].transcript.trim();

        if (voiceActivation && transcript.toLowerCase().includes('hey compass')) {
          const query = transcript.toLowerCase().replace('hey compass', '').trim();
          if (query) {
            chatMutation.mutate(query);
          }
          setIsListening(false);
          return;
        }

        setInputMessage(transcript);

        if (continuousMode && transcript) {
          chatMutation.mutate(transcript);
          setInputMessage('');
        }

        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.log('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          toast({
            title: "Voice input error",
            description: "Please try again or use text input.",
            variant: "destructive",
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setCompassState('normal');

        if (voiceActivation && isOpen) {
          setTimeout(() => {
            if (speechRecognition && voiceActivation && isOpen) {
              try {
                speechRecognition.start();
                setIsListening(true);
                setCompassState('listening');
              } catch (error) {
                console.log('Failed to restart speech recognition:', error);
              }
            }
          }, 1000);
        }
      };

      setSpeechRecognition(recognition);
    }
  }, [voiceActivation, continuousMode, isOpen]);

  // Generate session ID and load conversation history when first opened
  useEffect(() => {
    if (isOpen && !sessionId) {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      
      if (messages.length === 0 && !chatMutation.isPending) {
        sendWelcomeMessage();
      }
    }
  }, [isOpen]);

  // Start voice activation listening when enabled
  useEffect(() => {
    if (voiceActivation && isOpen && speechRecognition && !isListening) {
      try {
        speechRecognition.start();
        setIsListening(true);
        setCompassState('listening');
      } catch (error) {
        console.log('Voice activation start failed:', error);
      }
    } else if (!voiceActivation && speechRecognition && isListening) {
      try {
        speechRecognition.stop();
        setIsListening(false);
        setCompassState('normal');
      } catch (error) {
        console.log('Voice activation stop failed:', error);
      }
    }
  }, [voiceActivation, isOpen]);

  // Clean up when component unmounts or window closes
  useEffect(() => {
    return () => {
      if (speechRecognition) {
        try {
          speechRecognition.stop();
        } catch (error) {
          console.log('Cleanup speech recognition failed:', error);
        }
      }
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
    };
  }, []);

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

    if (messages.length === 0) {
      return [
        { label: "Today's Focus", query: "What should I focus on today?" },
        { label: "Session Prep", query: "Help me prepare for today's sessions" },
        { label: "Client Insights", query: "Show me insights from recent client data" },
        { label: "Action Items", query: "Help me manage my action items" }
      ];
    }

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

    return actions.slice(0, 4);
  };

  // Voice input functions
  const startListening = () => {
    if (speechRecognition && !isListening) {
      try {
        setIsListening(true);
        setCompassState('listening');
        speechRecognition.start();
      } catch (error) {
        console.log('Failed to start speech recognition:', error);
        setIsListening(false);
        setCompassState('normal');
        toast({
          title: "Voice input error",
          description: "Please try again or use text input.",
          variant: "destructive",
        });
      }
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
      try {
        speechRecognition.stop();
        setIsListening(false);
        setCompassState('normal');
      } catch (error) {
        console.log('Failed to stop speech recognition:', error);
        setIsListening(false);
        setCompassState('normal');
      }
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
        body: JSON.stringify({ 
          text,
          voice: selectedVoice,
          speed: speechRate
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate speech: ${response.status} - ${errorText}`);
      }

      const audioBlob = await response.blob();

      if (audioBlob.size === 0) {
        throw new Error('Received empty audio response');
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsSpeaking(false);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (e) => {
        console.log('Audio playback error (handled):', e);
        setIsSpeaking(false);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.oncanplaythrough = () => {
        console.log('Audio ready to play');
      };

      setCurrentAudio(audio);

      try {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          console.log('Audio started playing successfully');
        }
      } catch (playError) {
        console.log('Auto-play blocked by browser (expected behavior)');
        setIsSpeaking(false);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
        return;
      }

    } catch (error) {
      console.log('Voice generation failed:', error);
      setIsSpeaking(false);
      if (!(error instanceof Error) || !error.toString().includes('play')) {
        toast({
          title: "Voice generation failed",
          description: error instanceof Error ? error.message : "Please try again or check your connection.",
          variant: "destructive",
        });
      }
    }
  };

  const stopSpeaking = () => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setIsSpeaking(false);
    }
  };

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (query: string) => {
      setCompassState('thinking');
      
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: query,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);

      const response = await apiRequest('/api/compass/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: query,
          sessionId,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      return response;
    },
    onSuccess: (data) => {
      setCompassState('normal');
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        aiProvider: data.provider
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (voiceActivation && data.response) {
        speakText(data.response);
      }
    },
    onError: (error) => {
      setCompassState('normal');
      console.error('Chat error:', error);
      toast({
        title: "Connection Error",
        description: "Unable to reach Compass AI. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !chatMutation.isPending) {
      chatMutation.mutate(inputMessage);
      setInputMessage('');
    }
  };

  const quickActions = getContextualQuickActions();

  const providerColors = {
    openai: 'bg-green-100 text-green-700 border-green-200',
    anthropic: 'bg-orange-100 text-orange-700 border-orange-200',
    gemini: 'bg-blue-100 text-blue-700 border-blue-200',
    perplexity: 'bg-purple-100 text-purple-700 border-purple-200'
  };

  const renderProviderBadge = (provider?: string) => {
    if (!provider) return null;
    
    return (
      <Badge className={cn('text-xs', providerColors[provider as keyof typeof providerColors])}>
        {provider.toUpperCase()}
      </Badge>
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (isOpen && compassRef.current && !compassRef.current.contains(event.target as Node)) {
        const fabButton = document.querySelector('[data-compass-fab]');
        if (fabButton && fabButton.contains(event.target as Node)) {
          return;
        }

        setIsOpen(false);
        if (inputRef.current) {
          inputRef.current.blur();
        }
      }
    };

    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Generate tick marks for compass
  const tickMarks = [];
  for (let i = 0; i < 60; i++) {
    tickMarks.push(
      <div
        key={i}
        className={cn(
          'compass-tick absolute bg-therapy-primary opacity-40',
          i % 5 === 0 ? 'w-1 h-3 opacity-80' : 'w-0.5 h-1.5'
        )}
        style={{
          transform: `rotate(${i * 6}deg)`,
          transformOrigin: 'center 47px',
          left: '50%',
          top: '3px'
        }}
      />
    );
  }

  return (
    <>
      {/* Inject compass styles */}
      <style dangerouslySetInnerHTML={{ __html: compassStyles }} />
      
      {/* Floating Animated Compass */}
      {!isOpen && (
        <div className={cn(
          'fixed bottom-6 right-6 z-50',
          className
        )}>
          <div
            className={cn(
              'compass-float relative w-30 h-30',
              compassState === 'listening' && 'compass-listening',
              compassState === 'thinking' && 'compass-thinking'
            )}
            onClick={() => setIsOpen(true)}
            data-compass-fab
          >
            {/* Outer ring */}
            <div className="absolute w-full h-full rounded-full bg-gradient-to-br from-gray-100 to-gray-200 shadow-lg">
              {/* Inner compass */}
              <div className="absolute top-2.5 left-2.5 right-2.5 bottom-2.5 rounded-full bg-gradient-to-br from-therapy-primary to-purple-400 shadow-inner overflow-hidden">
                {/* Compass face */}
                <div className="absolute top-2.5 left-2.5 right-2.5 bottom-2.5 rounded-full bg-gradient-to-br from-white to-gray-50 flex justify-center items-center">
                  {/* Tick marks */}
                  <div className="absolute w-full h-full">
                    {tickMarks}
                  </div>
                  
                  {/* Star container */}
                  <div className="compass-pulse relative w-16 h-16">
                    <svg className="compass-star absolute w-full h-full" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{stopColor: '#7c3aed', stopOpacity: 1}} />
                          <stop offset="100%" style={{stopColor: '#8b5cf6', stopOpacity: 1}} />
                        </linearGradient>
                      </defs>
                      <path 
                        d="M50,15 L58,35 L80,35 L62,48 L70,68 L50,53 L30,68 L38,48 L20,35 L42,35 Z" 
                        fill="url(#starGradient)" 
                        stroke="#6b21a8" 
                        strokeWidth="1"
                        style={{filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))'}}
                      />
                    </svg>
                  </div>
                  
                  {/* Face */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-7 h-7 bg-gradient-to-br from-white to-gray-50 rounded-full shadow-sm z-10">
                    <div className="absolute top-2 w-full flex justify-around px-2">
                      <div className="compass-eye w-1 h-1 bg-gray-600 rounded-full"></div>
                      <div className="compass-eye w-1 h-1 bg-gray-600 rounded-full"></div>
                    </div>
                    <div className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 w-3 h-1.5 border-b-2 border-gray-600 rounded-b-full"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Status indicator */}
            <div className="compass-status absolute top-1 right-1 w-2.5 h-2.5 bg-purple-400 rounded-full shadow-sm"></div>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      {isOpen && (
        <div
          ref={compassRef}
          className={cn(
            'fixed right-6 top-1/2 transform -translate-y-1/2 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 transition-all duration-300 overflow-hidden',
            isMinimized ? 'w-80 h-16' : 'w-96 h-[600px] max-w-[calc(100vw-3rem)]',
            className
          )}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              {/* Mini compass avatar */}
              <div className="relative w-8 h-8">
                <div className="absolute w-full h-full rounded-full bg-gradient-to-br from-therapy-primary to-purple-400">
                  <div className="absolute top-1 left-1 right-1 bottom-1 rounded-full bg-white flex justify-center items-center">
                    <svg className="w-4 h-4" viewBox="0 0 100 100">
                      <path 
                        d="M50,20 L55,40 L70,40 L58,50 L63,70 L50,58 L37,70 L42,50 L30,40 L45,40 Z" 
                        fill="#7c3aed"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm">Compass</h3>
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">AI Assistant</p>
                  {voiceActivation && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-red-600 dark:text-red-400">Listening</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                className="w-8 h-8 p-0"
                title="Voice Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newVoiceActivation = !voiceActivation;
                  setVoiceActivation(newVoiceActivation);
                  if (!newVoiceActivation && speechRecognition && isListening) {
                    try {
                      speechRecognition.stop();
                      setIsListening(false);
                      setCompassState('normal');
                    } catch (error) {
                      console.log('Failed to stop speech recognition:', error);
                    }
                  }
                }}
                className={cn("w-8 h-8 p-0", voiceActivation && "bg-gray-200 dark:bg-gray-600")}
                title={voiceActivation ? "Disable Hey Compass" : "Enable Hey Compass"}
              >
                {voiceActivation ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-8 h-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-600"
                title={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? (
                  <Maximize2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                ) : (
                  <Minimize2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
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

          {/* Voice Settings Panel */}
          {showVoiceSettings && !isMinimized && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Voice</label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="josh">Josh (Male)</SelectItem>
                      <SelectItem value="breeze">Breeze (Female)</SelectItem>
                      <SelectItem value="ember">Ember (Female)</SelectItem>
                      <SelectItem value="juniper">Juniper (Female)</SelectItem>
                      <SelectItem value="sky">Sky (Female)</SelectItem>
                      <SelectItem value="cove">Cove (Male)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Speech Rate: {speechRate.toFixed(1)}x
                  </label>
                  <Slider
                    value={[speechRate]}
                    onValueChange={(value) => setSpeechRate(value[0])}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    className="mt-2"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Continuous Mode</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setContinuousMode(!continuousMode)}
                    className={cn(continuousMode && "bg-therapy-primary text-white")}
                  >
                    {continuousMode ? "ON" : "OFF"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Messages Area */}
          {!isMinimized && (
            <>
              <ScrollArea className="flex-1 p-4 h-[400px]">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-3',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-therapy-primary/10 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-4 h-4 text-therapy-primary" />
                        </div>
                      )}
                      <div
                        className={cn(
                          'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                          message.role === 'user'
                            ? 'bg-therapy-primary text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        )}
                      >
                        <div className="whitespace-pre-wrap">
                          {message.role === 'assistant' ? formatRichText(message.content) : message.content}
                        </div>
                        <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                          <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <div className="flex items-center space-x-2">
                            {message.role === 'assistant' && renderProviderBadge(message.aiProvider)}
                            {message.role === 'assistant' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => speakText(message.content)}
                                disabled={isSpeaking}
                                className="w-6 h-6 p-0 hover:bg-white/20"
                                title="Speak message"
                              >
                                {isSpeaking ? (
                                  <VolumeX className="w-3 h-3" />
                                ) : (
                                  <Volume2 className="w-3 h-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-200">U</span>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {chatMutation.isPending && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-therapy-primary/10 flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-4 h-4 text-therapy-primary" />
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin text-therapy-primary" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Quick Actions */}
              {quickActions.length > 0 && messages.length <= 2 && (
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => chatMutation.mutate(action.query)}
                        disabled={chatMutation.isPending}
                        className="text-xs h-8 justify-start text-left"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Ask Compass anything..."
                      disabled={chatMutation.isPending}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 w-8 h-8 p-0"
                      onClick={isListening ? stopListening : startListening}
                      disabled={chatMutation.isPending}
                      title={isListening ? "Stop listening" : "Start voice input"}
                    >
                      {isListening ? (
                        <MicOff className="w-4 h-4 text-red-500" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    disabled={!inputMessage.trim() || chatMutation.isPending}
                    className="bg-therapy-primary hover:bg-therapy-primary/90"
                  >
                    {chatMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}