import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AutoLinkResult {
  linkedCount: number;
  totalUnlinked: number;
  linkedNoteIds?: string[];
  suggestions?: AutoLinkSuggestion[];
}

interface AutoLinkSuggestion {
  noteId: string;
  appointmentId: string;
  confidence: number;
  reason: string;
}

export function useSessionNoteLinking(clientId: string) {
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isAutoLinking, setIsAutoLinking] = useState(false);
  const [isBulkLinking, setIsBulkLinking] = useState(false);
  const { toast } = useToast();

  const linkNote = useCallback(async (noteId: string, appointmentId: string): Promise<boolean> => {
    setIsLinking(true);
    try {
      const response = await apiRequest('PUT', `/api/session-notes/${noteId}/link-appointment`, {
        appointmentId
      });

      if (response.ok) {
        toast({
          title: "Note Linked Successfully",
          description: "Session note has been linked to the appointment.",
        });
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to link note');
      }
    } catch (error) {
      toast({
        title: "Linking Failed",
        description: error instanceof Error ? error.message : "Failed to link session note to appointment.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLinking(false);
    }
  }, [toast]);

  const unlinkNote = useCallback(async (noteId: string): Promise<boolean> => {
    setIsUnlinking(true);
    try {
      const response = await apiRequest('PUT', `/api/session-notes/${noteId}/unlink-appointment`);

      if (response.ok) {
        toast({
          title: "Note Unlinked Successfully",
          description: "Session note has been unlinked from the appointment.",
        });
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to unlink note');
      }
    } catch (error) {
      toast({
        title: "Unlinking Failed",
        description: error instanceof Error ? error.message : "Failed to unlink session note from appointment.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsUnlinking(false);
    }
  }, [toast]);

  const bulkLink = useCallback(async (noteIds: string[], appointmentId: string): Promise<boolean> => {
    setIsBulkLinking(true);
    try {
      const results = await Promise.allSettled(
        noteIds.map(noteId =>
          apiRequest('PUT', `/api/session-notes/${noteId}/link-appointment`, {
            appointmentId
          })
        )
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (succeeded > 0) {
        toast({
          title: `Linked ${succeeded} of ${noteIds.length} notes`,
          description: succeeded === noteIds.length
            ? "All selected notes linked successfully."
            : `${failed} notes could not be linked.`,
          variant: succeeded === noteIds.length ? "default" : "destructive"
        });
        return true;
      } else {
        throw new Error('All notes failed to link');
      }
    } catch (error) {
      toast({
        title: "Bulk Linking Failed",
        description: error instanceof Error ? error.message : "Failed to link selected notes.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsBulkLinking(false);
    }
  }, [toast]);

  const autoLink = useCallback(async (): Promise<AutoLinkResult | null> => {
    setIsAutoLinking(true);
    try {
      const response = await apiRequest('POST', `/api/session-notes/auto-link/${clientId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Auto-linking failed');
      }

      const result: AutoLinkResult = await response.json();

      // Show appropriate toast based on results
      if (result.linkedCount > 0) {
        toast({
          title: "Auto-Linking Complete",
          description: `${result.linkedCount} notes linked automatically out of ${result.totalUnlinked} unlinked notes.`,
        });
      } else if (result.totalUnlinked > 0) {
        toast({
          title: "No Automatic Matches Found",
          description: "Unable to find confident matches. Please link notes manually or review suggestions.",
          variant: "default"
        });
      } else {
        toast({
          title: "No Unlinked Notes",
          description: "All session notes are already linked to appointments.",
        });
      }

      return result;
    } catch (error) {
      toast({
        title: "Auto-Linking Failed",
        description: error instanceof Error ? error.message : "Failed to automatically link session notes.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsAutoLinking(false);
    }
  }, [clientId, toast]);

  const suggestLinks = useCallback(async (): Promise<AutoLinkSuggestion[]> => {
    try {
      const response = await apiRequest('POST', `/api/session-notes/suggest-links/${clientId}`);

      if (!response.ok) {
        throw new Error('Failed to get suggestions');
      }

      const suggestions: AutoLinkSuggestion[] = await response.json();

      if (suggestions.length > 0) {
        toast({
          title: "Suggestions Generated",
          description: `Found ${suggestions.length} potential matches for review.`,
        });
      }

      return suggestions;
    } catch (error) {
      toast({
        title: "Failed to Generate Suggestions",
        description: error instanceof Error ? error.message : "Could not generate linking suggestions.",
        variant: "destructive"
      });
      return [];
    }
  }, [clientId, toast]);

  const validateLink = useCallback(async (noteId: string, appointmentId: string): Promise<boolean> => {
    try {
      const response = await apiRequest('POST', `/api/session-notes/validate-link`, {
        noteId,
        appointmentId
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.isValid;
    } catch (error) {
      console.error('Failed to validate link:', error);
      return false;
    }
  }, []);

  return {
    linkNote,
    unlinkNote,
    bulkLink,
    autoLink,
    suggestLinks,
    validateLink,
    isLinking,
    isUnlinking,
    isAutoLinking,
    isBulkLinking
  };
}