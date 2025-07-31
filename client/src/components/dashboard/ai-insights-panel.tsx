import { useQuery } from "@tanstack/react-query";
import { ApiClient, type AiInsight } from "@/lib/api";
import { Bot, Lightbulb, TrendingUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'pattern': return Lightbulb;
    case 'progress': return TrendingUp;
    case 'suggestion': return FileText;
    default: return Bot;
  }
};

const getInsightColor = (type: string) => {
  switch (type) {
    case 'pattern': return 'bg-therapy-primary/20 text-therapy-primary';
    case 'progress': return 'bg-therapy-success/20 text-therapy-success';
    case 'suggestion': return 'bg-therapy-warning/20 text-therapy-warning';
    default: return 'bg-therapy-primary/20 text-therapy-primary';
  }
};

export default function AiInsightsPanel() {
  const { data: insights, isLoading } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: ApiClient.getAiInsights,
  });

  if (isLoading) {
    return (
      <div className="therapy-card">
        <div className="p-6 border-b border-therapy-border">
          <h3 className="text-xl font-bold text-therapy-text flex items-center">
            <Bot className="text-therapy-primary mr-2" />
            AI Insights
          </h3>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="ai-insight p-4 rounded-lg animate-pulse">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="therapy-card">
      <div className="p-6 border-b border-therapy-border">
        <h3 className="text-xl font-bold text-therapy-text flex items-center">
          <Bot className="text-therapy-primary mr-2" />
          AI Insights
        </h3>
      </div>
      
      <div className="p-6 space-y-4">
        {insights && insights.length > 0 ? (
          insights.slice(0, 3).map((insight) => {
            const IconComponent = getInsightIcon(insight.type);
            return (
              <div key={insight.id} className="ai-insight p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mt-1 ${getInsightColor(insight.type)}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-therapy-text text-sm mb-1">
                      {insight.title}
                    </h4>
                    <p className="text-therapy-text/70 text-xs">
                      {insight.content}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-therapy-primary text-xs font-medium mt-2 p-0 h-auto hover:underline"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-6">
            <Bot className="h-12 w-12 text-therapy-text/30 mx-auto mb-2" />
            <p className="text-therapy-text/60 text-sm">No insights available</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => ApiClient.generateAiInsights()}
            >
              Generate Insights
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
