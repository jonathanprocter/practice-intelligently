import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import IntegrationStatus from "@/components/ui/integration-status";

export default function Header() {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              5
            </span>
          </Button>
          
          <div className="flex items-center space-x-3">
            <img 
              src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100" 
              alt="Dr. Sarah Chen" 
              className="w-10 h-10 rounded-full"
            />
            <div className="hidden md:block">
              <p className="font-medium text-therapy-text">Dr. Sarah Chen</p>
              <p className="text-sm text-therapy-text/60">Licensed Therapist</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
