// Module declarations
declare module 'react-window';
declare module 'react-virtualized-auto-sizer';
declare module '@radix-ui/react-accordion';
declare module '@radix-ui/react-aspect-ratio';
declare module '@radix-ui/react-collapsible';
declare module '@radix-ui/react-context-menu';
declare module '@radix-ui/react-hover-card';
declare module '@radix-ui/react-menubar';
declare module '@radix-ui/react-navigation-menu';
declare module '@radix-ui/react-radio-group';
declare module '@radix-ui/react-slider';
declare module '@radix-ui/react-toggle';
declare module '@radix-ui/react-toggle-group';
declare module 'vaul';
declare module 'input-otp';
declare module 'embla-carousel-react';
declare module 'react-resizable-panels';

// Global types
interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  type: 'manual' | 'system' | 'google';
  therapistId: string;
  clientId?: string;
  googleEventId?: string;
  status?: string;
  attendees?: any[];
  isAllDay?: boolean;
  location?: string;
  description?: string;
  actionItems?: any[];
  notes?: string;
}
