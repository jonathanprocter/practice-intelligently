import React, { useState } from 'react';
import { CalendarEvent } from '../types/calendar';
import { exportWeeklyPackageFromCalendar } from '../utils/bidirectionalWeeklyPackageLinked';
import { exportAdvancedBidirectionalWeekly } from '../utils/bidirectionalLinkedPDFExport';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Sparkles, Calendar, Clock, FileText, Navigation, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PlannerProps {
  events?: CalendarEvent[];
  currentDate?: Date;
}

const Planner: React.FC<PlannerProps> = ({ 
  events = [], 
  currentDate = new Date() 
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const { toast } = useToast();

  const handleBidirectionalExport = async () => {
    try {
      setIsExporting(true);
      setExportStatus('Generating bidirectional weekly package...');

      // Calculate week boundaries
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 }); // Sunday

      console.log('🎯 EXACT Weekly Package (8 Pages)');
      console.log(`📅 Week: ${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`);
      console.log(`📊 Events: ${events.length}`);

      // Export the bidirectional weekly package
      await exportWeeklyPackageFromCalendar(currentDate, events);

      setExportStatus('✅ Bidirectional weekly package exported successfully!');

      toast({
        title: "Export Complete",
        description: "Your bidirectional weekly package (8 pages) has been exported successfully!",
        duration: 5000,
      });

      // Clear status after 5 seconds
      setTimeout(() => setExportStatus(''), 5000);

    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('❌ Export failed. Please try again.');

      toast({
        title: "Export Failed",
        description: "Failed to export the weekly package. Please try again.",
        variant: "destructive",
        duration: 5000,
      });

      setTimeout(() => setExportStatus(''), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleAdvancedExport = async () => {
    try {
      setIsExporting(true);
      setExportStatus('Generating advanced bidirectional package...');

      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

      await exportAdvancedBidirectionalWeekly(weekStart, weekEnd, events);

      setExportStatus('✅ Advanced bidirectional package exported successfully!');

      toast({
        title: "Advanced Export Complete",
        description: "Your advanced bidirectional package has been exported successfully!",
        duration: 5000,
      });

      setTimeout(() => setExportStatus(''), 5000);

    } catch (error) {
      console.error('Advanced export failed:', error);
      setExportStatus('❌ Advanced export failed. Please try again.');

      toast({
        title: "Export Failed",
        description: "Failed to export the advanced package. Please try again.",
        variant: "destructive",
        duration: 5000,
      });

      setTimeout(() => setExportStatus(''), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  // Calculate events for each day of the week
  const weeklyEventCounts = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(weekStart, index);
    const dayEvents = events.filter(event => {
      if (!event.startTime) return false;
      const eventDate = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
      return eventDate.toDateString() === day.toDateString();
    });
    return {
      day: format(day, 'EEE'),
      date: format(day, 'MMM dd'),
      count: dayEvents.length
    };
  });

  return (
    <div className="planner-container p-6 max-w-6xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center">
            <Package className="mr-3 h-8 w-8 text-blue-600" />
            Bidirectional Weekly Package Export
          </h1>
          <p className="text-lg text-gray-600">
            Generate comprehensive weekly planners with full bidirectional navigation
          </p>
        </div>

        {/* Current Week Info */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <Calendar className="mr-2 h-5 w-5" />
              Current Week: {format(weekStart, 'MMMM dd')} - {format(weekEnd, 'MMMM dd, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="text-blue-700 font-medium">
                  {events.length} events scheduled this week
                </span>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                8 Pages Total
              </Badge>
            </div>

            {/* Daily event breakdown */}
            <div className="grid grid-cols-7 gap-2">
              {weeklyEventCounts.map((day, index) => (
                <div key={index} className="text-center p-2 bg-white rounded border">
                  <div className="text-xs font-medium text-gray-600">{day.day}</div>
                  <div className="text-xs text-gray-500">{day.date}</div>
                  <div className="text-sm font-bold text-blue-600 mt-1">
                    {day.count} {day.count === 1 ? 'event' : 'events'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Package Contents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-gray-800">
                <FileText className="mr-2 h-5 w-5 text-green-600" />
                Package Contents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <div className="font-medium">Weekly Overview</div>
                    <div className="text-sm text-gray-600">Landscape format with clickable navigation</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">7</span>
                  </div>
                  <div>
                    <div className="font-medium">Daily Pages</div>
                    <div className="text-sm text-gray-600">Portrait format with detailed scheduling</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium">US Letter Format</div>
                    <div className="text-sm text-gray-600">Optimized for reMarkable devices</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-gray-800">
                <Navigation className="mr-2 h-5 w-5 text-blue-600" />
                Navigation Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Click appointments → Navigate to daily pages</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Click day headers → Jump to specific days</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Daily pages → Return to weekly overview</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Daily pages → Navigate between days</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Full bidirectional linking system</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-gray-800">
              <Download className="mr-2 h-5 w-5 text-indigo-600" />
              Export Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button
                onClick={handleBidirectionalExport}
                disabled={isExporting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-3"
                size="lg"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Package className="h-5 w-5" />
                    <span>Export Bidirectional Weekly Package (8 Pages)</span>
                  </>
                )}
              </Button>

              <Button
                onClick={handleAdvancedExport}
                disabled={isExporting}
                variant="outline"
                className="w-full border-2 border-green-300 text-green-700 hover:bg-green-50 font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-3"
                size="lg"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    <span>Export Advanced Bidirectional Package</span>
                  </>
                )}
              </Button>
            </div>

            {exportStatus && (
              <div className={`mt-4 p-4 rounded-lg text-center font-medium border-2 ${
                exportStatus.includes('✅') 
                  ? 'bg-green-50 text-green-800 border-green-200' 
                  : exportStatus.includes('❌')
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}>
                <div className="flex items-center justify-center space-x-2">
                  {exportStatus.includes('✅') ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : exportStatus.includes('❌') ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <Clock className="h-5 w-5" />
                  )}
                  <span>{exportStatus}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-700">
              <FileText className="mr-2 h-5 w-5 text-gray-600" />
              Technical Specifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Format Details</h4>
                <ul className="space-y-1">
                  <li>• US Letter format (8.5" × 11")</li>
                  <li>• Page 1: Landscape orientation</li>
                  <li>• Pages 2-8: Portrait orientation</li>
                  <li>• Optimized for reMarkable devices</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Export Features</h4>
                <ul className="space-y-1">
                  <li>• Full bidirectional PDF navigation</li>
                  <li>• Clickable appointments and headers</li>
                  <li>• Time grid with 30-minute slots</li>
                  <li>• Color-coded event sources</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 space-y-1">
          <p>💡 The exported PDF will contain exactly 8 pages with full bidirectional navigation</p>
          <p>🎯 Optimized for reMarkable devices in US Letter format</p>
          <p>🔗 Each page links to relevant sections for seamless navigation</p>
        </div>
      </div>
    </div>
  );
};

export default Planner;

