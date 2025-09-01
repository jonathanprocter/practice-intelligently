import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Calendar, 
  FileText, 
  Clock, 
  User, 
  Tag, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Link,
  Plus,
  Filter,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  FileCheck,
  Loader2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface TimelineItem {
  id: string;
  type: 'appointment' | 'progress_note' | 'chart_note' | 'document_progress_note' | 'calendar_event';
  date: string;
  endDate?: string;
  title: string;
  content?: string;
  clientId?: string;
  clientName?: string;
  appointmentId?: string;
  googleEventId?: string;
  tags?: string[];
  status?: 'completed' | 'scheduled' | 'cancelled' | 'no_show' | 'unlinked' | 'linked' | 'needs_reconciliation';
  source?: 'manual' | 'google_calendar' | 'document_upload' | 'document_import' | 'auto_generated';
  isProgressNote?: boolean;
  progressNoteType?: 'SOAP' | 'narrative' | 'document';
  hasProgressNotes?: boolean;
  progressNoteCount?: number;
  metadata?: {
    duration?: number;
    location?: string;
    therapist?: string;
    appointmentType?: string;
    documentType?: string;
    fileName?: string;
    fileType?: string;
    category?: string;
    subcategory?: string;
    sensitivityLevel?: string;
    reconciliationStatus?: 'matched' | 'pending' | 'unmatched';
    needsProcessing?: boolean;
    needsAppointmentCreation?: boolean;
    needsReconciliation?: boolean;
    suggestedAction?: string;
    linkedSessionNotes?: Array<{
      id: string;
      title: string;
      type: string;
    }>;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    documentId?: string;
  };
}

interface EnhancedClinicalTimelineProps {
  clientId?: string;
  therapistId: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export const EnhancedClinicalTimeline: React.FC<EnhancedClinicalTimelineProps> = ({
  clientId,
  therapistId,
  dateRange
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'appointments' | 'progress_notes' | 'documents' | 'unlinked'>('all');
  const [showUnlinked, setShowUnlinked] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch comprehensive timeline data
  const { data: timelineData, isLoading, refetch } = useQuery({
    queryKey: ['enhanced-timeline', therapistId, clientId, selectedMonth],
    queryFn: async () => {
      const start = dateRange?.start || startOfMonth(selectedMonth);
      const end = dateRange?.end || endOfMonth(selectedMonth);
      const params = new URLSearchParams({
        includeUnlinked: 'true',
        includeDocuments: 'true',
        autoReconcile: 'true',
        startDate: start.toISOString(),
        endDate: end.toISOString()
      });
      
      if (clientId) {
        params.append('clientId', clientId);
      }
      
      const response = await fetch(`/api/timeline/comprehensive/${therapistId}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch timeline data');
      return response.json();
    }
  });

  // Mutation for processing and reconciling items
  const processItemMutation = useMutation({
    mutationFn: async ({ itemId, itemType }: { itemId: string; itemType: string }) => {
      const response = await fetch('/api/timeline/process-and-reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: itemId.replace(/^(doc-|note-|cal-)/, ''), // Remove prefix
          itemType,
          therapistId,
          createAppointment: true,
          reconcileCalendar: true
        })
      });
      if (!response.ok) throw new Error('Failed to process item');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Processing Complete",
        description: `Successfully ${data.action.replace(/_/g, ' ')}`,
      });
      queryClient.invalidateQueries({ queryKey: ['enhanced-timeline'] });
    },
    onError: (error) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation for batch reconciliation
  const batchReconcileMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/timeline/batch-reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapistId,
          autoCreate: true
        })
      });
      if (!response.ok) throw new Error('Failed to batch reconcile');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Batch Reconciliation Complete",
        description: `Processed ${data.results.processedNotes} notes and ${data.results.processedDocuments} documents`,
      });
      queryClient.invalidateQueries({ queryKey: ['enhanced-timeline'] });
    },
    onError: (error) => {
      toast({
        title: "Batch Reconciliation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Filter items based on selected filters
  const filteredItems = useMemo(() => {
    if (!timelineData?.items) return [];
    
    let filtered = [...timelineData.items];

    // Filter by type
    switch (filterType) {
      case 'appointments':
        filtered = filtered.filter(item => item.type === 'appointment' || item.type === 'calendar_event');
        break;
      case 'progress_notes':
        filtered = filtered.filter(item => item.isProgressNote === true);
        break;
      case 'documents':
        filtered = filtered.filter(item => item.type === 'document_progress_note');
        break;
      case 'unlinked':
        filtered = filtered.filter(item => 
          item.status === 'unlinked' || 
          item.status === 'needs_reconciliation' ||
          item.metadata?.needsProcessing
        );
        break;
    }

    // Filter by unlinked status
    if (!showUnlinked && filterType !== 'unlinked') {
      filtered = filtered.filter(item => 
        item.status !== 'unlinked' && 
        item.status !== 'needs_reconciliation'
      );
    }

    return filtered;
  }, [timelineData, filterType, showUnlinked]);

  // Group items by date
  const groupedItems = useMemo(() => {
    const groups: Record<string, TimelineItem[]> = {};
    
    filteredItems.forEach(item => {
      const date = format(parseISO(item.date), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
    });

    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredItems]);

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleProcessItem = async (item: TimelineItem) => {
    let itemType = item.type;
    if (item.type === 'chart_note' || item.type === 'progress_note') {
      itemType = item.type;
    } else if (item.type === 'document_progress_note') {
      itemType = 'document_progress_note';
    }
    
    await processItemMutation.mutateAsync({
      itemId: item.id,
      itemType
    });
  };

  const getStatusBadge = (item: TimelineItem) => {
    const statusConfig = {
      completed: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Completed' },
      scheduled: { icon: Clock, color: 'bg-blue-100 text-blue-800', label: 'Scheduled' },
      cancelled: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      no_show: { icon: AlertCircle, color: 'bg-orange-100 text-orange-800', label: 'No Show' },
      unlinked: { icon: Link, color: 'bg-gray-100 text-gray-800', label: 'Unlinked' },
      linked: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Linked' },
      needs_reconciliation: { icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-800', label: 'Needs Reconciliation' }
    };

    const config = statusConfig[item.status || 'unlinked'];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return Calendar;
      case 'progress_note':
      case 'chart_note':
        return FileText;
      case 'document_progress_note':
        return FileCheck;
      case 'calendar_event':
        return Calendar;
      default:
        return FileText;
    }
  };

  const renderProgressNoteContent = (item: TimelineItem) => {
    if (!item.metadata) return null;

    const { subjective, objective, assessment, plan } = item.metadata;
    
    if (subjective || objective || assessment || plan) {
      return (
        <div className="mt-2 space-y-2 text-sm">
          {subjective && (
            <div>
              <span className="font-semibold">Subjective:</span>
              <p className="text-gray-600 mt-1">{subjective}</p>
            </div>
          )}
          {objective && (
            <div>
              <span className="font-semibold">Objective:</span>
              <p className="text-gray-600 mt-1">{objective}</p>
            </div>
          )}
          {assessment && (
            <div>
              <span className="font-semibold">Assessment:</span>
              <p className="text-gray-600 mt-1">{assessment}</p>
            </div>
          )}
          {plan && (
            <div>
              <span className="font-semibold">Plan:</span>
              <p className="text-gray-600 mt-1">{plan}</p>
            </div>
          )}
        </div>
      );
    }

    if (item.content) {
      return (
        <div className="mt-2 text-sm text-gray-600">
          <p>{item.content.substring(0, 300)}...</p>
        </div>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats and actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Clinical Timeline</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Comprehensive view of all progress notes, appointments, and clinical documents
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => batchReconcileMutation.mutate()}
                disabled={batchReconcileMutation.isPending}
              >
                {batchReconcileMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Link className="w-4 h-4 mr-1" />
                )}
                Reconcile All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Statistics */}
          {timelineData?.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{timelineData.stats.totalItems}</div>
                <div className="text-xs text-gray-500">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{timelineData.stats.appointments}</div>
                <div className="text-xs text-gray-500">Appointments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{timelineData.stats.progressNotes}</div>
                <div className="text-xs text-gray-500">Progress Notes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{timelineData.stats.unlinkedProgressNotes}</div>
                <div className="text-xs text-gray-500">Unlinked Notes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{timelineData.stats.documentProgressNotes}</div>
                <div className="text-xs text-gray-500">Document Notes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{timelineData.stats.needsReconciliation}</div>
                <div className="text-xs text-gray-500">Needs Reconciliation</div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {timelineData?.recommendations && timelineData.recommendations.length > 0 && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Recommendations</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {timelineData.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-sm">{rec}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Filters */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              All
            </Button>
            <Button
              variant={filterType === 'appointments' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('appointments')}
            >
              Appointments
            </Button>
            <Button
              variant={filterType === 'progress_notes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('progress_notes')}
            >
              Progress Notes
            </Button>
            <Button
              variant={filterType === 'documents' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('documents')}
            >
              Documents
            </Button>
            <Button
              variant={filterType === 'unlinked' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('unlinked')}
            >
              Needs Processing
              {timelineData?.stats?.needsProcessing > 0 && (
                <Badge className="ml-1" variant="destructive">
                  {timelineData.stats.needsProcessing}
                </Badge>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Items */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-4 pr-4">
          {groupedItems.map(([date, items]) => (
            <div key={date} className="space-y-2">
              <div className="sticky top-0 bg-white z-10 py-2">
                <h3 className="text-sm font-semibold text-gray-700">
                  {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                </h3>
              </div>
              
              {items.map((item) => {
                const Icon = getTypeIcon(item.type);
                const isExpanded = expandedItems.has(item.id);
                const needsAction = item.status === 'unlinked' || 
                                  item.status === 'needs_reconciliation' ||
                                  item.metadata?.needsProcessing;

                return (
                  <Card key={item.id} className={needsAction ? 'border-yellow-300' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <Icon className="w-5 h-5 mt-0.5 text-gray-600" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{item.title}</h4>
                              {getStatusBadge(item)}
                              {item.isProgressNote && (
                                <Badge variant="secondary">
                                  {item.progressNoteType || 'Progress Note'}
                                </Badge>
                              )}
                              {item.hasProgressNotes && (
                                <Badge variant="outline">
                                  {item.progressNoteCount} Notes
                                </Badge>
                              )}
                            </div>
                            
                            {item.clientName && (
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {item.clientName}
                              </p>
                            )}
                            
                            {item.metadata?.location && (
                              <p className="text-sm text-gray-500">
                                📍 {item.metadata.location}
                              </p>
                            )}
                            
                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.tags.map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            
                            {isExpanded && renderProgressNoteContent(item)}
                            
                            {needsAction && (
                              <Alert className="mt-3">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                  {item.metadata?.suggestedAction === 'create_appointment' && (
                                    <div>
                                      <p className="text-sm mb-2">This calendar event needs to be reconciled with your appointment system.</p>
                                      <Button 
                                        size="sm" 
                                        onClick={() => handleProcessItem(item)}
                                        disabled={processItemMutation.isPending}
                                      >
                                        {processItemMutation.isPending ? (
                                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        ) : (
                                          <Plus className="w-4 h-4 mr-1" />
                                        )}
                                        Create Appointment
                                      </Button>
                                    </div>
                                  )}
                                  {item.metadata?.needsProcessing && (
                                    <div>
                                      <p className="text-sm mb-2">This document needs to be processed and converted to a progress note.</p>
                                      <Button 
                                        size="sm" 
                                        onClick={() => handleProcessItem(item)}
                                        disabled={processItemMutation.isPending}
                                      >
                                        {processItemMutation.isPending ? (
                                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        ) : (
                                          <FileCheck className="w-4 h-4 mr-1" />
                                        )}
                                        Process Document
                                      </Button>
                                    </div>
                                  )}
                                  {item.status === 'unlinked' && !item.metadata?.needsProcessing && (
                                    <div>
                                      <p className="text-sm mb-2">This progress note is not linked to any appointment.</p>
                                      <Button 
                                        size="sm" 
                                        onClick={() => handleProcessItem(item)}
                                        disabled={processItemMutation.isPending}
                                      >
                                        {processItemMutation.isPending ? (
                                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        ) : (
                                          <Link className="w-4 h-4 mr-1" />
                                        )}
                                        Find & Link Appointment
                                      </Button>
                                    </div>
                                  )}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleItemExpansion(item.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};