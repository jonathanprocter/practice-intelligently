
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Database, 
  Cloud, 
  RefreshCw, 
  Zap,
  Signal,
  Wifi
} from 'lucide-react';

interface LiveDataIndicatorProps {
  currentSource: 'database' | 'live';
  onSourceChange: (source: 'database' | 'live') => void;
  isLoading?: boolean;
  lastUpdate?: string;
  eventCount?: number;
}

export default function LiveDataIndicator({ 
  currentSource, 
  onSourceChange, 
  isLoading = false, 
  lastUpdate,
  eventCount = 0 
}: LiveDataIndicatorProps) {
  const [pulseCount, setPulseCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'offline'>('connected');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentSource === 'live' && !isLoading) {
      interval = setInterval(() => {
        setPulseCount(prev => prev + 1);
      }, 2000); // Pulse every 2 seconds to show live activity
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentSource, isLoading]);

  // Simulate connection status monitoring
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/auth/google/status');
        if (response.ok) {
          const data = await response.json();
          setConnectionStatus(data.connected ? 'connected' : 'offline');
        } else {
          setConnectionStatus('offline');
        }
      } catch {
        setConnectionStatus('offline');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const getSourceIcon = () => {
    if (currentSource === 'database') {
      return <Database className="w-4 h-4" />;
    }
    
    if (isLoading) {
      return <RefreshCw className="w-4 h-4 animate-spin" />;
    }
    
    return (
      <div className="relative">
        <Cloud className="w-4 h-4" />
        {currentSource === 'live' && connectionStatus === 'connected' && (
          <div 
            key={pulseCount} 
            className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping"
          />
        )}
      </div>
    );
  };

  const getStatusColor = () => {
    if (currentSource === 'database') return 'bg-blue-500';
    if (connectionStatus === 'connected') return 'bg-green-500';
    if (connectionStatus === 'connecting') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSourceLabel = () => {
    if (currentSource === 'database') return 'Database Cache';
    if (connectionStatus === 'offline') return 'Live API (Offline)';
    if (isLoading) return 'Live API (Loading...)';
    return 'Live API (Connected)';
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-center gap-2">
        <div className="relative">
          {getSourceIcon()}
          <div className={`absolute -bottom-1 -right-1 w-2 h-2 ${getStatusColor()} rounded-full`} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{getSourceLabel()}</span>
          {lastUpdate && (
            <span className="text-xs text-gray-500">Updated: {lastUpdate}</span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 ml-auto">
        {eventCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {eventCount} events
          </Badge>
        )}
        
        <div className="flex items-center gap-1">
          <Button
            variant={currentSource === 'database' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSourceChange('database')}
            disabled={isLoading}
            className="text-xs px-2 py-1"
          >
            <Database className="w-3 h-3 mr-1" />
            Cache
          </Button>
          
          <Button
            variant={currentSource === 'live' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSourceChange('live')}
            disabled={isLoading || connectionStatus === 'offline'}
            className="text-xs px-2 py-1"
          >
            <Cloud className="w-3 h-3 mr-1" />
            Live
          </Button>
        </div>
      </div>
      
      {/* Connection strength indicator */}
      {currentSource === 'live' && (
        <div className="flex items-center gap-1">
          {connectionStatus === 'connected' ? (
            <Signal className="w-4 h-4 text-green-500" />
          ) : connectionStatus === 'connecting' ? (
            <Wifi className="w-4 h-4 text-yellow-500 animate-pulse" />
          ) : (
            <Signal className="w-4 h-4 text-red-500" />
          )}
        </div>
      )}
    </div>
  );
}
