import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Tag, Shield, TrendingUp, Filter, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface DocumentStatistics {
  categoryCounts: Array<{ category: string; count: number }>;
  sensitivityCounts: Array<{ level: string; count: number }>;
  totalDocuments: number;
}

interface DocumentAnalyticsDashboardProps {
  therapistId: string;
}

const COLORS = {
  categories: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'],
  sensitivity: {
    low: '#10b981',
    standard: '#06b6d4', 
    high: '#f59e0b',
    confidential: '#ef4444'
  }
};

const DocumentAnalyticsDashboard: React.FC<DocumentAnalyticsDashboardProps> = ({ therapistId }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('all');

  // Fetch document statistics
  const { data: statistics, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['document-statistics', therapistId],
    queryFn: () => apiRequest('GET', `/api/documents/statistics/${therapistId}`),
  });

  // Fetch available categories
  const { data: categoriesData } = useQuery({
    queryKey: ['document-categories'],
    queryFn: () => apiRequest('GET', '/api/documents/categories'),
  });

  // Fetch documents by category (when category selected)
  const { data: categoryDocuments } = useQuery({
    queryKey: ['documents-by-category', therapistId, selectedCategory],
    queryFn: () => selectedCategory !== 'all' 
      ? apiRequest('GET', `/api/documents/by-category/${therapistId}?category=${selectedCategory}`)
      : null,
    enabled: selectedCategory !== 'all',
  });

  const stats = statistics?.statistics;
  const categories = categoriesData?.categories || [];

  // Transform data for charts
  const categoryChartData = stats?.categoryCounts.map((item, index) => ({
    ...item,
    category: item.category.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    fill: COLORS.categories[index % COLORS.categories.length]
  })) || [];

  const sensitivityChartData = stats?.sensitivityCounts.map(item => ({
    ...item,
    level: item.level.charAt(0).toUpperCase() + item.level.slice(1),
    fill: COLORS.sensitivity[item.level as keyof typeof COLORS.sensitivity] || '#6b7280'
  })) || [];

  // Sample trend data (would come from API in real implementation)
  const trendData = [
    { month: 'Jan', documents: 12, clinical: 8, administrative: 4 },
    { month: 'Feb', documents: 19, clinical: 13, administrative: 6 },
    { month: 'Mar', documents: 15, clinical: 9, administrative: 6 },
    { month: 'Apr', documents: 22, clinical: 14, administrative: 8 },
    { month: 'May', documents: 28, clinical: 18, administrative: 10 },
    { month: 'Jun', documents: 31, clinical: 21, administrative: 10 },
  ];

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="document-analytics-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Analytics</h2>
          <p className="text-gray-600">Insights into your clinical document management</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat: any) => (
                <SelectItem key={cat.category} value={cat.category}>
                  {cat.category.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalDocuments || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.categoryCounts.length || 0}</p>
              </div>
              <Tag className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Sensitivity</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.sensitivityCounts.find(s => s.level === 'high')?.count || 0}
                </p>
              </div>
              <Shield className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  {trendData[trendData.length - 1]?.documents || 0}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Documents by Category</CardTitle>
            <CardDescription>Distribution of document types in your practice</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="category" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sensitivity Level Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Security Sensitivity Levels</CardTitle>
            <CardDescription>Document classification by sensitivity level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sensitivityChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ level, percent }) => `${level} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {sensitivityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Upload Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Document Upload Trend</CardTitle>
            <CardDescription>Monthly document processing volume over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="clinical" 
                  stackId="1"
                  stroke="#8b5cf6" 
                  fill="#8b5cf6" 
                  fillOpacity={0.8}
                />
                <Area 
                  type="monotone" 
                  dataKey="administrative" 
                  stackId="1"
                  stroke="#06b6d4" 
                  fill="#06b6d4" 
                  fillOpacity={0.8}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {categoryDocuments?.documents && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedCategory.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Documents
            </CardTitle>
            <CardDescription>
              Detailed view of documents in selected category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryDocuments.documents.slice(0, 5).map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{doc.fileName}</h4>
                    <p className="text-sm text-gray-500">
                      {doc.subcategory} • {new Date(doc.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={
                        doc.sensitivityLevel === 'high' || doc.sensitivityLevel === 'confidential'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }
                    >
                      {doc.sensitivityLevel}
                    </Badge>
                    {doc.confidenceScore && (
                      <Badge variant="outline">
                        {Math.round(doc.confidenceScore * 100)}%
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentAnalyticsDashboard;