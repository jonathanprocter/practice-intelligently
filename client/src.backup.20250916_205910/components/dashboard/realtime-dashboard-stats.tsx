// components/dashboard/realtime-dashboard-stats.tsx
import { useQuery } from "@tanstack/react-query";
import { ApiClient, type DashboardStats } from "@/lib/api";
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Calendar, CheckCircle, TrendingUp, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Badge } from "@/components/ui/badge";

interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ReactNode;
  trend?: number;
  isLoading?: boolean;
  isLive?: boolean;
}

const StatCard = ({ title, value, description, icon, trend, isLoading, isLive }: StatCardProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("relative overflow-hidden", isLive && "ring-2 ring-green-500/20")}>
      {isLive && (
        <div className="absolute top-2 right-2">
          <div className="flex items-center gap-1">
            <Activity className="h-3 w-3 text-green-500 animate-pulse" />
            <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
              Live
            </Badge>
          </div>
        </div>
      )}
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend !== undefined && (
          <div className={cn(
            "text-xs mt-2 flex items-center",
            trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-gray-500"
          )}>
            <TrendingUp className={cn("h-3 w-3 mr-1", trend < 0 && "rotate-180")} />
            {Math.abs(trend)}% from last week
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const RealtimeDashboardStats = () => {
  const therapistId = ApiClient.getTherapistId();
  const { isConnected } = useWebSocket();

  // Main stats query
  const { data: stats, isLoading, error, refetch } = useQuery<DashboardStats>({
    queryKey: [`/api/dashboard/stats/${therapistId}`],
    queryFn: () => ApiClient.getDashboardStats(),
    refetchInterval: isConnected ? false : 60000, // Only poll if not connected to WebSocket
    staleTime: 30000,
  });

  // Setup real-time updates for dashboard stats
  useRealtimeUpdates('appointments', {
    invalidateQueries: [`/api/dashboard/stats/${therapistId}`]
  });
  
  useRealtimeUpdates('session-notes', {
    invalidateQueries: [`/api/dashboard/stats/${therapistId}`]
  });
  
  useRealtimeUpdates('action-items', {
    invalidateQueries: [`/api/dashboard/stats/${therapistId}`]
  });
  
  useRealtimeUpdates('clients', {
    invalidateQueries: [`/api/dashboard/stats/${therapistId}`]
  });

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="col-span-full">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              Failed to load dashboard statistics. Please refresh the page.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection status banner */}
      {isConnected && (
        <div className="flex items-center justify-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg p-2">
          <Activity className="h-3 w-3 animate-pulse" />
          Real-time updates active - Dashboard refreshes automatically
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sessions"
          value={stats?.todaysSessions || 0}
          description="Scheduled appointments"
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
          isLive={isConnected}
        />
        
        <StatCard
          title="Active Clients"
          value={stats?.activeClients || 0}
          description="Currently in treatment"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
          isLive={isConnected}
        />
        
        <StatCard
          title="Urgent Items"
          value={stats?.urgentActionItems || 0}
          description="Requiring attention"
          icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
          isLoading={isLoading}
          isLive={isConnected}
        />
        
        <StatCard
          title="Completion Rate"
          value={`${stats?.completionRate || 0}%`}
          description="This week's progress"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          trend={5}
          isLoading={isLoading}
          isLive={isConnected}
        />
      </div>

      {/* Additional real-time metrics */}
      {isConnected && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-xs text-muted-foreground">Calendar Synced</div>
            <div className="text-sm font-medium">
              {stats.calendarIntegrated ? 'Yes' : 'No'}
            </div>
          </div>
          
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-xs text-muted-foreground">Calendar Events</div>
            <div className="text-sm font-medium">{stats.calendarEvents || 0}</div>
          </div>
          
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-xs text-muted-foreground">Last Update</div>
            <div className="text-sm font-medium">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
          
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-xs text-muted-foreground">Connection</div>
            <div className="text-sm font-medium text-green-600">Live</div>
          </div>
        </div>
      )}
    </div>
  );
};