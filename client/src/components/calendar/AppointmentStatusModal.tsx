import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CalendarEvent } from '@/types/calendar';

import { getLocationDisplay } from '@/utils/locationUtils';

interface AppointmentStatusModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusOptions = [
  { value: 'scheduled', label: 'Scheduled', color: '#4285f4' },
  { value: 'confirmed', label: 'Confirmed', color: '#34a853' },
  { value: 'cancelled', label: 'Cancelled', color: '#ffc107' },
  { value: 'no_show', label: 'No Show', color: '#dc3545' },
  { value: 'rescheduled', label: 'Rescheduled', color: '#fd7e14' },
  { value: 'completed', label: 'Completed', color: '#28a745' }
];

const locationOptions = [
  { value: 'none', label: 'No Location' },
  { value: 'woodbury', label: '🏢 Woodbury' },
  { value: 'rvc', label: '🏢 RVC' },
  { value: 'telehealth', label: '💻 Telehealth' }
];

export function AppointmentStatusModal({ event, isOpen, onClose }: AppointmentStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [reason, setReason] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize location state when event changes
  useEffect(() => {
    if (event) {
      setSelectedLocation(event.location || 'none');
    }
  }, [event]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ eventId, status, reason, location }: { eventId: string; status: string; reason: string; location?: string }) => {
      console.log('Updating status and location for event:', { eventId, status, reason, location });

      // Update the event with both status and location
      const response = await apiRequest('PUT', `/api/events/${eventId}`, { 
        status, 
        cancellationReason: reason.trim() || null,
        location: location === 'none' ? null : location
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Event Updated",
        description: `Event successfully updated`,
        variant: "default"
      });

      // Invalidate and refetch calendar events
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });

      onClose();
      setSelectedStatus('');
      setSelectedLocation('');
      setReason('');
    },
    onError: (error: any) => {
      console.error('Status update error:', error);
      console.error('Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        statusText: error?.response?.statusText
      });

      let errorMessage = "Failed to update appointment status";
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.details) {
        errorMessage = error.response.data.details;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!event || !selectedStatus) {
      toast({
        title: "Error",
        description: "Please select a status",
        variant: "destructive"
      });
      return;
    }

    updateStatusMutation.mutate({
      eventId: event.id,
      status: selectedStatus,
      reason: reason.trim(),
      location: selectedLocation
    });
  };

  const handleClose = () => {
    onClose();
    setSelectedStatus('');
    setSelectedLocation('none');
    setReason('');
  };

  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Appointment Status</DialogTitle>
          <DialogDescription>
            Change the status and location for this appointment
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Event: {event.title}
            </Label>
            <p className="text-sm text-muted-foreground">
              {new Date(event.startTime).toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: option.color }}
                      />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for status change..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedStatus || updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}