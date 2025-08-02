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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm Compass, your AI assistant. I have access to all your therapy practice data and can help you with clients, appointments, notes, analytics, and more. How can I assist you today?",
      timestamp: new Date(),
      aiProvider: 'openai'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
          'fixed bottom-6 right-6 z-50',
          className
        )}>
          <Button
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 rounded-full bg-therapy-primary hover:bg-therapy-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            size="lg"
          >
            <Avatar className="w-12 h-12">
              <AvatarImage src={compassAvatar} alt="Compass AI Assistant" />
              <AvatarFallback className="bg-therapy-primary/10 text-therapy-primary">
                <MessageCircle className="w-6 h-6" />
              </AvatarFallback>
            </Avatar>
          </Button>
        </div>
      )}

      {/* Chat Interface */}
      {isOpen && (
        <div className={cn(
          'fixed bottom-6 right-6 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 transition-all duration-300',
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
                    placeholder="Ask Compass anything..."
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