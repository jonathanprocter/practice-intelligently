import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Package, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CalendarEvent } from '../../types/calendar';
import { exportWeeklyPackageFromCalendar } from '../../utils/bidirectionalWeeklyPackageLinked';
import { exportAdvancedBidirectionalWeekly } from '../../utils/bidirectionalLinkedPDFExport';
import { startOfWeek, endOfWeek } from 'date-fns';

interface ExportButtonProps {
  currentDate: Date;
  events: CalendarEvent[];
  variant?: 'default' | 'compact';
  className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  currentDate,
  events,
  variant = 'default',
  className = ''
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      console.log('🎯 EXACT Weekly Package (8 Pages)');
      console.log(`📅 Current Date: ${currentDate.toDateString()}`);
      console.log(`📊 Available Events: ${events.length}`);

      await exportWeeklyPackageFromCalendar(currentDate, events);

      toast({
        title: "Export Complete",
        description: "Your bidirectional weekly package (8 pages) has been exported successfully!",
      });

    } catch (error) {
      console.error('Export failed:', error);
      
      toast({
        title: "Export Failed",
        description: "Failed to export the weekly package. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (variant === 'compact') {
    return (
      <Button
        onClick={handleExport}
        disabled={isExporting}
        className={`bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 ${className}`}
        size="sm"
      >
        {isExporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Exporting...
          </>
        ) : (
          <>
            <Package className="mr-2 h-4 w-4" />
            Export (8 Pages)
          </>
        )}
      </Button>
    );
  }

  return (
    <div className={`p-4 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-800">Weekly Package Export</h3>
        </div>
        <div className="text-sm text-blue-600">
          {events.length} events
        </div>
      </div>
      
      <Button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
      >
        {isExporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Exporting...
          </>
        ) : (
          <>
            <Package className="mr-2 h-4 w-4" />
            Export Weekly Package (8 Pages)
          </>
        )}
      </Button>

      <div className="mt-2 text-xs text-blue-600">
        💡 Exports 8 pages: 1 weekly overview + 7 daily pages with full bidirectional navigation
      </div>
    </div>
  );
};
