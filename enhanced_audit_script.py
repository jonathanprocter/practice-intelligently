#!/usr/bin/env python3
"""
Enhanced Codebase Audit Script - Simplified and Robust
Checks for missing API routes, schema mismatches, and other structural issues.
"""

import os
import re
import json
from pathlib import Path
from typing import Dict, List, Set, Tuple, Any

class CodebaseAuditor:
    def __init__(self, root_path: str = "."):
        self.root_path = Path(root_path)
        self.issues = []
        self.api_routes = set()
        self.api_calls = []
        self.schema_fields = {}
        
    def log_issue(self, category: str, severity: str, file_path: str, line: int, description: str, suggestion: str = ""):
        """Log an issue found during audit"""
        self.issues.append({
            "category": category,
            "severity": severity,
            "file": str(file_path),
            "line": line,
            "description": description,
            "suggestion": suggestion
        })
    
    def extract_api_routes(self):
        """Extract all API routes defined in server files"""
        print("Extracting API routes from server files...")
        
        try:
            routes_file = self.root_path / "server" / "routes.ts"
            if routes_file.exists():
                with open(routes_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                route_patterns = [
                    r'app\.get\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
                    r'app\.post\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
                    r'app\.put\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
                    r'app\.delete\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
                    r'app\.patch\s*\(\s*[\'"`]([^\'"`]+)[\'"`]'
                ]
                
                for pattern in route_patterns:
                    matches = re.finditer(pattern, content, re.MULTILINE)
                    for match in matches:
                        route = match.group(1)
                        self.api_routes.add(route)
                        
            print(f"Found {len(self.api_routes)} API routes")
        except Exception as e:
            print(f"Error extracting routes: {e}")
    
    def extract_api_calls(self):
        """Extract all API calls made in client files"""
        print("Extracting API calls from client files...")
        
        client_dir = self.root_path / "client"
        if not client_dir.exists():
            client_dir = self.root_path / "src"
            
        if client_dir.exists():
            for file_path in client_dir.rglob("*.ts*"):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        lines = content.split('\n')
                        
                        for line_num, line in enumerate(lines, 1):
                            # Look for API calls
                            api_patterns = [
                                r'fetch\s*\(\s*[\'"`]([^\'"`]*\/api\/[^\'"`]+)[\'"`]',
                                r'apiRequest\s*\([^,]+,\s*[\'"`]([^\'"`]*\/api\/[^\'"`]+)[\'"`]',
                                r'queryKey:\s*\[\s*[\'"`]([^\'"`]*\/api\/[^\'"`]+)[\'"`]'
                            ]
                            
                            for pattern in api_patterns:
                                matches = re.finditer(pattern, line)
                                for match in matches:
                                    url = match.group(1)
                                    self.api_calls.append((url, str(file_path), line_num))
                                    
                except Exception as e:
                    print(f"Error reading {file_path}: {e}")
        
        print(f"Found {len(self.api_calls)} API calls")
    
    def check_missing_routes(self):
        """Check for API calls that don't have corresponding routes"""
        print("Checking for missing API routes...")
        
        for url, file_path, line_num in self.api_calls:
            # Normalize URL for comparison
            normalized_url = re.sub(r'\$\{[^}]+\}', ':param', url)  # Template literals
            normalized_url = re.sub(r'/[a-f0-9-]{36}', '/:id', normalized_url)  # UUIDs
            normalized_url = re.sub(r'/\d+', '/:id', normalized_url)  # Numbers
            
            # Check if route exists
            route_found = False
            for route in self.api_routes:
                if normalized_url == route or url == route:
                    route_found = True
                    break
                    
                # Check with parameter substitution
                route_pattern = re.sub(r':[^/]+', r'[^/]+', route)
                if re.match(f"^{route_pattern}$", normalized_url):
                    route_found = True
                    break
            
            if not route_found:
                self.log_issue(
                    "missing_route",
                    "error",
                    file_path,
                    line_num,
                    f"API call to '{url}' but no corresponding route found",
                    f"Add route definition for '{normalized_url}'"
                )
    
    def extract_schema_fields(self):
        """Extract schema fields from shared schema files"""
        print("Extracting schema fields...")
        
        schema_file = self.root_path / "shared" / "schema.ts"
        if schema_file.exists():
            try:
                with open(schema_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                # Find table definitions
                table_pattern = r'export const (\w+) = pgTable\([\'"`](\w+)[\'"`], \{([^}]+)\}'
                table_matches = re.finditer(table_pattern, content, re.DOTALL)
                
                for match in table_matches:
                    table_name = match.group(1)
                    fields_content = match.group(3)
                    
                    # Extract field names
                    field_pattern = r'(\w+):\s*(?:uuid|text|integer|boolean|timestamp|serial|varchar|jsonb)\([^)]*\)'
                    field_matches = re.finditer(field_pattern, fields_content)
                    
                    fields = set()
                    for field_match in field_matches:
                        fields.add(field_match.group(1))
                    
                    self.schema_fields[table_name] = fields
                    
                print(f"Found {len(self.schema_fields)} schema tables")
            except Exception as e:
                print(f"Error extracting schema: {e}")
    
    def check_common_issues(self):
        """Check for common coding issues"""
        print("Checking for common issues...")
        
        # Check TypeScript files
        for ts_file in self.root_path.rglob("*.ts*"):
            if 'node_modules' in str(ts_file) or '.git' in str(ts_file):
                continue
                
            try:
                with open(ts_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    lines = content.split('\n')
                    
                    for line_num, line in enumerate(lines, 1):
                        # Check for console.error/warn that might indicate issues
                        if 'console.error' in line or 'console.warn' in line:
                            if 'failed' in line.lower() or 'error' in line.lower():
                                self.log_issue(
                                    "error_handling",
                                    "info",
                                    str(ts_file),
                                    line_num,
                                    f"Error/warning message found: {line.strip()[:100]}",
                                    "Review error handling"
                                )
                        
                        # Check for TODO/FIXME comments
                        if 'TODO' in line or 'FIXME' in line or 'HACK' in line:
                            self.log_issue(
                                "code_quality",
                                "info",
                                str(ts_file),
                                line_num,
                                f"Action item found: {line.strip()[:100]}",
                                "Address TODO/FIXME"
                            )
                            
            except Exception as e:
                continue
    
    def run_audit(self):
        """Run the complete audit"""
        print("🚀 Starting comprehensive codebase audit...")
        print(f"📁 Auditing: {self.root_path}")
        print()
        
        self.extract_api_routes()
        self.extract_api_calls() 
        self.check_missing_routes()
        self.extract_schema_fields()
        self.check_common_issues()
        
        return self.generate_report()
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate audit report"""
        print("\n📊 Generating audit report...")
        
        # Group issues by category and severity
        issues_by_category = {}
        issues_by_severity = {"error": [], "warning": [], "info": []}
        
        for issue in self.issues:
            category = issue["category"]
            severity = issue["severity"]
            
            if category not in issues_by_category:
                issues_by_category[category] = []
            issues_by_category[category].append(issue)
            issues_by_severity[severity].append(issue)
        
        report = {
            "summary": {
                "total_issues": len(self.issues),
                "errors": len(issues_by_severity["error"]),
                "warnings": len(issues_by_severity["warning"]),
                "info": len(issues_by_severity["info"]),
                "api_routes_found": len(self.api_routes),
                "api_calls_found": len(self.api_calls),
                "schema_tables_found": len(self.schema_fields)
            },
            "issues_by_category": issues_by_category,
            "issues_by_severity": issues_by_severity,
            "api_routes": sorted(list(self.api_routes)),
            "api_calls": sorted(list(set([url for url, _, _ in self.api_calls]))),
            "schema_tables": {k: sorted(list(v)) for k, v in self.schema_fields.items()}
        }
        
        return report

def main():
    auditor = CodebaseAuditor()
    report = auditor.run_audit()
    
    # Save detailed report
    with open("enhanced_audit_report.json", "w") as f:
        json.dump(report, f, indent=2, default=str)
    
    # Print summary
    print("\n" + "="*80)
    print("🔍 COMPREHENSIVE AUDIT RESULTS")
    print("="*80)
    print(f"📊 Total Issues Found: {report['summary']['total_issues']}")
    print(f"❌ Errors: {report['summary']['errors']}")
    print(f"⚠️  Warnings: {report['summary']['warnings']}")
    print(f"ℹ️  Info: {report['summary']['info']}")
    print()
    print(f"🛣️  API Routes Found: {report['summary']['api_routes_found']}")
    print(f"📞 API Calls Found: {report['summary']['api_calls_found']}")
    print(f"🗃️  Schema Tables Found: {report['summary']['schema_tables_found']}")
    print()
    
    # Show critical errors first
    if report['summary']['errors'] > 0:
        print("❌ CRITICAL ERRORS (must fix):")
        for issue in report['issues_by_severity']['error']:
            print(f"  • {issue['file']}:{issue['line']} - {issue['description']}")
            if issue.get('suggestion'):
                print(f"    💡 {issue['suggestion']}")
        print()
    
    # Show some warnings
    if report['summary']['warnings'] > 0:
        print("⚠️  WARNINGS (should review):")
        for issue in report['issues_by_severity']['warning'][:5]:
            print(f"  • {issue['file']}:{issue['line']} - {issue['description']}")
        if len(report['issues_by_severity']['warning']) > 5:
            print(f"  ... and {len(report['issues_by_severity']['warning']) - 5} more warnings")
        print()
    
    print("📋 Full report saved to: enhanced_audit_report.json")
    print("="*80)
    
    return report

if __name__ == "__main__":
    main()