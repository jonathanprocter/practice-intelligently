import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MessageCircle, X, Send, Loader2, Minimize2, Maximize2, Mic, MicOff, Volume2, VolumeX, Settings, Play, Square } from 'lucide-react';

// Mock UI components (replace with your actual shadcn/ui imports)
const Button = ({ children, className = '', variant = 'default', size = 'default', disabled = false, onClick, type = 'button', title, ...props }) => (
  <button
    className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 ${
      variant === 'ghost' ? 'hover:bg-gray-100' : 
      variant === 'outline' ? 'border border-gray-300 bg-white hover:bg-gray-50' : 
      'bg-purple-600 text-white hover:bg-purple-700'
    } ${
      size === 'sm' ? 'h-9 px-3 text-sm' : 'h-10 px-4'
    } ${className}`}
    disabled={disabled}
    onClick={onClick}
    type={type}
    title={title}
    {...props}
  >
    {children}
  </button>
);

const Input = ({ value, onChange, placeholder, disabled, className = '', ...props }) => (
  <input
    type="text"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
);

const Select = ({ value, onValueChange, children }) => (
  <select
    value={value}
    onChange={(e) => onValueChange(e.target.value)}
    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
  >
    {children}
  </select>
);

const SelectItem = ({ value, children }) => (
  <option value={value}>{children}</option>
);

const Slider = ({ value, onValueChange, min, max, step, className = '' }) => (
  <input
    type="range"
    value={value[0]}
    onChange={(e) => onValueChange([parseFloat(e.target.value)])}
    min={min}
    max={max}
    step={step}
    className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${className}`}
  />
);

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
    {children}
  </span>
);

// Your original compass styles
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
    transform: scale(1.1);
    filter: brightness(1.05);
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

  @media (max-width: 640px) {
    .compass-chat-window {
      right: 12px !important;
      left: 12px !important;
      width: auto !important;
      max-width: calc(100vw - 24px) !important;
    }
  }
`;

// Format rich text helper
const formatRichText = (content) => {
  const lines = content.split('\n');
  const elements = [];

  lines.forEach((line, lineIndex) => {
    if (!line.trim()) {
      elements.push(<br key={`br-${lineIndex}`} />);
      return;
    }

    // Process bold text
    let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Process italic text
    processedLine = processedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');

    elements.push(
      <div key={`line-${lineIndex}`} className="mb-1" dangerouslySetInnerHTML={{ __html: processedLine }} />
    );
  });

  return <div>{elements}</div>;
};

export function Compass({ className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null);
  const [continuousMode, setContinuousMode] = useState(false);
  const [voiceActivation, setVoiceActivation] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('rachel');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [voiceModulation, setVoiceModulation] = useState('auto');
  const [compassState, setCompassState] = useState('normal');
  const [wakeWordMode, setWakeWordMode] = useState(true); // true for wake words, false for push-to-talk
  const [isLoading, setIsLoading] = useState(false);
  const [allowInterruption, setAllowInterruption] = useState(true);

  const messagesEndRef = useRef(null);
  const compassRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize session and send welcome message
  useEffect(() => {
    if (isOpen && !sessionId) {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);

      if (messages.length === 0) {
        sendWelcomeMessage();
      }
    }
  }, [isOpen, sessionId, messages.length]);

  const sendWelcomeMessage = () => {
    const welcomeMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      content: "Hello! I'm Compass, your AI assistant. I'm here to help you with your practice management. How can I assist you today?",
      timestamp: new Date(),
      aiProvider: 'system'
    };
    setMessages([welcomeMessage]);
  };

  // Chat function with fallback
  const sendMessage = async (message) => {
    if (!message.trim() || isLoading) return;

    setCompassState('thinking');
    setIsLoading(true);

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    try {
      const response = await fetch('/api/compass/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        aiProvider: data.aiProvider || 'openai'
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (voiceActivation && data.content) {
        speakText(data.content);
      }
    } catch (error) {
      console.error('Chat error:', error);

      // Fallback response
      const fallbackMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: generateFallbackResponse(message),
        timestamp: new Date(),
        aiProvider: 'offline'
      };

      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setCompassState('normal');
      setIsLoading(false);
    }
  };

  // Fallback responses for demo/offline mode
  const generateFallbackResponse = (query) => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('hello') || lowerQuery.includes('hi')) {
      return "Hello! I'm here to help with your practice management needs. What can I assist you with today?";
    }
    if (lowerQuery.includes('appointment') || lowerQuery.includes('schedule')) {
      return "I can help manage your appointments. You have 3 appointments scheduled for today. Would you like to review them?";
    }
    if (lowerQuery.includes('client') || lowerQuery.includes('patient')) {
      return "I can provide insights about your clients. You have 24 active clients with 5 new intakes this month.";
    }
    if (lowerQuery.includes('help')) {
      return "I can help with: scheduling, client insights, task management, documentation, billing, and practice analytics. What would you like to focus on?";
    }

    return "I understand you're asking about '" + query + "'. I'm currently in offline mode but can still help with basic practice management questions. Try asking about appointments, clients, or tasks.";
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();

        // Check for interruption keywords when Compass is speaking
        if (isSpeaking && allowInterruption) {
          const interruptKeywords = ['stop', 'pause', 'wait', 'hold on', 'interrupt'];
          if (interruptKeywords.some(keyword => transcript.toLowerCase().includes(keyword))) {
            interruptSpeech();
            setIsListening(false);
            setCompassState('normal');
            return;
          }
        }

        if (voiceActivation && transcript.toLowerCase().includes('hey compass')) {
          // Interrupt current speech if speaking
          if (isSpeaking && allowInterruption) {
            interruptSpeech();
          }
          
          const query = transcript.toLowerCase().replace('hey compass', '').trim();
          if (query) {
            sendMessage(query);
          }
          setIsListening(false);
          return;
        }

        setInputMessage(transcript);

        if (continuousMode && transcript) {
          // Interrupt current speech if speaking
          if (isSpeaking && allowInterruption) {
            interruptSpeech();
          }
          sendMessage(transcript);
          setInputMessage('');
        }

        setIsListening(false);
        setCompassState('normal');
      };

      recognition.onerror = (event) => {
        console.log('Speech recognition error:', event.error);
        setIsListening(false);
        setCompassState('normal');
      };

      recognition.onend = () => {
        setIsListening(false);
        setCompassState('normal');
        // Removed automatic restart to prevent endless error loops
      };

      setSpeechRecognition(recognition);
    }
  }, [voiceActivation, continuousMode, isOpen]);

  // Voice activation control (manual only to prevent loops)
  useEffect(() => {
    if (!voiceActivation && speechRecognition && isListening) {
      try {
        speechRecognition.stop();
        setIsListening(false);
        setCompassState('normal');
      } catch (error) {
        console.log('Voice activation stop failed:', error);
      }
    }
  }, [voiceActivation, speechRecognition, isListening]);

  // Voice input controls
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
      }
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
      }
    }
  };

  // Interrupt current speech
  const interruptSpeech = () => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setIsSpeaking(false);
      console.log('🎤 Speech interrupted by user');
    }
  };

  // Text to speech using ElevenLabs
  const speakText = async (text) => {
    try {
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }

      setIsSpeaking(true);

      // Use ElevenLabs API for high-quality voice synthesis with intelligent modulation
      const response = await fetch('/api/compass/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text,
          voice: selectedVoice,
          speed: speechRate,
          modulation: voiceModulation
        }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          setIsSpeaking(false);
          setCurrentAudio(null);
          URL.revokeObjectURL(audioUrl);
        };

        // Add interruption capability during speech
        audio.onpause = () => {
          setIsSpeaking(false);
          setCurrentAudio(null);
          URL.revokeObjectURL(audioUrl);
        };

        // Log voice context for debugging
        const voiceContext = response.headers.get('X-Voice-Context');
        if (voiceContext) {
          console.log(`🎤 Voice adapted for ${voiceContext} context`);
        }

        setCurrentAudio(audio);
        await audio.play();
      }
    } catch (error) {
      console.log('Voice generation failed:', error);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }
    setIsSpeaking(false);
  };

  // Contextual quick actions
  const getContextualQuickActions = () => {
    if (messages.length === 0) {
      return [
        { label: "Today's Focus", query: "What should I focus on today?" },
        { label: "Session Prep", query: "Help me prepare for today's sessions" },
        { label: "Client Insights", query: "Show me insights from recent client data" },
        { label: "Action Items", query: "Help me manage my action items" }
      ];
    }

    return [
      { label: "Schedule Review", query: "Review my upcoming appointments" },
      { label: "Client Patterns", query: "What patterns do you see in my client data?" },
      { label: "Priority Tasks", query: "What are my most important tasks?" },
      { label: "Practice Overview", query: "Give me a practice overview" }
    ];
  };

  const quickActions = getContextualQuickActions();

  const providerColors = {
    openai: 'bg-green-100 text-green-700 border-green-200',
    anthropic: 'bg-orange-100 text-orange-700 border-orange-200',
    gemini: 'bg-blue-100 text-blue-700 border-blue-200',
    perplexity: 'bg-purple-100 text-purple-700 border-purple-200',
    offline: 'bg-gray-100 text-gray-700 border-gray-200',
    system: 'bg-blue-100 text-blue-700 border-blue-200'
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && compassRef.current && !compassRef.current.contains(event.target)) {
        const fabButton = document.querySelector('[data-compass-fab]');
        if (fabButton && fabButton.contains(event.target)) {
          return;
        }
        setIsOpen(false);
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
    const isHour = i % 5 === 0;
    tickMarks.push(
      <div
        key={i}
        className="absolute bg-purple-600"
        style={{
          width: isHour ? '2px' : '1px',
          height: isHour ? '8px' : '4px',
          opacity: isHour ? 0.8 : 0.4,
          top: '4px',
          left: '50%',
          transform: `translateX(-50%) rotate(${i * 6}deg)`,
          transformOrigin: 'center 40px'
        }}
      />
    );
  }

  return (
    <>
      {/* Inject compass styles */}
      <style dangerouslySetInnerHTML={{ __html: compassStyles }} />

      {/* Your Original Floating Animated Compass */}
      {!isOpen && (
        <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
          <div
            className={`compass-float relative group ${
              compassState === 'listening' ? 'compass-listening' : ''
            } ${
              compassState === 'thinking' ? 'compass-thinking' : ''
            }`}
            style={{ width: '120px', height: '120px' }}
            onClick={() => setIsOpen(true)}
            data-compass-fab
            title="Click to open Compass AI Assistant"
          >
            {/* Outer ring with enhanced shadow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-100 to-gray-200" 
                 style={{ boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2), 0 2px 10px rgba(0, 0, 0, 0.1)' }}>
              {/* Inner compass purple ring */}
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 shadow-inner">
                {/* White compass face */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white to-gray-50 flex justify-center items-center overflow-visible">
                  {/* Tick marks around the edge */}
                  <div className="absolute inset-0">
                    {tickMarks}
                  </div>

                  {/* Central star */}
                  <div className="compass-pulse relative" style={{ width: '60px', height: '60px', zIndex: 5 }}>
                    <svg className="compass-star absolute inset-0 w-full h-full" viewBox="0 0 100 100">
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

                  {/* Compass Face with eyes and smile - positioned in center */}
                  <div className="absolute" style={{
                    width: '28px',
                    height: '28px',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10
                  }}>
                    <div className="relative w-full h-full bg-gradient-to-br from-white to-gray-50 rounded-full shadow-md">
                      {/* Eyes */}
                      <div className="absolute flex justify-center gap-2" style={{ top: '8px', left: '50%', transform: 'translateX(-50%)' }}>
                        <div className="compass-eye bg-gray-700 rounded-full" style={{ width: '3px', height: '3px' }}></div>
                        <div className="compass-eye bg-gray-700 rounded-full" style={{ width: '3px', height: '3px' }}></div>
                      </div>
                      {/* Smile */}
                      <div className="absolute" style={{
                        bottom: '6px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '12px',
                        height: '6px',
                        borderBottom: '2px solid #4b5563',
                        borderRadius: '0 0 12px 12px'
                      }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status indicator dot */}
            <div className="compass-status absolute" style={{
              top: '4px',
              right: '4px',
              width: '10px',
              height: '10px',
              backgroundColor: '#a78bfa',
              borderRadius: '50%',
              boxShadow: '0 0 4px rgba(167, 139, 250, 0.5)'
            }}></div>

            {/* Tooltip on hover */}
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Click to chat with Compass
            </div>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      {isOpen && (
        <div
          ref={compassRef}
          className={`compass-chat-window fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 transition-all duration-300 overflow-hidden ${
            isMinimized ? 'w-80' : 'w-full sm:w-96 flex flex-col'
          } ${className}`}
          style={{
            bottom: '24px',
            right: '24px',
            height: isMinimized ? '52px' : 'min(600px, calc(100vh - 48px))',
            maxHeight: 'calc(100vh - 48px)',
            maxWidth: 'calc(100vw - 48px)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-2">
              {/* Mini compass avatar */}
              <div className="relative w-7 h-7">
                <div className="absolute w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-purple-400">
                  <div className="absolute top-0.5 left-0.5 right-0.5 bottom-0.5 rounded-full bg-white flex justify-center items-center">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 100 100">
                      <path 
                        d="M50,20 L55,40 L70,40 L58,50 L63,70 L50,58 L37,70 L42,50 L30,40 L45,40 Z" 
                        fill="#7c3aed"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-xs">Compass</h3>
                <div className="flex items-center space-x-1">
                  <p className="text-xs text-gray-500">AI Assistant</p>
                  {voiceActivation && (
                    <>
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-red-600">Live</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                className="w-7 h-7 p-0"
                title="Voice Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newVoiceActivation = !voiceActivation;
                  setVoiceActivation(newVoiceActivation);
                  
                  if (newVoiceActivation) {
                    // Enable voice activation
                    if (speechRecognition && !isListening && wakeWordMode) {
                      try {
                        speechRecognition.start();
                        setIsListening(true);
                        setCompassState('listening');
                      } catch (error) {
                        console.log('Failed to start speech recognition:', error);
                      }
                    }
                  } else {
                    // Disable voice activation
                    if (speechRecognition && isListening) {
                      try {
                        speechRecognition.stop();
                        setIsListening(false);
                        setCompassState('normal');
                      } catch (error) {
                        console.log('Failed to stop speech recognition:', error);
                      }
                    }
                  }
                }}
                className={`w-7 h-7 p-0 ${voiceActivation ? 'bg-green-100 text-green-600' : 'bg-gray-100'}`}
                title={voiceActivation ? "Disable Voice Activation" : "Enable Voice Activation"}
              >
                {voiceActivation ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-7 h-7 p-0 hover:bg-gray-200"
                title={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4 text-gray-700" />
                ) : (
                  <Minimize2 className="w-4 h-4 text-gray-700" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 p-0"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Voice Settings Panel */}
          {showVoiceSettings && !isMinimized && (
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">ElevenLabs Voice</label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectItem value="rachel">Rachel (Professional Female)</SelectItem>
                    <SelectItem value="adam">Adam (Warm Male)</SelectItem>
                    <SelectItem value="bella">Bella (Young Female)</SelectItem>
                    <SelectItem value="josh">Josh (Deep Male)</SelectItem>
                    <SelectItem value="sam">Sam (Raspy Male)</SelectItem>
                    <SelectItem value="nicole">Nicole (Warm Professional)</SelectItem>
                    <SelectItem value="natasha">Natasha (Calm Therapeutic)</SelectItem>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
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
                <div>
                  <label className="text-sm font-medium text-gray-700">Voice Modulation</label>
                  <Select value={voiceModulation} onValueChange={setVoiceModulation}>
                    <SelectItem value="auto">Auto (Intelligent)</SelectItem>
                    <SelectItem value="manual">Manual (Fixed)</SelectItem>
                  </Select>
                  <div className="text-xs text-gray-500 mt-1">
                    {voiceModulation === 'auto' 
                      ? 'AI analyzes content for optimal voice characteristics'
                      : 'Uses consistent voice settings for all content'
                    }
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Voice Activation Mode</label>
                  <Select value={wakeWordMode ? 'wake' : 'push'} onValueChange={(value) => setWakeWordMode(value === 'wake')}>
                    <SelectItem value="wake">Wake Words ("Hey Compass")</SelectItem>
                    <SelectItem value="push">Push to Talk</SelectItem>
                  </Select>
                  <div className="text-xs text-gray-500 mt-1">
                    {wakeWordMode 
                      ? 'Say "Hey Compass" to activate voice commands'
                      : 'Hold the microphone button to speak'
                    }
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Continuous Mode</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setContinuousMode(!continuousMode)}
                    className={continuousMode ? 'bg-purple-600 text-white' : ''}
                  >
                    {continuousMode ? "ON" : "OFF"}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Voice Interruption</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAllowInterruption(!allowInterruption)}
                    className={allowInterruption ? 'bg-blue-600 text-white' : ''}
                    title={allowInterruption ? 'You can interrupt Compass while speaking' : 'Voice interruption disabled'}
                  >
                    {allowInterruption ? "ON" : "OFF"}
                  </Button>
                </div>
                <div className="text-xs text-gray-500 mt-2 p-2 bg-blue-50 rounded">
                  <strong>Voice Interruption:</strong> Say "stop", "pause", "wait", or "Hey Compass" to interrupt and ask questions during continuous conversations.
                </div>
              </div>
            </div>
          )}

          {/* Messages Area */}
          {!isMinimized && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 p-4 overflow-y-auto min-h-0">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-4 h-4 text-purple-600" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          message.role === 'user'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">
                          {message.role === 'assistant' ? formatRichText(message.content) : message.content}
                        </div>
                        <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                          <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <div className="flex items-center space-x-2">
                            {message.role === 'assistant' && message.aiProvider && (
                              <Badge className={providerColors[message.aiProvider] || providerColors.system}>
                                {message.aiProvider.toUpperCase()}
                              </Badge>
                            )}
                            {message.role === 'assistant' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (isSpeaking) {
                                    interruptSpeech();
                                  } else {
                                    speakText(message.content);
                                  }
                                }}
                                className="w-6 h-6 p-0 hover:bg-white/20"
                                title={isSpeaking ? "Stop speaking" : "Speak message"}
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
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-gray-700">U</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="bg-gray-100 rounded-lg px-3 py-2">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                          <span className="text-sm text-gray-600">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Quick Actions */}
              {quickActions.length > 0 && messages.length <= 2 && (
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => sendMessage(action.query)}
                        disabled={isLoading}
                        className="text-xs h-8 justify-start text-left"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 border-t border-gray-200 mt-auto">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Ask Compass anything..."
                      disabled={isLoading}
                      className="pr-10"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(inputMessage);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={isListening ? stopListening : startListening}
                      disabled={isLoading}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                      title={isListening ? "Stop listening" : "Start voice input"}
                    >
                      {isListening ? (
                        <MicOff className="w-4 h-4 text-red-500" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    onClick={() => sendMessage(inputMessage)}
                    disabled={!inputMessage.trim() || isLoading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}