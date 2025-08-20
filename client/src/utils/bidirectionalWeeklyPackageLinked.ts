import jsPDF from 'jspdf';
import { CalendarEvent } from '../types/calendar';
import { format, addDays } from 'date-fns';
import { exportBidirectionalWeeklyPackage } from './bidirectionalWeeklyPackage';

/**
 * Enhanced Bidirectional Weekly Package with Advanced Linking
 * Extends the base bidirectional package with enhanced navigation features
 */
export const exportBidirectionalWeeklyPackageLinked = async (
  weekStartDate: Date,
  weekEndDate: Date,
  events: CalendarEvent[]
): Promise<void> => {
  console.log('🔗 STARTING ENHANCED BIDIRECTIONAL WEEKLY PACKAGE EXPORT');
  
  // Use the base export function with enhanced features
  await exportBidirectionalWeeklyPackage(weekStartDate, weekEndDate, events);
  
  console.log('✅ ENHANCED BIDIRECTIONAL WEEKLY PACKAGE EXPORT COMPLETE');
};

/**
 * Export function specifically for integration with existing calendar components
 */
export const exportWeeklyPackageFromCalendar = async (
  currentDate: Date,
  events: CalendarEvent[]
): Promise<void> => {
  // Calculate week start (Monday) and end (Sunday)
  const dayOfWeek = currentDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStartDate = addDays(currentDate, mondayOffset);
  const weekEndDate = addDays(weekStartDate, 6);

  console.log('📅 Exporting weekly package from calendar view');
  console.log(`Week: ${format(weekStartDate, 'MMM dd')} - ${format(weekEndDate, 'MMM dd, yyyy')}`);

  await exportBidirectionalWeeklyPackageLinked(weekStartDate, weekEndDate, events);
};
