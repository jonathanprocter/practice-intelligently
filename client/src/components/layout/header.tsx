import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import IntegrationStatus from "@/components/ui/integration-status";
import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api";
import { useLocation } from "wouter";
import { DEFAULT_CLINICIAN_NAME } from "@shared/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Replaced problematic image import with placeholder
// Original: import profileImage from '@assets/image_1754410832108.png';

export default function Header() {
  const [, setLocation] = useLocation();
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
    <header className="bg-white border-b border-therapy-border p-2 xs:p-3 sm:p-4 lg:p-6 header-safe sticky top-0 z-40 backdrop-blur-md bg-white/95">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 xs:space-x-3 sm:space-x-4 lg:ml-0 ml-14 xs:ml-12 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            <h2 className="text-base xs:text-lg sm:text-xl lg:text-2xl font-bold text-therapy-text truncate">Practice Dashboard</h2>
            <p className="text-xs xs:text-sm text-therapy-text/60 truncate">Today, {currentDate}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 xs:space-x-2 sm:space-x-4 flex-shrink-0">
          <div className="hidden md:block">
            <IntegrationStatus />
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative min-h-[48px] min-w-[48px] xs:min-h-[44px] xs:min-w-[44px] p-2 touch-manipulation iphone-button-enhanced rounded-xl"
            data-testid="button-notifications"
            style={{
              WebkitTapHighlightColor: 'rgba(100, 149, 237, 0.1)',
              WebkitTouchCallout: 'none'
            }}
          >
            <Bell className="h-5 w-5 xs:h-4 xs:w-4 sm:h-5 sm:w-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs w-6 h-6 xs:w-5 xs:h-5 rounded-full flex items-center justify-center font-medium shadow-lg">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </Button>
          
          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 xs:space-x-3 p-1" data-testid="button-user-menu">
                <img 
                  src="https://api.dicebear.com/7.x/initials/svg?seed=JP" 
                  alt={DEFAULT_CLINICIAN_NAME}
                  className="w-10 h-10 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                />
                <div className="hidden sm:block min-w-0">
                  <p className="font-medium text-therapy-text text-sm truncate">{DEFAULT_CLINICIAN_NAME}</p>
                  <p className="text-xs text-therapy-text/60">LMHC</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{DEFAULT_CLINICIAN_NAME}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    therapist@practice.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setLocation('/settings')}
                className="cursor-pointer"
                data-testid="menu-settings"
              >
                <User className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}