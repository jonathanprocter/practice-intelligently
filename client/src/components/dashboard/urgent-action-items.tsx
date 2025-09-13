import { ApiClient, type ActionItem } from "@/lib/api";
import { AlertTriangle, Clock, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUrgentActionItems } from "@/hooks/useUrgentActionItems";

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'high': return AlertTriangle;
    case 'medium': return Clock;
    default: return FileText;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-red-100 border-red-200 text-red-800';
    case 'medium': return 'bg-yellow-100 border-yellow-200 text-yellow-800';
    default: return 'bg-blue-100 border-blue-200 text-blue-800';
  }
};

const getBadgeColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-therapy-error/10 text-therapy-error';
    case 'medium': return 'bg-therapy-warning/10 text-therapy-warning';
    default: return 'bg-therapy-primary/10 text-therapy-primary';
  }
};

export default function UrgentActionItems() {
  const { actionItems, isLoading } = useUrgentActionItems();

  const formatDueDate = (dateString?: string) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Due: Today';
    if (diffDays === 1) return 'Due: Tomorrow';
    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`;
    return `Due: ${date.toLocaleDateString()}`;
  };

  if (isLoading) {
    return (
      <div className="therapy-card">
        <div className="p-6 border-b border-therapy-border">
          <h3 className="text-xl font-bold text-therapy-text">Urgent Action Items</h3>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 border rounded-lg animate-pulse">
              <div className="flex items-start space-x-4">
                <div className="w-6 h-6 bg-gray-200 rounded-lg"></div>
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
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-therapy-text">Urgent Action Items</h3>
          <Badge className="bg-therapy-error text-white">
            {actionItems?.length || 0} urgent
          </Badge>
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        {actionItems && actionItems.length > 0 ? (
          actionItems.slice(0, 3).map((item) => {
            const IconComponent = getPriorityIcon(item.priority);
            return (
              <div 
                key={item.id} 
                className={`flex items-start space-x-4 p-4 border rounded-lg ${getPriorityColor(item.priority)}`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center mt-1 ${
                  item.priority === 'high' ? 'bg-red-200' : 
                  item.priority === 'medium' ? 'bg-yellow-200' : 'bg-blue-200'
                }`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">
                    {item.title}
                  </h4>
                  {item.description && (
                    <p className="text-xs mb-2 opacity-80">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-2">
                    <Badge className={getBadgeColor(item.priority)}>
                      {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)} Priority
                    </Badge>
                    <span className="text-xs opacity-70">
                      {formatDueDate(item.dueDate)}
                    </span>
                  </div>
                </div>
                <Button 
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8 hover:bg-white/50"
                  onClick={() => {
                    // Handle completion
                    ApiClient.updateActionItem(item.id, { status: 'completed' });
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <Check className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-therapy-text/60">No urgent action items</p>
            <p className="text-therapy-text/40 text-sm">Great job staying on top of things!</p>
          </div>
        )}
      </div>
    </div>
  );
}
