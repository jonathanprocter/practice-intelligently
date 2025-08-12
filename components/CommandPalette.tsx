import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { 
  Search, Calendar, Users, FileText, Settings, LogOut,
  Plus, RefreshCw, Bell, User, Home, BarChart, Clock,
  Brain, Zap, Archive, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';

interface Command {
  id: string;
  label: string;
  icon: React.ElementType;
  shortcut?: string;
  category: 'navigation' | 'action' | 'search' | 'settings';
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: string) => void;
}

export function CommandPalette({ isOpen, onClose, onAction }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, navigate] = useLocation();

  const commands: Command[] = useMemo(() => [
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      icon: Home,
      shortcut: '⌘H',
      category: 'navigation',
      action: () => {
        navigate('/');
        onClose();
      },
      keywords: ['home', 'main']
    },
    {
      id: 'nav-appointments',
      label: 'View Appointments',
      icon: Calendar,
      shortcut: '⌘A',
      category: 'navigation',
      action: () => {
        navigate('/appointments');
        onClose();
      },
      keywords: ['schedule', 'calendar']
    },
    {
      id: 'nav-clients',
      label: 'View Clients',
      icon: Users,
      shortcut: '⌘C',
      category: 'navigation',
      action: () => {
        navigate('/clients');
        onClose();
      },
      keywords: ['patients', 'people']
    },
    {
      id: 'nav-notes',
      label: 'Session Notes',
      icon: FileText,
      shortcut: '⌘N',
      category: 'navigation',
      action: () => {
        navigate('/session-notes');
        onClose();
      },
      keywords: ['documents', 'records']
    },
    {
      id: 'nav-analytics',
      label: 'Analytics',
      icon: BarChart,
      category: 'navigation',
      action: () => {
        navigate('/analytics');
        onClose();
      },
      keywords: ['reports', 'statistics', 'metrics']
    },

    // Actions
    {
      id: 'action-new-appointment',
      label: 'New Appointment',
      icon: Plus,
      shortcut: '⌘⇧A',
      category: 'action',
      action: () => {
        onAction?.('new-appointment');
        onClose();
      },
      keywords: ['create', 'add', 'schedule']
    },
    {
      id: 'action-new-client',
      label: 'New Client',
      icon: Plus,
      shortcut: '⌘⇧C',
      category: 'action',
      action: () => {
        onAction?.('new-client');
        onClose();
      },
      keywords: ['create', 'add', 'patient']
    },
    {
      id: 'action-new-note',
      label: 'New Session Note',
      icon: Plus,
      shortcut: '⌘⇧N',
      category: 'action',
      action: () => {
        onAction?.('new-note');
        onClose();
      },
      keywords: ['create', 'add', 'document']
    },
    {
      id: 'action-generate-insights',
      label: 'Generate AI Insights',
      icon: Brain,
      category: 'action',
      action: () => {
        onAction?.('generate-insights');
        onClose();
      },
      keywords: ['ai', 'analysis', 'suggestions']
    },
    {
      id: 'action-sync',
      label: 'Sync Calendar',
      icon: RefreshCw,
      category: 'action',
      action: () => {
        onAction?.('sync-calendar');
        onClose();
      },
      keywords: ['refresh', 'update']
    },

    // Search
    {
      id: 'search-clients',
      label: 'Search Clients',
      icon: Search,
      category: 'search',
      action: () => {
        onAction?.('search-clients');
        onClose();
      },
      keywords: ['find', 'lookup']
    },
    {
      id: 'search-notes',
      label: 'Search Notes',
      icon: Search,
      category: 'search',
      action: () => {
        onAction?.('search-notes');
        onClose();
      },
      keywords: ['find', 'lookup']
    },

    // Settings
    {
      id: 'settings-profile',
      label: 'Profile Settings',
      icon: User,
      category: 'settings',
      action: () => {
        navigate('/settings/profile');
        onClose();
      },
      keywords: ['account', 'preferences']
    },
    {
      id: 'settings-notifications',
      label: 'Notification Settings',
      icon: Bell,
      category: 'settings',
      action: () => {
        navigate('/settings/notifications');
        onClose();
      },
      keywords: ['alerts', 'preferences']
    },
    {
      id: 'settings-integrations',
      label: 'Integrations',
      icon: Zap,
      category: 'settings',
      action: () => {
        navigate('/settings/integrations');
        onClose();
      },
      keywords: ['connections', 'apis']
    },
    {
      id: 'action-logout',
      label: 'Sign Out',
      icon: LogOut,
      category: 'settings',
      action: () => {
        onAction?.('logout');
        onClose();
      },
      keywords: ['logout', 'exit']
    },
  ], [navigate, onAction, onClose]);

  const filteredCommands = useMemo(() => {
    if (!search) return commands;

    const searchLower = search.toLowerCase();
    return commands.filter(cmd => 
      cmd.label.toLowerCase().includes(searchLower) ||
      cmd.keywords?.some(keyword => keyword.toLowerCase().includes(searchLower))
    );
  }, [commands, search]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {
      navigation: [],
      action: [],
      search: [],
      settings: []
    };

    filteredCommands.forEach(cmd => {
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-2xl">
        <div className="flex items-center border-b px-4 py-3">
          <Search className="h-5 w-5 text-gray-400 mr-3" />
          <Input
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
        </div>

        <div className="max-h-[400px] overflow-y-auto py-2">
          {Object.entries(groupedCommands).map(([category, cmds]) => {
            if (cmds.length === 0) return null;

            return (
              <div key={category}>
                <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                  {category}
                </div>
                {cmds.map((cmd, index) => {
                  const Icon = cmd.icon;
                  const globalIndex = filteredCommands.indexOf(cmd);
                  const isSelected = globalIndex === selectedIndex;

                  return (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      className={cn(
                        "w-full px-4 py-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800",
                        isSelected && "bg-gray-100 dark:bg-gray-800"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{cmd.label}</span>
                      </div>
                      {cmd.shortcut && (
                        <span className="text-xs text-gray-400">{cmd.shortcut}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {filteredCommands.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">
              No commands found
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}