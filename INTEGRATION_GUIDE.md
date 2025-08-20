# Bidirectional Weekly Package Integration Guide

## 🎯 Overview
This setup script has created a complete bidirectional weekly package export system that generates exactly 8 pages:
- Page 1: Weekly Overview (Landscape)
- Pages 2-8: Daily Pages (Portrait)

## 📁 Files Created

### Core TypeScript Files
- `client/src/utils/bidirectionalWeeklyPackage.ts` - Main export function
- `client/src/utils/bidirectionalWeeklyPackageLinked.ts` - Enhanced version with calendar integration
- `client/src/utils/bidirectionalLinkedPDFExport.ts` - Advanced export system
- `client/src/pages/planner.tsx` - React component with export buttons

### Python Backend
- `server/pymypdf_bidirectional_export.py` - Python PDF generation

### Audit & Testing
- `audit/bidirectional_export_audit.js` - JavaScript audit system

### Integration
- `integration/replit_integration.py` - Replit setup utilities

## 🔧 Integration Steps

### 1. Install Dependencies
```bash
npm install jspdf date-fns
npm install --save-dev @types/jspdf
```

### 2. Add to Existing Calendar Components

#### Option A: Add Export Button to Existing Calendar
Add this to your existing calendar components (DailyView.tsx, WeeklyCalendarGrid.tsx):

```tsx
import { exportWeeklyPackageFromCalendar } from '../utils/bidirectionalWeeklyPackageLinked';

// Add export button
<button 
  onClick={() => exportWeeklyPackageFromCalendar(currentDate, events)}
  className="bg-blue-600 text-white px-4 py-2 rounded"
>
  📦 Export Weekly Package (8 Pages)
</button>
```

#### Option B: Use Dedicated Planner Page
Add route to `client/src/pages/planner.tsx`:

```tsx
import Planner from './pages/planner';

// In your router
<Route path="/planner" component={Planner} />
```

### 3. Calendar Event Type
Ensure your CalendarEvent type includes:

```tsx
interface CalendarEvent {
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  source?: 'simplepractice' | 'google' | 'holiday';
  location?: string;
}
```

## 🎯 Usage

### Basic Export
```tsx
import { exportBidirectionalWeeklyPackage } from './utils/bidirectionalWeeklyPackage';

await exportBidirectionalWeeklyPackage(weekStartDate, weekEndDate, events);
```

### Calendar Integration
```tsx
import { exportWeeklyPackageFromCalendar } from './utils/bidirectionalWeeklyPackageLinked';

await exportWeeklyPackageFromCalendar(currentDate, events);
```

### Advanced Export
```tsx
import { exportAdvancedBidirectionalWeekly } from './utils/bidirectionalLinkedPDFExport';

await exportAdvancedBidirectionalWeekly(weekStartDate, weekEndDate, events);
```

## ✅ Features

### Navigation
- ✅ Weekly overview → Daily pages (click appointments or day headers)
- ✅ Daily pages → Back to weekly overview
- ✅ Daily pages → Previous/Next day navigation
- ✅ Full bidirectional linking system

### Format
- ✅ US Letter format for reMarkable compatibility
- ✅ Page 1: Landscape weekly overview
- ✅ Pages 2-8: Portrait daily pages
- ✅ Proper margins and typography

### Styling
- ✅ Color-coded events by source (SimplePractice, Google, Holiday)
- ✅ Time grid with 30-minute slots (6:00 AM - 11:30 PM)
- ✅ Professional layout optimized for reMarkable devices

## 🧪 Testing

Run the audit system:
```javascript
const audit = new BidirectionalExportAudit();
const results = audit.auditExport(weekStartDate, weekEndDate, events);
console.log(results);
```

## 🎊 Success!

Your bidirectional weekly package export system is now ready! The exported PDFs will contain exactly 8 pages with full navigation between all pages, just like the original RemarkablePlannerPro application.
