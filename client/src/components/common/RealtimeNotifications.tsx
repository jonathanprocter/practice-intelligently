// components/common/RealtimeNotifications.tsx
import { useEffect, useState } from 'react';
import { useWebSocketEvent } from '@/contexts/WebSocketContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Bell, Calendar, FileText, Users, Brain, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

interface Notification {
  id: string;
  type: 'appointment' | 'session-note' | 'client' | 'ai' | 'calendar' | 'system';
  title: string;
  description: string;
  timestamp: Date;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const RealtimeNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper to add notification
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 10)); // Keep max 10
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 10000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Subscribe to WebSocket events
  useWebSocketEvent('appointment:created', (data) => {
    addNotification({
      type: 'appointment',
      title: 'New Appointment',
      description: `Appointment created for ${data.clientName || 'a client'}`,
      action: {
        label: 'View',
        onClick: () => window.location.href = '/appointments'
      }
    });
  });

  useWebSocketEvent('session-note:created', (data) => {
    addNotification({
      type: 'session-note',
      title: 'New Session Note',
      description: `Session note added for ${data.clientName || 'a client'}`,
      action: {
        label: 'View',
        onClick: () => window.location.href = '/session-notes'
      }
    });
  });

  useWebSocketEvent('ai:insight-generated', (data) => {
    addNotification({
      type: 'ai',
      title: 'AI Insight Available',
      description: data.title || 'New insight has been generated',
      action: {
        label: 'View',
        onClick: () => window.location.href = '/ai-insights'
      }
    });
  });

  useWebSocketEvent('calendar:sync-completed', (data) => {
    addNotification({
      type: 'calendar',
      title: 'Calendar Synced',
      description: `${data.appointmentsUpdated || 0} appointments synchronized`
    });
  });

  useWebSocketEvent('document:processing-completed', (data) => {
    addNotification({
      type: 'session-note',
      title: 'Document Processed',
      description: 'Document analysis complete and notes created'
    });
  });

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-4 w-4" />;
      case 'session-note':
        return <FileText className="h-4 w-4" />;
      case 'client':
        return <Users className="h-4 w-4" />;
      case 'ai':
        return <Brain className="h-4 w-4" />;
      case 'calendar':
        return <Calendar className="h-4 w-4" />;
      case 'system':
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm" data-testid="realtime-notifications">
      {/* Notification badge/toggle */}
      <div className="flex justify-end mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {notifications.length}
            </span>
          )}
        </Button>
      </div>

      {/* Notifications list */}
      <AnimatePresence>
        {isExpanded && notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Alert className={cn(
              "relative pr-10 shadow-lg",
              notification.type === 'ai' && "border-purple-200 bg-purple-50",
              notification.type === 'appointment' && "border-blue-200 bg-blue-50",
              notification.type === 'session-note' && "border-green-200 bg-green-50",
              notification.type === 'calendar' && "border-yellow-200 bg-yellow-50"
            )}>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => removeNotification(notification.id)}
                data-testid={`close-notification-${notification.id}`}
              >
                <X className="h-3 w-3" />
              </Button>
              
              <div className="flex items-start gap-3">
                {getIcon(notification.type)}
                <div className="flex-1">
                  <AlertTitle className="text-sm font-medium">
                    {notification.title}
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    {notification.description}
                  </AlertDescription>
                  
                  {notification.action && (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-xs mt-2"
                      onClick={notification.action.onClick}
                    >
                      {notification.action.label} →
                    </Button>
                  )}
                  
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </Alert>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};