import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import IntegrationStatus from "@/components/ui/integration-status";
import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api";

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
    <header className="bg-white border-b border-therapy-border p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 lg:ml-0 ml-12">
          <div>
            <h2 className="text-2xl font-bold text-therapy-text">Practice Dashboard</h2>
            <p className="text-therapy-text/60">Today, {currentDate}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden md:block">
            <IntegrationStatus />
          </div>
          
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </Button>
          
          <div className="flex items-center space-x-3">
            <img 
              src="/attached_assets/generated-image (1)_1753977205405.png" 
              alt="Dr. Jonathan Procter" 
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="hidden md:block">
              <p className="font-medium text-therapy-text">Dr. Jonathan Procter</p>
              <p className="text-sm text-therapy-text/60">Licensed Therapist</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
