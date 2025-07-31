import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HeaderProps {
  weekRangeString: string;
  isOnline: boolean;
  isCurrentWeek: boolean;
  onConnectGoogle: () => void;
  onPreviousWeek: () => void;
  onToday: () => void;
  onNextWeek: () => void;
}

export const Header = ({
  weekRangeString,
  isOnline,
  isCurrentWeek,
  onConnectGoogle,
  onPreviousWeek,
  onToday,
  onNextWeek
}: HeaderProps) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{weekRangeString}</h1>
          <div className="flex items-center space-x-3 mt-1">
            <Badge variant={isOnline ? "default" : "secondary"} className="bg-green-100 text-green-800">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
              {isOnline ? "Online" : "Offline"}
            </Badge>
            <span className="text-sm text-gray-500">
              Weekly Overview • Click any day to view details
            </span>
          </div>
        </div>
        <Button onClick={onConnectGoogle} className="bg-blue-600 hover:bg-blue-700">
          Connect Google Calendar
        </Button>
      </div>

      <div className="flex justify-center">
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={onPreviousWeek}
            className="flex items-center px-4 py-2 bg-gray-50 border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous Week
          </Button>
          <Button 
            variant={isCurrentWeek ? "default" : "outline"}
            onClick={onToday}
            className={isCurrentWeek 
              ? "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 font-medium" 
              : "px-6 py-2 bg-gray-50 border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-colors"
            }
          >
            Today
          </Button>
          <Button 
            variant="outline" 
            onClick={onNextWeek}
            className="flex items-center px-4 py-2 bg-gray-50 border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-colors"
          >
            Next Week
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};