import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SessionNote {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
  clientName?: string;
}

interface SessionNoteRowWithEditProps {
  note: SessionNote;
  onUpdate: () => void;
  children?: React.ReactNode;
}

export function SessionNoteRowWithEdit({ note, onUpdate, children }: SessionNoteRowWithEditProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(note.title || '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const saveTitle = async () => {
    setIsLoading(true);
    try {
      await apiRequest('PATCH', `/api/session-notes/${note.id}`, {
        title: tempTitle.trim()
      });
      setIsEditingTitle(false);
      toast({
        title: "Title Updated",
        description: "Session note title has been saved.",
      });
      onUpdate();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Could not save the title.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEdit = () => {
    setTempTitle(note.title || '');
    setIsEditingTitle(false);
  };

  return (
    <div className="flex items-center gap-2 p-4 border rounded" data-testid={`session-note-row-${note.id}`}>
      {isEditingTitle ? (
        <div className="flex items-center gap-2 flex-1">
          <Input
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                saveTitle();
              } else if (e.key === 'Escape') {
                cancelEdit();
              }
            }}
            autoFocus
            className="flex-1"
            placeholder="Enter session note title..."
            data-testid={`input-inline-edit-${note.id}`}
          />
          <Button 
            size="sm" 
            onClick={saveTitle}
            disabled={isLoading || !tempTitle.trim()}
            data-testid={`button-save-inline-${note.id}`}
          >
            <Save className="w-3 h-3" />
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={cancelEdit}
            disabled={isLoading}
            data-testid={`button-cancel-inline-${note.id}`}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <h3 className="font-medium flex-1" data-testid={`text-note-title-${note.id}`}>
            {note.title || `Session Note - ${new Date(note.createdAt).toLocaleDateString()}`}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditingTitle(true)}
            data-testid={`button-edit-inline-${note.id}`}
          >
            <Edit2 className="w-3 h-3" />
          </Button>
        </div>
      )}
      
      {/* Rest of your session note row content */}
      {children && (
        <div className="flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}