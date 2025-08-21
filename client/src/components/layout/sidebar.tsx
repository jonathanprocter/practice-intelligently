import { Link, useLocation } from "wouter";
import { Brain, Users, Calendar, FileText, CheckSquare, BarChart, Bot, Settings, Menu, MessageSquare, FolderOpen, ClipboardList, Upload, Activity, PieChart, Tag } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api";

const getNavigationItems = (clientCount: number, urgentActionItemCount: number) => [
  { path: "/", label: "Dashboard", icon: BarChart },
  { path: "/clients", label: "Clients", icon: Users, badge: clientCount > 0 ? clientCount.toString() : undefined },
  { path: "/appointments", label: "Appointments", icon: Calendar },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/session-notes", label: "Session Notes", icon: FileText },
  { path: "/session-summaries", label: "Session Summaries", icon: PieChart },
  { path: "/assessments", label: "Assessments", icon: ClipboardList },
  { path: "/document-processing", label: "Document Processing", icon: Upload },
  { path: "/processing-results", label: "Processing Results", icon: Activity },
  { path: "/smart-documents", label: "Smart Documents", icon: Tag },
  { path: "/client-checkins", label: "Client Check-ins", icon: MessageSquare },
  { path: "/action-items", label: "Action Items", icon: CheckSquare, badge: urgentActionItemCount > 0 ? urgentActionItemCount.toString() : undefined, badgeColor: "bg-red-500" },
  { path: "/analytics", label: "Analytics", icon: BarChart },
  { path: "/ai-insights", label: "AI Intelligence", icon: Brain },
  { path: "/content-viewer", label: "Content Viewer", icon: FolderOpen },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Get real client count
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => ApiClient.getClients(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get real urgent action items count
  const { data: urgentActionItems } = useQuery({
    queryKey: ['urgent-action-items'],
    queryFn: ApiClient.getUrgentActionItems,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
  
  const navigationItems = getNavigationItems(clients?.length || 0, urgentActionItems?.length || 0);

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      {/* Mobile menu button - iPhone optimized */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden min-h-[44px] min-w-[44px] p-2 bg-white/90 backdrop-blur-sm shadow-lg"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        data-testid="mobile-menu-button"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Sidebar - iPhone optimized */}
      <div className={`sidebar-nav w-72 sm:w-64 shadow-xl fixed h-full z-50 lg:relative lg:translate-x-0 transition-transform duration-300 safe-area-top ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-4 sm:p-6 border-b border-white/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Brain className="text-white text-lg" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-white font-bold text-base sm:text-lg truncate">Practice Intelligence</h1>
            </div>
          </div>
        </div>
        
        <nav className="p-3 sm:p-4 space-y-1 overflow-y-auto flex-1">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 cursor-pointer select-none min-h-[44px] touch-manipulation ${
                isActive(item.path)
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/90 hover:bg-white/15 hover:text-white hover:shadow-sm'
              }`}
              onClick={() => setIsMobileOpen(false)}
              data-testid={`nav-link-${item.path.replace('/', '')}`}
              style={{ 
                pointerEvents: 'auto',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
              }}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium flex-1 text-sm sm:text-base truncate">{item.label}</span>
              {item.badge && (
                <span className={`text-white text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                  item.badgeColor || 'bg-therapy-primary'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
          
          <div className="pt-4 border-t border-white/20 mt-4">
            <Link
              href="/settings"
              className="flex items-center space-x-3 p-3 rounded-lg text-white/90 hover:bg-white/15 hover:text-white hover:shadow-sm transition-all duration-200 cursor-pointer select-none min-h-[44px] touch-manipulation"
              onClick={() => setIsMobileOpen(false)}
              data-testid="nav-link-settings"
              style={{ 
                pointerEvents: 'auto',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
              }}
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base flex-1">Settings</span>
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
