// components/dashboard/quick-actions-panel.tsx
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Upload, Users, Calendar, FileText, 
  CheckSquare, MessageSquare, Settings, 
  TrendingUp, Brain, Clock, ArrowRight 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  color: string;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
  variant?: "default" | "primary" | "secondary";
}

export default function QuickActionsPanel() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Fetch action items count with error handling
  const { data: actionItems = 0 } = useQuery({
    queryKey: ['action-items-count'],
    queryFn: async () => {
      try {
        const items = await ApiClient.getUrgentActionItems();
        return Array.isArray(items) ? items.length : 0;
      } catch (error) {
        console.error('Error fetching action items count:', error);
        return 0;
      }
    },
    refetchInterval: 60000,
  });

  // Quick action handlers
  const handleNewAppointment = () => {
    window.location.href = '/appointments?action=new';
  };

  const handleUploadDocument = () => {
    window.location.href = '/smart-documents?action=upload';
  };

  const handleViewClients = () => {
    window.location.href = '/clients';
  };

  const handleViewCalendar = () => {
    window.location.href = '/calendar';
  };

  const handleCreateNote = () => {
    window.location.href = '/session-notes?action=new';
  };

  const handleViewTasks = () => {
    window.location.href = '/action-items';
  };

  const handleAIInsights = () => {
    window.location.href = '/ai-insights';
  };

  const handleAnalytics = () => {
    window.location.href = '/analytics';
  };

  const handleQuickSync = async () => {
    setIsProcessing('sync');
    try {
      // This would trigger a calendar sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Calendar synced",
        description: "Your calendar has been synchronized successfully.",
      });
    } catch (error) {
      toast({
        title: "Sync failed",
        description: "Failed to sync calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const primaryActions: QuickAction[] = [
    {
      id: 'new-appointment',
      label: 'New Appointment',
      description: 'Schedule a client session',
      icon: Calendar,
      color: 'bg-therapy-primary',
      onClick: handleNewAppointment,
      variant: 'primary',
    },
    {
      id: 'upload-document',
      label: 'Upload Document',
      description: 'Add progress notes or forms',
      icon: Upload,
      color: 'bg-therapy-secondary',
      onClick: handleUploadDocument,
      variant: 'secondary',
    },
    {
      id: 'create-note',
      label: 'Session Note',
      description: 'Write a new session note',
      icon: FileText,
      color: 'bg-therapy-accent',
      onClick: handleCreateNote,
      variant: 'secondary',
    },
  ];

  const secondaryActions: QuickAction[] = [
    {
      id: 'view-clients',
      label: 'All Clients',
      icon: Users,
      color: 'bg-therapy-info',
      href: '/clients',
    },
    {
      id: 'view-calendar',
      label: 'Calendar',
      icon: Calendar,
      color: 'bg-therapy-warning',
      href: '/calendar',
    },
    {
      id: 'action-items',
      label: 'Tasks',
      icon: CheckSquare,
      color: 'bg-therapy-success',
      href: '/action-items',
      badge: actionItems,
    },
    {
      id: 'ai-insights',
      label: 'AI Insights',
      icon: Brain,
      color: 'bg-therapy-primary',
      href: '/ai-insights',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: TrendingUp,
      color: 'bg-therapy-secondary',
      href: '/analytics',
    },
    {
      id: 'quick-sync',
      label: 'Sync',
      icon: Clock,
      color: 'bg-therapy-accent',
      onClick: handleQuickSync,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Primary Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {primaryActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                className="w-full justify-start"
                variant={action.variant as any || "outline"}
                onClick={action.onClick}
                disabled={isProcessing === action.id}
                data-testid={`quick-action-${action.id}`}
              >
                <div className={cn("p-1.5 rounded-md mr-3", action.color)}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{action.label}</p>
                  {action.description && (
                    <p className="text-xs opacity-70">{action.description}</p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Secondary Actions Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Navigate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {secondaryActions.map((action) => {
              const Icon = action.icon;
              const isProcessingThis = isProcessing === action.id;
              
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  className="h-auto py-3 px-2 flex-col relative"
                  onClick={action.onClick || (() => action.href && (window.location.href = action.href))}
                  disabled={isProcessingThis}
                  data-testid={`nav-action-${action.id}`}
                >
                  {action.badge !== undefined && action.badge > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1"
                    >
                      {action.badge}
                    </Badge>
                  )}
                  <div className={cn("p-2 rounded-lg mb-1", action.color, "bg-opacity-10")}>
                    <Icon className={cn("h-5 w-5", action.color.replace('bg-', 'text-'))} />
                  </div>
                  <span className="text-xs font-medium">{action.label}</span>
                  {isProcessingThis && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-md">
                      <Clock className="h-4 w-4 animate-spin" />
                    </div>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Today's Priority */}
      <Card className="bg-therapy-primary/5 border-therapy-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-therapy-primary/10 rounded-lg">
              <MessageSquare className="h-4 w-4 text-therapy-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-therapy-text mb-1">
                Today's Focus
              </p>
              <p className="text-xs text-therapy-text/70">
                You have {actionItems || 0} pending tasks and 3 sessions scheduled. 
                Consider reviewing session notes from yesterday.
              </p>
              <Button 
                size="sm" 
                variant="link" 
                className="h-auto p-0 mt-2 text-therapy-primary"
                onClick={handleViewTasks}
              >
                View all tasks
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}