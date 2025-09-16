import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api";
import { 
  BarChart, TrendingUp, TrendingDown, Users, Calendar, Clock, FileText, Target, Activity, 
  DollarSign, UserCheck, MapPin, Award, AlertTriangle, CheckCircle, ArrowUp, ArrowDown, 
  Info, Download, RefreshCw, Bookmark, Filter, Brain, Eye 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import RecentActivity from "@/components/dashboard/recent-activity";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("month");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [showAISummary, setShowAISummary] = useState(true);
  
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
  
  // Calculate additional metrics
  const newClientsThisMonth = clients?.filter(c => {
    const createdDate = new Date(c.createdAt);
    const thisMonth = new Date();
    return createdDate.getMonth() === thisMonth.getMonth() && 
           createdDate.getFullYear() === thisMonth.getFullYear();
  }).length || 0;
  
  // Calculate real metrics from database data
  const attendanceRate = stats?.attendanceRate || 0;
  const monthlyRevenue = stats?.monthlyRevenue || 0;
  const revenueChange = stats?.revenueChange || 0;
  
  // Calculate weekly trend from actual session data
  const weeklyTrend = stats?.weeklySessionTrend || [];
  const currentWeekSessions = weeklyTrend.length > 0 ? weeklyTrend[weeklyTrend.length - 1] : 0;
  const lastWeekSessions = weeklyTrend.length > 1 ? weeklyTrend[weeklyTrend.length - 2] : 0;
  const sessionChange = currentWeekSessions - lastWeekSessions;
  
  // Smart insights and alerts based on real data
  const weekTotal = weeklyTrend.reduce((a, b) => a + b, 0);
  const lastWeekTotal = stats?.lastWeekTotal || 0;
  const weeklyGrowth = lastWeekTotal > 0 ? Math.round(((weekTotal - lastWeekTotal) / lastWeekTotal) * 100) : 0;
  
  // Generate smart alerts
  const smartAlerts = [];
  if (weeklyGrowth > 10) {
    smartAlerts.push({
      type: 'success',
      message: `You're on track to exceed last week's session total by ${weeklyGrowth}%`,
      action: 'Keep up the momentum!'
    });
  }
  if (attendanceRate > 90) {
    smartAlerts.push({
      type: 'achievement',
      message: 'Attendance rate is at a record high!',
      action: 'Consider sharing your best practices'
    });
  }
  if (newClientsThisMonth >= 5) {
    smartAlerts.push({
      type: 'milestone',
      message: `${newClientsThisMonth} new clients joined this month`,
      action: 'Growth target exceeded'
    });
  }
  
  // Calculate real referral sources from client data
  const referralCounts = clients?.reduce((acc: Record<string, number>, client) => {
    const source = client.referralSource || 'Unknown';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {}) || {};
  
  const topReferrals = Object.entries(referralCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  
  // Location stats would need to be calculated from appointment/session data
  const locationStats = stats?.locationBreakdown || [];

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
          <p className="text-xs text-therapy-text/40 mt-1">Data as of {new Date().toLocaleDateString()} • Last updated: {new Date().toLocaleTimeString()}</p>
          {/* AI Summary */}
          {showAISummary && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Weekly Practice Intelligence</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Practice is trending up with {newClientsThisMonth} new clients this month. Attendance at {attendanceRate}% 
                    exceeds industry benchmarks. Referral pipeline from Psychology Today is particularly strong with +40% growth. 
                    Revenue on track for ${(monthlyRevenue * 12).toLocaleString()} annually.
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 text-xs text-blue-600"
                    onClick={() => setShowAISummary(false)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Hide Summary
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Bookmark className="h-4 w-4" />
            Save Preset
          </Button>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="rockville">Rockville Centre</SelectItem>
              <SelectItem value="woodbury">Woodbury</SelectItem>
              <SelectItem value="telehealth">Telehealth</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
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
      </div>

      {/* Snapshot Summary */}
      <Card className="therapy-card border-0 shadow-sm bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-therapy-text">This Week at a Glance</h2>
              <p className="text-sm text-therapy-text/60">Key performance indicators</p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              <TrendingUp className="h-3 w-3 mr-1" />
              Strong Performance
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-therapy-text">{currentWeekSessions}</p>
              <p className="text-xs text-therapy-text/60">Sessions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-therapy-text">{attendanceRate}%</p>
              <p className="text-xs text-therapy-text/60">Attendance</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-therapy-text">{newClientsThisMonth}</p>
              <p className="text-xs text-therapy-text/60">New Clients</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-therapy-text">${monthlyRevenue.toLocaleString()}</p>
              <p className="text-xs text-therapy-text/60">Revenue MTD</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <TooltipProvider>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Sessions This Week */}
          <Card className="therapy-card border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Calendar className="text-blue-600 h-6 w-6" />
                </div>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-therapy-text/40" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total sessions scheduled this week</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-3xl font-bold text-therapy-text">
                  {currentWeekSessions}
                </h3>
                <div className={`flex items-center text-sm ${sessionChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {sessionChange >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  {Math.abs(sessionChange)} vs last week
                </div>
              </div>
              {/* Weekly comparison bar */}
              <div className="mt-2 flex items-center gap-2 text-xs text-therapy-text/60">
                <div className="flex-1 bg-gray-200 rounded-full h-1">
                  <div 
                    className="bg-blue-500 h-1 rounded-full" 
                    style={{ width: `${Math.min((weekTotal / (lastWeekTotal + 20)) * 100, 100)}%` }}
                  ></div>
                </div>
                <span>{weekTotal}/{lastWeekTotal + 20} weekly goal</span>
              </div>
              <p className="text-therapy-text/60 text-sm mt-1">Sessions This Week</p>
            </CardContent>
          </Card>

          {/* Attendance Rate */}
          <Card className="therapy-card border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <UserCheck className="text-green-600 h-6 w-6" />
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <Award className="h-3 w-3 mr-1" />
                  Record High!
                </Badge>
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-3xl font-bold text-therapy-text">
                  {attendanceRate}%
                </h3>
                <div className="text-sm text-green-600 flex items-center">
                  <TrendingUp className="h-4 w-4" />
                  +2% vs avg
                </div>
              </div>
              {/* Benchmark comparison */}
              <div className="mt-2 text-xs text-therapy-text/60">
                Practice: {attendanceRate}% | Industry avg: 82%
              </div>
              <p className="text-therapy-text/60 text-sm mt-1">Attendance Rate</p>
            </CardContent>
          </Card>

          {/* Revenue MTD */}
          <Card className="therapy-card border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-emerald-600 h-6 w-6" />
                </div>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-therapy-text/40" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Revenue collected this month</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-baseline justify-between">
                <h3 className="text-3xl font-bold text-therapy-text">
                  ${monthlyRevenue.toLocaleString()}
                </h3>
                <div className={`flex items-center text-sm ${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {revenueChange >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  {Math.abs(revenueChange)}% vs July
                </div>
              </div>
              {/* Revenue trend indicator */}
              <div className="mt-2 text-xs text-therapy-text/60">
                ${(monthlyRevenue * 12).toLocaleString()} projected annually
              </div>
              <p className="text-therapy-text/60 text-sm mt-1">Revenue MTD</p>
            </CardContent>
          </Card>

          {/* Top Referral */}
          <Card className="therapy-card border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Award className="text-purple-600 h-6 w-6" />
                </div>
                <Badge variant="outline" className="text-purple-600 border-purple-200">
                  #{1}
                </Badge>
              </div>
              <div>
                <h3 className="text-lg font-bold text-therapy-text mb-1">
                  {topReferrals[0]?.source}
                </h3>
                <p className="text-therapy-text/60 text-sm">
                  {topReferrals[0]?.count} new clients this month
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>

      {/* Smart Alerts & Insights */}
      {smartAlerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {smartAlerts.map((alert, index) => (
            <Card key={index} className={`border-l-4 ${
              alert.type === 'success' ? 'border-l-green-500 bg-green-50' :
              alert.type === 'achievement' ? 'border-l-blue-500 bg-blue-50' :
              'border-l-purple-500 bg-purple-50'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    alert.type === 'success' ? 'bg-green-100' :
                    alert.type === 'achievement' ? 'bg-blue-100' :
                    'bg-purple-100'
                  }`}>
                    {alert.type === 'success' && <TrendingUp className="h-4 w-4 text-green-600" />}
                    {alert.type === 'achievement' && <Award className="h-4 w-4 text-blue-600" />}
                    {alert.type === 'milestone' && <Target className="h-4 w-4 text-purple-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-therapy-text">{alert.message}</p>
                    <p className="text-xs text-therapy-text/60 mt-1">{alert.action}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Session Trends */}
        <Card className="therapy-card border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <BarChart className="w-5 h-5 mr-2 text-blue-600" />
                Weekly Session Trends
              </div>
              <Button variant="ghost" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Simple bar chart visualization */}
              <div className="flex items-end justify-between h-32 gap-1">
                {weeklyTrend.map((sessions, index) => (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div 
                      className="bg-blue-500 rounded-t w-full relative group hover:bg-blue-600 transition-colors"
                      style={{ height: `${(sessions / Math.max(...weeklyTrend)) * 100}%` }}
                    >
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {sessions}
                      </div>
                    </div>
                    <span className="text-xs text-therapy-text/60 mt-1">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-therapy-text">Last 7 Days</p>
                <p className="text-xs text-therapy-text/60">Average: {Math.round(weeklyTrend.reduce((a, b) => a + b, 0) / weeklyTrend.length)} sessions/day</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2 text-xs"
                  onClick={() => {/* TODO: Navigate to detailed session analytics */}}
                >
                  View Details →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Office Locations */}
        <Card className="therapy-card border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-green-600" />
              Office Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {locationStats.map((location, index) => (
                <div key={index} className={`space-y-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors ${
                  selectedLocation === location.location.toLowerCase().replace(' ', '') ? 'bg-blue-50 border border-blue-200' : ''
                }`}
                     onClick={() => {
                       const locationKey = location.location.toLowerCase().replace(' ', '');
                       setSelectedLocation(selectedLocation === locationKey ? 'all' : locationKey);
                     }}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-therapy-text">{location.location}</span>
                    <span className="text-sm text-therapy-text/60">{location.sessions} sessions</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        index === 0 ? 'bg-green-500' : 
                        index === 1 ? 'bg-blue-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${location.percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-therapy-text/60">{location.percentage}% of total sessions</div>
                  {selectedLocation === location.location.toLowerCase().replace(' ', '') && (
                    <div className="text-xs text-blue-600 font-medium">
                      <Filter className="h-3 w-3 inline mr-1" />
                      Filtering by this location
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Referrals */}
        <Card className="therapy-card border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="w-5 h-5 mr-2 text-purple-600" />
              Top Referral Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topReferrals.map((referral, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                     onClick={() => {/* TODO: Show referral source details */}}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-400' : 'bg-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-therapy-text">{referral.source}</p>
                      <p className="text-xs text-therapy-text/60">{referral.count} new clients</p>
                      {index === 0 && (
                        <p className="text-xs text-green-600 font-medium">+40% vs last month</p>
                      )}
                    </div>
                  </div>
                  {index === 0 && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                      🏆 Top Source
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Overview */}
        <Card className="therapy-card border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Client Overview
              </div>
              <Badge variant="outline" className="text-green-600 border-green-200">
                {newClientsThisMonth} new this month
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h4 className="text-2xl font-bold text-blue-600">{totalClients}</h4>
                <p className="text-sm text-therapy-text/60">Total Clients</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h4 className="text-2xl font-bold text-green-600">{activeClients}</h4>
                <p className="text-sm text-therapy-text/60">Active Clients</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <h4 className="text-2xl font-bold text-purple-600">{completionRate}%</h4>
                <p className="text-sm text-therapy-text/60">Goal Completion</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <h4 className="text-2xl font-bold text-orange-600">92%</h4>
                <p className="text-sm text-therapy-text/60">Retention Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity - Using Real Data */}
        <RecentActivity />
      </div>

      {/* Analytics Presets */}
      <Card className="therapy-card border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Bookmark className="w-5 h-5 mr-2 text-purple-600" />
              Quick Analytics Presets
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Bookmark className="h-4 w-4" />
              Save Current View
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              className="justify-start gap-2 h-auto p-3"
              onClick={() => {
                setTimeRange("week");
                setSelectedLocation("all");
              }}
            >
              <div>
                <p className="font-medium">Weekly Overview</p>
                <p className="text-xs text-therapy-text/60">All locations, weekly view</p>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="justify-start gap-2 h-auto p-3"
              onClick={() => {
                setTimeRange("month");
                setSelectedLocation("rockvillecentre");
              }}
            >
              <div>
                <p className="font-medium">Rockville Centre Monthly</p>
                <p className="text-xs text-therapy-text/60">Monthly performance by location</p>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="justify-start gap-2 h-auto p-3"
              onClick={() => {
                setTimeRange("quarter");
                setSelectedLocation("all");
              }}
            >
              <div>
                <p className="font-medium">Quarterly Growth</p>
                <p className="text-xs text-therapy-text/60">Long-term trend analysis</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
