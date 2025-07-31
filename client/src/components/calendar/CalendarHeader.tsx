import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarHeaderProps {
  weekRangeString: string;
  isOnline: boolean;
  isCurrentWeek: boolean;
  onPreviousWeek: () => void;
  onToday: () => void;
  onNextWeek: () => void;
  onNewAppointment?: () => void;
  onExportCalendar?: () => void;
}

export const CalendarHeader = ({
  weekRangeString,
  isOnline,
  isCurrentWeek,
  onPreviousWeek,
  onToday,
  onNextWeek,
  onNewAppointment,
  onExportCalendar
}: CalendarHeaderProps) => {
  return (
    <div className="space-y-6 p-6 bg-therapy-bg border-b-2 border-therapy-border">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-therapy-text">{weekRangeString}</h1>
          <div className="flex items-center space-x-3 mt-2">
            <Badge 
              variant={isOnline ? "default" : "secondary"} 
              className="bg-therapy-success/20 text-therapy-success border-therapy-success"
            >
              <div className="w-2 h-2 bg-therapy-success rounded-full mr-2"></div>
              {isOnline ? "Online" : "Offline"}
            </Badge>
            <span className="text-sm text-therapy-text/70">
              Weekly Calendar • Click any day to view details
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {onNewAppointment && (
            <Button 
              onClick={onNewAppointment}
              className="bg-therapy-primary hover:bg-therapy-primary/80 text-white flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Appointment
            </Button>
          )}
          
          {onExportCalendar && (
            <Button 
              variant="outline"
              onClick={onExportCalendar}
              className="border-therapy-border hover:bg-therapy-primary/5 flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Export Calendar
            </Button>
          )}
        </div>
      </div>

      <div className="flex justify-center">
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={onPreviousWeek}
            className="flex items-center px-4 py-2 bg-therapy-bg border-therapy-border hover:bg-therapy-primary/5 hover:border-therapy-primary transition-all duration-200"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous Week
          </Button>
          
          <Button 
            variant={isCurrentWeek ? "default" : "outline"}
            onClick={onToday}
            className={cn(
              "px-6 py-2 font-medium transition-all duration-200",
              isCurrentWeek 
                ? "bg-therapy-primary hover:bg-therapy-primary/80 text-white" 
                : "bg-therapy-bg border-therapy-border hover:bg-therapy-primary/5 hover:border-therapy-primary text-therapy-text"
            )}
          >
            Today
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onNextWeek}
            className="flex items-center px-4 py-2 bg-therapy-bg border-therapy-border hover:bg-therapy-primary/5 hover:border-therapy-primary transition-all duration-200"
          >
            Next Week
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};