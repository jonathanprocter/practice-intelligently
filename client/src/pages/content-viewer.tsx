import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { 
  Search, File, Folder, ExternalLink, Eye, FileText, Database, 
  AlertCircle, Star, Clock, Download, ChevronDown, Filter,
  Image, FileSpreadsheet, FileCode, Check, Square, Users, Calendar,
  ClipboardList, FolderOpen, Target, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Enhanced type definitions
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  owners?: Array<{ displayName: string; emailAddress: string }>;
  starred?: boolean;
}

interface NotionPage {
  id: string;
  properties: {
    title?: { title: Array<{ plain_text: string }> };
    Name?: { title: Array<{ plain_text: string }> };
    [key: string]: any;
  };
  created_time: string;
  last_edited_time: string;
  parent?: { type: string; [key: string]: any };
}

interface NotionDatabase {
  id: string;
  title: Array<{ plain_text: string }>;
  description: Array<{ plain_text: string }>;
  created_time: string;
  last_edited_time: string;
}

interface DatabaseItem {
  id: string;
  type: 'session_note' | 'client' | 'appointment' | 'document' | 'action_item';
  title: string;
  clientName?: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  metadata?: any;
}

interface FilterState {
  fileType: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Custom hook for local storage
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  };

  return [storedValue, setValue];
}

// Loading skeleton component
const FileListSkeleton: React.FC = () => (
  <div className="space-y-2">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
    ))}
  </div>
);

// Enhanced content preview component
const ContentPreview: React.FC<{ 
  content: any; 
  mimeType?: string; 
  type: 'drive' | 'notion' 
}> = ({ content, mimeType, type }) => {
  if (!content) return null;

  // Handle different Google Drive content types
  if (type === 'drive') {
    if (mimeType?.includes('image')) {
      return (
        <div className="flex justify-center">
          <img 
            src={content.thumbnailLink || content.url} 
            alt={content.name} 
            className="max-w-full rounded-lg shadow-lg"
          />
        </div>
      );
    }

    if (mimeType?.includes('pdf')) {
      return (
        <iframe 
          src={content.url} 
          className="w-full h-96 rounded-lg border"
          title="PDF Preview"
        />
      );
    }
  }

  // Handle Notion content
  if (type === 'notion' && content.blocks) {
    return (
      <div className="prose max-w-none">
        {content.blocks.map((block: any, index: number) => (
          <div key={index} className="mb-2">
            {block.type === 'paragraph' && (
              <p>{block.paragraph?.text?.[0]?.plain_text || ''}</p>
            )}
            {block.type === 'heading_1' && (
              <h1 className="text-2xl font-bold">{block.heading_1?.text?.[0]?.plain_text || ''}</h1>
            )}
            {block.type === 'heading_2' && (
              <h2 className="text-xl font-semibold">{block.heading_2?.text?.[0]?.plain_text || ''}</h2>
            )}
            {block.type === 'bulleted_list_item' && (
              <li>{block.bulleted_list_item?.text?.[0]?.plain_text || ''}</li>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Default text/JSON preview
  return (
    <div className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
      <pre className="whitespace-pre-wrap text-sm font-mono">
        {typeof content === 'string' 
          ? content 
          : JSON.stringify(content, null, 2)}
      </pre>
    </div>
  );
};

// Simple Select Component (fallback if not available)
const SimpleSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}> = ({ value, onChange, options, placeholder }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-therapy-primary"
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

export default function ContentViewer() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [selectedPage, setSelectedPage] = useState<NotionPage | null>(null);
  const [activeTab, setActiveTab] = useState('drive');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedDatabaseItem, setSelectedDatabaseItem] = useState<DatabaseItem | null>(null);
  const [databaseCategory, setDatabaseCategory] = useState('session_notes');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DatabaseItem | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    fileType: 'all',
    sortBy: 'modifiedTime',
    sortOrder: 'desc'
  });

  // Local storage for favorites and recent items
  const [favorites, setFavorites] = useLocalStorage<string[]>('favoriteFiles', []);
  const [recentlyViewed, setRecentlyViewed] = useLocalStorage<any[]>('recentFiles', []);

  // Refs for keyboard navigation
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileListRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (item: DatabaseItem) => {
      const endpoint = {
        session_note: `/api/session-notes/${item.id}`,
        client: `/api/clients/${item.id}`,
        appointment: `/api/appointments/${item.id}`,
        action_item: `/api/action-items/${item.id}`
      }[item.type as keyof typeof endpoint] || null;

      if (!endpoint) throw new Error('Unsupported item type');

      const res = await fetch(endpoint, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');
      return res.json();
    },
    onSuccess: (_, deletedItem) => {
      // Invalidate and refetch relevant queries
      const queryKeyMap = {
        session_note: ['session-notes', therapistId],
        client: ['clients', therapistId],
        appointment: ['appointments', therapistId],
        action_item: ['action-items', therapistId]
      } as const;
      
      const queryKey = queryKeyMap[deletedItem.type as keyof typeof queryKeyMap];

      if (queryKey) {
        queryClient.invalidateQueries({ queryKey });
      }

      // Clear selection if deleted item was selected
      if (selectedDatabaseItem?.id === deletedItem.id) {
        setSelectedDatabaseItem(null);
      }

      toast({
        title: 'Item deleted',
        description: `${deletedItem.type.replace('_', ' ')} has been deleted successfully.`,
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete the item. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Database queries
  const { data: sessionNotes, isLoading: sessionNotesLoading } = useQuery({
    queryKey: ['session-notes', therapistId],
    queryFn: async () => {
      const res = await fetch(`/api/session-notes/therapist/${therapistId}`);
      if (!res.ok) throw new Error('Failed to fetch session notes');
      return res.json();
    },
    enabled: activeTab === 'database' && databaseCategory === 'session_notes',
  });

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients', therapistId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${therapistId}`);
      if (!res.ok) throw new Error('Failed to fetch clients');
      return res.json();
    },
    enabled: activeTab === 'database' && databaseCategory === 'clients',
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments', therapistId],
    queryFn: async () => {
      const res = await fetch(`/api/appointments/${therapistId}`);
      if (!res.ok) throw new Error('Failed to fetch appointments');
      return res.json();
    },
    enabled: activeTab === 'database' && databaseCategory === 'appointments',
  });

  const { data: actionItems, isLoading: actionItemsLoading } = useQuery({
    queryKey: ['action-items', therapistId],
    queryFn: async () => {
      const res = await fetch(`/api/action-items/${therapistId}`);
      if (!res.ok) throw new Error('Failed to fetch action items');
      return res.json();
    },
    enabled: activeTab === 'database' && databaseCategory === 'action_items',
  });

  const { data: databaseSearchResults, isLoading: databaseSearchLoading } = useQuery({
    queryKey: ['database-search', debouncedSearchQuery, databaseCategory],
    queryFn: async () => {
      // This would ideally be a unified search endpoint
      const endpoint = {
        session_notes: `/api/session-notes/therapist/${therapistId}`,
        clients: `/api/clients/${therapistId}`,
        appointments: `/api/appointments/${therapistId}`,
        action_items: `/api/action-items/${therapistId}`
      }[databaseCategory];
      
      if (!endpoint) return [];
      
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      
      // Filter based on search query
      return data.filter((item: any) => {
        const searchFields = [
          item.title, item.content, item.firstName, item.lastName,
          item.clientName, item.description, item.notes
        ].filter(Boolean);
        
        return searchFields.some((field: string) => 
          field.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        );
      });
    },
    enabled: debouncedSearchQuery.length > 2 && activeTab === 'database',
  });

  // Google Drive infinite query with pagination
  const {
    data: driveData,
    fetchNextPage: fetchNextDrivePage,
    hasNextPage: hasNextDrivePage,
    isLoading: driveLoading,
    error: driveError,
    refetch: refetchDrive
  } = useInfiniteQuery({
    queryKey: ['drive-files', filters],
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams({
        ...(pageParam && { pageToken: pageParam }),
        orderBy: `${filters.sortBy} ${filters.sortOrder}`,
        ...(filters.fileType !== 'all' && { mimeType: filters.fileType })
      });

      const res = await fetch(`/api/drive/files?${params}`);
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Authentication expired. Please re-authenticate.');
        }
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch files');
      }
      return res.json();
    },
    initialPageParam: null,
    getNextPageParam: (lastPage: any) => lastPage?.nextPageToken,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Flatten pages for display
  const driveFiles = useMemo(() => 
    driveData?.pages?.flatMap((page: any) => 
      Array.isArray(page) ? page : (page?.files || [])
    ) || [],
    [driveData]
  );

  // Search query with debouncing
  const { data: driveSearchResults, isLoading: driveSearchLoading } = useQuery({
    queryKey: ['drive-search', debouncedSearchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/drive/search?q=${encodeURIComponent(debouncedSearchQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: debouncedSearchQuery.length > 2,
  });

  // File content query with caching
  const { data: fileContent, isLoading: fileContentLoading } = useQuery({
    queryKey: ['drive-file-content', selectedFile?.id],
    queryFn: async () => {
      const res = await fetch(`/api/drive/files/${selectedFile?.id}`);
      if (!res.ok) throw new Error('Failed to fetch file content');
      const content = await res.json();

      // Cache the content
      queryClient.setQueryData(['file-content-cache', selectedFile?.id], content);
      return content;
    },
    enabled: !!selectedFile,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Notion queries
  const { data: notionPages, isLoading: notionPagesLoading } = useQuery({
    queryKey: ['notion-pages'],
    queryFn: async () => {
      const res = await fetch('/api/notion/pages');
      if (!res.ok) throw new Error('Failed to fetch Notion pages');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: notionDatabases, isLoading: notionDbLoading } = useQuery({
    queryKey: ['notion-databases'],
    queryFn: async () => {
      const res = await fetch('/api/notion/databases');
      if (!res.ok) throw new Error('Failed to fetch Notion databases');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: notionSearchResults, isLoading: notionSearchLoading } = useQuery({
    queryKey: ['notion-search', debouncedSearchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/notion/search?q=${encodeURIComponent(debouncedSearchQuery)}`);
      if (!res.ok) throw new Error('Notion search failed');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: debouncedSearchQuery.length > 2 && activeTab === 'notion',
  });

  const { data: pageContent, isLoading: pageContentLoading } = useQuery({
    queryKey: ['notion-page-content', selectedPage?.id],
    queryFn: async () => {
      const res = await fetch(`/api/notion/pages/${selectedPage?.id}/content`);
      if (!res.ok) throw new Error('Failed to fetch page content');
      return res.json();
    },
    enabled: !!selectedPage,
    staleTime: 5 * 60 * 1000,
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + / to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Escape to clear selection
      if (e.key === 'Escape') {
        setSelectedFile(null);
        setSelectedPage(null);
        setSelectedItems(new Set());
      }

      // Ctrl/Cmd + A to select all visible items
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && fileListRef.current === document.activeElement) {
        e.preventDefault();
        const allIds = new Set(currentDriveFiles.map((f: DriveFile) => f.id));
        setSelectedItems(allIds as Set<string>);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Prefetch common queries
  useEffect(() => {
    queryClient.prefetchQuery({ 
      queryKey: ['drive-files'], 
      queryFn: () => fetch('/api/drive/files').then(res => res.json())
    });
  }, [queryClient]);

  // Update recently viewed
  const updateRecentlyViewed = useCallback((item: any) => {
    setRecentlyViewed((prev: any[]) => {
      const filtered = prev.filter((i: any) => i.id !== item.id);
      return [item, ...filtered].slice(0, 10);
    });
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((file: DriveFile) => {
    setSelectedFile(file);
    updateRecentlyViewed(file);
  }, [updateRecentlyViewed]);

  // Handle page selection
  const handlePageSelect = useCallback((page: NotionPage) => {
    setSelectedPage(page);
    updateRecentlyViewed(page);
  }, [updateRecentlyViewed]);

  // Delete handlers
  const handleDeleteClick = useCallback((item: DatabaseItem, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Delete clicked for item:', item);
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
    console.log('Delete dialog state set to true');
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  }, [itemToDelete, deleteMutation]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  }, []);

  // Handle database item selection
  const handleDatabaseItemSelect = useCallback((item: DatabaseItem) => {
    setSelectedDatabaseItem(item);
    updateRecentlyViewed(item);
  }, [updateRecentlyViewed]);

  // Toggle favorite
  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev: string[]) => 
      prev.includes(id) 
        ? prev.filter((f: string) => f !== id)
        : [...prev, id]
    );
  }, []);

  // Toggle selection for bulk actions
  const toggleSelection = useCallback((id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Bulk download handler
  const handleBulkDownload = async () => {
    const items = Array.from(selectedItems);
    if (items.length === 0) {
      alert('Please select items to download');
      return;
    }

    try {
      for (const id of items) {
        const file = driveFiles.find((f: DriveFile) => f.id === id);
        if (file?.webViewLink) {
          window.open(file.webViewLink, '_blank');
        }
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('An error occurred while downloading files');
    }
  };

  // Helper functions
  const formatFileSize = (bytes?: string) => {
    if (!bytes) return 'Unknown size';
    const size = parseInt(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.includes('folder')) return <Folder className="h-4 w-4" />;
    if (mimeType?.includes('document') || mimeType?.includes('text')) return <FileText className="h-4 w-4" />;
    if (mimeType?.includes('spreadsheet')) return <FileSpreadsheet className="h-4 w-4" />;
    if (mimeType?.includes('image')) return <Image className="h-4 w-4" />;
    if (mimeType?.includes('code')) return <FileCode className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const getNotionTitle = (page: any) => {
    if (page.properties?.title?.title?.[0]?.plain_text) {
      return page.properties.title.title[0].plain_text;
    }
    if (page.properties?.Name?.title?.[0]?.plain_text) {
      return page.properties.Name.title[0].plain_text;
    }
    return 'Untitled';
  };

  const getDatabaseItemIcon = (type: string) => {
    switch (type) {
      case 'session_note': return <FileText className="h-4 w-4" />;
      case 'client': return <Users className="h-4 w-4" />;
      case 'appointment': return <Calendar className="h-4 w-4" />;
      case 'document': return <FolderOpen className="h-4 w-4" />;
      case 'action_item': return <Target className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  // Enhanced client name extraction from session note content
  const extractClientNameFromContent = (content: string): string | null => {
    if (!content) return null;
    
    // Common patterns for client names in session notes
    const patterns = [
      // Match "Progress Note for [Name]'s Therapy Session" format
      /(?:Progress Note for|Clinical Progress Note for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)'s/i,
      // Match "Session Note for [Name]" format  
      /(?:Session Note for|Therapy Session for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      // Match "Client: [Name]" format
      /(?:Client|Patient|Individual):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      // Match "Session with [Name]" format
      /(?:Session with|Therapy with|Counseling with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      // Match names at beginning of lines followed by common separators
      /(?:^|\n)([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s*-|\s*\(|\s*:|\s*,)/,
      // Match "Subject: [Name]" format
      /Subject:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      // Match "Client Name: [Name]" format
      /Client Name:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      // Match "Name - Session Date" format at start
      /^([A-Z][a-z]+\s+[A-Z][a-z]+)\s*-\s*(?:Session|Therapy|Progress)/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Validate it looks like a real name (at least 2 words, reasonable length)
        if (name.split(' ').length >= 2 && name.length >= 3 && name.length <= 50) {
          return name;
        }
      }
    }
    
    return null;
  };

  const formatDatabaseItem = (item: any, type: string): DatabaseItem => {
    const baseItem = {
      id: item.id,
      type: type as DatabaseItem['type'],
      createdAt: item.createdAt || item.created_at || new Date().toISOString(),
      updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
      metadata: item
    };

    switch (type) {
      case 'session_notes':
        // Try multiple sources for client name
        let clientName = 'Unknown Client';
        
        if (item.clientFirstName && item.clientLastName) {
          clientName = `${item.clientFirstName} ${item.clientLastName}`;
        } else if (item.clientName) {
          clientName = item.clientName;
        } else {
          // Extract from content if available
          const extractedName = extractClientNameFromContent(item.content || item.subjective || item.notes || '');
          if (extractedName) {
            clientName = extractedName;
          }
        }
        
        return {
          ...baseItem,
          type: 'session_note',
          title: item.title || `Session Note - ${new Date(item.createdAt || item.created_at).toLocaleDateString()}`,
          clientName,
          content: item.content || item.subjective || '',
          tags: item.tags || item.aiTags || []
        };
      case 'clients':
        return {
          ...baseItem,
          type: 'client',
          title: `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Unnamed Client',
          content: item.notes || `Phone: ${item.phone || 'N/A'}, Email: ${item.email || 'N/A'}`,
          tags: [item.status || 'active']
        };
      case 'appointments':
        return {
          ...baseItem,
          type: 'appointment',
          title: `${item.type || 'Appointment'} - ${new Date(item.startTime).toLocaleDateString()}`,
          clientName: item.clientName || item.client_name,
          content: item.notes || `${new Date(item.startTime).toLocaleString()} - ${item.status}`,
          tags: [item.status || 'scheduled']
        };
      case 'action_items':
        return {
          ...baseItem,
          type: 'action_item',
          title: item.description || item.title || 'Action Item',
          clientName: item.clientName,
          content: item.notes || `Priority: ${item.priority || 'medium'}, Due: ${item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date'}`,
          tags: [item.status || 'pending', item.priority || 'medium']
        };
      default:
        return {
          ...baseItem,
          title: item.title || item.name || 'Unknown Item',
          content: item.description || item.content || ''
        };
    }
  };

  const currentDriveFiles = debouncedSearchQuery ? (driveSearchResults || []) : driveFiles;
  const currentNotionItems = debouncedSearchQuery 
    ? (notionSearchResults || []) 
    : [...(notionDatabases || []), ...(notionPages || [])];

  const getCurrentDatabaseItems = (): DatabaseItem[] => {
    if (debouncedSearchQuery && databaseSearchResults) {
      return databaseSearchResults.map((item: any) => formatDatabaseItem(item, databaseCategory));
    }

    const data = {
      session_notes: sessionNotes,
      clients: clients,
      appointments: appointments,
      action_items: actionItems
    }[databaseCategory];

    if (!data) return [];
    
    return data.map((item: any) => formatDatabaseItem(item, databaseCategory));
  };

  const currentDatabaseItems = getCurrentDatabaseItems();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-therapy-text">Content Viewer</h1>
          <p className="text-therapy-text/60">Access your Google Drive files and Notion content</p>
        </div>
        {selectedItems.size > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedItems.size} selected</Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBulkDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Selected
            </Button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search files and content... (Ctrl+/)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {activeTab === 'drive' && (
          <div className="flex gap-2">
            <SimpleSelect
              value={filters.fileType}
              onChange={(value) => setFilters({...filters, fileType: value})}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'application/vnd.google-apps.document', label: 'Documents' },
                { value: 'application/vnd.google-apps.spreadsheet', label: 'Spreadsheets' },
                { value: 'image/', label: 'Images' },
                { value: 'application/pdf', label: 'PDFs' }
              ]}
            />

            <SimpleSelect
              value={filters.sortBy}
              onChange={(value) => setFilters({...filters, sortBy: value})}
              options={[
                { value: 'modifiedTime', label: 'Modified' },
                { value: 'name', label: 'Name' },
                { value: 'createdTime', label: 'Created' }
              ]}
            />

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setFilters({...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'})}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${filters.sortOrder === 'asc' ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        )}
      </div>

      {/* Recent Items */}
      {recentlyViewed.length > 0 && !debouncedSearchQuery && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Recently Viewed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {recentlyViewed.slice(0, 5).map((item) => (
                <Button
                  key={item.id}
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => {
                    if (item.mimeType) {
                      handleFileSelect(item);
                    } else {
                      handlePageSelect(item);
                    }
                  }}
                >
                  {item.mimeType ? getFileIcon(item.mimeType) : <FileText className="h-3 w-3 mr-1" />}
                  <span className="ml-1 max-w-[150px] truncate">
                    {item.name || getNotionTitle(item)}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="drive">Google Drive</TabsTrigger>
          <TabsTrigger value="notion">Notion</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        <TabsContent value="drive" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* File List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <File className="h-5 w-5 mr-2" />
                    {debouncedSearchQuery ? 'Search Results' : 'Files'}
                  </span>
                  {selectedItems.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedItems(new Set())}
                    >
                      Clear
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {driveError ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <div className="text-red-500 mb-4">
                      <p>{(driveError as Error).message}</p>
                    </div>
                    <div className="space-x-2">
                      <Button 
                        onClick={() => refetchDrive()}
                        variant="outline"
                      >
                        Retry
                      </Button>
                      <Button 
                        onClick={() => window.location.href = '/api/auth/google'}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Re-authenticate
                      </Button>
                    </div>
                  </div>
                ) : driveLoading || driveSearchLoading ? (
                  <FileListSkeleton />
                ) : !currentDriveFiles || currentDriveFiles.length === 0 ? (
                  <div className="text-center py-8">
                    <File className="h-12 w-12 text-therapy-text/30 mx-auto mb-4" />
                    <p className="text-therapy-text/60">No files found</p>
                    <p className="text-therapy-text/40 text-sm">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <div ref={fileListRef} className="space-y-2" tabIndex={0}>
                    {currentDriveFiles.map((file: DriveFile) => (
                      <div
                        key={file.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedFile?.id === file.id
                            ? 'bg-therapy-primary/10 border-therapy-primary'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleFileSelect(file)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-0 h-auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelection(file.id);
                              }}
                            >
                              {selectedItems.has(file.id) ? 
                                <Check className="h-4 w-4" /> : 
                                <Square className="h-4 w-4" />
                              }
                            </Button>
                            {getFileIcon(file.mimeType)}
                            <div className="flex-1">
                              <p className="font-medium text-sm flex items-center">
                                {file.name}
                                {favorites.includes(file.id) && (
                                  <Star className="h-3 w-3 ml-2 fill-yellow-400 text-yellow-400" />
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.size)} • {new Date(file.modifiedTime).toLocaleDateString()}
                                {file.owners?.[0] && ` • ${file.owners[0].displayName}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(file.id);
                              }}
                            >
                              <Star className={`h-4 w-4 ${favorites.includes(file.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {hasNextDrivePage && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => fetchNextDrivePage()}
                      >
                        Load More
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* File Content */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>File Preview</span>
                  {selectedFile && (
                    <div className="flex items-center space-x-2">
                      {selectedFile.webViewLink && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={selectedFile.webViewLink} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedFile ? (
                  <div className="text-center py-8 text-gray-500">
                    <Eye className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p>Select a file to view its content</p>
                  </div>
                ) : fileContentLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-b pb-2">
                      <h3 className="font-semibold flex items-center">
                        {selectedFile.name}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2"
                          onClick={() => toggleFavorite(selectedFile.id)}
                        >
                          <Star className={`h-4 w-4 ${favorites.includes(selectedFile.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                        </Button>
                      </h3>
                      <p className="text-sm text-gray-500">{selectedFile.mimeType}</p>
                    </div>
                    <ContentPreview 
                      content={fileContent?.content || fileContent} 
                      mimeType={selectedFile.mimeType}
                      type="drive"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notion" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pages and Databases List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  {debouncedSearchQuery ? 'Search Results' : 'Pages & Databases'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {notionPagesLoading || notionDbLoading || notionSearchLoading ? (
                  <FileListSkeleton />
                ) : !currentNotionItems || currentNotionItems.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="h-12 w-12 text-therapy-text/30 mx-auto mb-4" />
                    <p className="text-therapy-text/60">No content found</p>
                    <p className="text-therapy-text/40 text-sm">Check your Notion workspace connection</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Databases */}
                    {!debouncedSearchQuery && notionDatabases && notionDatabases.map((db: NotionDatabase) => (
                      <div
                        key={db.id}
                        className="p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Database className="h-4 w-4" />
                            <div>
                              <p className="font-medium text-sm flex items-center">
                                {db.title?.[0]?.plain_text || 'Untitled Database'}
                                {favorites.includes(db.id) && (
                                  <Star className="h-3 w-3 ml-2 fill-yellow-400 text-yellow-400" />
                                )}
                              </p>
                              <div className="flex items-center space-x-2">
                                <Badge variant="secondary" className="text-xs">Database</Badge>
                                <span className="text-xs text-gray-500">
                                  Updated {new Date(db.last_edited_time).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(db.id);
                            }}
                          >
                            <Star className={`h-4 w-4 ${favorites.includes(db.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Pages */}
                    {(debouncedSearchQuery ? notionSearchResults : notionPages)?.map((page: NotionPage) => (
                      <div
                        key={page.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedPage?.id === page.id
                            ? 'bg-therapy-primary/10 border-therapy-primary'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handlePageSelect(page)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-4 w-4" />
                            <div>
                              <p className="font-medium text-sm flex items-center">
                                {getNotionTitle(page)}
                                {favorites.includes(page.id) && (
                                  <Star className="h-3 w-3 ml-2 fill-yellow-400 text-yellow-400" />
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                Updated {new Date(page.last_edited_time).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(page.id);
                              }}
                            >
                              <Star className={`h-4 w-4 ${favorites.includes(page.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Page Content */}
            <Card>
              <CardHeader>
                <CardTitle>Page Content</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedPage ? (
                  <div className="text-center py-8 text-gray-500">
                    <Eye className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p>Select a page to view its content</p>
                  </div>
                ) : pageContentLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-b pb-2">
                      <h3 className="font-semibold flex items-center">
                        {getNotionTitle(selectedPage)}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2"
                          onClick={() => toggleFavorite(selectedPage.id)}
                        >
                          <Star className={`h-4 w-4 ${favorites.includes(selectedPage.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                        </Button>
                      </h3>
                      <p className="text-sm text-gray-500">
                        Last edited: {new Date(selectedPage.last_edited_time).toLocaleDateString()}
                      </p>
                    </div>
                    <ContentPreview 
                      content={pageContent} 
                      type="notion"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          {/* Database Category Selector */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <SimpleSelect
                value={databaseCategory}
                onChange={(value) => setDatabaseCategory(value)}
                options={[
                  { value: 'session_notes', label: 'Session Notes & Progress Notes' },
                  { value: 'clients', label: 'Clients' },
                  { value: 'appointments', label: 'Appointments' },
                  { value: 'action_items', label: 'Action Items' }
                ]}
              />
            </div>
            <Badge variant="outline" className="flex items-center">
              <Database className="h-3 w-3 mr-1" />
              {currentDatabaseItems.length} items
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Database Items List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Database className="h-5 w-5 mr-2" />
                    {debouncedSearchQuery ? 'Search Results' : 
                      databaseCategory.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')
                    }
                  </span>
                  {selectedItems.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedItems(new Set())}
                    >
                      Clear
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessionNotesLoading || clientsLoading || appointmentsLoading || actionItemsLoading || databaseSearchLoading ? (
                  <FileListSkeleton />
                ) : !currentDatabaseItems || currentDatabaseItems.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="h-12 w-12 text-therapy-text/30 mx-auto mb-4" />
                    <p className="text-therapy-text/60">No {databaseCategory.replace('_', ' ')} found</p>
                    <p className="text-therapy-text/40 text-sm">Try adjusting your search or category</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentDatabaseItems.map((item: DatabaseItem) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedDatabaseItem?.id === item.id
                            ? 'bg-therapy-primary/10 border-therapy-primary'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleDatabaseItemSelect(item)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-0 h-auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelection(item.id);
                              }}
                            >
                              {selectedItems.has(item.id) ? 
                                <Check className="h-4 w-4" /> : 
                                <Square className="h-4 w-4" />
                              }
                            </Button>
                            {getDatabaseItemIcon(item.type)}
                            <div className="flex-1">
                              <p className="font-medium text-sm flex items-center">
                                {item.title}
                                {favorites.includes(item.id) && (
                                  <Star className="h-3 w-3 ml-2 fill-yellow-400 text-yellow-400" />
                                )}
                              </p>
                              <div className="flex items-center space-x-2">
                                {item.clientName && (
                                  <Badge variant="secondary" className="text-xs">
                                    {item.clientName}
                                  </Badge>
                                )}
                                {item.tags?.map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              <p className="text-xs text-gray-500">
                                Updated {new Date(item.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(item.id);
                              }}
                            >
                              <Star className={`h-4 w-4 ${favorites.includes(item.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => handleDeleteClick(item, e)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              data-testid={`button-delete-${item.type}-${item.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Database Item Content */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Item Details</span>
                  {selectedDatabaseItem && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        {selectedDatabaseItem.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedDatabaseItem ? (
                  <div className="text-center py-8 text-gray-500">
                    <Eye className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p>Select an item to view its details</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-b pb-2">
                      <h3 className="font-semibold flex items-center">
                        {getDatabaseItemIcon(selectedDatabaseItem.type)}
                        <span className="ml-2">{selectedDatabaseItem.title}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2"
                          onClick={() => toggleFavorite(selectedDatabaseItem.id)}
                        >
                          <Star className={`h-4 w-4 ${favorites.includes(selectedDatabaseItem.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                        </Button>
                      </h3>
                      {selectedDatabaseItem.clientName && (
                        <p className="text-sm text-therapy-primary font-medium">
                          Client: {selectedDatabaseItem.clientName}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        Created: {new Date(selectedDatabaseItem.createdAt).toLocaleDateString()}
                        {' • '}
                        Updated: {new Date(selectedDatabaseItem.updatedAt).toLocaleDateString()}
                      </p>
                      {selectedDatabaseItem.tags && selectedDatabaseItem.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {selectedDatabaseItem.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                      <pre className="whitespace-pre-wrap text-sm">
                        {selectedDatabaseItem.content || 'No content available'}
                      </pre>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                      {selectedDatabaseItem.type === 'session_note' && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/session-notes`} target="_blank">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open in Session Notes
                          </a>
                        </Button>
                      )}
                      {selectedDatabaseItem.type === 'client' && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/clients`} target="_blank">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open in Clients
                          </a>
                        </Button>
                      )}
                      {selectedDatabaseItem.type === 'appointment' && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/appointments`} target="_blank">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open in Calendar
                          </a>
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => handleDeleteClick(selectedDatabaseItem, e)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        data-testid={`button-delete-selected-${selectedDatabaseItem.type}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {itemToDelete?.type?.replace('_', ' ') || 'item'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.title || 'this item'}"? 
              {itemToDelete?.clientName && ` for client ${itemToDelete.clientName}`}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel} data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}