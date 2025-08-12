import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  FileText, 
  Link, 
  Unlink, 
  Bot, 
  Search, 
  Undo,
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// If you have these shadcn/ui components, uncomment the imports below:
// import { Input } from "@/components/ui/input";
// import { Checkbox } from "@/components/ui/checkbox";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";

interface SessionNote {
  id: string;
  appointmentId?: string;
  eventId?: string;
  clientId: string;
  therapistId: string;
  content: string;
  createdAt: string;
  aiTags?: string[];
  source?: string;
  originalFilename?: string;
}

interface Appointment {
  id: string;
  title?: string;
  startTime: string;
  endTime: string;
  type: string;
  status?: string;
  location?: string;
  googleEventId?: string;
}

interface AutoLinkSuggestion {
  noteId: string;
  appointmentId: string;
  confidence: number;
  reason: string;
}

interface LastAction {
  type: 'link' | 'unlink' | 'bulk-link' | 'auto-link';
  noteIds: string[];
  appointmentId?: string;
  timestamp: number;
}

interface SessionNoteLinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  sessionNotes: SessionNote[];
  appointments: Appointment[];
  onLinkingComplete: () => void;
  isLoading?: boolean;
}

// Simple Input component fallback
const Input = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
);

// Simple Checkbox component fallback
const Checkbox = ({ 
  checked, 
  onCheckedChange, 
  className = "",
  ...props 
}: { 
  checked?: boolean; 
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    type="checkbox"
    checked={checked}
    onChange={(e) => onCheckedChange?.(e.target.checked)}
    className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${className}`}
    {...props}
  />
);

// Simple ScrollArea component fallback
const ScrollArea = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`overflow-auto ${className}`}>
    {children}
  </div>
);

// Custom hook for session note linking operations
function useSessionNoteLinking(clientId: string) {
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isAutoLinking, setIsAutoLinking] = useState(false);
  const [isBulkLinking, setIsBulkLinking] = useState(false);
  const { toast } = useToast();

  const linkNote = async (noteId: string, appointmentId: string): Promise<boolean> => {
    setIsLinking(true);
    try {
      await apiRequest('PUT', `/api/session-notes/${noteId}/link-appointment`, { appointmentId });
      toast({
        title: "Note Linked Successfully",
        description: "Session note has been linked to the appointment.",
      });
      return true;
    } catch (error) {
      toast({
        title: "Linking Failed",
        description: "Failed to link session note to appointment.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLinking(false);
    }
  };

  const unlinkNote = async (noteId: string): Promise<boolean> => {
    setIsUnlinking(true);
    try {
      await apiRequest('PUT', `/api/session-notes/${noteId}/unlink-appointment`);
      toast({
        title: "Note Unlinked Successfully",
        description: "Session note has been unlinked from the appointment.",
      });
      return true;
    } catch (error) {
      toast({
        title: "Unlinking Failed",
        description: "Failed to unlink session note from appointment.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsUnlinking(false);
    }
  };

  const bulkLink = async (noteIds: string[], appointmentId: string): Promise<boolean> => {
    setIsBulkLinking(true);
    try {
      const results = await Promise.allSettled(
        noteIds.map(noteId =>
          apiRequest('PUT', `/api/session-notes/${noteId}/link-appointment`, { appointmentId })
        )
      );
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      toast({
        title: `Linked ${succeeded} of ${noteIds.length} notes`,
        description: succeeded === noteIds.length ? "All selected notes linked successfully." : "Some notes could not be linked.",
      });
      return true;
    } catch (error) {
      toast({
        title: "Bulk Linking Failed",
        description: "Failed to link selected notes.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsBulkLinking(false);
    }
  };

  const autoLink = async (): Promise<any> => {
    setIsAutoLinking(true);
    try {
      const response = await apiRequest('POST', `/api/session-notes/auto-link/${clientId}`);
      const result = await response.json();
      toast({
        title: "Auto-Linking Complete",
        description: `${result.linkedCount} notes linked automatically out of ${result.totalUnlinked} unlinked notes.`,
      });
      return result;
    } catch (error) {
      toast({
        title: "Auto-Linking Failed",
        description: "Failed to automatically link session notes.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsAutoLinking(false);
    }
  };

  return {
    linkNote,
    unlinkNote,
    bulkLink,
    autoLink,
    isLinking,
    isUnlinking,
    isAutoLinking,
    isBulkLinking
  };
}

// Date formatting utility
const formatSessionDate = (date: string | Date): string => {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
};

export function SessionNoteLinkingModal({
  isOpen,
  onClose,
  clientId,
  sessionNotes,
  appointments,
  onLinkingComplete,
  isLoading = false
}: SessionNoteLinkingModalProps) {
  // State management
  const [selectedNote, setSelectedNote] = useState<SessionNote | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<string>("");
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [noteSearchQuery, setNoteSearchQuery] = useState("");
  const [appointmentSearchQuery, setAppointmentSearchQuery] = useState("");
  const [noteToUnlink, setNoteToUnlink] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [suggestions, setSuggestions] = useState<AutoLinkSuggestion[]>([]);
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Custom hook for linking operations
  const {
    linkNote,
    unlinkNote,
    autoLink,
    bulkLink,
    isLinking,
    isUnlinking,
    isAutoLinking,
    isBulkLinking
  } = useSessionNoteLinking(clientId);

  const { toast } = useToast();

  // Memoized computations
  const unlinkedNotes = useMemo(
    () => sessionNotes.filter(note => !note.appointmentId),
    [sessionNotes]
  );

  const linkedNotes = useMemo(
    () => sessionNotes.filter(note => note.appointmentId),
    [sessionNotes]
  );

  const appointmentMap = useMemo(
    () => new Map(appointments.map(apt => [apt.id, apt])),
    [appointments]
  );

  // Filtered lists based on search queries
  const filteredUnlinkedNotes = useMemo(() => {
    if (!noteSearchQuery) return unlinkedNotes;
    const query = noteSearchQuery.toLowerCase();
    return unlinkedNotes.filter(note => 
      note.content.toLowerCase().includes(query) ||
      formatSessionDate(note.createdAt).toLowerCase().includes(query)
    );
  }, [unlinkedNotes, noteSearchQuery]);

  const filteredAppointments = useMemo(() => {
    if (!appointmentSearchQuery) return appointments;
    const query = appointmentSearchQuery.toLowerCase();
    return appointments.filter(apt => 
      apt.title?.toLowerCase().includes(query) ||
      apt.type.toLowerCase().includes(query) ||
      formatSessionDate(apt.startTime).toLowerCase().includes(query)
    );
  }, [appointments, appointmentSearchQuery]);

  const filteredLinkedNotes = useMemo(() => {
    if (!noteSearchQuery) return linkedNotes;
    const query = noteSearchQuery.toLowerCase();
    return linkedNotes.filter(note => 
      note.content.toLowerCase().includes(query) ||
      formatSessionDate(note.createdAt).toLowerCase().includes(query)
    );
  }, [linkedNotes, noteSearchQuery]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedNote(null);
      setSelectedAppointment("");
      setSelectedNoteIds(new Set());
      setNoteSearchQuery("");
      setAppointmentSearchQuery("");
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [isOpen]);

  // Handlers
  const handleLinkNote = async () => {
    if (!selectedNote || !selectedAppointment) return;

    const success = await linkNote(selectedNote.id, selectedAppointment);
    if (success) {
      setLastAction({
        type: 'link',
        noteIds: [selectedNote.id],
        appointmentId: selectedAppointment,
        timestamp: Date.now()
      });
      onLinkingComplete();
      setSelectedNote(null);
      setSelectedAppointment("");
    }
  };

  const handleBulkLink = async () => {
    if (selectedNoteIds.size === 0 || !selectedAppointment) return;

    const noteIds = Array.from(selectedNoteIds);
    const success = await bulkLink(noteIds, selectedAppointment);

    if (success) {
      setLastAction({
        type: 'bulk-link',
        noteIds,
        appointmentId: selectedAppointment,
        timestamp: Date.now()
      });
      onLinkingComplete();
      setSelectedNoteIds(new Set());
      setSelectedAppointment("");
    }
  };

  const handleUnlinkConfirm = async () => {
    if (!noteToUnlink) return;

    const note = linkedNotes.find(n => n.id === noteToUnlink);
    const success = await unlinkNote(noteToUnlink);

    if (success) {
      setLastAction({
        type: 'unlink',
        noteIds: [noteToUnlink],
        appointmentId: note?.appointmentId,
        timestamp: Date.now()
      });
      onLinkingComplete();
    }
    setNoteToUnlink(null);
    setShowConfirmDialog(false);
  };

  const handleAutoLink = async () => {
    const result = await autoLink();
    if (result) {
      setLastAction({
        type: 'auto-link',
        noteIds: result.linkedNoteIds || [],
        timestamp: Date.now()
      });
      onLinkingComplete();

      if (result.suggestions) {
        setSuggestions(result.suggestions);
        setShowSuggestions(true);
      }
    }
  };

  const handleUndo = async () => {
    if (!lastAction) return;

    try {
      if (lastAction.type === 'link' || lastAction.type === 'bulk-link') {
        await Promise.all(lastAction.noteIds.map(noteId => unlinkNote(noteId)));
        toast({
          title: "Action undone",
          description: `Unlinked ${lastAction.noteIds.length} note(s)`,
        });
      } else if (lastAction.type === 'unlink' && lastAction.appointmentId) {
        await linkNote(lastAction.noteIds[0], lastAction.appointmentId);
        toast({
          title: "Action undone",
          description: "Note re-linked to appointment",
        });
      }

      setLastAction(null);
      onLinkingComplete();
    } catch (error) {
      toast({
        title: "Undo failed",
        description: "Could not undo the last action",
        variant: "destructive"
      });
    }
  };

  const toggleNoteSelection = (noteId: string) => {
    const newSelection = new Set(selectedNoteIds);
    if (newSelection.has(noteId)) {
      newSelection.delete(noteId);
    } else {
      newSelection.add(noteId);
    }
    setSelectedNoteIds(newSelection);
  };

  const selectAllUnlinked = () => {
    if (selectedNoteIds.size === filteredUnlinkedNotes.length) {
      setSelectedNoteIds(new Set());
    } else {
      setSelectedNoteIds(new Set(filteredUnlinkedNotes.map(n => n.id)));
    }
  };

  const getAppointmentById = (appointmentId: string) => {
    return appointmentMap.get(appointmentId);
  };

  // Loading state
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="text-sm text-gray-500">Loading session notes and appointments...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link className="w-5 h-5" />
                Link Session Notes to Appointments
              </div>
              {lastAction && Date.now() - lastAction.timestamp < 30000 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  className="text-sm"
                >
                  <Undo className="w-4 h-4 mr-2" />
                  Undo
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <Badge variant="secondary">
                  {unlinkedNotes.length} Unlinked
                </Badge>
                <Badge variant="default">
                  {linkedNotes.length} Linked
                </Badge>
              </div>
              <span className="text-sm text-gray-600">
                Total: {sessionNotes.length} session notes
              </span>
            </div>

            {/* Auto-Link Section */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-blue-800 flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    AI Auto-Linking
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Let AI automatically match session notes to appointments based on dates and content.
                  </p>
                </div>
                <Button
                  onClick={handleAutoLink}
                  disabled={isAutoLinking || unlinkedNotes.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-auto-link"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  {isAutoLinking ? "Auto-Linking..." : "Auto-Link Notes"}
                </Button>
              </div>
            </div>

            {/* Manual Linking Section */}
            <div>
              <h3 className="font-medium mb-3">Manual Linking</h3>

              {/* Search Inputs */}
              <div className="grid gap-4 md:grid-cols-2 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search session notes..."
                    value={noteSearchQuery}
                    onChange={(e) => setNoteSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search appointments..."
                    value={appointmentSearchQuery}
                    onChange={(e) => setAppointmentSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Selection Controls */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Select Session Note(s)</label>
                    {selectedNoteIds.size > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedNoteIds.size} selected
                      </Badge>
                    )}
                  </div>

                  {selectedNoteIds.size > 0 ? (
                    <div className="p-3 border rounded-lg bg-blue-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Bulk Selection Mode</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedNoteIds(new Set())}
                        >
                          Clear
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedNoteIds.size === filteredUnlinkedNotes.length && filteredUnlinkedNotes.length > 0}
                          onCheckedChange={selectAllUnlinked}
                        />
                        <label className="text-sm text-gray-600">
                          Select all {filteredUnlinkedNotes.length} notes
                        </label>
                      </div>
                    </div>
                  ) : (
                    <Select 
                      value={selectedNote?.id || ""} 
                      onValueChange={(value) => {
                        const note = unlinkedNotes.find(n => n.id === value);
                        setSelectedNote(note || null);
                      }}
                    >
                      <SelectTrigger data-testid="select-session-note">
                        <SelectValue placeholder="Choose a session note..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredUnlinkedNotes.map((note) => (
                          <SelectItem key={note.id} value={note.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{formatSessionDate(note.createdAt)}</span>
                              <span className="text-xs text-gray-500">
                                {note.content.substring(0, 60)}...
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {filteredUnlinkedNotes.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedNoteIds(new Set())}
                      className="w-full mt-2"
                    >
                      {selectedNoteIds.size > 0 ? "Switch to Single Selection" : "Switch to Bulk Selection"}
                    </Button>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Select Appointment</label>
                  <Select value={selectedAppointment} onValueChange={setSelectedAppointment}>
                    <SelectTrigger data-testid="select-appointment">
                      <SelectValue placeholder="Choose an appointment..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredAppointments.map((appointment) => (
                        <SelectItem key={appointment.id} value={appointment.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {formatSessionDate(appointment.startTime)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {appointment.type?.replace('_', ' ')} - {appointment.status}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Link Actions */}
              <div className="flex gap-2 mt-4">
                {selectedNoteIds.size > 0 ? (
                  <Button
                    onClick={handleBulkLink}
                    disabled={selectedNoteIds.size === 0 || !selectedAppointment || isBulkLinking}
                    className="flex-1"
                    data-testid="button-bulk-link"
                  >
                    <Link className="w-4 h-4 mr-2" />
                    {isBulkLinking ? "Linking..." : `Link ${selectedNoteIds.size} Notes`}
                  </Button>
                ) : (
                  <Button
                    onClick={handleLinkNote}
                    disabled={!selectedNote || !selectedAppointment || isLinking}
                    className="flex-1"
                    data-testid="button-manual-link"
                  >
                    <Link className="w-4 h-4 mr-2" />
                    {isLinking ? "Linking..." : "Link Note to Appointment"}
                  </Button>
                )}
              </div>
            </div>

            {/* Bulk Selection List */}
            {selectedNoteIds.size > 0 && (
              <div>
                <h3 className="font-medium mb-3">Selected Notes for Bulk Linking</h3>
                <ScrollArea className="h-48 border rounded-lg p-3">
                  <div className="space-y-2">
                    {filteredUnlinkedNotes.map((note) => (
                      <div
                        key={note.id}
                        className={`flex items-center gap-3 p-2 rounded-lg ${
                          selectedNoteIds.has(note.id) ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <Checkbox
                          checked={selectedNoteIds.has(note.id)}
                          onCheckedChange={() => toggleNoteSelection(note.id)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{formatSessionDate(note.createdAt)}</p>
                          <p className="text-xs text-gray-500">
                            {note.content.substring(0, 100)}...
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Currently Linked Notes */}
            <div>
              <h3 className="font-medium mb-3">Currently Linked Notes ({linkedNotes.length})</h3>
              <ScrollArea className="h-64 border rounded-lg p-3">
                <div className="space-y-2">
                  {filteredLinkedNotes.map((note) => {
                    const appointment = getAppointmentById(note.appointmentId!);
                    return (
                      <div key={note.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              Note from {formatSessionDate(note.createdAt)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {note.content.substring(0, 80)}...
                            </p>
                            {appointment && (
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="w-3 h-3 text-blue-500" />
                                <span className="text-xs text-blue-600">
                                  Linked to {formatSessionDate(appointment.startTime)} appointment
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNoteToUnlink(note.id);
                            setShowConfirmDialog(true);
                          }}
                          disabled={isUnlinking}
                          data-testid={`button-unlink-${note.id}`}
                        >
                          <Unlink className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                  {linkedNotes.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No linked session notes yet.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Simple Confirmation Dialog */}
      {showConfirmDialog && noteToUnlink && (
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unlink Session Note?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              This will remove the link between the session note and its appointment. 
              You can re-link it later if needed.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUnlinkConfirm}>
                Unlink Note
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}