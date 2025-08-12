import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import { FileText, Loader2, Calendar, Plus } from 'lucide-react';

interface CreateSessionNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  selectedAppointment?: {
    id: string;
    startTime: string;
    endTime: string;
    title?: string;
  } | null;
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
  selectedAppointment
}: CreateSessionNoteModalProps) {
  const [content, setContent] = useState('');
  const [appointmentMode, setAppointmentMode] = useState<'existing' | 'new' | 'none'>('existing');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [newAppointmentDate, setNewAppointmentDate] = useState<string>('');
  const [newAppointmentTime, setNewAppointmentTime] = useState<string>('');
  const [newAppointmentTitle, setNewAppointmentTitle] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing appointments for the client
  const { data: appointments } = useQuery({
    queryKey: ['/api/appointments/client', clientId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/appointments/client/${clientId}`);
      return response.json();
    },
    enabled: isOpen
  });

  // Initialize form with selected appointment
  useEffect(() => {
    if (selectedAppointment) {
      setSelectedAppointmentId(selectedAppointment.id);
      setAppointmentMode('existing');
    } else {
      setAppointmentMode('existing');
      setSelectedAppointmentId('');
    }
  }, [selectedAppointment]);

  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      return apiRequest('POST', '/api/appointments', appointmentData);
    }
  });

  const createSessionNoteMutation = useMutation({
    mutationFn: async (data: SessionNoteData) => {
      return apiRequest('POST', '/api/session-notes', data);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast({
        title: "Content Required",
        description: "Please enter session note content before saving.",
        variant: "destructive",
      });
      return;
    }

    let appointmentIdToUse = '';

    try {
      if (appointmentMode === 'existing' && selectedAppointmentId) {
        appointmentIdToUse = selectedAppointmentId;
      } else if (appointmentMode === 'new') {
        if (!newAppointmentDate || !newAppointmentTime) {
          toast({
            title: "Appointment Details Required",
            description: "Please provide both date and time for the new appointment.",
            variant: "destructive",
          });
          return;
        }

        // Create new appointment first
        const startDateTime = new Date(`${newAppointmentDate}T${newAppointmentTime}`);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration

        const appointmentData = {
          clientId,
          therapistId: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c',
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          title: newAppointmentTitle || 'Session',
          type: 'individual_therapy', // Required field
          status: 'completed',
          source: 'manual'
        };

        const appointmentResponse = await createAppointmentMutation.mutateAsync(appointmentData);
        const createdAppointment = await appointmentResponse.json();
        appointmentIdToUse = createdAppointment.id;
      }

      // Create the session note
      createSessionNoteMutation.mutate({
        clientId,
        therapistId: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c',
        content: content.trim(),
        appointmentId: appointmentIdToUse,
        source: 'manual'
      });
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Error",
        description: "Failed to create appointment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    if (!createSessionNoteMutation.isPending && !createAppointmentMutation.isPending) {
      setContent('');
      setSelectedAppointmentId('');
      setNewAppointmentDate('');
      setNewAppointmentTime('');
      setNewAppointmentTitle('');
      onClose();
    }
  };

  const formatAppointmentOption = (appointment: any) => {
    const date = new Date(appointment.startTime);
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${appointment.title || 'Session'}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Create Session Note
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            <p><strong>Client:</strong> {clientName}</p>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Appointment Selection Section */}
          <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
            <Label className="text-base font-medium">Link to Appointment</Label>
            
            <div className="space-y-3">
              <Select value={appointmentMode} onValueChange={(value: 'existing' | 'new' | 'none') => setAppointmentMode(value)}>
                <SelectTrigger data-testid="select-appointment-mode">
                  <SelectValue placeholder="Choose appointment option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">Link to existing appointment</SelectItem>
                  <SelectItem value="new">Create new appointment</SelectItem>
                  <SelectItem value="none">No appointment link</SelectItem>
                </SelectContent>
              </Select>

              {appointmentMode === 'existing' && (
                <div className="space-y-2">
                  <Select value={selectedAppointmentId} onValueChange={setSelectedAppointmentId}>
                    <SelectTrigger data-testid="select-existing-appointment">
                      <SelectValue placeholder="Select an appointment" />
                    </SelectTrigger>
                    <SelectContent>
                      {appointments?.length > 0 ? (
                        appointments.map((appointment: any) => (
                          <SelectItem key={appointment.id} value={appointment.id}>
                            {formatAppointmentOption(appointment)}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>No appointments found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {appointments?.length === 0 && (
                    <p className="text-xs text-muted-foreground">No existing appointments found. Consider creating a new appointment.</p>
                  )}
                </div>
              )}

              {appointmentMode === 'new' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="appointment-date">Date</Label>
                    <Input
                      id="appointment-date"
                      type="date"
                      value={newAppointmentDate}
                      onChange={(e) => setNewAppointmentDate(e.target.value)}
                      data-testid="input-appointment-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appointment-time">Time</Label>
                    <Input
                      id="appointment-time"
                      type="time"
                      value={newAppointmentTime}
                      onChange={(e) => setNewAppointmentTime(e.target.value)}
                      data-testid="input-appointment-time"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="appointment-title">Title (Optional)</Label>
                    <Input
                      id="appointment-title"
                      placeholder="e.g., Individual Therapy Session"
                      value={newAppointmentTitle}
                      onChange={(e) => setNewAppointmentTitle(e.target.value)}
                      data-testid="input-appointment-title"
                    />
                  </div>
                </div>
              )}

              {appointmentMode === 'none' && (
                <p className="text-xs text-muted-foreground">This session note will not be linked to any appointment.</p>
              )}
            </div>
          </div>

          {/* Session Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="session-content">Session Notes</Label>
            <Textarea
              id="session-content"
              placeholder="Enter your session notes here... Include details about interventions, client progress, homework assignments, observations, and any other relevant therapeutic information."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="resize-none"
              disabled={createSessionNoteMutation.isPending || createAppointmentMutation.isPending}
              data-testid="textarea-session-content"
            />
            <div className="text-xs text-muted-foreground">
              Session notes will be saved to the client's record and linked to the selected appointment.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createSessionNoteMutation.isPending || createAppointmentMutation.isPending}
              data-testid="button-cancel-session-note"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createSessionNoteMutation.isPending || 
                createAppointmentMutation.isPending || 
                !content.trim() ||
                (appointmentMode === 'existing' && !selectedAppointmentId) ||
                (appointmentMode === 'new' && (!newAppointmentDate || !newAppointmentTime))
              }
              data-testid="button-save-session-note"
            >
              {(createSessionNoteMutation.isPending || createAppointmentMutation.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {createAppointmentMutation.isPending ? 'Creating Appointment...' : 'Creating Note...'}
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