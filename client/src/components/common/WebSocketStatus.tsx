// components/common/WebSocketStatus.tsx
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export const WebSocketStatus = () => {
  const { isConnected, connectionStatus } = useWebSocket();

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-3 w-3" />;
      case 'connecting':
      case 'reconnecting':
        return <RefreshCw className="h-3 w-3 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="h-3 w-3" />;
      default:
        return <WifiOff className="h-3 w-3" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Live';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const getStatusVariant = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'default';
      case 'connecting':
      case 'reconnecting':
        return 'secondary';
      case 'disconnected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Badge 
      variant={getStatusVariant() as any}
      className={cn(
        "flex items-center gap-1 text-xs",
        isConnected && "bg-green-100 text-green-800 border-green-200",
        !isConnected && connectionStatus !== 'connecting' && connectionStatus !== 'reconnecting' && 
        "bg-red-100 text-red-800 border-red-200"
      )}
      data-testid="websocket-status"
    >
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </Badge>
  );
};