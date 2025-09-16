import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Edit2, Save, Calendar, Clock, MapPin } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SessionNote {
  id: string;
  title?: string;
  content: string;
  sessionDate?: string;
  meetingType?: string;
  location?: string;
  duration?: number;
  createdAt: string;
  clientName?: string;
}

interface EditSessionNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteUpdated?: () => void;
  note: SessionNote | null;
}

export function EditSessionNoteModal({
  isOpen,
  onClose,
  note,
  onNoteUpdated
}: EditSessionNoteModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    sessionDate: '',
    location: '',
    duration: '',
    meetingType: 'therapy_session'
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize form data when note changes
  React.useEffect(() => {
    if (note) {
      const sessionDate = note.sessionDate || note.createdAt;
      setFormData({
        title: note.title || '',
        content: note.content || '',
        sessionDate: sessionDate ? new Date(sessionDate).toISOString().split('T')[0] : '',
        location: note.location || '',
        duration: note.duration?.toString() || '',
        meetingType: note.meetingType || 'therapy_session'
      });
    }
  }, [note]);

  const updateNoteMutation = useMutation({
    mutationFn: async (updateData: any) => {
      if (!note) return;
      
      const payload = {
        ...updateData,
        sessionDate: updateData.sessionDate ? new Date(updateData.sessionDate).toISOString() : null,
        duration: updateData.duration ? parseInt(updateData.duration, 10) : null
      };
      
      return apiRequest('PATCH', `/api/session-notes/${note.id}`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Session Note Updated",
        description: "All changes have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/session-notes'] });
      onNoteUpdated?.();
      onClose();
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Could not save the session note changes.",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    if (formData.title.trim() || formData.content.trim()) {
      updateNoteMutation.mutate(formData);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!note || !isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-4 h-4" />
            Edit Session Note
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter a descriptive title..."
                data-testid="input-edit-title"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date" className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Session Date
                </Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.sessionDate}
                  onChange={(e) => handleInputChange('sessionDate', e.target.value)}
                  data-testid="input-edit-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-duration" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Duration (minutes)
                </Label>
                <Input
                  id="edit-duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  placeholder="60"
                  data-testid="input-edit-duration"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-meeting-type">Meeting Type</Label>
                <select
                  id="edit-meeting-type"
                  value={formData.meetingType}
                  onChange={(e) => handleInputChange('meetingType', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  data-testid="select-edit-meeting-type"
                >
                  <option value="therapy_session">Therapy Session</option>
                  <option value="consultation">Consultation</option>
                  <option value="supervision">Supervision</option>
                  <option value="team_meeting">Team Meeting</option>
                  <option value="planning">Planning</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-location" className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Location
              </Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Office, Telehealth, etc."
                data-testid="input-edit-location"
              />
            </div>
          </div>

          {/* Session Content */}
          <div className="space-y-2">
            <Label htmlFor="edit-content">Session Content</Label>
            <Textarea
              id="edit-content"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="Enter your session notes, observations, and plans..."
              className="min-h-[300px] font-mono text-sm"
              data-testid="textarea-edit-content"
            />
            <p className="text-xs text-muted-foreground">
              {formData.content.length} characters
            </p>
          </div>
          
          {/* Original Note Info */}
          <div className="text-sm text-muted-foreground border-t pt-4">
            <p><strong>Client:</strong> {note.clientName || 'Unknown'}</p>
            <p><strong>Originally created:</strong> {new Date(note.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-edit">
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateNoteMutation.isPending || (!formData.title.trim() && !formData.content.trim())}
            data-testid="button-save-edit"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateNoteMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}