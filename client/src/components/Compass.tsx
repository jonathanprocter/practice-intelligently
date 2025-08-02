import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MessageCircle, X, Send, Loader2, Minimize2, Maximize2 } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
          'fixed right-6 top-1/2 transform -translate-y-1/2 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 transition-all duration-300',
          isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]',
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
              <ScrollArea className="flex-1 p-4" style={{ height: 'calc(600px - 140px)' }}>
                <div className="space-y-4">
                  {/* Quick Action Buttons - Show when no messages */}
                  {messages.length === 0 && !chatMutation.isPending && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        Hi! I'm Compass. Click any suggestion below to get started:
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-left justify-start h-auto p-3"
                          onClick={() => {
                            chatMutation.mutate("What should I focus on today?");
                          }}
                        >
                          <div className="text-xs">
                            <div className="font-medium">🎯 Today's Focus</div>
                            <div className="text-gray-500">What should I prioritize today?</div>
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-left justify-start h-auto p-3"
                          onClick={() => {
                            chatMutation.mutate("Help me prepare for today's sessions");
                          }}
                        >
                          <div className="text-xs">
                            <div className="font-medium">📅 Session Prep</div>
                            <div className="text-gray-500">Prepare for today's appointments</div>
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-left justify-start h-auto p-3"
                          onClick={() => {
                            chatMutation.mutate("Show me insights from recent client data");
                          }}
                        >
                          <div className="text-xs">
                            <div className="font-medium">📊 Client Insights</div>
                            <div className="text-gray-500">Analyze patterns and trends</div>
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-left justify-start h-auto p-3"
                          onClick={() => {
                            chatMutation.mutate("Help me manage my action items");
                          }}
                        >
                          <div className="text-xs">
                            <div className="font-medium">✅ Action Items</div>
                            <div className="text-gray-500">Organize and prioritize tasks</div>
                          </div>
                        </Button>
                      </div>
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
                          {message.role === 'assistant' && getProviderBadge(message.aiProvider)}
                        </div>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
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
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex space-x-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask Compass anything... (Voice support coming soon!)"
                    className="flex-1"
                    disabled={chatMutation.isPending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || chatMutation.isPending}
                    size="sm"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}