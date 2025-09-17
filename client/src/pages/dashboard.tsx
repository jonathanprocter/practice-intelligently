// pages/dashboard.tsx
import { useQuery, useQueries } from "@tanstack/react-query";
import { ApiClient, type DashboardStats } from "@/lib/api";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Suspense, lazy, useState, useEffect, useMemo } from "react";
import { RefreshCw, Settings, LayoutGrid, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { pageTransition, staggerContainer, fadeIn } from "@/lib/animations";
import { DashboardStatSkeleton } from "@/components/ui/animated-skeleton";
import { SectionLoader } from "@/components/ui/animated-spinner";
import { LoadingButton } from "@/components/ui/animated-spinner";

// Import core components directly (high priority)
import QuickStats from "@/components/dashboard/quick-stats";
import ApiStatusIndicators from "@/components/dashboard/api-status-indicators";
import { AIInsightsWidget } from "@/components/dashboard/ai-insights-widget";

// Lazy load heavy/secondary components
const TodaysSchedule = lazy(() => import("@/components/dashboard/todays-schedule-enhanced"));
const AiInsightsPanel = lazy(() => import("@/components/dashboard/ai-insights-panel"));
const UrgentActionItems = lazy(() => import("@/components/dashboard/urgent-action-items"));
const TodaysSessions = lazy(() => import("@/components/dashboard/todays-sessions"));
const RecentActivity = lazy(() => import("@/components/dashboard/recent-activity"));
const ProgressOverview = lazy(() => import("@/components/dashboard/progress-overview"));
const RealTimeMetrics = lazy(() => import("@/components/dashboard/real-time-metrics"));
const QuickActionsPanel = lazy(() => import("@/components/dashboard/quick-actions-panel"));
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

// Loading Skeleton Component with animations
function DashboardSkeleton({ section = 'full' }: { section?: string }) {
  if (section === 'stats') {
    return (
      <motion.div 
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {Array.from({ length: 4 }, (_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <DashboardStatSkeleton />
          </motion.div>
        ))}
      </motion.div>
    );
  }

  return <SectionLoader title="Loading dashboard..." />;
}

// Dashboard Section Wrapper with animations
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
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn("therapy-card p-4 border-red-200 bg-red-50", className)}
      >
        <div className="flex items-center justify-between mb-2">
          {title && <h3 className="text-sm font-medium text-red-800">{title}</h3>}
          {onRefresh && (
            <LoadingButton
              onClick={onRefresh}
              variant="ghost"
              size="sm"
              loadingText="Refreshing..."
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </LoadingButton>
          )}
        </div>
        <p className="text-xs text-red-600">Failed to load. Please refresh.</p>
      </motion.div>
    );
  }

  if (collapsible && title) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={className}
      >
        <motion.div 
          className="flex items-center justify-between mb-2"
          whileHover={{ x: 2 }}
        >
          <h3 className="text-lg font-semibold text-therapy-text">{title}</h3>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded hover:bg-accent"
          >
            {isCollapsed ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </motion.button>
        </motion.div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              {isLoading ? <DashboardSkeleton section={title?.toLowerCase()} /> : children}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  if (isLoading) {
    return <DashboardSkeleton section={title?.toLowerCase()} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Main Dashboard Component
export default function Dashboard() {
  const therapistId = getTherapistId();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardLayout, setDashboardLayout] = useState<'default' | 'compact' | 'expanded'>('default');

  // Main stats query with improved caching and default values
  const statsQuery = useQuery({
    queryKey: ['dashboard-stats', therapistId],
    queryFn: async () => {
      try {
        const result = await ApiClient.getDashboardStats();
        return result || {
          todaysSessions: 0,
          activeClients: 0,
          urgentActionItems: 0,
          completionRate: 0
        };
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
          todaysSessions: 0,
          activeClients: 0,
          urgentActionItems: 0,
          completionRate: 0
        };
      }
    },
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
        queryFn: async () => {
          try {
            const result = await ApiClient.getTodaysAppointments();
            return Array.isArray(result) ? result : [];
          } catch (error) {
            console.error('Error fetching today\'s appointments:', error);
            return [];
          }
        },
        staleTime: DASHBOARD_CONFIG.staleTime.schedule,
        refetchInterval: DASHBOARD_CONFIG.refreshIntervals.schedule,
        gcTime: 5 * 60 * 1000,
      },
      {
        queryKey: ['ai-insights', therapistId],
        queryFn: async () => {
          try {
            const result = await ApiClient.getAiInsights();
            return Array.isArray(result) ? result : [];
          } catch (error) {
            console.error('Error fetching AI insights:', error);
            return [];
          }
        },
        staleTime: DASHBOARD_CONFIG.staleTime.insights,
        refetchInterval: DASHBOARD_CONFIG.refreshIntervals.insights,
        gcTime: 10 * 60 * 1000, // Keep AI insights longer
      },
    ],
  });

  // Calculate dashboard health metrics
  const dashboardHealth = useMemo(() => {
    const loadedSections = Array.isArray(sectionQueries) 
      ? sectionQueries.filter(q => !q.isLoading && !q.error).length 
      : 0;
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
        ...(Array.isArray(sectionQueries) ? sectionQueries.map(q => q.refetch()) : [])
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
            <QuickStats stats={statsQuery.data || {
              todaysSessions: 0,
              activeClients: 0,
              urgentActionItems: 0,
              completionRate: 0
            }} />
          </DashboardSection>
        </ErrorBoundary>

        {/* Main Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Main Content (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Today's Schedule - Enhanced */}
            <ErrorBoundary>
              <Suspense fallback={<DashboardSkeleton />}>
                <TodaysSchedule />
              </Suspense>
            </ErrorBoundary>

            {/* Real-Time Metrics */}
            <ErrorBoundary>
              <Suspense fallback={<DashboardSkeleton />}>
                <RealTimeMetrics />
              </Suspense>
            </ErrorBoundary>

            {/* Recent Activity */}
            <ErrorBoundary>
              <Suspense fallback={<DashboardSkeleton />}>
                <RecentActivity />
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

          {/* Right Column - Quick Actions & Secondary Content */}
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Actions Panel */}
            <ErrorBoundary>
              <Suspense fallback={<DashboardSkeleton />}>
                <QuickActionsPanel />
              </Suspense>
            </ErrorBoundary>

            {/* Urgent Action Items */}
            <ErrorBoundary>
              <Suspense fallback={<DashboardSkeleton />}>
                <UrgentActionItems />
              </Suspense>
            </ErrorBoundary>

            {/* Today's Sessions */}
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

            {/* Document Uploader - Hidden on compact */}
            {dashboardLayout !== 'compact' && (
              <ErrorBoundary>
                <Suspense fallback={<DashboardSkeleton />}>
                  <SessionDocumentUploader therapistId={therapistId} />
                </Suspense>
              </ErrorBoundary>
            )}
          </div>
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