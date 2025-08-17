
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  Calendar, 
  Database, 
  Cloud, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Zap,
  Activity
} from 'lucide-react';

interface SyncStatus {
  isActive: boolean;
  currentStep: string;
  progress: number;
  lastSync: string;
  eventsCount: number;
  calendarsCount: number;
  source: 'database' | 'live';
  error?: string;
}

interface CalendarActivity {
  timestamp: string;
  action: string;
  calendar: string;
  count: number;
  status: 'success' | 'error' | 'progress';
}

export default function CalendarSyncStatusIndicator() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isActive: false,
    currentStep: 'Ready',
    progress: 0,
    lastSync: '',
    eventsCount: 0,
    calendarsCount: 0,
    source: 'database'
  });

  const [activities, setActivities] = useState<CalendarActivity[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  const addActivity = (activity: Omit<CalendarActivity, 'timestamp'>) => {
    const newActivity: CalendarActivity = {
      ...activity,
      timestamp: new Date().toLocaleTimeString()
    };
    setActivities(prev => [newActivity, ...prev.slice(0, 9)]); // Keep last 10 activities
  };

  // Monitor sync status from API calls
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const url = args[0] as string;
      
      // Monitor calendar sync endpoint
      if (url.includes('/api/calendar/sync')) {
        if (response.ok) {
          setSyncStatus(prev => ({ ...prev, isActive: true, currentStep: 'Syncing calendars...', progress: 10 }));
          addActivity({
            action: 'Sync started',
            calendar: 'All calendars',
            count: 0,
            status: 'progress'
          });
        }
      }
      
      // Monitor calendar events endpoint
      if (url.includes('/api/calendar/events')) {
        const data = await response.clone().json();
        if (Array.isArray(data)) {
          addActivity({
            action: 'Events fetched',
            calendar: url.includes('local') ? 'Database' : 'Live API',
            count: data.length,
            status: 'success'
          });
          
          setSyncStatus(prev => ({
            ...prev,
            eventsCount: data.length,
            source: url.includes('local') ? 'database' : 'live',
            lastSync: new Date().toLocaleString()
          }));
        }
      }
      
      // Monitor calendars list endpoint
      if (url.includes('/api/calendar/calendars')) {
        const data = await response.clone().json();
        if (Array.isArray(data)) {
          addActivity({
            action: 'Calendars loaded',
            calendar: 'Google Calendar',
            count: data.length,
            status: 'success'
          });
          
          setSyncStatus(prev => ({
            ...prev,
            calendarsCount: data.length
          }));
        }
      }
      
      return response;
    };
    
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Listen for sync completion messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'Calendar sync complete!') {
        setSyncStatus(prev => ({
          ...prev,
          isActive: false,
          currentStep: 'Sync complete',
          progress: 100,
          lastSync: new Date().toLocaleString()
        }));
        
        addActivity({
          action: 'Sync completed',
          calendar: 'All calendars',
          count: 0,
          status: 'success'
        });
        
        // Reset progress after 3 seconds
        setTimeout(() => {
          setSyncStatus(prev => ({ ...prev, progress: 0, currentStep: 'Ready' }));
        }, 3000);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const triggerManualSync = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isActive: true, currentStep: 'Starting sync...', progress: 5 }));
      
      const response = await fetch('/api/calendar/sync', { method: 'POST' });
      const result = await response.json();
      
      if (response.ok) {
        addActivity({
          action: 'Manual sync triggered',
          calendar: 'All calendars',
          count: result.totalSynced || 0,
          status: 'success'
        });
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (error) {
      setSyncStatus(prev => ({ ...prev, isActive: false, currentStep: 'Sync failed', error: error.message }));
      addActivity({
        action: 'Sync failed',
        calendar: 'Error',
        count: 0,
        status: 'error'
      });
    }
  };

  const getStatusIcon = () => {
    if (syncStatus.isActive) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (syncStatus.error) return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getSourceIcon = () => {
    return syncStatus.source === 'database' ? 
      <Database className="w-4 h-4 text-blue-500" /> : 
      <Cloud className="w-4 h-4 text-green-500" />;
  };

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <Activity className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 z-50 shadow-lg border-2">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="font-semibold">Calendar Sync Status</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={triggerManualSync}
              disabled={syncStatus.isActive}
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus.isActive ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
            >
              ×
            </Button>
          </div>
        </div>
        
        {/* Current Status */}
        <div className="flex items-center gap-2 mb-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{syncStatus.currentStep}</span>
          <Badge variant={syncStatus.source === 'live' ? 'default' : 'secondary'} className="ml-auto">
            {getSourceIcon()}
            {syncStatus.source === 'live' ? 'Live API' : 'Database'}
          </Badge>
        </div>
        
        {/* Progress Bar */}
        {syncStatus.isActive && (
          <Progress value={syncStatus.progress} className="mb-3" />
        )}
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{syncStatus.calendarsCount} calendars</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>{syncStatus.eventsCount} events</span>
          </div>
        </div>
        
        {/* Last Sync */}
        {syncStatus.lastSync && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
            <Clock className="w-3 h-3" />
            <span>Last sync: {syncStatus.lastSync}</span>
          </div>
        )}
        
        {/* Error Display */}
        {syncStatus.error && (
          <div className="text-xs text-red-600 mb-3 p-2 bg-red-50 rounded">
            {syncStatus.error}
          </div>
        )}
        
        {/* Recent Activity Log */}
        <div className="border-t pt-2">
          <div className="text-xs font-medium mb-2">Recent Activity:</div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {activities.length === 0 ? (
              <div className="text-xs text-gray-400">No recent activity</div>
            ) : (
              activities.map((activity, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === 'success' ? 'bg-green-500' :
                      activity.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <span className="font-medium">{activity.action}</span>
                    <span className="text-gray-500">({activity.calendar})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {activity.count > 0 && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {activity.count}
                      </Badge>
                    )}
                    <span className="text-gray-400">{activity.timestamp}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
