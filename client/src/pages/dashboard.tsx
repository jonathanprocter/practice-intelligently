// pages/dashboard.tsx
import { useQuery, useQueries } from "@tanstack/react-query";
import { ApiClient, type DashboardStats } from "@/lib/api";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useState, useEffect, useMemo } from "react";
import { RefreshCw, Settings, LayoutGrid, Maximize2, Minimize2, Activity, Calendar, Users, CheckCircle2 } from "lucide-react";
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

// Import dashboard components directly to avoid lazy loading issues
import TodaysSchedule from "@/components/dashboard/todays-schedule-enhanced";
import AiInsightsPanel from "@/components/dashboard/ai-insights-panel";
import UrgentActionItems from "@/components/dashboard/urgent-action-items";
import TodaysSessions from "@/components/dashboard/todays-sessions";
import RecentActivity from "@/components/dashboard/recent-activity";
import ProgressOverview from "@/components/dashboard/progress-overview";
import RealTimeMetrics from "@/components/dashboard/real-time-metrics";
import QuickActionsPanel from "@/components/dashboard/quick-actions-panel";

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

// Dashboard Section Wrapper with animations and enhanced styling
function DashboardSection({ 
  children, 
  title, 
  error,
  isLoading,
  onRefresh,
  className,
  collapsible = false,
  defaultCollapsed = false,
  description
}: {
  children: React.ReactNode;
  title?: string;
  error?: Error | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  description?: string;
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "bg-red-50 border border-red-200 rounded-lg p-4",
          className
        )}
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
        className={cn(
          "bg-white rounded-lg shadow-sm border border-gray-100",
          className
        )}
      >
        <motion.div 
          className="p-4 border-b border-gray-100 cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
          whileHover={{ backgroundColor: "rgba(59, 89, 152, 0.02)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              {description && (
                <p className="text-sm text-gray-500 mt-1">{description}</p>
              )}
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {isCollapsed ? 
                <Maximize2 className="h-4 w-4 text-gray-400" /> : 
                <Minimize2 className="h-4 w-4 text-gray-400" />
              }
            </motion.button>
          </div>
        </motion.div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="p-4">
                {isLoading ? <DashboardSkeleton section={title?.toLowerCase()} /> : children}
              </div>
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

// Enhanced Stat Card Component
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend,
  color = "blue" 
}: { 
  title: string; 
  value: string | number; 
  icon: any;
  description?: string;
  trend?: { value: number; isPositive: boolean };
  color?: "blue" | "green" | "purple" | "orange";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200"
  };

  const iconBgClasses = {
    blue: "bg-gradient-to-br from-blue-500 to-blue-600",
    green: "bg-gradient-to-br from-green-500 to-green-600",
    purple: "bg-gradient-to-br from-purple-500 to-purple-600",
    orange: "bg-gradient-to-br from-orange-500 to-orange-600"
  };

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}
      className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full opacity-50" />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "p-3 rounded-xl shadow-lg",
            iconBgClasses[color]
          )}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          {trend && (
            <span className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              trend.isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}>
              {trend.isPositive ? "+" : ""}{trend.value}%
            </span>
          )}
        </div>
        
        <h3 className="text-3xl font-bold text-gray-900 mb-1">
          {value}
        </h3>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-2">{description}</p>
        )}
      </div>
    </motion.div>
  );
}

// Main Dashboard Component with enhanced styling
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

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const stats = statsQuery.data || {
    todaysSessions: 0,
    activeClients: 0,
    urgentActionItems: 0,
    completionRate: 0
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white overflow-x-hidden">
      {/* Premium Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  {getGreeting()}
                </h1>
                <p className="text-gray-600 mt-1">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* System Status */}
                <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                  <div className={cn(
                    "h-2 w-2 rounded-full animate-pulse",
                    dashboardHealth.status === 'healthy' ? "bg-green-500" :
                    dashboardHealth.status === 'partial' ? "bg-yellow-500" :
                    "bg-red-500"
                  )} />
                  <span className="text-sm font-medium text-gray-700">
                    System {dashboardHealth.status === 'healthy' ? 'Operational' : 
                           dashboardHealth.status === 'partial' ? 'Partial' : 'Degraded'}
                  </span>
                </div>

                {/* Layout Toggle */}
                <div className="hidden sm:flex bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={dashboardLayout === 'compact' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setDashboardLayout('compact')}
                    className="px-3"
                    data-testid="layout-compact"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={dashboardLayout === 'default' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setDashboardLayout('default')}
                    className="px-3"
                    data-testid="layout-default"
                  >
                    Default
                  </Button>
                  <Button
                    variant={dashboardLayout === 'expanded' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setDashboardLayout('expanded')}
                    className="px-3"
                    data-testid="layout-expanded"
                  >
                    Wide
                  </Button>
                </div>

                {/* Refresh Button */}
                <Button 
                  variant="outline" 
                  size="default"
                  onClick={handleRefreshDashboard}
                  disabled={isRefreshing}
                  className="gap-2"
                  data-testid="refresh-dashboard"
                >
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>

                {/* API Status */}
                <div className="hidden sm:block">
                  <ApiStatusIndicators />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics Cards */}
        <ErrorBoundary>
          <DashboardSection
            error={statsQuery.error as Error | null}
            isLoading={statsQuery.isLoading}
            onRefresh={() => statsQuery.refetch()}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="Today's Sessions"
                value={stats.todaysSessions}
                icon={Calendar}
                color="blue"
                description="Scheduled appointments"
                trend={{ value: 12, isPositive: true }}
              />
              <StatCard
                title="Active Clients"
                value={stats.activeClients}
                icon={Users}
                color="green"
                description="Currently in treatment"
                trend={{ value: 5, isPositive: true }}
              />
              <StatCard
                title="Urgent Items"
                value={stats.urgentActionItems}
                icon={Activity}
                color="orange"
                description="Requires attention"
                trend={{ value: 3, isPositive: false }}
              />
              <StatCard
                title="Completion Rate"
                value={`${stats.completionRate}%`}
                icon={CheckCircle2}
                color="purple"
                description="Weekly average"
                trend={{ value: 8, isPositive: true }}
              />
            </div>
          </DashboardSection>
        </ErrorBoundary>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Schedule - Primary Focus */}
            <ErrorBoundary>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Today's Schedule</h2>
                  <span className="text-sm text-gray-500">
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <TodaysSchedule />
              </div>
            </ErrorBoundary>

            {/* Real-Time Metrics */}
            <ErrorBoundary>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Practice Metrics</h2>
                <RealTimeMetrics />
              </div>
            </ErrorBoundary>

            {/* Recent Activity */}
            <ErrorBoundary>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
                <RecentActivity />
              </div>
            </ErrorBoundary>

            {/* AI Insights - Conditional based on layout */}
            {dashboardLayout !== 'compact' && (
              <ErrorBoundary>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Insights</h2>
                  <AiInsightsPanel />
                </div>
              </ErrorBoundary>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <ErrorBoundary>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <QuickActionsPanel />
              </div>
            </ErrorBoundary>

            {/* Urgent Action Items */}
            <ErrorBoundary>
              <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-6">
                <h2 className="text-lg font-semibold text-red-900 mb-4">Urgent Items</h2>
                <UrgentActionItems />
              </div>
            </ErrorBoundary>

            {/* Today's Sessions */}
            <ErrorBoundary>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Notes</h2>
                <TodaysSessions />
              </div>
            </ErrorBoundary>

            {/* AI Insights - Compact layout */}
            {dashboardLayout === 'compact' && (
              <ErrorBoundary>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Insights</h2>
                  <AiInsightsPanel />
                </div>
              </ErrorBoundary>
            )}
          </div>
        </div>

        {/* Additional Insights - Collapsible Section */}
        {dashboardLayout !== 'compact' && (
          <div className="mt-8">
            <DashboardSection
              title="Additional Insights"
              description="Detailed practice analytics and progress tracking"
              collapsible
              defaultCollapsed={false}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ErrorBoundary>
                  <div className="bg-white rounded-lg p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Progress</h3>
                    <ProgressOverview />
                  </div>
                </ErrorBoundary>

                <ErrorBoundary>
                  <div className="bg-white rounded-lg p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
                    <RecentActivity />
                  </div>
                </ErrorBoundary>
              </div>
            </DashboardSection>
          </div>
        )}
      </div>
    </div>
  );
}