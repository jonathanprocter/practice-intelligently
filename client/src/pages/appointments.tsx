import { useQuery } from "@tanstack/react-query";
import { ApiClient, type Appointment } from "@/lib/api";
import { Calendar, Plus, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export default function Appointments() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', selectedDate],
    queryFn: () => ApiClient.getAppointments(selectedDate),
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Appointments</h1>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Schedule Appointment
          </Button>
        </div>
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="therapy-card p-6 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-therapy-text">Appointments</h1>
          <p className="text-therapy-text/60">Manage your therapy sessions and schedule</p>
        </div>
        <Button className="bg-therapy-primary hover:bg-therapy-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Schedule Appointment
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-therapy-primary" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-therapy-border rounded-lg px-3 py-2"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {appointments && appointments.length > 0 ? (
          appointments.map((appointment) => (
            <div key={appointment.id} className="therapy-card p-6">
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-therapy-success text-white rounded-lg flex flex-col items-center justify-center">
                    <div className="text-xs font-medium">
                      {formatTime(appointment.startTime).split(' ')[1]}
                    </div>
                    <div className="text-lg font-bold">
                      {formatTime(appointment.startTime).split(' ')[0]}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-therapy-text">
                      {appointment.type}
                    </h3>
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-therapy-text/60">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>Office</span>
                    </div>
                  </div>
                  
                  {appointment.notes && (
                    <p className="text-sm text-therapy-text/70 mt-2">
                      {appointment.notes}
                    </p>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="therapy-card p-12 text-center">
            <Calendar className="h-12 w-12 text-therapy-text/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-therapy-text mb-2">
              No appointments scheduled
            </h3>
            <p className="text-therapy-text/60 mb-4">
              No appointments found for {new Date(selectedDate).toLocaleDateString()}
            </p>
            <Button className="bg-therapy-primary hover:bg-therapy-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Schedule an Appointment
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
