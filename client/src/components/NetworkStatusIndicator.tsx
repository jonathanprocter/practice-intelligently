import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showWarningToast, showSuccessToast } from '@/lib/errorUtils';

export interface NetworkStatus {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export function NetworkStatusIndicator() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    online: navigator.onLine
  });
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Update network information
    const updateNetworkInfo = () => {
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;
      
      setNetworkStatus({
        online: navigator.onLine,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
        saveData: connection?.saveData
      });
    };

    // Handle online event
    const handleOnline = () => {
      updateNetworkInfo();
      setIsReconnecting(false);
      
      if (wasOffline) {
        showSuccessToast('Connection restored', 'You are back online');
        setWasOffline(false);
        
        // Hide the indicator after showing success
        setTimeout(() => {
          setShowStatus(false);
        }, 3000);
      }
    };

    // Handle offline event
    const handleOffline = () => {
      updateNetworkInfo();
      setShowStatus(true);
      setWasOffline(true);
      showWarningToast('Connection lost', 'You are currently offline');
    };

    // Handle connection change
    const handleConnectionChange = () => {
      updateNetworkInfo();
      
      const connection = (navigator as any).connection;
      if (connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g') {
        setShowStatus(true);
      }
    };

    // Initial check
    updateNetworkInfo();
    if (!navigator.onLine) {
      setShowStatus(true);
      setWasOffline(true);
    }

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Check connection periodically when offline
    let intervalId: NodeJS.Timeout | null = null;
    if (!networkStatus.online) {
      intervalId = setInterval(() => {
        if (navigator.onLine) {
          handleOnline();
        }
      }, 5000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
      
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [networkStatus.online, wasOffline]);

  // Don't show indicator if online and connection is good
  if (!showStatus && networkStatus.online && networkStatus.effectiveType !== '2g' && networkStatus.effectiveType !== 'slow-2g') {
    return null;
  }

  const getStatusMessage = () => {
    if (!networkStatus.online) {
      return 'No internet connection';
    }
    if (isReconnecting) {
      return 'Reconnecting...';
    }
    if (networkStatus.effectiveType === '2g' || networkStatus.effectiveType === 'slow-2g') {
      return 'Slow connection detected';
    }
    return 'Connected';
  };

  const getStatusIcon = () => {
    if (!networkStatus.online) {
      return <WifiOff className="h-4 w-4" />;
    }
    if (isReconnecting) {
      return <AlertCircle className="h-4 w-4 animate-pulse" />;
    }
    if (networkStatus.effectiveType === '2g' || networkStatus.effectiveType === 'slow-2g') {
      return <AlertCircle className="h-4 w-4" />;
    }
    return <Wifi className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    if (!networkStatus.online) {
      return 'bg-red-500 text-white';
    }
    if (isReconnecting) {
      return 'bg-yellow-500 text-white';
    }
    if (networkStatus.effectiveType === '2g' || networkStatus.effectiveType === 'slow-2g') {
      return 'bg-yellow-500 text-white';
    }
    return 'bg-green-500 text-white';
  };

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-md shadow-lg transition-all duration-300',
        getStatusColor(),
        showStatus ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      )}
      data-testid="network-status-indicator"
    >
      {getStatusIcon()}
      <span className="text-sm font-medium">{getStatusMessage()}</span>
      {networkStatus.effectiveType && networkStatus.online && (
        <span className="text-xs opacity-75">({networkStatus.effectiveType})</span>
      )}
    </div>
  );
}

// Hook to use network status in components
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    const checkConnectionSpeed = () => {
      const connection = (navigator as any).connection;
      if (connection) {
        setIsSlowConnection(
          connection.effectiveType === '2g' || 
          connection.effectiveType === 'slow-2g' ||
          connection.rtt > 500 // High latency
        );
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', checkConnectionSpeed);
      checkConnectionSpeed();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', checkConnectionSpeed);
      }
    };
  }, []);

  return { isOnline, isSlowConnection };
}