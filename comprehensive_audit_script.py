#!/usr/bin/env python3
"""
Comprehensive Codebase Audit Script
Checks for missing API routes, orphaned function calls, schema mismatches, and other structural issues.
"""

import os
import re
import json
import ast
from typing import Dict, List, Set, Tuple, Any
from pathlib import Path

class CodebaseAuditor:
    def __init__(self, root_path: str = "."):
        self.root_path = Path(root_path)
        self.issues = []
        self.api_routes = set()
        self.api_calls = set()
        self.schema_fields = {}
        self.component_imports = set()
        self.component_definitions = set()
        
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
    
    def find_files(self, pattern: str) -> List[Path]:
        """Find files matching a pattern"""
        files = []
        for ext in pattern.split(','):
            files.extend(self.root_path.rglob(f"*.{ext.strip()}"))
        return files
    
    def extract_api_routes(self):
        """Extract all API routes defined in server files"""
        print("🔍 Extracting API routes from server files...")
        
        server_files = self.find_files("ts,js")
        server_files = [f for f in server_files if 'server' in str(f) or 'routes' in str(f)]
        
        route_patterns = [
            r'app\.get\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            r'app\.post\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            r'app\.put\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            r'app\.delete\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            r'app\.patch\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            r'router\.get\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            r'router\.post\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            r'router\.put\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            r'router\.delete\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
        ]
        
        for file_path in server_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                for pattern in route_patterns:
                    matches = re.finditer(pattern, content, re.MULTILINE)
                    for match in matches:
                        route = match.group(1)
                        self.api_routes.add(route)
                        
            except Exception as e:
                self.log_issue("file_read", "error", file_path, 0, f"Could not read file: {e}")
    
    def extract_api_calls(self):
        """Extract all API calls made in client files"""
        print("🔍 Extracting API calls from client files...")
        
        client_files = self.find_files("ts,tsx,js,jsx")
        client_files = [f for f in client_files if 'client' in str(f) or 'src' in str(f)]
        
        # Patterns for API calls
        api_call_patterns = [
            r'fetch\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            r'apiRequest\s*\(\s*[\'"`][^\'"`]+[\'"`]\s*,\s*[\'"`]([^\'"`]+)[\'"`]',
            r'axios\.get\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            r'axios\.post\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            r'axios\.put\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            r'axios\.delete\s*\(\s*[\'"`]([^\'"`]+)[\'"`]',
            r'queryKey:\s*\[\s*[\'"`]([^\'"`]+)[\'"`]',
            r'url:\s*[\'"`]([^\'"`]+)[\'"`]',
        ]
        
        for file_path in client_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    line_num = 0
                    
                    for line in content.split('\n'):
                        line_num += 1
                        for pattern in api_call_patterns:
                            matches = re.finditer(pattern, line)
                            for match in matches:
                                url = match.group(1)
                                if url.startswith('/api/'):
                                    self.api_calls.add((url, file_path, line_num))
                                    
            except Exception as e:
                self.log_issue("file_read", "error", file_path, 0, f"Could not read file: {e}")
    
    def check_missing_routes(self):
        """Check for API calls that don't have corresponding routes"""
        print("🔍 Checking for missing API routes...")
        
        # Extract just the URLs from api_calls
        called_urls = set()
        for url, file_path, line_num in self.api_calls:
            # Clean up dynamic routes
            clean_url = re.sub(r'/[^/]*\$\{[^}]+\}[^/]*', '/:param', url)
            clean_url = re.sub(r'/\d+', '/:id', clean_url)
            clean_url = re.sub(r'/[a-f0-9-]{36}', '/:id', clean_url)  # UUIDs
            called_urls.add(clean_url)
        
        # Clean up defined routes
        defined_routes = set()
        for route in self.api_routes:
            clean_route = re.sub(r':[^/]+', ':param', route)
            defined_routes.add(clean_route)
        
        missing_routes = called_urls - defined_routes
        
        for missing_route in missing_routes:
            # Find the actual calls that use this route
            for url, file_path, line_num in self.api_calls:
                clean_url = re.sub(r'/[^/]*\$\{[^}]+\}[^/]*', '/:param', url)
                clean_url = re.sub(r'/\d+', '/:id', clean_url)
                clean_url = re.sub(r'/[a-f0-9-]{36}', '/:id', clean_url)
                
                if clean_url == missing_route:
                    self.log_issue(
                        "missing_route", 
                        "error", 
                        file_path, 
                        line_num,
                        f"API call to '{url}' but no corresponding route found",
                        f"Add route definition: app.get('{missing_route}', ...)"
                    )
    
    def extract_schema_fields(self):
        """Extract schema fields from shared schema files"""
        print("🔍 Extracting schema fields...")
        
        schema_files = [f for f in self.find_files("ts") if 'schema' in str(f)]
        
        for file_path in schema_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                # Find table definitions
                table_matches = re.finditer(r'export const (\w+) = pgTable\([\'"`](\w+)[\'"`], \{([^}]+)\}', content, re.DOTALL)
                for match in table_matches:
                    table_name = match.group(1)
                    table_sql_name = match.group(2)
                    fields_content = match.group(3)
                    
                    # Extract field names
                    field_matches = re.finditer(r'(\w+):\s*\w+\([^)]*\)', fields_content)
                    fields = set()
                    for field_match in field_matches:
                        fields.add(field_match.group(1))
                    
                    self.schema_fields[table_name] = fields
                    
            except Exception as e:
                self.log_issue("file_read", "error", file_path, 0, f"Could not read schema file: {e}")
    
    def check_schema_usage(self):
        """Check for schema field usage that doesn't match definitions"""
        print("🔍 Checking schema field usage...")
        
        code_files = self.find_files("ts,tsx,js,jsx")
        
        for file_path in code_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    line_num = 0
                    
                    for line in content.split('\n'):
                        line_num += 1
                        
                        # Check for field access patterns
                        for table_name, fields in self.schema_fields.items():
                            # Pattern: object.field or object[field]
                            field_access_patterns = [
                                rf'{table_name}\.(\w+)',
                                rf'(\w+)\.(\w+)\s*(?:=|:)',  # General field access
                            ]
                            
                            for pattern in field_access_patterns:
                                matches = re.finditer(pattern, line)
                                for match in matches:
                                    if len(match.groups()) >= 2:
                                        accessed_field = match.group(2)
                                    else:
                                        accessed_field = match.group(1)
                                    
                                    # Skip common non-field names
                                    if accessed_field in ['id', 'length', 'map', 'filter', 'find', 'some', 'every', 'forEach']:
                                        continue
                                        
                                    if accessed_field not in fields and accessed_field not in ['id', 'createdAt', 'updatedAt']:
                                        self.log_issue(
                                            "schema_mismatch",
                                            "warning",
                                            file_path,
                                            line_num,
                                            f"Field '{accessed_field}' used but not defined in {table_name} schema",
                                            f"Add field to schema or check field name spelling"
                                        )
                                        
            except Exception as e:
                self.log_issue("file_read", "error", file_path, 0, f"Could not read file: {e}")
    
    def check_import_export_consistency(self):
        """Check for missing imports/exports"""
        print("🔍 Checking import/export consistency...")
        
        ts_files = self.find_files("ts,tsx,js,jsx")
        imports = {}
        exports = {}
        
        for file_path in ts_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                # Find imports
                import_matches = re.finditer(r'import\s+(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s+from\s+[\'"`]([^\'"`]+)[\'"`]', content)
                for match in import_matches:
                    if match.group(1):  # Named imports
                        named_imports = [imp.strip() for imp in match.group(1).split(',')]
                        for imp in named_imports:
                            imp = imp.split(' as ')[0].strip()  # Handle 'as' aliases
                            imports.setdefault(str(file_path), set()).add((imp, match.group(4)))
                    elif match.group(2):  # Namespace import
                        imports.setdefault(str(file_path), set()).add((match.group(2), match.group(4)))
                    elif match.group(3):  # Default import
                        imports.setdefault(str(file_path), set()).add((match.group(3), match.group(4)))
                
                # Find exports
                export_matches = re.finditer(r'export\s+(?:(?:const|let|var|function|class|interface|type)\s+(\w+)|(?:default\s+)?(?:function\s+)?(\w+)|(?:\{([^}]+)\}))', content)
                for match in export_matches:
                    if match.group(1):
                        exports.setdefault(str(file_path), set()).add(match.group(1))
                    elif match.group(2):
                        exports.setdefault(str(file_path), set()).add(match.group(2))
                    elif match.group(3):
                        named_exports = [exp.strip().split(' as ')[0] for exp in match.group(3).split(',')]
                        for exp in named_exports:
                            exports.setdefault(str(file_path), set()).add(exp.strip())
                            
            except Exception as e:
                self.log_issue("file_read", "error", file_path, 0, f"Could not read file: {e}")
    
    def check_environment_variables(self):
        """Check for undefined environment variables"""
        print("🔍 Checking environment variables...")
        
        code_files = self.find_files("ts,tsx,js,jsx")
        env_vars_used = set()
        
        for file_path in code_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    line_num = 0
                    
                    for line in content.split('\n'):
                        line_num += 1
                        
                        # Find environment variable usage
                        env_patterns = [
                            r'process\.env\.(\w+)',
                            r'import\.meta\.env\.(\w+)',
                        ]
                        
                        for pattern in env_patterns:
                            matches = re.finditer(pattern, line)
                            for match in matches:
                                env_var = match.group(1)
                                env_vars_used.add(env_var)
                                
                                # Check if it's likely undefined (common patterns)
                                if env_var not in ['NODE_ENV', 'PORT', 'DATABASE_URL', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY']:
                                    if not any(env_var.endswith(suffix) for suffix in ['_KEY', '_TOKEN', '_SECRET', '_URL', '_ID']):
                                        self.log_issue(
                                            "env_var",
                                            "info",
                                            file_path,
                                            line_num,
                                            f"Environment variable '{env_var}' used - verify it's defined",
                                            f"Add {env_var} to environment or .env file"
                                        )
                                        
            except Exception as e:
                self.log_issue("file_read", "error", file_path, 0, f"Could not read file: {e}")
    
    def check_typescript_errors(self):
        """Check for common TypeScript issues"""
        print("🔍 Checking for TypeScript issues...")
        
        ts_files = self.find_files("ts,tsx")
        
        for file_path in ts_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    line_num = 0
                    
                    for line in content.split('\n'):
                        line_num += 1
                        
                        # Check for common issues
                        if re.search(r'any\[\]', line):
                            self.log_issue(
                                "typescript",
                                "warning",
                                file_path,
                                line_num,
                                "Using 'any[]' - consider more specific typing",
                                "Replace with specific type array"
                            )
                        
                        if re.search(r':\s*any(?!\w)', line):
                            self.log_issue(
                                "typescript",
                                "info",
                                file_path,
                                line_num,
                                "Using 'any' type - consider more specific typing",
                                "Replace with specific type"
                            )
                            
                        # Check for unused imports (basic check)
                        import_match = re.search(r'import\s+\{([^}]+)\}', line)
                        if import_match:
                            imports = [imp.strip() for imp in import_match.group(1).split(',')]
                            for imp in imports:
                                if imp not in content[content.find(line) + len(line):]:
                                    self.log_issue(
                                        "typescript",
                                        "info",
                                        file_path,
                                        line_num,
                                        f"Import '{imp}' may be unused",
                                        f"Remove unused import"
                                    )
                            
            except Exception as e:
                self.log_issue("file_read", "error", file_path, 0, f"Could not read file: {e}")
    
    def run_audit(self):
        """Run the complete audit"""
        print("🚀 Starting comprehensive codebase audit...")
        print(f"📁 Auditing: {self.root_path}")
        print()
        
        # Run all audit checks
        self.extract_api_routes()
        self.extract_api_calls()
        self.check_missing_routes()
        
        self.extract_schema_fields()
        self.check_schema_usage()
        
        self.check_import_export_consistency()
        self.check_environment_variables()
        self.check_typescript_errors()
        
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
    
    # Save report to file
    with open("comprehensive_audit_report.json", "w") as f:
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
    
    if report['summary']['errors'] > 0:
        print("❌ CRITICAL ERRORS (must fix):")
        for issue in report['issues_by_severity']['error']:
            print(f"  • {issue['file']}:{issue['line']} - {issue['description']}")
            if issue['suggestion']:
                print(f"    💡 {issue['suggestion']}")
        print()
    
    if report['summary']['warnings'] > 0:
        print("⚠️  WARNINGS (should fix):")
        for issue in report['issues_by_severity']['warning'][:10]:  # Show first 10
            print(f"  • {issue['file']}:{issue['line']} - {issue['description']}")
        if len(report['issues_by_severity']['warning']) > 10:
            print(f"  ... and {len(report['issues_by_severity']['warning']) - 10} more warnings")
        print()
    
    print("📋 Full report saved to: comprehensive_audit_report.json")
    print("="*80)

if __name__ == "__main__":
    main()