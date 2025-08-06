import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Link, Unlink, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

interface SessionNoteLinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  sessionNotes: SessionNote[];
  appointments: Appointment[];
  onLinkingComplete: () => void;
}

export function SessionNoteLinkingModal({
  isOpen,
  onClose,
  clientId,
  sessionNotes,
  appointments,
  onLinkingComplete
}: SessionNoteLinkingModalProps) {
  const [selectedNote, setSelectedNote] = useState<SessionNote | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<string>("");
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isAutoLinking, setIsAutoLinking] = useState(false);
  const { toast } = useToast();

  // Filter unlinked notes
  const unlinkedNotes = sessionNotes.filter(note => !note.appointmentId);
  const linkedNotes = sessionNotes.filter(note => note.appointmentId);

  useEffect(() => {
    if (!isOpen) {
      setSelectedNote(null);
      setSelectedAppointment("");
    }
  }, [isOpen]);

  const handleLinkNote = async () => {
    if (!selectedNote || !selectedAppointment) return;

    setIsLinking(true);
    try {
      await apiRequest(`/api/session-notes/${selectedNote.id}/link-appointment`, {
        method: 'PUT',
        body: JSON.stringify({ appointmentId: selectedAppointment }),
        headers: { 'Content-Type': 'application/json' }
      });

      toast({
        title: "Note Linked Successfully",
        description: "Session note has been linked to the appointment.",
      });

      onLinkingComplete();
      setSelectedNote(null);
      setSelectedAppointment("");
    } catch (error) {
      toast({
        title: "Linking Failed",
        description: "Failed to link session note to appointment.",
        variant: "destructive"
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkNote = async (noteId: string) => {
    setIsUnlinking(true);
    try {
      await apiRequest(`/api/session-notes/${noteId}/unlink-appointment`, {
        method: 'PUT'
      });

      toast({
        title: "Note Unlinked Successfully",
        description: "Session note has been unlinked from the appointment.",
      });

      onLinkingComplete();
    } catch (error) {
      toast({
        title: "Unlinking Failed",
        description: "Failed to unlink session note from appointment.",
        variant: "destructive"
      });
    } finally {
      setIsUnlinking(false);
    }
  };

  const handleAutoLink = async () => {
    setIsAutoLinking(true);
    try {
      const response = await apiRequest(`/api/session-notes/auto-link/${clientId}`, {
        method: 'POST'
      });

      const result = await response.json();

      toast({
        title: "Auto-Linking Complete",
        description: `${result.linkedCount} notes linked automatically out of ${result.totalUnlinked} unlinked notes.`,
      });

      onLinkingComplete();
    } catch (error) {
      toast({
        title: "Auto-Linking Failed",
        description: "Failed to automatically link session notes.",
        variant: "destructive"
      });
    } finally {
      setIsAutoLinking(false);
    }
  };

  const getAppointmentById = (appointmentId: string) => {
    return appointments.find(apt => apt.id === appointmentId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Link Session Notes to Appointments
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Auto-Link Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-800">AI Auto-Linking</h3>
                <p className="text-sm text-blue-700">
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
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Session Note</label>
                <Select value={selectedNote?.id || ""} onValueChange={(value) => {
                  const note = unlinkedNotes.find(n => n.id === value);
                  setSelectedNote(note || null);
                }}>
                  <SelectTrigger data-testid="select-session-note">
                    <SelectValue placeholder="Choose a session note..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unlinkedNotes.map((note) => (
                      <SelectItem key={note.id} value={note.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{new Date(note.createdAt).toLocaleDateString()}</span>
                          <span className="text-xs text-gray-500">
                            {note.content.substring(0, 60)}...
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Select Appointment</label>
                <Select value={selectedAppointment} onValueChange={setSelectedAppointment}>
                  <SelectTrigger data-testid="select-appointment">
                    <SelectValue placeholder="Choose an appointment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {appointments.map((appointment) => (
                      <SelectItem key={appointment.id} value={appointment.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {new Date(appointment.startTime).toLocaleDateString()} at{" "}
                            {new Date(appointment.startTime).toLocaleTimeString()}
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

            <Button
              onClick={handleLinkNote}
              disabled={!selectedNote || !selectedAppointment || isLinking}
              className="mt-4"
              data-testid="button-manual-link"
            >
              <Link className="w-4 h-4 mr-2" />
              {isLinking ? "Linking..." : "Link Note to Appointment"}
            </Button>
          </div>

          {/* Currently Linked Notes */}
          <div>
            <h3 className="font-medium mb-3">Currently Linked Notes ({linkedNotes.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {linkedNotes.map((note) => {
                const appointment = getAppointmentById(note.appointmentId!);
                return (
                  <div key={note.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Note from {new Date(note.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {note.content.substring(0, 80)}...
                        </p>
                        {appointment && (
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="w-3 h-3 text-blue-500" />
                            <span className="text-xs text-blue-600">
                              Linked to {new Date(appointment.startTime).toLocaleDateString()} appointment
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnlinkNote(note.id)}
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
          </div>

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <Badge variant="secondary">
                  {unlinkedNotes.length} Unlinked Notes
                </Badge>
                <Badge variant="default">
                  {linkedNotes.length} Linked Notes
                </Badge>
              </div>
              <span className="text-gray-600">
                Total: {sessionNotes.length} session notes
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}