// Optimized dashboard with memoization and lazy loading
import { memo, useMemo, useCallback, Suspense, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

// Lazy load heavy components
const TodaysSchedule = lazy(() => import('@/components/dashboard/todays-schedule-enhanced'));
const AiInsightsPanel = lazy(() => import('@/components/dashboard/ai-insights-panel'));
const UrgentActionItems = lazy(() => import('@/components/dashboard/urgent-action-items'));
const RecentActivity = lazy(() => import('@/components/dashboard/recent-activity'));

// Memoized stats card component
const StatsCard = memo(({ 
  title, 
  value, 
  icon: Icon, 
  trend 
}: { 
  title: string; 
  value: number | string; 
  icon: any;
  trend?: { value: number; isUp: boolean };
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className={`text-xs ${trend.isUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isUp ? '↑' : '↓'} {trend.value}%
          </p>
        )}
      </CardContent>
    </Card>
  );
});
StatsCard.displayName = 'StatsCard';

// Loading skeleton for lazy components
const ComponentSkeleton = memo(() => (
  <Card className="p-6">
    <Skeleton className="h-6 w-40 mb-4" />
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-12 w-12 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  </Card>
));
ComponentSkeleton.displayName = 'ComponentSkeleton';

// Main optimized dashboard component
const OptimizedDashboard = memo(() => {
  const therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';
  
  // Fetch dashboard stats with caching
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats', therapistId],
    queryFn: () => ApiClient.getDashboardStats(),
    staleTime: 60 * 1000, // Consider fresh for 1 minute
    cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 60 * 1000, // Auto-refetch every minute
  });
  
  // Memoize computed values
  const completionTrend = useMemo(() => {
    if (!stats) return null;
    // Mock trend data - in real app, compare with previous period
    return {
      value: 5,
      isUp: stats.completionRate > 75
    };
  }, [stats]);
  
  // Memoized refresh handler
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </Card>
          ))}
        </div>
        <ComponentSkeleton />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      
      {/* Stats Grid - Always visible for quick info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Today's Sessions"
          value={stats?.todaysSessions || 0}
          icon={() => <div />}
        />
        <StatsCard
          title="Active Clients"
          value={stats?.activeClients || 0}
          icon={() => <div />}
        />
        <StatsCard
          title="Urgent Items"
          value={stats?.urgentActionItems || 0}
          icon={() => <div />}
        />
        <StatsCard
          title="Completion Rate"
          value={`${stats?.completionRate || 0}%`}
          icon={() => <div />}
          trend={completionTrend}
        />
      </div>
      
      {/* Main Content Grid - Lazy loaded */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<ComponentSkeleton />}>
          <TodaysSchedule />
        </Suspense>
        
        <Suspense fallback={<ComponentSkeleton />}>
          <UrgentActionItems />
        </Suspense>
      </div>
      
      {/* Secondary Content - Lazy loaded */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<ComponentSkeleton />}>
          <AiInsightsPanel />
        </Suspense>
        
        <Suspense fallback={<ComponentSkeleton />}>
          <RecentActivity />
        </Suspense>
      </div>
    </div>
  );
});

OptimizedDashboard.displayName = 'OptimizedDashboard';

export default OptimizedDashboard;