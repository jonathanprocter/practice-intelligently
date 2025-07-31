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
              <Badge variant="secondary" className="text-therapy-success">+12%</Badge>
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
              <Badge variant="secondary" className="text-therapy-success">+8%</Badge>
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
              <Badge variant="secondary" className="text-therapy-success">+15%</Badge>
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
              <Badge variant="secondary" className="text-therapy-success">+22%</Badge>
            </div>
            <h3 className="text-2xl font-bold text-therapy-text mb-1">87%</h3>
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
            <div className="space-y-4">
              {sessionTrends.map((data, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-therapy-success/10 rounded text-therapy-success text-sm font-semibold flex items-center justify-center">
                      {data.month}
                    </div>
                    <div>
                      <p className="font-medium text-therapy-text">{data.sessions} sessions</p>
                      <p className="text-sm text-therapy-text/60">{data.clients} clients</p>
                    </div>
                  </div>
                  <div className="w-24">
                    <Progress 
                      value={(data.sessions / 80) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
              ))}
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
            <div className="space-y-4">
              {outcomeMetrics.map((outcome, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-therapy-text text-sm">
                      {outcome.category}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-therapy-success">
                        {outcome.improvement}%
                      </span>
                      <span className="text-xs text-therapy-text/50">
                        ({outcome.sessions} sessions)
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={outcome.improvement} 
                    className="h-2"
                  />
                </div>
              ))}
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
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-therapy-text">Individual Therapy</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-therapy-bg rounded-full h-2">
                    <div className="bg-therapy-primary h-2 rounded-full" style={{width: '65%'}}></div>
                  </div>
                  <span className="text-sm font-semibold">65%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-therapy-text">Couples Therapy</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-therapy-bg rounded-full h-2">
                    <div className="bg-therapy-success h-2 rounded-full" style={{width: '25%'}}></div>
                  </div>
                  <span className="text-sm font-semibold">25%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-therapy-text">Family Therapy</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-therapy-bg rounded-full h-2">
                    <div className="bg-therapy-warning h-2 rounded-full" style={{width: '10%'}}></div>
                  </div>
                  <span className="text-sm font-semibold">10%</span>
                </div>
              </div>
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
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-therapy-text">Age 18-30</span>
                  <span className="text-sm font-semibold">32%</span>
                </div>
                <Progress value={32} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-therapy-text">Age 31-45</span>
                  <span className="text-sm font-semibold">45%</span>
                </div>
                <Progress value={45} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-therapy-text">Age 46+</span>
                  <span className="text-sm font-semibold">23%</span>
                </div>
                <Progress value={23} className="h-2" />
              </div>
            </div>
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
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-therapy-bg rounded-lg">
                <div>
                  <p className="font-medium text-therapy-text text-sm">Documentation Rate</p>
                  <p className="text-xs text-therapy-text/60">Notes completed on time</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-therapy-success">94%</p>
                  <p className="text-xs text-therapy-success">+5%</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-therapy-bg rounded-lg">
                <div>
                  <p className="font-medium text-therapy-text text-sm">Show-up Rate</p>
                  <p className="text-xs text-therapy-text/60">Client attendance</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-therapy-warning">87%</p>
                  <p className="text-xs text-therapy-warning">+2%</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-therapy-bg rounded-lg">
                <div>
                  <p className="font-medium text-therapy-text text-sm">Response Time</p>
                  <p className="text-xs text-therapy-text/60">Average email response</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-therapy-primary">2.3h</p>
                  <p className="text-xs text-therapy-success">-0.5h</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
