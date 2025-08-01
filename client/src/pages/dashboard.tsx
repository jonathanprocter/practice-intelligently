import { useQuery } from "@tanstack/react-query";
import { ApiClient, type DashboardStats } from "@/lib/api";
import QuickStats from "@/components/dashboard/quick-stats";
import TodaysSchedule from "@/components/dashboard/todays-schedule";
import AiInsightsPanel from "@/components/dashboard/ai-insights-panel";
import UrgentActionItems from "@/components/dashboard/urgent-action-items";
import RecentActivity from "@/components/dashboard/recent-activity";
import ProgressOverview from "@/components/dashboard/progress-overview";
import ApiStatusIndicators from "@/components/dashboard/api-status-indicators";
import TodaysSessions from "@/components/dashboard/todays-sessions";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => ApiClient.getDashboardStats(),
  });

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="therapy-card p-6 animate-pulse">
              <div className="h-12 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with API Status */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-therapy-text">Dashboard</h1>
          <p className="text-therapy-text/60">Overview of your therapy practice</p>
        </div>
        <ApiStatusIndicators />
      </div>
      
      <QuickStats stats={stats} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TodaysSchedule />
        </div>
        <div>
          <AiInsightsPanel />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodaysSessions />
        <UrgentActionItems />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity />
        <ProgressOverview />
      </div>

      
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          className="w-14 h-14 rounded-full shadow-lg bg-therapy-primary hover:bg-therapy-primary/90 text-white"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
