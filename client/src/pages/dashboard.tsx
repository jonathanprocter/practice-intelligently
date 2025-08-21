// pages/dashboard.tsx
import { useQuery, useQueries } from "@tanstack/react-query";
import { ApiClient, type DashboardStats } from "@/lib/api";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Suspense, lazy, useState, useEffect, useMemo } from "react";
import { RefreshCw, Settings, LayoutGrid, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Import core components directly (high priority)
import QuickStats from "@/components/dashboard/quick-stats";
import ApiStatusIndicators from "@/components/dashboard/api-status-indicators";

// Lazy load heavy/secondary components
const TodaysSchedule = lazy(() => import("@/components/dashboard/todays-schedule"));
const AiInsightsPanel = lazy(() => import("@/components/dashboard/ai-insights-panel"));
const UrgentActionItems = lazy(() => import("@/components/dashboard/urgent-action-items"));
const TodaysSessions = lazy(() => import("@/components/dashboard/todays-sessions"));
const RecentActivity = lazy(() => import("@/components/dashboard/recent-activity"));
const ProgressOverview = lazy(() => import("@/components/dashboard/progress-overview"));
const SessionDocumentUploader = lazy(() => import("@/components/SessionDocumentUploader").then(
  module => ({ default: module.SessionDocumentUploader })
));

// Dashboard configuration
const DASHBOARD_CONFIG = {
  refreshIntervals: {
    stats: 60 * 1000,      // 1 minute
    schedule: 30 * 1000,   // 30 seconds
    insights: 5 * 60 * 1000, // 5 minutes
    actions: 60 * 1000,    // 1 minute
  },
  staleTime: {
    stats: 30 * 1000,      // Consider fresh for 30 seconds
    schedule: 15 * 1000,   // Consider fresh for 15 seconds
    insights: 2 * 60 * 1000, // Consider fresh for 2 minutes
  },
};

// Get therapist ID - temporary solution until auth context is implemented
const getTherapistId = () => {
  // Check localStorage for saved therapist ID
  const savedAuth = localStorage.getItem('therapistId');
  if (savedAuth) return savedAuth;

  // Fallback to demo ID
  return 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';
};

// Loading Skeleton Component
function DashboardSkeleton({ section = 'full' }: { section?: string }) {
  if (section === 'stats') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="therapy-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-gray-200 rounded-lg" />
              <div className="h-4 w-4 bg-gray-200 rounded" />
            </div>
            <div className="h-8 w-24 bg-gray-300 rounded mb-2" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="therapy-card p-6 animate-pulse">
      <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-12 w-12 bg-gray-200 rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 rounded" />
              <div className="h-3 w-1/2 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Dashboard Section Wrapper
function DashboardSection({ 
  children, 
  title, 
  error,
  isLoading,
  onRefresh,
  className,
  collapsible = false,
  defaultCollapsed = false
}: {
  children: React.ReactNode;
  title?: string;
  error?: Error | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  if (error) {
    return (
      <div className={cn("therapy-card p-4 border-red-200 bg-red-50", className)}>
        <div className="flex items-center justify-between mb-2">
          {title && <h3 className="text-sm font-medium text-red-800">{title}</h3>}
          {onRefresh && (
            <Button onClick={onRefresh} variant="ghost" size="sm">
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
        <p className="text-xs text-red-600">Failed to load. Please refresh.</p>
      </div>
    );
  }

  if (collapsible && title) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-therapy-text">{title}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
        </div>
        {!isCollapsed && (isLoading ? <DashboardSkeleton section={title?.toLowerCase()} /> : children)}
      </div>
    );
  }

  if (isLoading) {
    return <DashboardSkeleton section={title?.toLowerCase()} />;
  }

  return <div className={className}>{children}</div>;
}

// Main Dashboard Component
export default function Dashboard() {
  const therapistId = getTherapistId();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardLayout, setDashboardLayout] = useState<'default' | 'compact' | 'expanded'>('default');

  // Main stats query with improved caching
  const statsQuery = useQuery({
    queryKey: ['dashboard-stats', therapistId],
    queryFn: () => ApiClient.getDashboardStats(),
    staleTime: DASHBOARD_CONFIG.staleTime.stats,
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: DASHBOARD_CONFIG.refreshIntervals.stats,
    refetchOnWindowFocus: true,
  });

  // Parallel queries for dashboard sections with optimized settings
  const sectionQueries = useQueries({
    queries: [
      {
        queryKey: ['todays-schedule', therapistId],
        queryFn: ApiClient.getTodaysAppointments,
        staleTime: DASHBOARD_CONFIG.staleTime.schedule,
        refetchInterval: DASHBOARD_CONFIG.refreshIntervals.schedule,
        gcTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['urgent-actions', therapistId],
        queryFn: ApiClient.getUrgentActionItems,
        staleTime: DASHBOARD_CONFIG.staleTime.stats,
        refetchInterval: DASHBOARD_CONFIG.refreshIntervals.actions,
        gcTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['ai-insights', therapistId],
        queryFn: ApiClient.getAiInsights,
        staleTime: DASHBOARD_CONFIG.staleTime.insights,
        refetchInterval: DASHBOARD_CONFIG.refreshIntervals.insights,
        gcTime: 10 * 60 * 1000, // Keep AI insights longer
      },
    ],
  });

  // Calculate dashboard health metrics
  const dashboardHealth = useMemo(() => {
    const loadedSections = sectionQueries.filter(q => !q.isLoading && !q.error).length;
    const totalSections = sectionQueries.length;
    const healthPercentage = (loadedSections / totalSections) * 100;

    return {
      status: healthPercentage === 100 ? 'healthy' : healthPercentage > 50 ? 'partial' : 'degraded',
      percentage: healthPercentage,
      loadedSections,
      totalSections
    };
  }, [sectionQueries]);

  // Manual refresh function
  const handleRefreshDashboard = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        statsQuery.refetch(),
        ...sectionQueries.map(q => q.refetch())
      ]);
      toast({
        title: "Dashboard refreshed",
        description: "All data has been updated",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Some data could not be updated",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load user preferences
  useEffect(() => {
    const savedPreferences = localStorage.getItem('dashboard-preferences');
    if (savedPreferences) {
      try {
        const prefs = JSON.parse(savedPreferences);
        if (prefs.layout) {
          setDashboardLayout(prefs.layout);
        }
      } catch (e) {
        console.error('Failed to load dashboard preferences');
      }
    }
  }, []);

  // Save preferences when layout changes
  useEffect(() => {
    localStorage.setItem('dashboard-preferences', JSON.stringify({
      layout: dashboardLayout
    }));
  }, [dashboardLayout]);

  // Determine grid layout based on preference
  const getGridClass = (section: string) => {
    if (dashboardLayout === 'compact') {
      return section === 'primary' ? 'lg:grid-cols-3' : 'lg:grid-cols-2';
    }
    if (dashboardLayout === 'expanded') {
      return 'lg:grid-cols-1';
    }
    // Default layout
    switch (section) {
      case 'primary': return 'lg:grid-cols-3 xl:grid-cols-4';
      case 'secondary': return 'lg:grid-cols-2';
      case 'tertiary': return 'lg:grid-cols-2';
      default: return 'lg:grid-cols-2';
    }
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="min-h-screen bg-therapy-bg overflow-x-hidden">
      {/* Sticky Header - iPhone Optimized */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-therapy-border header-safe">
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-therapy-text truncate">
                {getGreeting()}
              </h1>
              <p className="text-xs sm:text-sm text-therapy-text/60">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Health Indicator - Hidden on mobile */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  dashboardHealth.status === 'healthy' ? "bg-green-500" :
                  dashboardHealth.status === 'partial' ? "bg-yellow-500" :
                  "bg-red-500"
                )} />
                <span className="text-xs text-gray-600">
                  {dashboardHealth.loadedSections}/{dashboardHealth.totalSections} loaded
                </span>
              </div>

              {/* Layout Toggle - Simplified for mobile */}
              <div className="hidden sm:flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={dashboardLayout === 'compact' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDashboardLayout('compact')}
                  className="px-2 min-h-[36px]"
                  title="Compact view"
                  data-testid="layout-compact"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={dashboardLayout === 'default' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDashboardLayout('default')}
                  className="px-2 min-h-[36px]"
                  data-testid="layout-default"
                >
                  Default
                </Button>
                <Button
                  variant={dashboardLayout === 'expanded' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDashboardLayout('expanded')}
                  className="px-2 min-h-[36px]"
                  data-testid="layout-expanded"
                >
                  Wide
                </Button>
              </div>

              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefreshDashboard}
                disabled={isRefreshing}
                className="min-h-[44px] flex-1 sm:flex-none"
                data-testid="refresh-dashboard"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                <span className="ml-2 hidden sm:inline">Refresh</span>
              </Button>

              <div className="hidden sm:block">
                <ApiStatusIndicators />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - iPhone Optimized */}
      <div className="p-3 sm:p-6 max-w-[1800px] mx-auto space-y-4 sm:space-y-6 safe-area-bottom">
        {/* Primary Section - Always visible */}
        <ErrorBoundary>
          <DashboardSection
            error={statsQuery.error as Error | null}
            isLoading={statsQuery.isLoading}
            onRefresh={() => statsQuery.refetch()}
          >
            <QuickStats stats={statsQuery.data} />
          </DashboardSection>
        </ErrorBoundary>

        {/* Critical Information Row - iPhone Responsive */}
        <div className={cn("grid grid-cols-1 gap-4 sm:gap-6", getGridClass('primary'))}>
          <ErrorBoundary>
            <Suspense fallback={<DashboardSkeleton />}>
              <div className="lg:col-span-2">
                <TodaysSchedule />
              </div>
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary>
            <Suspense fallback={<DashboardSkeleton />}>
              <UrgentActionItems />
            </Suspense>
          </ErrorBoundary>

          {dashboardLayout !== 'compact' && (
            <ErrorBoundary>
              <Suspense fallback={<DashboardSkeleton />}>
                <AiInsightsPanel />
              </Suspense>
            </ErrorBoundary>
          )}
        </div>

        {/* Secondary Information Row */}
        <div className={cn("grid grid-cols-1 gap-6", getGridClass('secondary'))}>
          <ErrorBoundary>
            <Suspense fallback={<DashboardSkeleton />}>
              <TodaysSessions />
            </Suspense>
          </ErrorBoundary>

          {dashboardLayout === 'compact' && (
            <ErrorBoundary>
              <Suspense fallback={<DashboardSkeleton />}>
                <AiInsightsPanel />
              </Suspense>
            </ErrorBoundary>
          )}

          <ErrorBoundary>
            <Suspense fallback={<DashboardSkeleton />}>
              <SessionDocumentUploader therapistId={therapistId} />
            </Suspense>
          </ErrorBoundary>
        </div>

        {/* Tertiary Information - Lower Priority */}
        <DashboardSection
          title="Additional Insights"
          collapsible
          defaultCollapsed={dashboardLayout === 'compact'}
        >
          <div className={cn("grid grid-cols-1 gap-6", getGridClass('tertiary'))}>
            <ErrorBoundary>
              <Suspense fallback={<DashboardSkeleton />}>
                <RecentActivity />
              </Suspense>
            </ErrorBoundary>

            <ErrorBoundary>
              <Suspense fallback={<DashboardSkeleton />}>
                <ProgressOverview />
              </Suspense>
            </ErrorBoundary>
          </div>
        </DashboardSection>
      </div>
    </div>
  );
}