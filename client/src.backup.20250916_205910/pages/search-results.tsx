import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useLocation, useRoute } from 'wouter';
import { 
  Search, Filter, X, Calendar, Users, FileText, Brain, 
  Clock, Star, Download, Save, ChevronRight, Loader2,
  CheckCircle, AlertCircle, Info, TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'client' | 'appointment' | 'session_note' | 'document' | 'ai_insight';
  title: string;
  subtitle?: string;
  description?: string;
  date?: string;
  tags?: string[];
  score?: number;
  highlight?: string;
  metadata?: Record<string, any>;
}

interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  facets?: Record<string, Record<string, number>>;
  suggestions?: string[];
  executionTime?: number;
}

const entityConfig = {
  client: {
    icon: Users,
    color: 'bg-blue-100 text-blue-800',
    label: 'Clients',
    route: (id: string) => `/clients/${id}/chart`,
  },
  appointment: {
    icon: Calendar,
    color: 'bg-green-100 text-green-800',
    label: 'Appointments',
    route: (id: string) => `/appointments?highlight=${id}`,
  },
  session_note: {
    icon: FileText,
    color: 'bg-purple-100 text-purple-800',
    label: 'Session Notes',
    route: (id: string) => `/session-notes?highlight=${id}`,
  },
  document: {
    icon: FileText,
    color: 'bg-yellow-100 text-yellow-800',
    label: 'Documents',
    route: (id: string) => `/smart-documents?highlight=${id}`,
  },
  ai_insight: {
    icon: Brain,
    color: 'bg-pink-100 text-pink-800',
    label: 'AI Insights',
    route: (id: string) => `/ai-insights?highlight=${id}`,
  },
};

export default function SearchResultsPage() {
  const [, params] = useRoute('/search/:query?');
  const [, setLocation] = useLocation();
  const initialQuery = params?.query ? decodeURIComponent(params.query) : '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'name'>('relevance');
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [selectedTab, setSelectedTab] = useState('all');
  
  const debouncedQuery = useDebounce(searchQuery, 500);
  const therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';

  // Update URL when search query changes
  useEffect(() => {
    if (debouncedQuery) {
      setLocation(`/search/${encodeURIComponent(debouncedQuery)}`, { replace: true });
    }
  }, [debouncedQuery, setLocation]);

  // Search query
  const { data: searchResults, isLoading, error, refetch } = useQuery<SearchResponse>({
    queryKey: ['search', debouncedQuery, entityTypes, dateRange, statusFilter, sortBy, limit, offset],
    enabled: debouncedQuery.length > 0,
    queryFn: async () => {
      const params = new URLSearchParams({
        q: debouncedQuery,
        therapistId,
        limit: limit.toString(),
        offset: offset.toString(),
        ...(entityTypes.length > 0 && { entityTypes: entityTypes.join(',') }),
        ...(dateRange.from && { dateFrom: dateRange.from }),
        ...(dateRange.to && { dateTo: dateRange.to }),
        ...(statusFilter.length > 0 && { status: statusFilter.join(',') }),
      });
      
      const response = await apiRequest('GET', `/api/search?${params}`);
      
      // Save to search history
      await apiRequest('POST', '/api/search/history', {
        therapistId,
        query: debouncedQuery,
        filters: { entityTypes, dateRange, statusFilter },
        resultCount: response.totalCount,
      });
      
      return response;
    },
  });

  // Search history
  const { data: searchHistory } = useQuery<string[]>({
    queryKey: ['search-history', therapistId],
    queryFn: async () => apiRequest('GET', `/api/search/history/${therapistId}`),
  });

  // Saved searches
  const { data: savedSearches } = useQuery({
    queryKey: ['saved-searches', therapistId],
    queryFn: async () => apiRequest('GET', `/api/search/presets/${therapistId}`),
  });

  // Save search mutation
  const saveSearchMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest('POST', '/api/search/presets', {
        therapistId,
        name,
        query: searchQuery,
        entityTypes,
        filters: { dateRange, statusFilter },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });

  const handleEntityTypeToggle = (type: string) => {
    setEntityTypes(prev =>
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
    setOffset(0);
  };

  const handleStatusToggle = (status: string) => {
    setStatusFilter(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
    setOffset(0);
  };

  const handleResultClick = (result: SearchResult) => {
    const config = entityConfig[result.type];
    if (config) {
      setLocation(config.route(result.id));
    }
  };

  const exportResults = () => {
    if (!searchResults) return;
    
    const csv = [
      ['Type', 'Title', 'Description', 'Date', 'Score'],
      ...searchResults.results.map(r => [
        r.type,
        r.title,
        r.description || '',
        r.date || '',
        r.score?.toString() || '',
      ]),
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-results-${new Date().toISOString()}.csv`;
    a.click();
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-yellow-200 font-semibold">{part}</mark>
        : part
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Group results by type for tabbed view
  const groupedResults = searchResults?.results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>) || {};

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Search Results</h1>
        <p className="text-gray-600">
          Search across all your practice data to find what you need
        </p>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search clients, appointments, notes, documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
                data-testid="input-search-query"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={() => setSearchQuery('')}
                  data-testid="button-clear-search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button onClick={() => refetch()} disabled={!searchQuery}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            {searchResults && searchResults.results.length > 0 && (
              <Button variant="outline" onClick={exportResults}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            {Object.entries(entityConfig).map(([type, config]) => (
              <Button
                key={type}
                variant={entityTypes.includes(type) ? "default" : "outline"}
                size="sm"
                onClick={() => handleEntityTypeToggle(type)}
                data-testid={`button-filter-${type}`}
              >
                <config.icon className="h-3 w-3 mr-1" />
                {config.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar Filters */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  data-testid="input-date-from"
                />
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  data-testid="input-date-to"
                />
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                {['active', 'scheduled', 'completed', 'cancelled', 'pending'].map(status => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={status}
                      checked={statusFilter.includes(status)}
                      onCheckedChange={() => handleStatusToggle(status)}
                    />
                    <Label htmlFor={status} className="text-sm capitalize cursor-pointer">
                      {status}
                    </Label>
                  </div>
                ))}
              </div>

              {/* Sort By */}
              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setEntityTypes([]);
                  setDateRange({ from: '', to: '' });
                  setStatusFilter([]);
                  setSortBy('relevance');
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>

          {/* Saved Searches */}
          {savedSearches && savedSearches.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Saved Searches</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  {savedSearches.map((search: any) => (
                    <Button
                      key={search.id}
                      variant="ghost"
                      className="w-full justify-start text-sm mb-1"
                      onClick={() => {
                        setSearchQuery(search.query);
                        if (search.filters) {
                          setEntityTypes(search.filters.entityTypes || []);
                          setDateRange(search.filters.dateRange || { from: '', to: '' });
                          setStatusFilter(search.filters.statusFilter || []);
                        }
                      }}
                    >
                      <Star className="h-3 w-3 mr-2" />
                      {search.name}
                    </Button>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Search History */}
          {searchHistory && searchHistory.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Recent Searches</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  {searchHistory.map((query, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="w-full justify-start text-sm mb-1"
                      onClick={() => setSearchQuery(query)}
                    >
                      <Clock className="h-3 w-3 mr-2" />
                      {query}
                    </Button>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Search Results */}
        <div className="col-span-9">
          {isLoading && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </CardContent>
            </Card>
          )}

          {error && (
            <Card>
              <CardContent className="py-12">
                <div className="flex items-center justify-center text-red-500">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Error loading search results
                </div>
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && searchQuery && (!searchResults || searchResults.results.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center">
                <Info className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-gray-500">
                  Try adjusting your search terms or filters
                </p>
              </CardContent>
            </Card>
          )}

          {searchResults && searchResults.results.length > 0 && (
            <>
              {/* Results Summary */}
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Found <span className="font-semibold">{searchResults.totalCount}</span> results
                  {searchResults.executionTime && (
                    <span className="ml-2">
                      in {searchResults.executionTime}ms
                    </span>
                  )}
                </div>
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveSearchMutation.mutate(searchQuery)}
                    disabled={saveSearchMutation.isPending}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Save Search
                  </Button>
                )}
              </div>

              {/* Results Tabs */}
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">
                    All ({searchResults.results.length})
                  </TabsTrigger>
                  {Object.entries(groupedResults).map(([type, results]) => {
                    const config = entityConfig[type as keyof typeof entityConfig];
                    return (
                      <TabsTrigger key={type} value={type}>
                        {config.label} ({results.length})
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                  {searchResults.results.map((result) => (
                    <SearchResultCard
                      key={result.id}
                      result={result}
                      onClick={() => handleResultClick(result)}
                      highlightMatch={highlightMatch}
                      formatDate={formatDate}
                      searchQuery={searchQuery}
                    />
                  ))}
                </TabsContent>

                {Object.entries(groupedResults).map(([type, results]) => (
                  <TabsContent key={type} value={type} className="space-y-4">
                    {results.map((result) => (
                      <SearchResultCard
                        key={result.id}
                        result={result}
                        onClick={() => handleResultClick(result)}
                        highlightMatch={highlightMatch}
                        formatDate={formatDate}
                        searchQuery={searchQuery}
                      />
                    ))}
                  </TabsContent>
                ))}
              </Tabs>

              {/* Pagination */}
              {searchResults.totalCount > limit && (
                <div className="flex items-center justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Showing {offset + 1}-{Math.min(offset + limit, searchResults.totalCount)} of {searchResults.totalCount}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= searchResults.totalCount}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Suggestions */}
          {searchResults?.suggestions && searchResults.suggestions.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Did you mean?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {searchResults.suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchQuery(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

interface SearchResultCardProps {
  result: SearchResult;
  onClick: () => void;
  highlightMatch: (text: string, query: string) => React.ReactNode;
  formatDate: (date?: string) => string;
  searchQuery: string;
}

function SearchResultCard({ 
  result, 
  onClick, 
  highlightMatch, 
  formatDate,
  searchQuery 
}: SearchResultCardProps) {
  const config = entityConfig[result.type];
  const Icon = config.icon;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
      data-testid={`card-result-${result.type}-${result.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={cn("p-2 rounded-lg", config.color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-lg">
                {highlightMatch(result.title, searchQuery)}
              </h3>
              {result.score && (
                <Badge variant="outline" className="ml-2">
                  {Math.round(result.score * 100)}% match
                </Badge>
              )}
            </div>
            {result.subtitle && (
              <p className="text-sm text-gray-600 mb-2">
                {result.subtitle}
              </p>
            )}
            {result.description && (
              <p className="text-sm text-gray-500 line-clamp-2">
                {highlightMatch(result.description, searchQuery)}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3">
              {result.date && (
                <span className="text-xs text-gray-400">
                  {formatDate(result.date)}
                </span>
              )}
              {result.tags && result.tags.length > 0 && (
                <div className="flex gap-1">
                  {result.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {result.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{result.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </CardContent>
    </Card>
  );
}