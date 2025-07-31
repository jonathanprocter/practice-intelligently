import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api";
import { BarChart, TrendingUp, Users, Calendar, Clock, FileText, Target, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("month");
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: ApiClient.getDashboardStats,
  });

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: ApiClient.getClients,
  });

  const { data: actionItems, isLoading: actionItemsLoading } = useQuery({
    queryKey: ['action-items'],
    queryFn: ApiClient.getActionItems,
  });

  const isLoading = statsLoading || clientsLoading || actionItemsLoading;

  // Calculate analytics data
  const totalClients = clients?.length || 0;
  const activeClients = clients?.filter(c => c.status === 'active').length || 0;
  const completedActionItems = actionItems?.filter(item => item.status === 'completed').length || 0;
  const totalActionItems = actionItems?.length || 0;
  const completionRate = totalActionItems > 0 ? Math.round((completedActionItems / totalActionItems) * 100) : 0;

  // Real data from database - initially empty
  const sessionTrends: Array<{ month: string; sessions: number; clients: number }> = [];
  const outcomeMetrics: Array<{ category: string; improvement: number; sessions: number }> = [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <div className="w-32 h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-therapy-text">Analytics</h1>
          <p className="text-therapy-text/60">Track your practice performance and client outcomes</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="therapy-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-therapy-primary/10 rounded-lg flex items-center justify-center">
                <Calendar className="text-therapy-primary text-xl" />
              </div>

            </div>
            <h3 className="text-2xl font-bold text-therapy-text mb-1">
              {stats?.todaysSessions || 0}
            </h3>
            <p className="text-therapy-text/60 text-sm">Sessions This Month</p>
          </CardContent>
        </Card>

        <Card className="therapy-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-therapy-success/10 rounded-lg flex items-center justify-center">
                <Users className="text-therapy-success text-xl" />
              </div>

            </div>
            <h3 className="text-2xl font-bold text-therapy-text mb-1">
              {activeClients}
            </h3>
            <p className="text-therapy-text/60 text-sm">Active Clients</p>
          </CardContent>
        </Card>

        <Card className="therapy-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-therapy-warning/10 rounded-lg flex items-center justify-center">
                <Target className="text-therapy-warning text-xl" />
              </div>

            </div>
            <h3 className="text-2xl font-bold text-therapy-text mb-1">
              {completionRate}%
            </h3>
            <p className="text-therapy-text/60 text-sm">Goal Completion Rate</p>
          </CardContent>
        </Card>

        <Card className="therapy-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-therapy-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-therapy-primary text-xl" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-therapy-text mb-1">--%</h3>
            <p className="text-therapy-text/60 text-sm">Client Satisfaction</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Trends */}
        <Card className="therapy-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart className="w-5 h-5 mr-2 text-therapy-primary" />
              Session Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <BarChart className="h-12 w-12 text-therapy-text/30 mx-auto mb-2" />
              <p className="text-therapy-text/60 text-sm">No session data available yet</p>
            </div>
          </CardContent>
        </Card>

        {/* Treatment Outcomes */}
        <Card className="therapy-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2 text-therapy-success" />
              Treatment Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-therapy-text/30 mx-auto mb-2" />
              <p className="text-therapy-text/60 text-sm">No treatment outcome data available yet</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session Distribution */}
        <Card className="therapy-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-therapy-warning" />
              Session Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-therapy-text/30 mx-auto mb-2" />
              <p className="text-therapy-text/60 text-sm">No session distribution data available yet</p>
            </div>
          </CardContent>
        </Card>

        {/* Client Demographics */}
        <Card className="therapy-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-therapy-primary" />
              Client Demographics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalClients > 0 ? (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-therapy-text/30 mx-auto mb-2" />
                  <p className="text-therapy-text/60 text-sm">Demographics analysis available with more client data</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-therapy-text/30 mx-auto mb-2" />
                <p className="text-therapy-text/60 text-sm">No client data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Performance */}
        <Card className="therapy-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2 text-therapy-success" />
              Recent Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-therapy-text/30 mx-auto mb-2" />
              <p className="text-therapy-text/60 text-sm">No performance data available yet</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
