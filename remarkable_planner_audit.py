#!/usr/bin/env python3
"""
RemarkablePlanner Weekly Export Audit Script
============================================

This script audits the RemarkablePlanner application to identify issues
with the bidirectional weekly export functionality.

Usage: python3 remarkable_planner_audit.py [project_path]
"""

import os
import sys
import json
import re
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

class RemarkablePlannerAudit:
    def __init__(self, project_path: str = "."):
        self.project_path = Path(project_path).resolve()
        self.audit_results = {
            "timestamp": datetime.now().isoformat(),
            "project_path": str(self.project_path),
            "issues": [],
            "warnings": [],
            "success": [],
            "file_checks": {},
            "dependency_checks": {},
            "code_analysis": {},
            "recommendations": []
        }
        
    def log_issue(self, category: str, message: str, severity: str = "error"):
        """Log an issue found during audit"""
        issue = {
            "category": category,
            "message": message,
            "severity": severity,
            "timestamp": datetime.now().isoformat()
        }
        
        if severity == "error":
            self.audit_results["issues"].append(issue)
        elif severity == "warning":
            self.audit_results["warnings"].append(issue)
        else:
            self.audit_results["success"].append(issue)
            
        print(f"[{severity.upper()}] {category}: {message}")
    
    def check_file_exists(self, file_path: str, required: bool = True) -> bool:
        """Check if a file exists and log the result"""
        full_path = self.project_path / file_path
        exists = full_path.exists()
        
        self.audit_results["file_checks"][file_path] = {
            "exists": exists,
            "required": required,
            "full_path": str(full_path)
        }
        
        if exists:
            self.log_issue("File Check", f"✅ Found: {file_path}", "success")
            return True
        else:
            severity = "error" if required else "warning"
            self.log_issue("File Check", f"❌ Missing: {file_path}", severity)
            return False
    
    def check_package_json(self) -> Dict[str, Any]:
        """Check package.json for required dependencies"""
        package_json_path = self.project_path / "package.json"
        
        if not package_json_path.exists():
            self.log_issue("Dependencies", "package.json not found", "error")
            return {}
        
        try:
            with open(package_json_path, 'r') as f:
                package_data = json.load(f)
            
            dependencies = {
                **package_data.get("dependencies", {}),
                **package_data.get("devDependencies", {})
            }
            
            required_deps = {
                "jspdf": "PDF generation library",
                "date-fns": "Date manipulation utilities"
            }
            
            for dep, description in required_deps.items():
                if dep in dependencies:
                    self.log_issue("Dependencies", f"✅ Found {dep}: {dependencies[dep]} ({description})", "success")
                    self.audit_results["dependency_checks"][dep] = {
                        "found": True,
                        "version": dependencies[dep],
                        "description": description
                    }
                else:
                    self.log_issue("Dependencies", f"❌ Missing {dep}: {description}", "error")
                    self.audit_results["dependency_checks"][dep] = {
                        "found": False,
                        "version": None,
                        "description": description
                    }
            
            return dependencies
            
        except json.JSONDecodeError as e:
            self.log_issue("Dependencies", f"Invalid package.json: {e}", "error")
            return {}
        except Exception as e:
            self.log_issue("Dependencies", f"Error reading package.json: {e}", "error")
            return {}
    
    def analyze_typescript_file(self, file_path: str) -> Dict[str, Any]:
        """Analyze a TypeScript file for export functions and imports"""
        full_path = self.project_path / file_path
        
        if not full_path.exists():
            return {"exists": False, "analysis": None}
        
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            analysis = {
                "imports": [],
                "exports": [],
                "functions": [],
                "components": [],
                "has_jspdf_import": False,
                "has_date_fns_import": False,
                "has_export_functions": False
            }
            
            # Check for imports
            import_patterns = [
                (r"import.*from\s+['\"]jspdf['\"]", "jsPDF"),
                (r"import.*from\s+['\"]date-fns['\"]", "date-fns"),
                (r"import.*bidirectionalWeeklyPackage", "bidirectional export functions")
            ]
            
            for pattern, name in import_patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    analysis["imports"].append(name)
                    if "jspdf" in name.lower():
                        analysis["has_jspdf_import"] = True
                    if "date-fns" in name.lower():
                        analysis["has_date_fns_import"] = True
            
            # Check for export functions
            export_patterns = [
                r"export\s+const\s+(\w+)",
                r"export\s+function\s+(\w+)",
                r"export\s+default\s+(\w+)"
            ]
            
            for pattern in export_patterns:
                matches = re.findall(pattern, content)
                analysis["exports"].extend(matches)
            
            # Check for specific export functions
            export_function_patterns = [
                "exportWeeklyPackageFromCalendar",
                "exportBidirectionalWeeklyPackage",
                "exportAdvancedBidirectionalWeekly"
            ]
            
            for func_name in export_function_patterns:
                if func_name in content:
                    analysis["functions"].append(func_name)
                    analysis["has_export_functions"] = True
            
            # Check for React components
            component_patterns = [
                r"const\s+(\w+):\s*React\.FC",
                r"function\s+(\w+)\s*\(",
                r"export\s+const\s+(\w+)\s*=\s*\("
            ]
            
            for pattern in component_patterns:
                matches = re.findall(pattern, content)
                analysis["components"].extend(matches)
            
            return {"exists": True, "analysis": analysis}
            
        except Exception as e:
            self.log_issue("Code Analysis", f"Error analyzing {file_path}: {e}", "error")
            return {"exists": True, "analysis": None, "error": str(e)}
    
    def check_bidirectional_export_files(self):
        """Check all bidirectional export related files"""
        required_files = [
            "client/src/utils/bidirectionalWeeklyPackage.ts",
            "client/src/utils/bidirectionalWeeklyPackageLinked.ts",
            "client/src/utils/bidirectionalLinkedPDFExport.ts"
        ]
        
        optional_files = [
            "client/src/pages/planner.tsx",
            "src/utils/bidirectionalWeeklyPackage.ts",
            "server/pymypdf_bidirectional_export.py"
        ]
        
        self.log_issue("Export Files", "Checking bidirectional export files...", "info")
        
        for file_path in required_files:
            exists = self.check_file_exists(file_path, required=True)
            if exists:
                analysis = self.analyze_typescript_file(file_path)
                self.audit_results["code_analysis"][file_path] = analysis
                
                if analysis["analysis"]:
                    if analysis["analysis"]["has_export_functions"]:
                        self.log_issue("Code Analysis", f"✅ {file_path} has export functions", "success")
                    else:
                        self.log_issue("Code Analysis", f"⚠️ {file_path} missing export functions", "warning")
        
        for file_path in optional_files:
            exists = self.check_file_exists(file_path, required=False)
            if exists:
                analysis = self.analyze_typescript_file(file_path)
                self.audit_results["code_analysis"][file_path] = analysis
    
    def check_calendar_components(self):
        """Check calendar components for export integration"""
        calendar_files = [
            "client/src/components/calendar/DailyView.tsx",
            "client/src/components/calendar/WeeklyCalendarGrid.tsx",
            "src/components/calendar/DailyView.tsx",
            "src/components/calendar/WeeklyCalendarGrid.tsx"
        ]
        
        self.log_issue("Calendar Components", "Checking calendar components...", "info")
        
        for file_path in calendar_files:
            if self.check_file_exists(file_path, required=False):
                analysis = self.analyze_typescript_file(file_path)
                self.audit_results["code_analysis"][file_path] = analysis
                
                if analysis["analysis"]:
                    # Check if export functions are imported
                    has_export_import = any("bidirectional" in imp.lower() for imp in analysis["analysis"]["imports"])
                    
                    if has_export_import:
                        self.log_issue("Calendar Integration", f"✅ {file_path} has export imports", "success")
                    else:
                        self.log_issue("Calendar Integration", f"❌ {file_path} missing export imports", "error")
                        self.audit_results["recommendations"].append(
                            f"Add bidirectional export imports to {file_path}"
                        )
    
    def check_types_definition(self):
        """Check for CalendarEvent type definition"""
        type_files = [
            "client/src/types/calendar.ts",
            "src/types/calendar.ts",
            "types/calendar.ts"
        ]
        
        self.log_issue("Type Definitions", "Checking CalendarEvent type...", "info")
        
        found_types = False
        for file_path in type_files:
            if self.check_file_exists(file_path, required=False):
                try:
                    full_path = self.project_path / file_path
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    if "CalendarEvent" in content:
                        self.log_issue("Type Definitions", f"✅ Found CalendarEvent in {file_path}", "success")
                        found_types = True
                        
                        # Check for required fields
                        required_fields = ["startTime", "endTime", "title"]
                        for field in required_fields:
                            if field in content:
                                self.log_issue("Type Definitions", f"✅ CalendarEvent has {field} field", "success")
                            else:
                                self.log_issue("Type Definitions", f"⚠️ CalendarEvent missing {field} field", "warning")
                    
                except Exception as e:
                    self.log_issue("Type Definitions", f"Error reading {file_path}: {e}", "error")
        
        if not found_types:
            self.log_issue("Type Definitions", "❌ CalendarEvent type not found", "error")
            self.audit_results["recommendations"].append(
                "Create CalendarEvent type definition with required fields"
            )
    
    def check_console_errors(self):
        """Check for common console error patterns in files"""
        self.log_issue("Console Errors", "Checking for common error patterns...", "info")
        
        # This would typically check browser console logs, but we'll check code patterns
        error_patterns = [
            (r"Cannot resolve module", "Module resolution error"),
            (r"is not defined", "Undefined variable/function"),
            (r"Cannot read property.*of undefined", "Undefined property access"),
            (r"TypeError:", "Type error"),
            (r"ReferenceError:", "Reference error")
        ]
        
        # Check TypeScript files for potential issues
        ts_files = list(self.project_path.rglob("*.ts")) + list(self.project_path.rglob("*.tsx"))
        
        for ts_file in ts_files:
            if ts_file.is_file():
                try:
                    with open(ts_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Check for common issues
                    if "exportWeeklyPackageFromCalendar" in content and "import" not in content:
                        self.log_issue("Console Errors", 
                                     f"⚠️ {ts_file.relative_to(self.project_path)} uses export function without import", 
                                     "warning")
                    
                except Exception:
                    continue  # Skip files that can't be read
    
    def generate_recommendations(self):
        """Generate recommendations based on audit results"""
        self.log_issue("Recommendations", "Generating recommendations...", "info")
        
        # Check if core files are missing
        missing_core_files = []
        for file_path, check_result in self.audit_results["file_checks"].items():
            if check_result["required"] and not check_result["exists"]:
                missing_core_files.append(file_path)
        
        if missing_core_files:
            self.audit_results["recommendations"].append(
                f"Install missing core files: {', '.join(missing_core_files)}"
            )
        
        # Check if dependencies are missing
        missing_deps = []
        for dep, check_result in self.audit_results["dependency_checks"].items():
            if not check_result["found"]:
                missing_deps.append(dep)
        
        if missing_deps:
            self.audit_results["recommendations"].append(
                f"Install missing dependencies: npm install {' '.join(missing_deps)}"
            )
        
        # Check if calendar components need integration
        calendar_integration_needed = False
        for file_path, analysis in self.audit_results["code_analysis"].items():
            if "calendar" in file_path.lower() and analysis.get("analysis"):
                if not any("bidirectional" in imp.lower() for imp in analysis["analysis"]["imports"]):
                    calendar_integration_needed = True
        
        if calendar_integration_needed:
            self.audit_results["recommendations"].append(
                "Integrate bidirectional export functions into calendar components"
            )
    
    def run_audit(self) -> Dict[str, Any]:
        """Run the complete audit"""
        print("🔍 Starting RemarkablePlanner Weekly Export Audit...")
        print(f"📁 Project Path: {self.project_path}")
        print("=" * 60)
        
        # Check project structure
        self.log_issue("Audit", "Checking project structure...", "info")
        
        # Check dependencies
        self.check_package_json()
        
        # Check bidirectional export files
        self.check_bidirectional_export_files()
        
        # Check calendar components
        self.check_calendar_components()
        
        # Check type definitions
        self.check_types_definition()
        
        # Check for console errors
        self.check_console_errors()
        
        # Generate recommendations
        self.generate_recommendations()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 AUDIT SUMMARY")
        print("=" * 60)
        print(f"✅ Success: {len(self.audit_results['success'])}")
        print(f"⚠️  Warnings: {len(self.audit_results['warnings'])}")
        print(f"❌ Errors: {len(self.audit_results['issues'])}")
        print(f"💡 Recommendations: {len(self.audit_results['recommendations'])}")
        
        if self.audit_results['recommendations']:
            print("\n🔧 RECOMMENDATIONS:")
            for i, rec in enumerate(self.audit_results['recommendations'], 1):
                print(f"{i}. {rec}")
        
        return self.audit_results
    
    def save_report(self, output_file: str = "remarkable_planner_audit_report.json"):
        """Save audit report to JSON file"""
        output_path = self.project_path / output_file
        
        try:
            with open(output_path, 'w') as f:
                json.dump(self.audit_results, f, indent=2)
            
            print(f"\n📄 Audit report saved to: {output_path}")
            return str(output_path)
            
        except Exception as e:
            print(f"❌ Error saving report: {e}")
            return None

def main():
    """Main function"""
    project_path = sys.argv[1] if len(sys.argv) > 1 else "."
    
    print("🚀 RemarkablePlanner Weekly Export Audit Tool")
    print("=" * 60)
    
    auditor = RemarkablePlannerAudit(project_path)
    results = auditor.run_audit()
    report_path = auditor.save_report()
    
    # Exit with error code if issues found
    if results['issues']:
        print(f"\n❌ Audit completed with {len(results['issues'])} errors")
        sys.exit(1)
    elif results['warnings']:
        print(f"\n⚠️  Audit completed with {len(results['warnings'])} warnings")
        sys.exit(0)
    else:
        print("\n✅ Audit completed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    main()

