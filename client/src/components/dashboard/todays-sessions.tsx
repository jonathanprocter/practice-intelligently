import { useQuery } from "@tanstack/react-query";
import { ApiClient, type SessionNote } from "@/lib/api";
import { FileText, Clock, User, Upload, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentUploadZone } from "@/components/forms/DocumentUploadZone";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface SessionStats {
  todaysSessions?: number;
  completedSessions?: number;
  upcomingSessions?: number;
  sessionData?: Array<{
    id: string;
    clientName: string;
    time: string;
    status: string;
  }>;
}

interface TodaysSessionsProps {
  stats: SessionStats;
}

export default function TodaysSessions() {
  const [showUpload, setShowUpload] = useState(false);
  const { toast } = useToast();

  const handleSessionNoteGenerated = (note: any) => {
    // Handle the generated session note
    queryClient.invalidateQueries({ queryKey: ['session-notes'] });
    toast({
      title: "Session Note Generated",
      description: "AI has successfully processed your document.",
    });
    setShowUpload(false);
  };

  const { data: sessionNotes, isLoading, refetch } = useQuery({
    queryKey: ['todays-sessions'],
    queryFn: ApiClient.getTodaysSessionNotes,
  });

  if (isLoading) {
    return (
      <div className="therapy-card">
        <div className="p-6 border-b border-therapy-border">
          <h3 className="text-xl font-bold text-therapy-text">Today's Sessions</h3>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="therapy-card">
      <div className="p-6 border-b border-therapy-border">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-therapy-text">Today's Sessions</h3>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowUpload(!showUpload)}
              className="text-therapy-primary hover:text-therapy-primary/80"
            >
              <Upload className="h-4 w-4 mr-1" />
              Upload
            </Button>
            <Button variant="ghost" className="text-therapy-primary hover:text-therapy-primary/80">
              View All Notes
            </Button>
          </div>
        </div>
      </div>

      {/* Document Upload Zone */}
      {showUpload && (
        <div className="px-6 pb-4">
          <DocumentUploadZone onProgressNoteGenerated={handleSessionNoteGenerated} />
        </div>
      )}

      <div className="p-6 space-y-4">
        {sessionNotes && sessionNotes.length > 0 ? (
          sessionNotes.map((note) => (
            <div key={note.id} className="flex items-start space-x-4 p-4 bg-therapy-bg rounded-lg">
              <div className="w-10 h-10 bg-therapy-primary/10 text-therapy-primary rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-therapy-text">Session Note</h4>
                  <div className="flex items-center space-x-1 text-xs text-therapy-text/60">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(note.createdAt)}</span>
                  </div>
                </div>
                <p className="text-therapy-text/70 text-sm mb-2 line-clamp-2">
                  {note.content ? note.content.substring(0, 100) + '...' : 'No content available'}
                </p>
                <div className="flex items-center space-x-2">
                  {note.aiSummary && (
                    <Badge variant="secondary" className="text-xs">
                      AI Analyzed
                    </Badge>
                  )}
                  {note.transcript && (
                    <Badge variant="outline" className="text-xs">
                      Transcript Available
                    </Badge>
                  )}
                  <div className="flex items-center space-x-1 text-xs text-therapy-text/50">
                    <User className="h-3 w-3" />
                    <span>Client ID: {note.clientId.substring(0, 8)}...</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-therapy-text/30 mx-auto mb-4" />
            <p className="text-therapy-text/60">No session notes for today</p>
            <p className="text-therapy-text/40 text-sm mt-1">Session notes will appear here after appointments</p>
          </div>
        )}
      </div>
    </div>
  );
}