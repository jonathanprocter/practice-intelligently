#!/usr/bin/env python3
"""
Comprehensive Application Audit Script
Analyzes the entire therapy practice management system for issues and generates fixes.
"""

import json
import os
import re
import subprocess
import time
from datetime import datetime
from pathlib import Path
import requests

class ApplicationAuditor:
    def __init__(self):
        self.issues = []
        self.critical_issues = []
        self.warnings = []
        self.audit_results = {}
        self.server_url = "http://localhost:5000"
        self.therapist_id = "e66b8b8e-e7a2-40b9-ae74-00c93ffe503c"
        
    def log_issue(self, category, severity, issue, file_path=None, line_number=None, fix_suggestion=None):
        """Log an issue with categorization and fix suggestions"""
        issue_data = {
            "category": category,
            "severity": severity,
            "issue": issue,
            "file_path": file_path,
            "line_number": line_number,
            "fix_suggestion": fix_suggestion,
            "timestamp": datetime.now().isoformat()
        }
        
        if severity == "CRITICAL":
            self.critical_issues.append(issue_data)
        elif severity == "HIGH":
            self.issues.append(issue_data)
        else:
            self.warnings.append(issue_data)
    
    def check_typescript_errors(self):
        """Check for TypeScript compilation errors"""
        print("🔍 Checking TypeScript errors...")
        try:
            result = subprocess.run(["npx", "tsc", "--noEmit"], 
                                  capture_output=True, text=True, cwd=".")
            if result.returncode != 0:
                errors = result.stderr.split('\n')
                for error in errors:
                    if error.strip() and 'error TS' in error:
                        self.log_issue("TypeScript", "HIGH", error, 
                                     fix_suggestion="Fix TypeScript compilation errors")
            else:
                print("✅ No TypeScript compilation errors found")
        except Exception as e:
            self.log_issue("TypeScript", "CRITICAL", f"Cannot run TypeScript check: {e}")
    
    def check_server_health(self):
        """Check server health and API endpoints"""
        print("🔍 Checking server health...")
        try:
            response = requests.get(f"{self.server_url}/api/health", timeout=10)
            if response.status_code == 200:
                health_data = response.json()
                print(f"✅ Server is healthy: {health_data.get('status')}")
                
                # Check integrations
                integrations = health_data.get('integrations', {})
                for service, status in integrations.items():
                    if not status:
                        self.log_issue("Integration", "HIGH", 
                                     f"{service} integration is down",
                                     fix_suggestion=f"Check {service} API keys and connectivity")
            else:
                self.log_issue("Server", "CRITICAL", 
                             f"Server health check failed: {response.status_code}")
        except Exception as e:
            self.log_issue("Server", "CRITICAL", f"Cannot connect to server: {e}")
    
    def check_database_connectivity(self):
        """Check database connectivity and schema"""
        print("🔍 Checking database connectivity...")
        try:
            response = requests.get(f"{self.server_url}/api/clients/{self.therapist_id}", timeout=10)
            if response.status_code == 200:
                print("✅ Database connectivity working")
            else:
                self.log_issue("Database", "CRITICAL", 
                             f"Database query failed: {response.status_code}")
        except Exception as e:
            self.log_issue("Database", "CRITICAL", f"Database connectivity error: {e}")
    
    def check_critical_endpoints(self):
        """Check critical API endpoints"""
        print("🔍 Checking critical API endpoints...")
        
        critical_endpoints = [
            "/api/health",
            f"/api/clients/{self.therapist_id}",
            f"/api/appointments/today/{self.therapist_id}",
            f"/api/session-notes/today/{self.therapist_id}",
            f"/api/dashboard/stats/{self.therapist_id}",
            "/api/calendar/events"
        ]
        
        for endpoint in critical_endpoints:
            try:
                response = requests.get(f"{self.server_url}{endpoint}", timeout=10)
                if response.status_code >= 400:
                    self.log_issue("API", "HIGH", 
                                 f"Endpoint {endpoint} returned {response.status_code}",
                                 fix_suggestion="Debug API route and fix server-side errors")
                else:
                    print(f"✅ {endpoint} working")
            except Exception as e:
                self.log_issue("API", "HIGH", f"Endpoint {endpoint} error: {e}")
    
    def check_file_structure(self):
        """Check for missing critical files and proper structure"""
        print("🔍 Checking file structure...")
        
        critical_files = [
            "package.json",
            "server/index.ts",
            "server/storage.ts",
            "server/routes.ts",
            "client/src/App.tsx",
            "shared/schema.ts",
            "vite.config.ts",
            "drizzle.config.ts"
        ]
        
        for file_path in critical_files:
            if not os.path.exists(file_path):
                self.log_issue("FileStructure", "CRITICAL", 
                             f"Missing critical file: {file_path}",
                             fix_suggestion=f"Create missing file {file_path}")
            else:
                # Check file size to ensure it's not empty
                if os.path.getsize(file_path) == 0:
                    self.log_issue("FileStructure", "HIGH", 
                                 f"Empty critical file: {file_path}",
                                 fix_suggestion=f"Populate {file_path} with required content")
    
    def check_dependencies(self):
        """Check for dependency issues"""
        print("🔍 Checking dependencies...")
        try:
            with open("package.json", "r") as f:
                package_data = json.load(f)
                
            # Check for missing critical dependencies
            critical_deps = [
                "react", "typescript", "express", "drizzle-orm", 
                "@tanstack/react-query", "wouter"
            ]
            
            dependencies = {**package_data.get("dependencies", {}), 
                          **package_data.get("devDependencies", {})}
            
            for dep in critical_deps:
                if dep not in dependencies:
                    self.log_issue("Dependencies", "HIGH", 
                                 f"Missing critical dependency: {dep}",
                                 fix_suggestion=f"Install {dep}")
                    
        except Exception as e:
            self.log_issue("Dependencies", "CRITICAL", f"Cannot read package.json: {e}")
    
    def check_security_issues(self):
        """Check for security vulnerabilities"""
        print("🔍 Checking security issues...")
        try:
            # Check for exposed secrets in code
            secret_patterns = [
                r'api[_-]?key["\'\s]*[:=]["\'\s]*[a-zA-Z0-9]+',
                r'secret["\'\s]*[:=]["\'\s]*[a-zA-Z0-9]+',
                r'password["\'\s]*[:=]["\'\s]*[a-zA-Z0-9]+',
                r'token["\'\s]*[:=]["\'\s]*[a-zA-Z0-9]+'
            ]
            
            for root, dirs, files in os.walk("."):
                # Skip node_modules and other irrelevant directories
                dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '.next', 'dist']]
                
                for file in files:
                    if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                        file_path = os.path.join(root, file)
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                                for pattern in secret_patterns:
                                    if re.search(pattern, content, re.IGNORECASE):
                                        self.log_issue("Security", "HIGH", 
                                                     f"Potential exposed secret in {file_path}",
                                                     fix_suggestion="Move secrets to environment variables")
                        except Exception:
                            continue
                            
        except Exception as e:
            self.log_issue("Security", "MEDIUM", f"Security scan error: {e}")
    
    def check_performance_issues(self):
        """Check for performance issues"""
        print("🔍 Checking performance issues...")
        
        # Check for large files
        large_file_threshold = 1024 * 1024  # 1MB
        for root, dirs, files in os.walk("."):
            dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '.next', 'dist']]
            
            for file in files:
                file_path = os.path.join(root, file)
                try:
                    if os.path.getsize(file_path) > large_file_threshold:
                        self.log_issue("Performance", "MEDIUM", 
                                     f"Large file detected: {file_path}",
                                     fix_suggestion="Consider optimizing or splitting large files")
                except Exception:
                    continue
    
    def check_code_quality(self):
        """Check code quality issues"""
        print("🔍 Checking code quality...")
        
        # Check for console.log statements in production code
        for root, dirs, files in os.walk("client"):
            for file in files:
                if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            lines = f.readlines()
                            for i, line in enumerate(lines):
                                if 'console.log' in line and not line.strip().startswith('//'):
                                    self.log_issue("CodeQuality", "LOW", 
                                                 f"Console.log found in {file_path}:{i+1}",
                                                 fix_suggestion="Remove or replace with proper logging")
                    except Exception:
                        continue
    
    def check_database_schema(self):
        """Check database schema consistency"""
        print("🔍 Checking database schema...")
        try:
            # Check if schema file exists and has content
            schema_path = "shared/schema.ts"
            if os.path.exists(schema_path):
                with open(schema_path, 'r') as f:
                    content = f.read()
                    if 'export' not in content:
                        self.log_issue("Database", "HIGH", 
                                     "Schema file exists but may be incomplete",
                                     fix_suggestion="Ensure schema exports are properly defined")
            else:
                self.log_issue("Database", "CRITICAL", 
                             "Database schema file missing",
                             fix_suggestion="Create shared/schema.ts with proper database schema")
        except Exception as e:
            self.log_issue("Database", "HIGH", f"Schema check error: {e}")
    
    def run_comprehensive_audit(self):
        """Run all audit checks"""
        print("🔍 Starting comprehensive application audit...")
        print(f"📅 Audit started at: {datetime.now()}")
        
        # Run all checks
        self.check_server_health()
        self.check_database_connectivity()
        self.check_critical_endpoints()
        self.check_file_structure()
        self.check_dependencies()
        self.check_typescript_errors()
        self.check_security_issues()
        self.check_performance_issues()
        self.check_code_quality()
        self.check_database_schema()
        
        # Compile results
        self.audit_results = {
            "audit_timestamp": datetime.now().isoformat(),
            "total_critical_issues": len(self.critical_issues),
            "total_high_issues": len(self.issues),
            "total_warnings": len(self.warnings),
            "critical_issues": self.critical_issues,
            "high_issues": self.issues,
            "warnings": self.warnings,
            "audit_score": self.calculate_audit_score()
        }
        
        return self.audit_results
    
    def calculate_audit_score(self):
        """Calculate overall audit score (0-100)"""
        critical_weight = 10
        high_weight = 5
        warning_weight = 1
        
        total_penalty = (len(self.critical_issues) * critical_weight + 
                        len(self.issues) * high_weight + 
                        len(self.warnings) * warning_weight)
        
        # Base score of 100, subtract penalties
        score = max(0, 100 - total_penalty)
        return score
    
    def generate_fix_report(self):
        """Generate detailed fix report"""
        print("\n" + "="*80)
        print("📊 COMPREHENSIVE AUDIT RESULTS")
        print("="*80)
        
        print(f"🎯 Audit Score: {self.audit_results['audit_score']}/100")
        print(f"🔴 Critical Issues: {len(self.critical_issues)}")
        print(f"🟠 High Priority Issues: {len(self.issues)}")
        print(f"🟡 Warnings: {len(self.warnings)}")
        
        if self.critical_issues:
            print("\n🔴 CRITICAL ISSUES (Fix Immediately):")
            for i, issue in enumerate(self.critical_issues, 1):
                print(f"{i}. [{issue['category']}] {issue['issue']}")
                if issue['fix_suggestion']:
                    print(f"   💡 Fix: {issue['fix_suggestion']}")
        
        if self.issues:
            print("\n🟠 HIGH PRIORITY ISSUES:")
            for i, issue in enumerate(self.issues, 1):
                print(f"{i}. [{issue['category']}] {issue['issue']}")
                if issue['fix_suggestion']:
                    print(f"   💡 Fix: {issue['fix_suggestion']}")
        
        if self.warnings:
            print("\n🟡 WARNINGS:")
            for i, issue in enumerate(self.warnings, 1):
                print(f"{i}. [{issue['category']}] {issue['issue']}")
        
        return self.audit_results

def main():
    auditor = ApplicationAuditor()
    results = auditor.run_comprehensive_audit()
    auditor.generate_fix_report()
    
    # Save results to file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"audit_results_{timestamp}.json"
    with open(filename, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Full audit results saved to: {filename}")
    return results

if __name__ == "__main__":
    main()