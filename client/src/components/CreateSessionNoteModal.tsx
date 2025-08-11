import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { FileText, Loader2 } from 'lucide-react';

interface CreateSessionNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  appointmentId: string;
  appointmentDate: string;
}

interface SessionNoteData {
  clientId: string;
  therapistId: string;
  content: string;
  appointmentId: string;
  source: string;
}

export function CreateSessionNoteModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  appointmentId,
  appointmentDate
}: CreateSessionNoteModalProps) {
  const [content, setContent] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createSessionNoteMutation = useMutation({
    mutationFn: async (data: SessionNoteData) => {
      return apiRequest('/api/session-notes', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Session Note Created",
        description: `Session note for ${clientName} has been created successfully.`,
      });
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/session-notes/client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });
      
      // Reset form and close modal
      setContent('');
      onClose();
    },
    onError: (error: any) => {
      console.error('Error creating session note:', error);
      toast({
        title: "Error",
        description: "Failed to create session note. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast({
        title: "Content Required",
        description: "Please enter session note content before saving.",
        variant: "destructive",
      });
      return;
    }

    createSessionNoteMutation.mutate({
      clientId,
      therapistId: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c', // Using the standard therapist ID
      content: content.trim(),
      appointmentId,
      source: 'manual'
    });
  };

  const handleClose = () => {
    if (!createSessionNoteMutation.isPending) {
      setContent('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Create Session Note
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            <p><strong>Client:</strong> {clientName}</p>
            <p><strong>Appointment:</strong> {new Date(appointmentDate).toLocaleString()}</p>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-content">Session Notes</Label>
            <Textarea
              id="session-content"
              placeholder="Enter your session notes here... Include details about interventions, client progress, homework assignments, observations, and any other relevant therapeutic information."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="resize-none"
              disabled={createSessionNoteMutation.isPending}
              data-testid="textarea-session-content"
            />
            <div className="text-xs text-muted-foreground">
              This session note will be linked to the appointment and saved to the client's record.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createSessionNoteMutation.isPending}
              data-testid="button-cancel-session-note"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createSessionNoteMutation.isPending || !content.trim()}
              data-testid="button-save-session-note"
            >
              {createSessionNoteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Create Session Note
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}