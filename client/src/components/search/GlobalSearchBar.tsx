import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Clock, Star, FileText, Calendar, Users, Brain, Filter, ChevronRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

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

interface GlobalSearchBarProps {
  className?: string;
  onResultClick?: (result: SearchResult) => void;
  embedded?: boolean;
}

const entityIcons = {
  client: Users,
  appointment: Calendar,
  session_note: FileText,
  document: FileText,
  ai_insight: Brain,
};

const entityColors = {
  client: 'bg-blue-100 text-blue-800',
  appointment: 'bg-green-100 text-green-800',
  session_note: 'bg-purple-100 text-purple-800',
  document: 'bg-yellow-100 text-yellow-800',
  ai_insight: 'bg-pink-100 text-pink-800',
};

export function GlobalSearchBar({ className, onResultClick, embedded = false }: GlobalSearchBarProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [entityFilter, setEntityFilter] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Search query
  const { data: searchResults, isLoading, error } = useQuery<SearchResponse>({
    queryKey: ['/api/search', debouncedQuery, entityFilter],
    enabled: debouncedQuery.length > 0 && open,
    queryFn: async () => {
      const params = new URLSearchParams({
        q: debouncedQuery,
        limit: '10',
        ...(entityFilter.length > 0 && { entities: entityFilter.join(',') }),
      });
      return apiRequest('GET', `/api/search?${params}`);
    },
  });

  // Search history query
  const { data: searchHistory } = useQuery<string[]>({
    queryKey: ['/api/search/history'],
    enabled: open && !searchQuery,
  });

  // Save search mutation
  const saveSearchMutation = useMutation({
    mutationFn: async (data: { name: string; query: string; entityType?: string }) => {
      return apiRequest('POST', '/api/search/saved', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/search/saved'] });
    },
  });

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open search with Cmd/Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      
      // Close on Escape
      if (e.key === 'Escape') {
        setOpen(false);
      }
      
      // Navigate results with arrow keys
      if (open && searchResults?.results) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, searchResults.results.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && searchResults.results[selectedIndex]) {
          e.preventDefault();
          handleResultClick(searchResults.results[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, searchResults, selectedIndex]);

  // Focus input when opening
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleResultClick = useCallback((result: SearchResult) => {
    if (onResultClick) {
      onResultClick(result);
    } else {
      // Default navigation based on result type
      switch (result.type) {
        case 'client':
          setLocation(`/clients/${result.id}/chart`);
          break;
        case 'appointment':
          setLocation(`/appointments?highlight=${result.id}`);
          break;
        case 'session_note':
          setLocation(`/session-notes?highlight=${result.id}`);
          break;
        case 'document':
          setLocation(`/smart-documents?highlight=${result.id}`);
          break;
        case 'ai_insight':
          setLocation(`/ai-insights?highlight=${result.id}`);
          break;
      }
    }
    setOpen(false);
    setSearchQuery('');
  }, [onResultClick, setLocation]);

  const handleEntityFilterToggle = (entity: string) => {
    setEntityFilter(prev => 
      prev.includes(entity) 
        ? prev.filter(e => e !== entity)
        : [...prev, entity]
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
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

  if (embedded) {
    return (
      <div className={cn("relative w-full", className)}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search clients, appointments, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            className="pl-10 pr-10"
            data-testid="input-global-search"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => {
                setSearchQuery('');
                inputRef.current?.focus();
              }}
              data-testid="button-clear-search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {open && (searchQuery || searchHistory) && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border z-50 max-h-[400px] overflow-hidden">
            <SearchResultsPanel
              searchResults={searchResults}
              searchHistory={searchHistory}
              searchQuery={searchQuery}
              isLoading={isLoading}
              selectedIndex={selectedIndex}
              onResultClick={handleResultClick}
              highlightMatch={highlightMatch}
              formatDate={formatDate}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "relative justify-start text-sm text-muted-foreground w-full md:w-64",
          className
        )}
        onClick={() => setOpen(true)}
        data-testid="button-open-search"
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          ref={inputRef}
          placeholder="Search clients, appointments, notes, documents..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs"
            data-testid="button-toggle-filters"
          >
            <Filter className="h-3 w-3 mr-1" />
            Filters
          </Button>
          {entityFilter.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {entityFilter.length} active
            </Badge>
          )}
        </div>
        
        {showFilters && (
          <div className="px-3 py-2 border-b bg-gray-50">
            <div className="text-xs text-gray-600 mb-2">Filter by type:</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(entityIcons).map(([type, Icon]) => (
                <Button
                  key={type}
                  variant={entityFilter.includes(type) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleEntityFilterToggle(type)}
                  className="text-xs h-7"
                  data-testid={`button-filter-${type}`}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {type.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>
        )}

        <CommandList>
          <ScrollArea className="h-[400px]">
            <SearchResultsPanel
              searchResults={searchResults}
              searchHistory={searchHistory}
              searchQuery={searchQuery}
              isLoading={isLoading}
              selectedIndex={selectedIndex}
              onResultClick={handleResultClick}
              highlightMatch={highlightMatch}
              formatDate={formatDate}
            />
          </ScrollArea>
        </CommandList>
      </CommandDialog>
    </>
  );
}

interface SearchResultsPanelProps {
  searchResults?: SearchResponse;
  searchHistory?: string[];
  searchQuery: string;
  isLoading: boolean;
  selectedIndex: number;
  onResultClick: (result: SearchResult) => void;
  highlightMatch: (text: string, query: string) => React.ReactNode;
  formatDate: (date?: string) => string;
}

function SearchResultsPanel({
  searchResults,
  searchHistory,
  searchQuery,
  isLoading,
  selectedIndex,
  onResultClick,
  highlightMatch,
  formatDate,
}: SearchResultsPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!searchQuery && searchHistory && searchHistory.length > 0) {
    return (
      <CommandGroup heading="Recent Searches">
        {searchHistory.map((query, index) => (
          <CommandItem
            key={index}
            className="flex items-center gap-2 px-3 py-2"
            data-testid={`item-history-${index}`}
          >
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="flex-1">{query}</span>
          </CommandItem>
        ))}
      </CommandGroup>
    );
  }

  if (searchQuery && (!searchResults || searchResults.results.length === 0)) {
    return (
      <CommandEmpty>
        <div className="text-center py-8">
          <p className="text-gray-500">No results found for "{searchQuery}"</p>
          <p className="text-sm text-gray-400 mt-2">Try different keywords or filters</p>
        </div>
      </CommandEmpty>
    );
  }

  if (searchResults && searchResults.results.length > 0) {
    // Group results by type
    const groupedResults = searchResults.results.reduce((acc, result) => {
      if (!acc[result.type]) acc[result.type] = [];
      acc[result.type].push(result);
      return acc;
    }, {} as Record<string, SearchResult[]>);

    return (
      <>
        {Object.entries(groupedResults).map(([type, results]) => {
          const Icon = entityIcons[type as keyof typeof entityIcons];
          
          return (
            <CommandGroup key={type} heading={type.replace('_', ' ').toUpperCase()}>
              {results.map((result, index) => {
                const globalIndex = searchResults.results.indexOf(result);
                const isSelected = globalIndex === selectedIndex;
                
                return (
                  <CommandItem
                    key={result.id}
                    onSelect={() => onResultClick(result)}
                    className={cn(
                      "flex items-start gap-3 px-3 py-2 cursor-pointer",
                      isSelected && "bg-gray-100"
                    )}
                    data-testid={`item-result-${result.type}-${index}`}
                  >
                    <div className={cn("p-2 rounded-lg", entityColors[result.type])}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {highlightMatch(result.title, searchQuery)}
                      </div>
                      {result.subtitle && (
                        <div className="text-sm text-gray-500">
                          {result.subtitle}
                        </div>
                      )}
                      {result.description && (
                        <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {highlightMatch(result.description, searchQuery)}
                        </div>
                      )}
                      {result.date && (
                        <div className="text-xs text-gray-400 mt-1">
                          {formatDate(result.date)}
                        </div>
                      )}
                    </div>
                    {result.score && (
                      <Badge variant="outline" className="text-xs">
                        {Math.round(result.score * 100)}%
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
        
        {searchResults.executionTime && (
          <div className="px-3 py-2 text-xs text-gray-400 border-t">
            Found {searchResults.totalCount} results in {searchResults.executionTime}ms
          </div>
        )}
      </>
    );
  }

  return null;
}