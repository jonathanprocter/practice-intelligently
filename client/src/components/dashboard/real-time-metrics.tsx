// components/dashboard/real-time-metrics.tsx
import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, TrendingDown, Activity, DollarSign, 
  Users, Calendar, Clock, Target, Award, AlertTriangle 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Metric {
  label: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  color: string;
  progress?: number;
  target?: number;
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  const isPositiveChange = metric.change && metric.change > 0;
  const isNegativeChange = metric.change && metric.change < 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={cn("p-2 rounded-lg", metric.color)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          {metric.change !== undefined && (
            <div className="flex items-center gap-1">
              {isPositiveChange ? (
                <TrendingUp className="h-3 w-3 text-therapy-success" />
              ) : isNegativeChange ? (
                <TrendingDown className="h-3 w-3 text-therapy-error" />
              ) : null}
              <span className={cn(
                "text-xs font-medium",
                isPositiveChange ? "text-therapy-success" : 
                isNegativeChange ? "text-therapy-error" : 
                "text-therapy-text/60"
              )}>
                {isPositiveChange ? "+" : ""}{metric.change}%
              </span>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-2xl font-bold text-therapy-text">{metric.value}</p>
          <p className="text-xs text-therapy-text/60">{metric.label}</p>
          
          {metric.changeLabel && (
            <p className="text-xs text-therapy-text/40">{metric.changeLabel}</p>
          )}
          
          {metric.progress !== undefined && (
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-therapy-text/60">Progress</span>
                <span className="text-therapy-text/80">{metric.progress}%</span>
              </div>
              <Progress value={metric.progress} className="h-1" />
              {metric.target && (
                <p className="text-xs text-therapy-text/40">
                  Target: {metric.target}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface EngagementData {
  weeklyAppointments: number[];
  monthlyTrend: number;
  attendanceRate: number;
  noShowRate: number;
  cancellationRate: number;
  averageSessionsPerWeek: number;
  clientRetentionRate: number;
  newClientsThisMonth: number;
}

export default function RealTimeMetrics() {
  // Fetch dashboard stats with default values
  const { data: stats = {
    todaysSessions: 0,
    activeClients: 0,
    urgentActionItems: 0,
    completionRate: 0,
    monthlyRevenue: 0
  }, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        const result = await ApiClient.getDashboardStats();
        return result || {
          todaysSessions: 0,
          activeClients: 0,
          urgentActionItems: 0,
          completionRate: 0,
          monthlyRevenue: 0
        };
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
          todaysSessions: 0,
          activeClients: 0,
          urgentActionItems: 0,
          completionRate: 0,
          monthlyRevenue: 0
        };
      }
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch engagement metrics with default values
  const { data: engagement = {
    weeklyAppointments: [0, 0, 0, 0, 0, 0, 0],
    monthlyTrend: 0,
    attendanceRate: 0,
    noShowRate: 0,
    cancellationRate: 0,
    averageSessionsPerWeek: 0,
    clientRetentionRate: 0,
    newClientsThisMonth: 0,
  }, isLoading: engagementLoading } = useQuery({
    queryKey: ['engagement-metrics'],
    queryFn: async () => {
      // This would be a real API call in production
      const mockData: EngagementData = {
        weeklyAppointments: [12, 14, 13, 15, 16, 14, 18],
        monthlyTrend: 12,
        attendanceRate: 92,
        noShowRate: 5,
        cancellationRate: 3,
        averageSessionsPerWeek: 15,
        clientRetentionRate: 88,
        newClientsThisMonth: 3,
      };
      return mockData;
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const isLoading = statsLoading || engagementLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-therapy-text">Real-Time Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // Calculate metrics
  const metrics: Metric[] = [
    {
      label: "Monthly Revenue",
      value: `$${stats?.monthlyRevenue?.toLocaleString() || '0'}`,
      change: 8,
      changeLabel: "vs last month",
      icon: DollarSign,
      color: "bg-therapy-success",
      progress: 75,
      target: 20000,
    },
    {
      label: "Active Clients",
      value: stats?.activeClients || 0,
      change: engagement?.newClientsThisMonth ? 
        Math.round((engagement.newClientsThisMonth / (stats?.activeClients || 1)) * 100) : 0,
      changeLabel: `${engagement?.newClientsThisMonth || 0} new this month`,
      icon: Users,
      color: "bg-therapy-primary",
    },
    {
      label: "Attendance Rate",
      value: `${engagement?.attendanceRate || 0}%`,
      change: 2,
      changeLabel: "This month",
      icon: Activity,
      color: "bg-therapy-secondary",
      progress: engagement?.attendanceRate,
      target: 95,
    },
    {
      label: "Completion Rate",
      value: `${stats?.completionRate || 0}%`,
      change: -1,
      changeLabel: "Session completion",
      icon: Target,
      color: "bg-therapy-warning",
      progress: stats?.completionRate,
    },
    {
      label: "Weekly Sessions",
      value: engagement?.averageSessionsPerWeek || 0,
      change: engagement?.monthlyTrend || 0,
      changeLabel: "Average this month",
      icon: Calendar,
      color: "bg-therapy-info",
    },
    {
      label: "Client Retention",
      value: `${engagement?.clientRetentionRate || 0}%`,
      change: 3,
      changeLabel: "3-month average",
      icon: Award,
      color: "bg-therapy-accent",
      progress: engagement?.clientRetentionRate,
      target: 90,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-therapy-text">Real-Time Metrics</h2>
        <Badge variant="outline" className="text-xs">
          <Activity className="h-3 w-3 mr-1" />
          Live
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <MetricCard key={index} metric={metric} />
        ))}
      </div>

      {/* Weekly Trend Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Weekly Appointment Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-20">
            {engagement?.weeklyAppointments && Array.isArray(engagement.weeklyAppointments) ? engagement.weeklyAppointments.map((count, index) => {
              const maxCount = engagement.weeklyAppointments && engagement.weeklyAppointments.length > 0 
                ? Math.max(...engagement.weeklyAppointments) 
                : 1;
              const height = (count / maxCount) * 100;
              const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="relative w-full flex items-end justify-center h-16">
                    <div 
                      className="w-full bg-therapy-primary/20 hover:bg-therapy-primary/30 transition-colors rounded-t"
                      style={{ height: `${height}%` }}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium text-therapy-text">
                        {count}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-therapy-text/60">{days[index]}</span>
                </div>
              );
            }) : null}
          </div>
        </CardContent>
      </Card>

      {/* Alert Section */}
      {(engagement?.noShowRate || 0) > 10 && (
        <Card className="border-therapy-warning bg-therapy-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-therapy-warning mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-therapy-text">High No-Show Rate Detected</p>
                <p className="text-xs text-therapy-text/60 mt-1">
                  Your no-show rate is {engagement?.noShowRate}% this month. 
                  Consider implementing reminder systems or follow-up protocols.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}