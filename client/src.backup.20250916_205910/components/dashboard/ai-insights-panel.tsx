import { useQuery } from "@tanstack/react-query";
import { ApiClient, type AiInsight } from "@/lib/api";
import { Bot, Lightbulb, TrendingUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'pattern': return Lightbulb;
    case 'progress': return TrendingUp;
    case 'suggestion': return FileText;
    case 'general': return Bot;
    case 'urgent': return TrendingUp;
    default: return Bot;
  }
};

const getInsightColor = (type: string) => {
  switch (type) {
    case 'pattern': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'progress': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'suggestion': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'urgent': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case 'general': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
};

export default function AiInsightsPanel() {
  const { data: insights, isLoading, error } = useQuery({
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
              <div key={insight.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg shadow-sm">
                <div className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mt-1 ${getInsightColor(insight.type)}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">
                      {insight.title}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">
                      {insight.content}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-blue-600 dark:text-blue-400 text-xs font-medium mt-2 p-0 h-auto hover:underline"
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
            <Bot className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No insights available</p>
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
