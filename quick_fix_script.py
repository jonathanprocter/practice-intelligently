#!/usr/bin/env python3
"""
RemarkablePlanner Quick Fix Script
=================================

This script applies common fixes for weekly export issues based on audit results.
"""

import os
import sys
import json
import shutil
from pathlib import Path

class QuickFixer:
    def __init__(self, project_path: str = "."):
        self.project_path = Path(project_path).resolve()
        
    def fix_missing_imports(self):
        """Fix missing import statements in calendar components"""
        print("🔧 Fixing missing import statements...")
        
        calendar_files = [
            "client/src/components/calendar/DailyView.tsx",
            "client/src/components/calendar/WeeklyCalendarGrid.tsx",
            "src/components/calendar/DailyView.tsx",
            "src/components/calendar/WeeklyCalendarGrid.tsx"
        ]
        
        required_imports = [
            "import { exportWeeklyPackageFromCalendar } from '../../utils/bidirectionalWeeklyPackageLinked';",
            "import { exportAdvancedBidirectionalWeekly } from '../../utils/bidirectionalLinkedPDFExport';",
            "import { format, startOfWeek, endOfWeek } from 'date-fns';"
        ]
        
        for file_path in calendar_files:
            full_path = self.project_path / file_path
            if full_path.exists():
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Check if imports are missing
                    missing_imports = []
                    for import_line in required_imports:
                        if import_line.split(' from ')[0] not in content:
                            missing_imports.append(import_line)
                    
                    if missing_imports:
                        # Find the last import line
                        lines = content.split('\n')
                        last_import_index = -1
                        
                        for i, line in enumerate(lines):
                            if line.strip().startswith('import '):
                                last_import_index = i
                        
                        if last_import_index >= 0:
                            # Insert missing imports after the last import
                            for import_line in reversed(missing_imports):
                                lines.insert(last_import_index + 1, import_line)
                            
                            # Write back to file
                            with open(full_path, 'w', encoding='utf-8') as f:
                                f.write('\n'.join(lines))
                            
                            print(f"✅ Fixed imports in {file_path}")
                        else:
                            print(f"⚠️ Could not find import section in {file_path}")
                    else:
                        print(f"✅ Imports already present in {file_path}")
                        
                except Exception as e:
                    print(f"❌ Error fixing {file_path}: {e}")
    
    def create_missing_types(self):
        """Create missing CalendarEvent type definition"""
        print("🔧 Creating missing type definitions...")
        
        type_files = [
            "client/src/types/calendar.ts",
            "src/types/calendar.ts"
        ]
        
        calendar_event_type = '''export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  isAllDay?: boolean;
  location?: string;
  clientName?: string;
  notes?: string;
  source?: 'simplepractice' | 'google' | 'holiday';
  status?: string;
  calendarName?: string;
}

export interface CalendarDay {
  date: Date;
  isToday: boolean;
  events?: CalendarEvent[];
}
'''
        
        for file_path in type_files:
            full_path = self.project_path / file_path
            
            # Create directory if it doesn't exist
            full_path.parent.mkdir(parents=True, exist_ok=True)
            
            if not full_path.exists():
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(calendar_event_type)
                print(f"✅ Created {file_path}")
            else:
                # Check if CalendarEvent exists
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if "CalendarEvent" not in content:
                    with open(full_path, 'a', encoding='utf-8') as f:
                        f.write('\n' + calendar_event_type)
                    print(f"✅ Added CalendarEvent to {file_path}")
                else:
                    print(f"✅ CalendarEvent already exists in {file_path}")
    
    def fix_package_json(self):
        """Add missing dependencies to package.json"""
        print("🔧 Checking package.json dependencies...")
        
        package_json_path = self.project_path / "package.json"
        
        if not package_json_path.exists():
            print("❌ package.json not found")
            return
        
        try:
            with open(package_json_path, 'r') as f:
                package_data = json.load(f)
            
            dependencies = package_data.get("dependencies", {})
            dev_dependencies = package_data.get("devDependencies", {})
            
            # Required dependencies
            required_deps = {
                "jspdf": "^2.5.1",
                "date-fns": "^2.30.0"
            }
            
            required_dev_deps = {
                "@types/jspdf": "^2.3.0"
            }
            
            # Check and add missing dependencies
            missing_deps = []
            for dep, version in required_deps.items():
                if dep not in dependencies:
                    dependencies[dep] = version
                    missing_deps.append(dep)
            
            missing_dev_deps = []
            for dep, version in required_dev_deps.items():
                if dep not in dev_dependencies:
                    dev_dependencies[dep] = version
                    missing_dev_deps.append(dep)
            
            if missing_deps or missing_dev_deps:
                package_data["dependencies"] = dependencies
                package_data["devDependencies"] = dev_dependencies
                
                with open(package_json_path, 'w') as f:
                    json.dump(package_data, f, indent=2)
                
                print(f"✅ Added dependencies: {', '.join(missing_deps + missing_dev_deps)}")
                print("🔄 Run 'npm install' to install new dependencies")
            else:
                print("✅ All required dependencies are present")
                
        except Exception as e:
            print(f"❌ Error updating package.json: {e}")
    
    def create_export_button_component(self):
        """Create a reusable export button component"""
        print("🔧 Creating reusable export button component...")
        
        component_path = self.project_path / "client/src/components/ui/ExportButton.tsx"
        component_path.parent.mkdir(parents=True, exist_ok=True)
        
        if not component_path.exists():
            export_button_code = '''import React, { useState } from 'react';
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
'''
            
            with open(component_path, 'w', encoding='utf-8') as f:
                f.write(export_button_code)
            
            print(f"✅ Created reusable export button component")
        else:
            print("✅ Export button component already exists")
    
    def run_fixes(self):
        """Run all quick fixes"""
        print("🚀 Running RemarkablePlanner Quick Fixes...")
        print("=" * 50)
        
        self.fix_package_json()
        self.create_missing_types()
        self.fix_missing_imports()
        self.create_export_button_component()
        
        print("\n" + "=" * 50)
        print("✅ Quick fixes completed!")
        print("\n🔄 Next steps:")
        print("1. Run 'npm install' to install dependencies")
        print("2. Restart your development server")
        print("3. Test the export functionality")
        print("4. Run the audit script again to verify fixes")

def main():
    project_path = sys.argv[1] if len(sys.argv) > 1 else "."
    
    fixer = QuickFixer(project_path)
    fixer.run_fixes()

if __name__ == "__main__":
    main()

