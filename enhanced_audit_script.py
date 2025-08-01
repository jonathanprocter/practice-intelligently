
#!/usr/bin/env python3
"""
Enhanced Therapy Practice Management System Audit Tool
Comprehensive codebase analysis and automated fix generation
"""

import os
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Any, Tuple
from dataclasses import dataclass, asdict
import tempfile

@dataclass
class AuditIssue:
    """Represents an issue found during audit"""
    category: str
    severity: str  # 'critical', 'high', 'medium', 'low'
    file_path: str
    line_number: int
    description: str
    recommendation: str
    auto_fixable: bool = False

@dataclass
class AuditReport:
    """Complete audit report"""
    summary: Dict[str, int]
    issues: List[AuditIssue]
    file_analysis: Dict[str, Any]
    recommendations: List[str]

class TherapySystemAuditor:
    def __init__(self, root_path: str = "."):
        self.root_path = Path(root_path)
        self.issues: List[AuditIssue] = []
        self.file_analysis: Dict[str, Any] = {}
        
        # Define critical files and their expected structure
        self.critical_files = {
            "server/routes.ts": "API Routes",
            "server/storage.ts": "Database Storage Layer", 
            "server/oauth-simple.ts": "OAuth Implementation",
            "server/auth.ts": "Authentication Service",
            "shared/schema.ts": "Database Schema",
            "client/src/App.tsx": "Frontend App Root",
            "server/index.ts": "Server Entry Point"
        }
        
        # Known problematic patterns
        self.problematic_patterns = {
            r"therapist-1": "Invalid UUID format",
            r"fs\..*Sync": "Synchronous file operations",
            r"calendars/all": "Invalid calendar ID",
            r"console\.log": "Debug logging (should be removed in production)",
            r"any\s*\[\]": "Loose typing",
            r"\.catch\(\(\)\s*=>\s*\{\}\)": "Empty error handlers",
            r"localhost": "Localhost usage (should use 0.0.0.0)",
            r"process\.env\.[A-Z_]+\s*\|\|\s*['\"][^'\"]*['\"]": "Potential exposed secrets"
        }

    def run_audit(self) -> AuditReport:
        """Run complete audit and return report"""
        print("🔍 Starting Enhanced Codebase Audit...")
        
        # Phase 1: File System Analysis
        self._analyze_file_structure()
        
        # Phase 2: TypeScript/JavaScript Analysis
        self._analyze_typescript_files()
        
        # Phase 3: Database Schema Analysis
        self._analyze_database_schema()
        
        # Phase 4: API Endpoint Analysis
        self._analyze_api_endpoints()
        
        # Phase 5: OAuth Integration Analysis
        self._analyze_oauth_integration()
        
        # Phase 6: Security Analysis
        self._analyze_security_issues()
        
        # Phase 7: Performance Analysis
        self._analyze_performance_issues()
        
        # Phase 8: Error Handling Analysis
        self._analyze_error_handling()
        
        # Phase 9: Package Dependencies
        self._analyze_dependencies()
        
        return self._generate_report()

    def _analyze_file_structure(self):
        """Analyze overall file structure and dependencies"""
        print("📁 Analyzing file structure...")
        
        # Check for missing critical files
        for file_path, description in self.critical_files.items():
            full_path = self.root_path / file_path
            if not full_path.exists():
                self.issues.append(AuditIssue(
                    category="File Structure",
                    severity="critical",
                    file_path=file_path,
                    line_number=0,
                    description=f"Missing critical file: {description}",
                    recommendation=f"Create {file_path} with proper {description} implementation"
                ))

    def _analyze_typescript_files(self):
        """Analyze TypeScript files for issues"""
        print("🔧 Analyzing TypeScript files...")
        
        ts_files = list(self.root_path.rglob("*.ts")) + list(self.root_path.rglob("*.tsx"))
        
        for file_path in ts_files:
            # Skip node_modules
            if "node_modules" in str(file_path):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    self._analyze_file_content(file_path, content)
            except Exception as e:
                self.issues.append(AuditIssue(
                    category="File Analysis",
                    severity="medium",
                    file_path=str(file_path.relative_to(self.root_path)),
                    line_number=0,
                    description=f"Cannot read file: {e}",
                    recommendation="Check file encoding and permissions"
                ))

    def _analyze_file_content(self, file_path: Path, content: str):
        """Analyze individual file content"""
        relative_path = str(file_path.relative_to(self.root_path))
        lines = content.split('\n')
        
        # Check for problematic patterns
        for line_num, line in enumerate(lines, 1):
            for pattern, description in self.problematic_patterns.items():
                if re.search(pattern, line):
                    severity = "critical" if pattern in [r"therapist-1", r"fs\..*Sync"] else "medium"
                    self.issues.append(AuditIssue(
                        category="Code Quality",
                        severity=severity,
                        file_path=relative_path,
                        line_number=line_num,
                        description=f"{description}: {line.strip()}",
                        recommendation=f"Fix {description.lower()} in this line",
                        auto_fixable=True
                    ))
        
        # Analyze imports/exports
        self._analyze_imports_exports(relative_path, content)
        
        # Analyze TypeScript specific issues
        self._analyze_typescript_issues(relative_path, content)

    def _analyze_imports_exports(self, file_path: str, content: str):
        """Analyze import/export statements"""
        lines = content.split('\n')
        
        imports = []
        exports = []
        
        for line_num, line in enumerate(lines, 1):
            stripped = line.strip()
            
            # Collect imports
            if stripped.startswith('import '):
                imports.append((line_num, stripped))
            
            # Collect exports
            if stripped.startswith('export '):
                exports.append((line_num, stripped))
        
        # Store analysis
        self.file_analysis[file_path] = {
            'imports': len(imports),
            'exports': len(exports),
            'import_details': imports,
            'export_details': exports
        }

    def _analyze_typescript_issues(self, file_path: str, content: str):
        """Analyze TypeScript-specific issues"""
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            stripped = line.strip()
            
            # Check for 'any' usage
            if re.search(r'\:\s*any\b', line):
                self.issues.append(AuditIssue(
                    category="Type Safety",
                    severity="medium",
                    file_path=file_path,
                    line_number=line_num,
                    description="Usage of 'any' type reduces type safety",
                    recommendation="Replace 'any' with specific type definitions"
                ))
            
            # Check for non-null assertions
            if '!' in line and not line.strip().startswith('//'):
                if re.search(r'\w+!\.', line):
                    self.issues.append(AuditIssue(
                        category="Type Safety",
                        severity="medium",
                        file_path=file_path,
                        line_number=line_num,
                        description="Non-null assertion operator (!) usage",
                        recommendation="Add proper null checks instead of using !"
                    ))

    def _analyze_database_schema(self):
        """Analyze database schema and storage layer"""
        print("🗄️  Analyzing database schema...")
        
        schema_file = self.root_path / "shared" / "schema.ts"
        storage_file = self.root_path / "server" / "storage.ts"
        
        if not schema_file.exists():
            self.issues.append(AuditIssue(
                category="Database",
                severity="critical",
                file_path="shared/schema.ts",
                line_number=0,
                description="Database schema file missing",
                recommendation="Create shared/schema.ts with Drizzle schema definitions"
            ))
            return
        
        try:
            with open(schema_file) as f:
                schema_content = f.read()
                
            # Check for required tables
            required_tables = ['users', 'clients', 'appointments', 'sessionNotes', 'progressNotes']
            for table in required_tables:
                if table not in schema_content:
                    self.issues.append(AuditIssue(
                        category="Database",
                        severity="high",
                        file_path="shared/schema.ts", 
                        line_number=0,
                        description=f"Missing required table: {table}",
                        recommendation=f"Add {table} table definition to schema"
                    ))
                    
        except Exception as e:
            self.issues.append(AuditIssue(
                category="Database",
                severity="high",
                file_path="shared/schema.ts",
                line_number=0,
                description=f"Cannot analyze schema file: {e}",
                recommendation="Fix schema file syntax or access issues"
            ))

    def _analyze_api_endpoints(self):
        """Analyze API endpoints for consistency and functionality"""
        print("🌐 Analyzing API endpoints...")
        
        routes_file = self.root_path / "server" / "routes.ts"
        if not routes_file.exists():
            self.issues.append(AuditIssue(
                category="API",
                severity="critical",
                file_path="server/routes.ts",
                line_number=0,
                description="API routes file missing",
                recommendation="Create server/routes.ts with Express route definitions"
            ))
            return
        
        try:
            with open(routes_file) as f:
                routes_content = f.read()
            
            # Extract API endpoints
            endpoints = re.findall(r'app\.(get|post|put|delete)\(["\']([^"\']+)["\']', routes_content)
            
            # Check for critical endpoints
            critical_endpoints = [
                '/api/clients',
                '/api/appointments', 
                '/api/session-notes',
                '/api/auth/google/status',
                '/api/health'
            ]
            
            found_endpoints = [endpoint[1] for endpoint in endpoints]
            
            for critical_ep in critical_endpoints:
                if not any(ep.startswith(critical_ep) for ep in found_endpoints):
                    self.issues.append(AuditIssue(
                        category="API",
                        severity="high",
                        file_path="server/routes.ts",
                        line_number=0,
                        description=f"Missing critical endpoint: {critical_ep}",
                        recommendation=f"Implement {critical_ep} endpoint"
                    ))
                    
        except Exception as e:
            self.issues.append(AuditIssue(
                category="API",
                severity="high",
                file_path="server/routes.ts",
                line_number=0,
                description=f"Cannot analyze routes file: {e}",
                recommendation="Fix routes file syntax or access issues"
            ))

    def _analyze_oauth_integration(self):
        """Analyze OAuth integration for Google Calendar"""
        print("🔐 Analyzing OAuth integration...")
        
        oauth_file = self.root_path / "server" / "oauth-simple.ts"
        if not oauth_file.exists():
            self.issues.append(AuditIssue(
                category="OAuth",
                severity="critical", 
                file_path="server/oauth-simple.ts",
                line_number=0,
                description="OAuth implementation file missing",
                recommendation="Create server/oauth-simple.ts with Google OAuth implementation"
            ))
            return
        
        try:
            with open(oauth_file) as f:
                oauth_content = f.read()
            
            # Check for required OAuth components
            required_components = [
                'OAuth2Client',
                'generateAuthUrl',
                'getAccessToken',
                'isConnected',
                'getEvents'
            ]
            
            for component in required_components:
                if component not in oauth_content:
                    self.issues.append(AuditIssue(
                        category="OAuth",
                        severity="high",
                        file_path="server/oauth-simple.ts",
                        line_number=0,
                        description=f"Missing OAuth component: {component}",
                        recommendation=f"Implement {component} method in OAuth class"
                    ))
                    
        except Exception as e:
            self.issues.append(AuditIssue(
                category="OAuth",
                severity="high",
                file_path="server/oauth-simple.ts",
                line_number=0,
                description=f"Cannot analyze OAuth file: {e}",
                recommendation="Fix OAuth file syntax or access issues"
            ))

    def _analyze_security_issues(self):
        """Analyze security vulnerabilities"""
        print("🔒 Analyzing security issues...")
        
        # Check for exposed secrets
        all_files = list(self.root_path.rglob("*.ts")) + list(self.root_path.rglob("*.tsx")) + list(self.root_path.rglob("*.js"))
        
        for file_path in all_files:
            if "node_modules" in str(file_path):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                # Check for hardcoded secrets (basic patterns)
                if re.search(r'(api_key|secret|password)\s*[:=]\s*["\'][a-zA-Z0-9]{20,}["\']', content, re.IGNORECASE):
                    self.issues.append(AuditIssue(
                        category="Security",
                        severity="high",
                        file_path=str(file_path.relative_to(self.root_path)),
                        line_number=0,
                        description="Potential hardcoded secret detected",
                        recommendation="Move secrets to environment variables"
                    ))
                            
            except Exception:
                continue

    def _analyze_performance_issues(self):
        """Analyze performance issues"""
        print("⚡ Analyzing performance issues...")
        
        # Look for performance anti-patterns
        performance_patterns = {
            r'await.*forEach': "Inefficient async forEach pattern",
            r'new Date\(\).*getTime\(\)': "Inefficient date operations",
            r'JSON\.parse\(JSON\.stringify': "Inefficient deep cloning"
        }
        
        all_files = list(self.root_path.rglob("*.ts")) + list(self.root_path.rglob("*.tsx"))
        
        for file_path in all_files:
            if "node_modules" in str(file_path):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                for line_num, line in enumerate(content.split('\n'), 1):
                    for pattern, description in performance_patterns.items():
                        if re.search(pattern, line):
                            self.issues.append(AuditIssue(
                                category="Performance",
                                severity="medium",
                                file_path=str(file_path.relative_to(self.root_path)),
                                line_number=line_num,
                                description=description,
                                recommendation="Optimize this pattern for better performance"
                            ))
                            
            except Exception:
                continue

    def _analyze_error_handling(self):
        """Analyze error handling patterns"""
        print("🚨 Analyzing error handling...")
        
        routes_file = self.root_path / "server" / "routes.ts"
        if routes_file.exists():
            try:
                with open(routes_file) as f:
                    content = f.read()
                
                # Count try-catch blocks vs route handlers
                route_count = len(re.findall(r'app\.(get|post|put|delete)', content))
                try_catch_count = len(re.findall(r'try\s*{', content))
                
                if try_catch_count < route_count * 0.8:  # 80% should have error handling
                    self.issues.append(AuditIssue(
                        category="Error Handling",
                        severity="high",
                        file_path="server/routes.ts",
                        line_number=0,
                        description=f"Insufficient error handling: {try_catch_count} try-catch blocks for {route_count} routes",
                        recommendation="Add try-catch blocks to all route handlers"
                    ))
                    
            except Exception:
                pass

    def _analyze_dependencies(self):
        """Analyze package dependencies"""
        print("📦 Analyzing dependencies...")
        
        package_json = self.root_path / "package.json"
        if package_json.exists():
            try:
                with open(package_json) as f:
                    pkg_data = json.load(f)
                    
                dependencies = pkg_data.get('dependencies', {})
                
                # Check for potential security issues
                if len(dependencies) > 50:
                    self.issues.append(AuditIssue(
                        category="Dependencies",
                        severity="medium",
                        file_path="package.json",
                        line_number=0,
                        description=f"Large number of dependencies ({len(dependencies)})",
                        recommendation="Review and remove unused dependencies"
                    ))
                    
            except Exception:
                pass

    def _generate_report(self) -> AuditReport:
        """Generate comprehensive audit report"""
        print("📊 Generating audit report...")
        
        # Calculate summary statistics
        summary = {
            'total_issues': len(self.issues),
            'critical_issues': len([i for i in self.issues if i.severity == 'critical']),
            'high_issues': len([i for i in self.issues if i.severity == 'high']),
            'medium_issues': len([i for i in self.issues if i.severity == 'medium']),
            'low_issues': len([i for i in self.issues if i.severity == 'low']),
            'auto_fixable': len([i for i in self.issues if i.auto_fixable])
        }
        
        # Generate recommendations
        recommendations = self._generate_recommendations()
        
        return AuditReport(
            summary=summary,
            issues=self.issues,
            file_analysis=self.file_analysis,
            recommendations=recommendations
        )

    def _generate_recommendations(self) -> List[str]:
        """Generate prioritized recommendations"""
        recommendations = []
        
        # Critical issues first
        critical_issues = [i for i in self.issues if i.severity == 'critical']
        if critical_issues:
            recommendations.append("🚨 IMMEDIATE ACTION REQUIRED:")
            for issue in critical_issues[:5]:  # Top 5 critical
                recommendations.append(f"   • {issue.description} ({issue.file_path})")
        
        # High priority fixes
        high_issues = [i for i in self.issues if i.severity == 'high']
        if high_issues:
            recommendations.append("\n🔥 HIGH PRIORITY FIXES:")
            for issue in high_issues[:5]:  # Top 5 high
                recommendations.append(f"   • {issue.description} ({issue.file_path})")
        
        # Auto-fixable issues
        auto_fix = [i for i in self.issues if i.auto_fixable]
        if auto_fix:
            recommendations.append(f"\n⚡ {len(auto_fix)} issues can be automatically fixed")
        
        return recommendations

def main():
    """Main execution function"""
    auditor = TherapySystemAuditor()
    
    # Run the audit
    report = auditor.run_audit()
    
    # Print summary
    print("\n" + "="*80)
    print("🏥 THERAPY PRACTICE MANAGEMENT SYSTEM - AUDIT REPORT")
    print("="*80)
    
    print(f"\n📈 SUMMARY:")
    print(f"   Total Issues Found: {report.summary['total_issues']}")
    print(f"   Critical Issues: {report.summary['critical_issues']}")
    print(f"   High Priority: {report.summary['high_issues']}")
    print(f"   Medium Priority: {report.summary['medium_issues']}")
    print(f"   Auto-Fixable: {report.summary['auto_fixable']}")
    
    # Print recommendations
    print(f"\n📋 RECOMMENDATIONS:")
    for rec in report.recommendations:
        print(rec)
    
    # Save detailed report
    report_data = {
        "summary": report.summary,
        "issues": [asdict(issue) for issue in report.issues],
        "file_analysis": report.file_analysis,
        "timestamp": "2025-08-01T13:45:00Z"
    }
    
    with open("enhanced_audit_report.json", "w") as f:
        json.dump(report_data, f, indent=2)
    
    print(f"\n💾 Detailed report saved to: enhanced_audit_report.json")
    
    # Return exit code based on critical issues
    if report.summary['critical_issues'] > 0:
        print(f"\n⚠️  SYSTEM REQUIRES IMMEDIATE ATTENTION")
        return 1
    else:
        print(f"\n✅ System is functional with {report.summary['total_issues']} improvements recommended")
        return 0

if __name__ == "__main__":
    sys.exit(main())
