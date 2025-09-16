import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api";
import { Bot, Brain, AlertCircle, CheckCircle, Zap, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface ApiStatus {
  service: string;
  status: 'online' | 'offline' | 'checking';
  lastChecked?: string;
  error?: string;
}

export default function ApiStatusIndicators() {
  const { data: apiStatuses, isLoading } = useQuery({
    queryKey: ['api-status'],
    queryFn: ApiClient.getApiStatuses,
    refetchInterval: 30000, // Check every 30 seconds
  });

  const statuses = apiStatuses || [];

  if (isLoading || !apiStatuses) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <Zap className="h-4 w-4 text-therapy-text/30" />
          <div className="w-2 h-2 bg-therapy-text/30 rounded-full animate-pulse" />
        </div>
        <div className="flex items-center space-x-1">
          <Bot className="h-4 w-4 text-therapy-text/30" />
          <div className="w-2 h-2 bg-therapy-text/30 rounded-full animate-pulse" />
        </div>
        <div className="flex items-center space-x-1">
          <Sparkles className="h-4 w-4 text-therapy-text/30" />
          <div className="w-2 h-2 bg-therapy-text/30 rounded-full animate-pulse" />
        </div>
        <div className="flex items-center space-x-1">
          <Brain className="h-4 w-4 text-therapy-text/30" />
          <div className="w-2 h-2 bg-therapy-text/30 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  const openaiStatus = statuses.find((s: ApiStatus) => s.service === 'openai');
  const anthropicStatus = statuses.find((s: ApiStatus) => s.service === 'anthropic');
  const perplexityStatus = statuses.find((s: ApiStatus) => s.service === 'perplexity');
  const geminiStatus = statuses.find((s: ApiStatus) => s.service === 'gemini');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-therapy-success';
      case 'offline': return 'bg-therapy-error';
      default: return 'bg-therapy-warning';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return CheckCircle;
      case 'offline': return AlertCircle;
      default: return AlertCircle;
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center space-x-3">
        {/* OpenAI Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-1 cursor-pointer">
              <Zap className="h-4 w-4 text-therapy-text/70" />
              <div className={`w-2 h-2 rounded-full ${getStatusColor(openaiStatus?.status || 'offline')}`} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p className="font-semibold">OpenAI GPT-4o</p>
              <p className="capitalize">{openaiStatus?.status || 'offline'}</p>
              {openaiStatus?.error && (
                <p className="text-therapy-error mt-1">{openaiStatus.error}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Anthropic Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-1 cursor-pointer">
              <Bot className="h-4 w-4 text-therapy-text/70" />
              <div className={`w-2 h-2 rounded-full ${getStatusColor(anthropicStatus?.status || 'offline')}`} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p className="font-semibold">Anthropic Claude</p>
              <p className="capitalize">{anthropicStatus?.status || 'offline'}</p>
              {anthropicStatus?.error && (
                <p className="text-therapy-error mt-1">{anthropicStatus.error}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Perplexity Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-1 cursor-pointer">
              <Sparkles className="h-4 w-4 text-therapy-text/70" />
              <div className={`w-2 h-2 rounded-full ${getStatusColor(perplexityStatus?.status || 'offline')}`} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p className="font-semibold">Perplexity AI</p>
              <p className="capitalize">{perplexityStatus?.status || 'offline'}</p>
              {perplexityStatus?.error && (
                <p className="text-therapy-error mt-1">{perplexityStatus.error}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Gemini Status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-1 cursor-pointer">
              <Brain className="h-4 w-4 text-therapy-text/70" />
              <div className={`w-2 h-2 rounded-full ${getStatusColor(geminiStatus?.status || 'offline')}`} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p className="font-semibold">Google Gemini</p>
              <p className="capitalize">{geminiStatus?.status || 'offline'}</p>
              {geminiStatus?.error && (
                <p className="text-therapy-error mt-1">{geminiStatus.error}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}