import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, Calendar, Users, Brain, AlertCircle, CheckCircle,
  Info, X, Archive, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: 'appointment' | 'client' | 'insight' | 'system' | 'success' | 'warning' | 'error';
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'appointment',
      title: 'Upcoming Appointment',
      description: 'Session with John Doe starts in 30 minutes',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      read: false,
      actionUrl: '/appointments',
      actionLabel: 'View'
    },
    {
      id: '2',
      type: 'insight',
      title: 'New AI Insight Available',
      description: 'Treatment recommendations generated for Sarah Smith',
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      read: false,
      actionUrl: '/insights',
      actionLabel: 'Review'
    },
    {
      id: '3',
      type: 'success',
      title: 'Calendar Synced',
      description: 'Successfully synced 5 appointments from Google Calendar',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: true
    },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'appointment': return Calendar;
      case 'client': return Users;
      case 'insight': return Brain;
      case 'success': return CheckCircle;
      case 'warning': return AlertCircle;
      case 'error': return AlertCircle;
      default: return Info;
    }
  };

  const getIconColor = (type: Notification['type']) => {
    switch (type) {
      case 'appointment': return 'text-blue-500';
      case 'client': return 'text-purple-500';
      case 'insight': return 'text-indigo-500';
      case 'success': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </SheetTitle>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Bell className="h-12 w-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium">No notifications</p>
              <p className="text-sm">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map(notification => {
                const Icon = getIcon(notification.type);

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 rounded-lg border transition-colors",
                      !notification.read && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                    )}
                  >
                    <div className="flex gap-3">
                      <div className={cn("mt-1", getIconColor(notification.type))}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">
                              {notification.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {notification.description}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          {notification.actionUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Navigate to action URL
                                window.location.href = notification.actionUrl!;
                                onClose();
                              }}
                            >
                              {notification.actionLabel || 'View'}
                            </Button>
                          )}
                          {!notification.read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsRead(notification.id)}
                            >
                              Mark as read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}