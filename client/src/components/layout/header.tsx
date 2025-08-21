import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import IntegrationStatus from "@/components/ui/integration-status";
import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api";
import profileImage from '@assets/image_1754410832108.png';

export default function Header() {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Get real notification count from urgent action items
  const { data: urgentActionItems } = useQuery({
    queryKey: ['urgent-action-items'],
    queryFn: ApiClient.getUrgentActionItems,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const notificationCount = urgentActionItems?.length || 0;

  return (
    <header className="bg-white border-b border-therapy-border p-3 sm:p-4 lg:p-6 header-safe">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-4 lg:ml-0 ml-12">
          <div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-therapy-text">Practice Dashboard</h2>
            <p className="text-xs sm:text-sm text-therapy-text/60">Today, {currentDate}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden sm:block">
            <IntegrationStatus />
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative min-h-[44px] min-w-[44px] p-2"
            data-testid="notifications-button"
          >
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </Button>
          
          <div className="flex items-center space-x-2 sm:space-x-3">
            <img 
              src={profileImage} 
              alt="Dr. Jonathan Procter" 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
            />
            <div className="hidden sm:block">
              <p className="font-medium text-therapy-text text-sm">Dr. Jonathan Procter</p>
              <p className="text-xs text-therapy-text/60">LMHC</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
