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
  Zap
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

  const filteredCheckins = {
    generated: checkins.filter((c: ClientCheckin) => c.status === 'generated'),
    reviewed: checkins.filter((c: ClientCheckin) => c.status === 'reviewed'),
    sent: checkins.filter((c: ClientCheckin) => c.status === 'sent'),
    archived: checkins.filter((c: ClientCheckin) => c.status === 'archived'),
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{filteredCheckins.generated.length}</div>
            <p className="text-xs text-gray-500">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{filteredCheckins.reviewed.length}</div>
            <p className="text-xs text-gray-500">Ready to send</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{filteredCheckins.sent.length}</div>
            <p className="text-xs text-gray-500">Delivered to clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Archived</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{filteredCheckins.archived.length}</div>
            <p className="text-xs text-gray-500">Completed</p>
          </CardContent>
        </Card>
      </div>

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
              <div className="grid gap-4">
                {filteredCheckins[tab].map((checkin: ClientCheckin) => (
                  <Card key={checkin.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTypeIcon(checkin.checkinType)}
                            <h3 className="font-semibold">{checkin.subject}</h3>
                            <Badge className={getPriorityColor(checkin.priority)}>
                              {checkin.priority}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              {getStatusIcon(checkin.status)}
                              {checkin.status}
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {checkin.messageContent}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Type: {checkin.checkinType.replace('_', ' ')}</span>
                            <span>Method: {checkin.deliveryMethod}</span>
                            <span>Expires: {new Date(checkin.expiresAt).toLocaleDateString()}</span>
                          </div>

                          {checkin.aiReasoning && (
                            <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                              <strong>AI Reasoning:</strong> {checkin.aiReasoning}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePreview(checkin)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                          </Button>

                          {checkin.status === 'generated' && (
                            <Button
                              size="sm"
                              onClick={() => handleApprove(checkin)}
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                          )}

                          {(checkin.status === 'reviewed' || checkin.status === 'approved') && (
                            <Button
                              size="sm"
                              onClick={() => handleSend(checkin)}
                              disabled={sendCheckinMutation.isPending}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <Send className="h-3 w-3 mr-1" />
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
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
    </div>
  );
}