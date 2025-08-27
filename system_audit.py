
#!/usr/bin/env python3
"""
Comprehensive System Audit for Therapy Management Platform
Checks all critical components and identifies issues that need fixing
"""

import os
import sys
import json
import time
import requests
import subprocess
from datetime import datetime
from typing import Dict, List, Any
from pathlib import Path

class SystemAuditor:
    def __init__(self):
        self.base_url = "http://localhost:5000"
        self.issues = []
        self.passed_tests = []
        
    def log_issue(self, category: str, severity: str, description: str, fix_suggestion: str = ""):
        """Log an issue found during audit"""
        issue = {
            "category": category,
            "severity": severity,
            "description": description,
            "fix_suggestion": fix_suggestion,
            "timestamp": datetime.now().isoformat()
        }
        self.issues.append(issue)
        
        severity_icon = {
            "critical": "🚨",
            "high": "⚠️",
            "medium": "🔍",
            "low": "ℹ️"
        }
        print(f"{severity_icon.get(severity, '•')} [{category}] {description}")
        
    def log_success(self, category: str, description: str):
        """Log a successful test"""
        self.passed_tests.append({
            "category": category,
            "description": description,
            "timestamp": datetime.now().isoformat()
        })
        print(f"✅ [{category}] {description}")

    def test_server_connectivity(self):
        """Test if server is running and responding"""
        print("\n🔍 Testing Server Connectivity...")
        try:
            response = requests.get(f"{self.base_url}/api/health", timeout=5)
            if response.status_code == 200:
                self.log_success("Server", "Server is running and responding")
                return True
            else:
                self.log_issue("Server", "critical", 
                             f"Server returned status {response.status_code}",
                             "Check server startup and configuration")
                return False
        except requests.exceptions.ConnectionError:
            self.log_issue("Server", "critical", 
                         "Cannot connect to server - server may not be running",
                         "Start the server using 'npm run dev'")
            return False
        except Exception as e:
            self.log_issue("Server", "critical", 
                         f"Server connectivity error: {str(e)}",
                         "Check server logs for detailed error information")
            return False

    def test_api_endpoints(self):
        """Test critical API endpoints"""
        print("\n🔍 Testing API Endpoints...")
        
        endpoints = [
            ("/api/health", "Health check"),
            ("/api/dashboard/stats/e66b8b8e-e7a2-40b9-ae74-00c93ffe503c", "Dashboard stats"),
            ("/api/clients", "Client list"),
            ("/api/appointments/today/e66b8b8e-e7a2-40b9-ae74-00c93ffe503c", "Today's appointments"),
            ("/api/session-notes", "Session notes"),
            ("/api/documents/categories", "Document categories"),
        ]
        
        for endpoint, description in endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=5)
                if response.status_code == 200:
                    self.log_success("API", f"{description} endpoint working")
                elif response.status_code == 404:
                    self.log_issue("API", "high", 
                                 f"{description} endpoint not found ({endpoint})",
                                 f"Implement {endpoint} route in server/routes.ts")
                else:
                    self.log_issue("API", "medium", 
                                 f"{description} endpoint returned {response.status_code}",
                                 f"Check {endpoint} implementation")
            except Exception as e:
                self.log_issue("API", "high", 
                             f"{description} endpoint failed: {str(e)}",
                             f"Fix {endpoint} endpoint implementation")

    def test_frontend_build(self):
        """Test if frontend builds without errors"""
        print("\n🔍 Testing Frontend Build...")
        try:
            # Check TypeScript compilation
            result = subprocess.run(["npx", "tsc", "--noEmit"], 
                                  capture_output=True, text=True, cwd=".")
            
            if result.returncode == 0:
                self.log_success("Frontend", "TypeScript compilation successful")
            else:
                error_count = len([line for line in result.stderr.split('\n') if 'error TS' in line])
                self.log_issue("Frontend", "high", 
                             f"TypeScript compilation failed with {error_count} errors",
                             "Fix TypeScript errors shown in the output")
                
        except Exception as e:
            self.log_issue("Frontend", "medium", 
                         f"Could not run TypeScript check: {str(e)}",
                         "Ensure TypeScript is installed")

    def test_database_connection(self):
        """Test database connectivity through API"""
        print("\n🔍 Testing Database Connection...")
        try:
            # Test through an API that requires database
            response = requests.get(f"{self.base_url}/api/clients", timeout=5)
            if response.status_code == 200:
                clients = response.json()
                if isinstance(clients, list):
                    self.log_success("Database", f"Database connection working - found {len(clients)} clients")
                else:
                    self.log_issue("Database", "medium", 
                                 "Database returned unexpected format",
                                 "Check database query format in storage layer")
            else:
                self.log_issue("Database", "high", 
                             f"Database query failed with status {response.status_code}",
                             "Check database connection and query implementation")
        except Exception as e:
            self.log_issue("Database", "high", 
                         f"Database test failed: {str(e)}",
                         "Check database connection string and server status")

    def test_file_structure(self):
        """Test critical file structure"""
        print("\n🔍 Testing File Structure...")
        
        critical_files = [
            ("server/index.ts", "Server entry point"),
            ("server/routes.ts", "API routes"),
            ("server/storage.ts", "Database storage layer"),
            ("shared/schema.ts", "Database schema"),
            ("client/src/App.tsx", "Frontend app"),
            ("package.json", "Package configuration"),
        ]
        
        for file_path, description in critical_files:
            if os.path.exists(file_path):
                self.log_success("FileStructure", f"{description} exists")
            else:
                self.log_issue("FileStructure", "critical", 
                             f"Missing {description} ({file_path})",
                             f"Create {file_path}")

    def test_environment_setup(self):
        """Test environment variables and configuration"""
        print("\n🔍 Testing Environment Setup...")
        
        # Check for package.json and dependencies
        if os.path.exists("package.json"):
            try:
                with open("package.json", "r") as f:
                    package_data = json.load(f)
                    
                deps = package_data.get("dependencies", {})
                dev_deps = package_data.get("devDependencies", {})
                all_deps = {**deps, **dev_deps}
                
                critical_deps = ["react", "typescript", "express", "@tanstack/react-query"]
                missing_deps = [dep for dep in critical_deps if dep not in all_deps]
                
                if missing_deps:
                    self.log_issue("Environment", "high", 
                                 f"Missing critical dependencies: {', '.join(missing_deps)}",
                                 f"Install missing dependencies: npm install {' '.join(missing_deps)}")
                else:
                    self.log_success("Environment", "All critical dependencies present")
                    
            except Exception as e:
                self.log_issue("Environment", "medium", 
                             f"Could not read package.json: {str(e)}",
                             "Fix package.json syntax")
        else:
            self.log_issue("Environment", "critical", 
                         "package.json not found",
                         "Initialize npm project with package.json")

    def test_console_errors(self):
        """Check for obvious console errors in logs"""
        print("\n🔍 Checking for Console Errors...")
        
        # Look for common error patterns in TypeScript files
        error_patterns = [
            (r"console\.log", "Debug statements left in code"),
            (r"any\[\]", "Loose typing with any[]"),
            (r":\s*any(?!\w)", "Usage of 'any' type"),
        ]
        
        ts_files = list(Path(".").rglob("*.ts")) + list(Path(".").rglob("*.tsx"))
        ts_files = [f for f in ts_files if "node_modules" not in str(f)]
        
        total_issues = 0
        for file_path in ts_files[:20]:  # Check first 20 files to avoid overwhelming output
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                import re
                for pattern, description in error_patterns:
                    matches = re.findall(pattern, content)
                    if matches:
                        total_issues += len(matches)
                        
            except Exception:
                continue
                
        if total_issues > 0:
            self.log_issue("CodeQuality", "low", 
                         f"Found {total_issues} code quality issues across TypeScript files",
                         "Clean up console.log statements and improve typing")
        else:
            self.log_success("CodeQuality", "No obvious code quality issues found")

    def run_comprehensive_audit(self):
        """Run all audit tests"""
        print("🚀 Starting Comprehensive System Audit")
        print("=" * 60)
        
        start_time = time.time()
        
        # Run all tests
        self.test_server_connectivity()
        self.test_api_endpoints()
        self.test_database_connection()
        self.test_file_structure()
        self.test_environment_setup()
        self.test_frontend_build()
        self.test_console_errors()
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Generate summary
        print("\n" + "=" * 60)
        print("📊 AUDIT SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.passed_tests) + len(self.issues)
        pass_rate = (len(self.passed_tests) / total_tests * 100) if total_tests > 0 else 0
        
        print(f"⏱️  Duration: {duration:.2f} seconds")
        print(f"✅ Passed Tests: {len(self.passed_tests)}")
        print(f"❌ Issues Found: {len(self.issues)}")
        print(f"📈 Pass Rate: {pass_rate:.1f}%")
        
        # Group issues by severity
        critical = [i for i in self.issues if i["severity"] == "critical"]
        high = [i for i in self.issues if i["severity"] == "high"]
        medium = [i for i in self.issues if i["severity"] == "medium"]
        low = [i for i in self.issues if i["severity"] == "low"]
        
        print(f"\n🚨 Critical Issues: {len(critical)}")
        print(f"⚠️  High Priority: {len(high)}")
        print(f"🔍 Medium Priority: {len(medium)}")
        print(f"ℹ️  Low Priority: {len(low)}")
        
        # Show critical issues
        if critical:
            print(f"\n🚨 CRITICAL ISSUES (MUST FIX):")
            for issue in critical:
                print(f"  • {issue['description']}")
                if issue['fix_suggestion']:
                    print(f"    💡 Fix: {issue['fix_suggestion']}")
        
        # Show high priority issues
        if high:
            print(f"\n⚠️  HIGH PRIORITY ISSUES:")
            for issue in high[:5]:  # Show first 5
                print(f"  • {issue['description']}")
                if issue['fix_suggestion']:
                    print(f"    💡 Fix: {issue['fix_suggestion']}")
            if len(high) > 5:
                print(f"  ... and {len(high) - 5} more high priority issues")
        
        # Save detailed report
        report = {
            "timestamp": datetime.now().isoformat(),
            "duration": duration,
            "summary": {
                "total_tests": total_tests,
                "passed_tests": len(self.passed_tests),
                "issues_found": len(self.issues),
                "pass_rate": pass_rate,
                "critical_issues": len(critical),
                "high_priority": len(high),
                "medium_priority": len(medium),
                "low_priority": len(low)
            },
            "issues": self.issues,
            "passed_tests": self.passed_tests
        }
        
        report_file = f"audit_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n💾 Detailed report saved: {report_file}")
        
        if len(critical) == 0 and pass_rate >= 80:
            print("\n🎉 SYSTEM STATUS: Stable - Minor issues to address")
            return 0
        elif len(critical) > 0:
            print(f"\n🚨 SYSTEM STATUS: Critical issues require immediate attention")
            return 1
        else:
            print(f"\n⚠️  SYSTEM STATUS: Functional with issues to address")
            return 1

def main():
    auditor = SystemAuditor()
    return auditor.run_comprehensive_audit()

if __name__ == "__main__":
    sys.exit(main())
