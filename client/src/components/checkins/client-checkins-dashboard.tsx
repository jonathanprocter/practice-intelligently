import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mail, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Send,
  Eye,
  Archive,
  Brain,
  Zap,
  Search,
  Filter,
  MoreHorizontal,
  Users,
  Activity,
  TrendingUp,
  X,
  Loader2,
  ChevronDown,
  Edit,
  Trash2,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ClientCheckin {
  id: string;
  clientId: string;
  therapistId: string;
  checkinType: string;
  priority: string;
  subject: string;
  messageContent: string;
  aiReasoning?: string;
  triggerContext: any;
  deliveryMethod: string;
  status: string;
  generatedAt: Date;
  reviewedAt?: Date;
  sentAt?: Date;
  archivedAt?: Date;
  expiresAt: Date;
  clientResponse?: string;
  responseReceivedAt?: Date;
}

export default function ClientCheckinsDashboard() {
  const [selectedCheckin, setSelectedCheckin] = useState<ClientCheckin | null>(null);
  const [previewModal, setPreviewModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCheckins, setSelectedCheckins] = useState<string[]>([]);
  const [editModal, setEditModal] = useState(false);
  const [editingCheckin, setEditingCheckin] = useState<ClientCheckin | null>(null);
  const therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c'; // Default therapist
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: checkins = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/client-checkins', therapistId],
    queryFn: async () => {
      const response = await fetch(`/api/client-checkins/${therapistId}`);
      if (!response.ok) throw new Error('Failed to fetch check-ins');
      return response.json();
    },
  });

  const generateAICheckinsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/client-checkins/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ therapistId })
      });
      if (!response.ok) throw new Error('Failed to generate check-ins');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "AI Check-ins Generated",
        description: `Generated ${data.checkins.length} personalized check-ins`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/client-checkins'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate AI check-ins",
        variant: "destructive",
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, clientResponse }: { id: string; status: string; clientResponse?: string }) => {
      const response = await fetch(`/api/client-checkins/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, clientResponse })
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client-checkins'] });
    }
  });

  const sendCheckinMutation = useMutation({
    mutationFn: async ({ id, method }: { id: string; method: string }) => {
      const response = await fetch(`/api/client-checkins/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method })
      });
      if (!response.ok) throw new Error('Failed to send check-in');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Check-in Sent",
        description: "The check-in message has been sent to the client",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/client-checkins'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send check-in",
        variant: "destructive",
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'generated': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'reviewed': return <Eye className="h-4 w-4 text-yellow-500" />;
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'sent': return <Send className="h-4 w-4 text-purple-500" />;
      case 'archived': return <Archive className="h-4 w-4 text-gray-500" />;
      case 'deleted': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'midweek': return <Clock className="h-4 w-4" />;
      case 'followup': return <RefreshCw className="h-4 w-4" />;
      case 'crisis_support': return <AlertTriangle className="h-4 w-4" />;
      case 'goal_reminder': return <Zap className="h-4 w-4" />;
      case 'homework_reminder': return <Brain className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  // Enhanced filtering logic
  const getFilteredCheckins = () => {
    let filtered = checkins;
    
    // Apply search filter
    if (searchFilter) {
      filtered = filtered.filter((c: ClientCheckin) =>
        c.subject.toLowerCase().includes(searchFilter.toLowerCase()) ||
        c.messageContent.toLowerCase().includes(searchFilter.toLowerCase()) ||
        c.clientId.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((c: ClientCheckin) => c.status === statusFilter);
    }
    
    return filtered;
  };

  const allFilteredCheckins = getFilteredCheckins();
  
  const filteredCheckins = {
    all: allFilteredCheckins,
    generated: allFilteredCheckins.filter((c: ClientCheckin) => c.status === 'generated'),
    reviewed: allFilteredCheckins.filter((c: ClientCheckin) => c.status === 'reviewed'),
    sent: allFilteredCheckins.filter((c: ClientCheckin) => c.status === 'sent'),
    archived: allFilteredCheckins.filter((c: ClientCheckin) => c.status === 'archived'),
  };

  // Statistics
  const totalCheckinsNeedingReview = filteredCheckins.generated.length;
  const avgResponseRate = checkins.length > 0 ? Math.round((checkins.filter((c: ClientCheckin) => c.clientResponse).length / checkins.filter((c: ClientCheckin) => c.status === 'sent').length) * 100) || 0 : 0;

  // Bulk actions
  const handleBulkApprove = async () => {
    const promises = selectedCheckins.map(id => 
      updateStatusMutation.mutateAsync({ id, status: 'reviewed' })
    );
    await Promise.all(promises);
    setSelectedCheckins([]);
    toast({
      title: "Bulk Action Completed",
      description: `${selectedCheckins.length} check-ins marked as reviewed`,
    });
  };

  const handleBulkArchive = async () => {
    const promises = selectedCheckins.map(id => 
      updateStatusMutation.mutateAsync({ id, status: 'archived' })
    );
    await Promise.all(promises);
    setSelectedCheckins([]);
    toast({
      title: "Bulk Action Completed", 
      description: `${selectedCheckins.length} check-ins archived`,
    });
  };

  const handleSelectAll = (status: string) => {
    const checkinsInTab = filteredCheckins[status as keyof typeof filteredCheckins] as ClientCheckin[];
    const allIds = checkinsInTab.map((c: ClientCheckin) => c.id);
    setSelectedCheckins(prev => 
      prev.length === allIds.length ? [] : allIds
    );
  };

  const getClientInitials = (clientId: string) => {
    // Mock client name extraction - in real app would come from client data
    return clientId.substring(0, 2).toUpperCase();
  };

  const handlePreview = (checkin: ClientCheckin) => {
    setSelectedCheckin(checkin);
    setPreviewModal(true);
  };

  const handleApprove = async (checkin: ClientCheckin) => {
    await updateStatusMutation.mutateAsync({ 
      id: checkin.id, 
      status: 'approved' 
    });
  };

  const handleSend = async (checkin: ClientCheckin) => {
    await sendCheckinMutation.mutateAsync({ 
      id: checkin.id, 
      method: checkin.deliveryMethod 
    });
  };

  const handleArchive = async (checkin: ClientCheckin) => {
    await updateStatusMutation.mutateAsync({ 
      id: checkin.id, 
      status: 'archived' 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-therapy-text">AI Client Check-ins</h2>
          <p className="text-therapy-text/60">Personalized check-ins generated by AI based on session insights</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => generateAICheckinsMutation.mutate()}
            disabled={generateAICheckinsMutation.isPending}
            className="bg-therapy-primary hover:bg-therapy-primary/90"
          >
            {generateAICheckinsMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            Generate AI Check-ins
          </Button>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Check-ins at a Glance Summary */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-therapy-text">Check-ins at a Glance</h3>
              <p className="text-sm text-therapy-text/60">Current status overview</p>
            </div>
            {totalCheckinsNeedingReview > 0 && (
              <Badge className="bg-orange-100 text-orange-700">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {totalCheckinsNeedingReview} need review
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-2xl font-bold text-blue-600">{filteredCheckins.generated.length}</span>
              </div>
              <p className="text-xs text-therapy-text/60">Generated</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Eye className="h-4 w-4 text-yellow-600" />
                <span className="text-2xl font-bold text-yellow-600">{filteredCheckins.reviewed.length}</span>
              </div>
              <p className="text-xs text-therapy-text/60">Reviewed</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Send className="h-4 w-4 text-purple-600" />
                <span className="text-2xl font-bold text-purple-600">{filteredCheckins.sent.length}</span>
              </div>
              <p className="text-xs text-therapy-text/60">Sent</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Archive className="h-4 w-4 text-gray-600" />
                <span className="text-2xl font-bold text-gray-600">{filteredCheckins.archived.length}</span>
              </div>
              <p className="text-xs text-therapy-text/60">Archived</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-2xl font-bold text-green-600">{avgResponseRate}%</span>
              </div>
              <p className="text-xs text-therapy-text/60">Response Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter Bar */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by client, subject, or message content..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {selectedCheckins.length > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={handleBulkApprove}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve ({selectedCheckins.length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleBulkArchive}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive ({selectedCheckins.length})
                  </Button>
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter: {statusFilter === "all" ? "All" : statusFilter}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Statuses</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("generated")}>Generated</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("reviewed")}>Reviewed</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("sent")}>Sent</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("archived")}>Archived</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="generated" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generated">Generated ({filteredCheckins.generated.length})</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed ({filteredCheckins.reviewed.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({filteredCheckins.sent.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({filteredCheckins.archived.length})</TabsTrigger>
        </TabsList>

        {(['generated', 'reviewed', 'sent', 'archived'] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {filteredCheckins[tab].length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">No {tab} check-ins</p>
                    {tab === 'generated' && (
                      <p className="text-sm text-gray-400 mt-2">
                        Click "Generate AI Check-ins" to create personalized check-ins
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Bulk Actions Bar */}
                {tab !== 'archived' && filteredCheckins[tab].length > 0 && (
                  <Card className="bg-gray-50">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedCheckins.length === filteredCheckins[tab].length && filteredCheckins[tab].length > 0}
                            onCheckedChange={() => handleSelectAll(tab)}
                          />
                          <span className="text-sm font-medium">
                            {selectedCheckins.length > 0 ? `${selectedCheckins.length} selected` : `Select all ${filteredCheckins[tab].length} check-ins`}
                          </span>
                        </div>
                        {selectedCheckins.length > 0 && (
                          <div className="flex gap-2">
                            {tab === 'generated' && (
                              <Button variant="outline" size="sm" onClick={handleBulkApprove}>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Mark as Reviewed
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={handleBulkArchive}>
                              <Archive className="h-4 w-4 mr-1" />
                              Archive Selected
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Enhanced Check-in Cards */}
                <div className="grid gap-4">
                  {filteredCheckins[tab].map((checkin: ClientCheckin) => (
                    <Card key={checkin.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-400">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Selection Checkbox */}
                          <Checkbox
                            checked={selectedCheckins.includes(checkin.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCheckins(prev => [...prev, checkin.id]);
                              } else {
                                setSelectedCheckins(prev => prev.filter(id => id !== checkin.id));
                              }
                            }}
                          />

                          {/* Client Avatar */}
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-therapy-primary text-white">
                              {getClientInitials(checkin.clientId)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Main Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-therapy-text truncate">{checkin.subject}</h3>
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                <Brain className="h-3 w-3 mr-1" />
                                AI-generated
                              </Badge>
                              <Badge className={getPriorityColor(checkin.priority)}>
                                {checkin.priority}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-4 mb-2 text-sm text-therapy-text/60">
                              <div className="flex items-center gap-1">
                                {getTypeIcon(checkin.checkinType)}
                                <span>{checkin.checkinType.replace('_', ' ')}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(checkin.status)}
                                <span className="capitalize">{checkin.status}</span>
                              </div>
                              <span>{new Date(checkin.generatedAt).toLocaleDateString()} • {new Date(checkin.generatedAt).toLocaleTimeString()}</span>
                            </div>
                            
                            <div className="bg-gray-50 rounded-lg p-3 mb-3">
                              <p className="text-sm text-therapy-text/80 leading-relaxed">
                                {checkin.messageContent.length > 150 
                                  ? `${checkin.messageContent.substring(0, 150)}...` 
                                  : checkin.messageContent}
                              </p>
                              {checkin.messageContent.length > 150 && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="mt-2 p-0 h-auto text-xs text-therapy-primary"
                                  onClick={() => handlePreview(checkin)}
                                >
                                  Read full message
                                </Button>
                              )}
                            </div>

                            {checkin.aiReasoning && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                                <div className="flex items-start gap-2">
                                  <Brain className="h-4 w-4 text-blue-600 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-medium text-blue-900 mb-1">AI Clinical Insight</p>
                                    <p className="text-xs text-blue-700">{checkin.aiReasoning}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Menu */}
                          <div className="flex items-center gap-2">
                            {/* Primary Action Button */}
                            {checkin.status === 'generated' && (
                              <Button
                                size="sm"
                                onClick={() => handleApprove(checkin)}
                                disabled={updateStatusMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {updateStatusMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                )}
                                Review & Send
                              </Button>
                            )}

                            {(checkin.status === 'reviewed' || checkin.status === 'approved') && (
                              <Button
                                size="sm"
                                onClick={() => handleSend(checkin)}
                                disabled={sendCheckinMutation.isPending}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                {sendCheckinMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Send className="h-3 w-3 mr-1" />
                                )}
                                Send
                              </Button>
                            )}

                            {checkin.status === 'sent' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleArchive(checkin)}
                                disabled={updateStatusMutation.isPending}
                              >
                                <Archive className="h-3 w-3 mr-1" />
                                Archive
                              </Button>
                            )}

                            {/* More Actions Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handlePreview(checkin)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setEditingCheckin(checkin);
                                  setEditModal(true);
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => updateStatusMutation.mutate({ id: checkin.id, status: 'archived' })}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={previewModal} onOpenChange={setPreviewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCheckin && getTypeIcon(selectedCheckin.checkinType)}
              Check-in Preview
            </DialogTitle>
            <DialogDescription>
              Preview the check-in message before sending
            </DialogDescription>
          </DialogHeader>

          {selectedCheckin && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Client:</strong> {selectedCheckin.clientId}
                </div>
                <div>
                  <strong>Type:</strong> {selectedCheckin.checkinType.replace('_', ' ')}
                </div>
                <div>
                  <strong>Priority:</strong> 
                  <Badge className={`ml-2 ${getPriorityColor(selectedCheckin.priority)}`}>
                    {selectedCheckin.priority}
                  </Badge>
                </div>
                <div>
                  <strong>Method:</strong> {selectedCheckin.deliveryMethod}
                </div>
              </div>

              <div>
                <strong>Subject:</strong>
                <div className="mt-1 p-2 bg-gray-50 rounded">{selectedCheckin.subject}</div>
              </div>

              <div>
                <strong>Message:</strong>
                <Textarea
                  value={selectedCheckin.messageContent}
                  readOnly
                  rows={8}
                  className="mt-1"
                />
              </div>

              {selectedCheckin.aiReasoning && (
                <div>
                  <strong>AI Reasoning:</strong>
                  <div className="mt-1 p-2 bg-blue-50 rounded text-sm text-blue-700">
                    {selectedCheckin.aiReasoning}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setPreviewModal(false)}>
                  Close
                </Button>
                {selectedCheckin.status === 'generated' && (
                  <Button
                    onClick={() => {
                      handleApprove(selectedCheckin);
                      setPreviewModal(false);
                    }}
                    disabled={updateStatusMutation.isPending}
                  >
                    Approve & Send
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Check-in Message</DialogTitle>
            <DialogDescription>
              Modify the check-in content before sending
            </DialogDescription>
          </DialogHeader>

          {editingCheckin && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    value={editingCheckin.subject}
                    onChange={(e) => setEditingCheckin({
                      ...editingCheckin,
                      subject: e.target.value
                    })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <select 
                    value={editingCheckin.priority}
                    onChange={(e) => setEditingCheckin({
                      ...editingCheckin,
                      priority: e.target.value
                    })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Message Content</label>
                <Textarea
                  value={editingCheckin.messageContent}
                  onChange={(e) => setEditingCheckin({
                    ...editingCheckin,
                    messageContent: e.target.value
                  })}
                  rows={8}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditModal(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  // Update checkin via API here
                  setEditModal(false);
                  toast({
                    title: "Check-in Updated",
                    description: "Changes saved successfully",
                  });
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bottom Analytics Panel */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Activity className="w-5 h-5 mr-2 text-therapy-primary" />
              Quick Actions & Analytics
            </div>
            <Button 
              onClick={() => generateAICheckinsMutation.mutate()}
              disabled={generateAICheckinsMutation.isPending}
              className="bg-therapy-primary hover:bg-therapy-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Generate All Pending Check-Ins
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Mini Response Rate Chart */}
            <div className="text-center">
              <div className="h-16 w-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <p className="font-semibold text-therapy-text">Response Rate This Week</p>
              <p className="text-2xl font-bold text-green-600">{avgResponseRate}%</p>
              <p className="text-xs text-therapy-text/60">Up from 78% last week</p>
            </div>

            {/* Engagement Insights */}
            <div className="text-center">
              <div className="h-16 w-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <p className="font-semibold text-therapy-text">Client Engagement</p>
              <p className="text-2xl font-bold text-blue-600">{filteredCheckins.sent.length}</p>
              <p className="text-xs text-therapy-text/60">Active check-ins sent this week</p>
            </div>

            {/* AI Efficiency */}
            <div className="text-center">
              <div className="h-16 w-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                <Brain className="h-8 w-8 text-purple-600" />
              </div>
              <p className="font-semibold text-therapy-text">AI Efficiency</p>
              <p className="text-2xl font-bold text-purple-600">{Math.round((filteredCheckins.generated.length / (checkins.length || 1)) * 100)}%</p>
              <p className="text-xs text-therapy-text/60">Check-ins generated automatically</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}