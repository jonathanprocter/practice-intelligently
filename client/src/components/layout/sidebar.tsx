import { Link, useLocation } from "wouter";
import { Brain, Users, Calendar, FileText, CheckSquare, BarChart, Bot, Settings, Menu, MessageSquare, FolderOpen, ClipboardList, Upload, Activity, PieChart, Tag, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load collapsed state from localStorage
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', isCollapsed.toString());
  }, [isCollapsed]);

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
      {/* Mobile overlay with enhanced animation */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-40 lg:hidden touch-manipulation transition-opacity duration-300",
          isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsMobileOpen(false)}
        onTouchStart={() => setIsMobileOpen(false)}
        data-testid="sidebar-overlay"
        style={{
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
      />

      {/* Mobile menu button - Enhanced iPhone optimized */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden min-h-[48px] min-w-[48px] xs:min-h-[44px] xs:min-w-[44px] p-2 bg-white/95 backdrop-blur-md shadow-lg touch-manipulation iphone-haptic-feedback rounded-xl"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        data-testid="mobile-menu-button"
        style={{
          WebkitTapHighlightColor: 'rgba(100, 149, 237, 0.2)',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
      >
        <Menu className="h-6 w-6 xs:h-5 xs:w-5" />
      </Button>

      {/* Sidebar - Enhanced with collapse feature */}
      <div className={cn(
        "sidebar-nav shadow-xl fixed h-full z-50 lg:relative transition-all duration-300 ease-in-out safe-area-top",
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        isCollapsed && !isMobileOpen ? 'lg:w-20' : 'w-80 xs:w-72 sm:w-64'
      )}>
        <div className="p-4 xs:p-5 sm:p-6 border-b border-white/20 safe-area-top relative">
          <div className="flex items-center justify-between">
            <div className={cn(
              "flex items-center transition-all duration-300",
              isCollapsed && !isMobileOpen ? "justify-center" : "space-x-3 xs:space-x-4"
            )}>
              <div className="w-12 h-12 xs:w-10 xs:h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Brain className="text-white text-xl xs:text-lg" />
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="min-w-0 flex-1 animate-fadeIn">
                  <h1 className="text-white font-bold text-lg xs:text-base sm:text-lg truncate leading-tight">Practice Intelligence</h1>
                </div>
              )}
            </div>
            {/* Mobile close button */}
            {isMobileOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-white hover:bg-white/20"
                onClick={() => setIsMobileOpen(false)}
                data-testid="mobile-close-button"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
          {/* Desktop collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "hidden lg:flex absolute -right-4 top-1/2 transform -translate-y-1/2 bg-white shadow-md hover:shadow-lg text-therapy-primary rounded-full transition-all duration-300",
              isCollapsed ? "-right-3" : "-right-4"
            )}
            onClick={() => setIsCollapsed(!isCollapsed)}
            data-testid="sidebar-collapse-button"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="p-2 xs:p-3 sm:p-4 space-y-1 overflow-y-auto flex-1 scrollable-container">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center rounded-xl xs:rounded-lg transition-all duration-200 cursor-pointer select-none min-h-[52px] xs:min-h-[48px] touch-manipulation active:scale-95",
                isActive(item.path)
                  ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm'
                  : 'text-white/90 hover:bg-white/15 hover:text-white hover:shadow-sm active:bg-white/20',
                isCollapsed && !isMobileOpen ? "justify-center px-3" : "space-x-3 xs:space-x-4 p-4 xs:p-3"
              )}
              onClick={() => setIsMobileOpen(false)}
              data-testid={`nav-link-${item.path.replace('/', '') || 'dashboard'}`}
              style={{ 
                pointerEvents: 'auto',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
              }}
            >
              <item.icon className={cn(
                "flex-shrink-0 transition-all duration-300",
                isCollapsed && !isMobileOpen ? "w-6 h-6" : "w-6 h-6 xs:w-5 xs:h-5"
              )} />
              {(!isCollapsed || isMobileOpen) && (
                <>
                  <span className="font-medium flex-1 text-base xs:text-sm sm:text-base truncate leading-tight animate-fadeIn">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className={cn(
                      "text-white text-xs px-3 py-1.5 xs:px-2 xs:py-1 rounded-full font-medium flex-shrink-0 shadow-sm animate-slideIn",
                      item.badgeColor || 'bg-therapy-primary'
                    )}>
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {isCollapsed && !isMobileOpen && item.badge && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </Link>
          ))}

          <div className="pt-4 border-t border-white/20 mt-4 safe-area-bottom">
            <Link
              href="/settings"
              className={cn(
                "flex items-center rounded-xl xs:rounded-lg text-white/90 hover:bg-white/15 hover:text-white hover:shadow-sm active:bg-white/20 transition-all duration-200 cursor-pointer select-none min-h-[52px] xs:min-h-[48px] touch-manipulation active:scale-95",
                isCollapsed && !isMobileOpen ? "justify-center px-3" : "space-x-3 xs:space-x-4 p-4 xs:p-3"
              )}
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
              <Settings className={cn(
                "flex-shrink-0 transition-all duration-300",
                isCollapsed && !isMobileOpen ? "w-6 h-6" : "w-6 h-6 xs:w-5 xs:h-5"
              )} />
              {(!isCollapsed || isMobileOpen) && (
                <span className="font-medium flex-1 text-base xs:text-sm sm:text-base truncate leading-tight animate-fadeIn">
                  Settings
                </span>
              )}
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}