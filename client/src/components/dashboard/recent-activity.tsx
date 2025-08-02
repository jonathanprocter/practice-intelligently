import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api";
import { FileText, Bot, Calendar, CheckCircle, RefreshCw, AlertCircle } from "lucide-react";

interface Activity {
  id: string;
  type: 'session' | 'ai_analysis' | 'appointment' | 'goal' | 'sync' | 'other';
  title: string;
  description: string;
  timestamp: string;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'session': return FileText;
    case 'ai_analysis': return Bot;
    case 'appointment': return Calendar;
    case 'goal': return CheckCircle;
    case 'sync': return RefreshCw;
    default: return AlertCircle;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'session': return 'bg-therapy-success/10 text-therapy-success';
    case 'ai_analysis': return 'bg-therapy-primary/10 text-therapy-primary';
    case 'appointment': return 'bg-therapy-warning/10 text-therapy-warning';
    case 'goal': return 'bg-therapy-success/10 text-therapy-success';
    case 'sync': return 'bg-therapy-primary/10 text-therapy-primary';
    default: return 'bg-therapy-text/10 text-therapy-text';
  }
};

export default function RecentActivity() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: ApiClient.getRecentActivity,
  });

  if (isLoading) {
    return (
      <div className="therapy-card">
        <div className="p-6 border-b border-therapy-border">
          <h3 className="text-xl font-bold text-therapy-text">Recent Activity</h3>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start space-x-4 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
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
        <h3 className="text-xl font-bold text-therapy-text">Recent Activity</h3>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {activities && activities.length > 0 ? (
            activities.slice(0, 5).map((activity: Activity) => {
              const IconComponent = getActivityIcon(activity.type);
              return (
                <div key={activity.id} className="flex items-start space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getActivityColor(activity.type)}`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-therapy-text">
                      {activity.title}
                    </p>
                    <p className="text-sm text-therapy-text/60">
                      {activity.description}
                    </p>
                    <p className="text-xs text-therapy-text/40 mt-1">
                      {activity.timestamp}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-therapy-text/30 mx-auto mb-4" />
              <p className="text-therapy-text/60">No recent activity found</p>
              <p className="text-therapy-text/40 text-sm">Activity will appear here as you use the system</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}