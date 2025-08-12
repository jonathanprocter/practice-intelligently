import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit2, Save } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface EditSessionNoteTitleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTitleUpdated?: () => void;
  note: {
    id: string;
    title?: string;
    content: string;
    createdAt: string;
    clientName?: string;
  } | null;
}

export function EditSessionNoteTitleModal({
  isOpen,
  onClose,
  note,
  onTitleUpdated
}: EditSessionNoteTitleModalProps) {
  const [title, setTitle] = useState(note?.title || '');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Don't render if no note is provided or modal is not open
  if (!note || !isOpen) {
    return null;
  }

  // Reset title when note changes
  React.useEffect(() => {
    if (note?.title !== undefined) {
      setTitle(note.title || '');
    }
  }, [note?.title]);

  const updateTitleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      return apiRequest('PATCH', `/api/session-notes/${note.id}`, {
        title: newTitle
      });
    },
    onSuccess: () => {
      toast({
        title: "Title Updated",
        description: "Session note title has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/session-notes'] });
      onTitleUpdated?.();
      onClose();
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Could not update the session note title.",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    if (title.trim()) {
      updateTitleMutation.mutate(title.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-4 h-4" />
            Edit Session Note Title
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title..."
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
              data-testid="input-edit-title"
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Client:</strong> {note.clientName}</p>
            <p><strong>Date:</strong> {new Date(note.createdAt).toLocaleDateString()}</p>
            <p><strong>Preview:</strong> {note.content.substring(0, 100)}...</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel">
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateTitleMutation.isPending || !title.trim()}
            data-testid="button-save"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Title
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}