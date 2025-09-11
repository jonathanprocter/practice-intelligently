import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

// Simple therapy appointment management (not auth sessions)
export function useAppointmentManagement() {
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const { toast } = useToast();

  const startSession = (appointmentId: string, type: string) => {
    setActiveSession(appointmentId);
    toast({
      title: "Session started",
      description: `${type} session has begun`,
    });
  };

  const endSession = (appointmentId: string) => {
    setActiveSession(null);
    toast({
      title: "Session ended",
      description: "The therapy session has been completed",
    });
  };

  return {
    activeSession,
    startSession,
    endSession
  };
}