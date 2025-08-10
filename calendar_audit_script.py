#!/usr/bin/env python3
"""
Comprehensive Calendar Audit Script for TrevorAI Therapy Management System

This script audits the entire calendar workflow to identify issues preventing
calendar events from loading and crashing. It examines:

1. Google Calendar API Integration
2. OAuth Authentication Status
3. Database Schema & Event Storage
4. API Endpoints & Routes
5. Frontend Calendar Components
6. Event Processing & Display Logic
7. Error Handling & Logging
"""

import json
import os
import requests
import psycopg2
from urllib.parse import urlparse
from datetime import datetime, timedelta
import subprocess
import sys
from typing import Dict, List, Any, Optional
import time

class CalendarAuditReport:
    def __init__(self):
        self.issues = []
        self.warnings = []
        self.passed_checks = []
        self.critical_issues = []
        self.recommendations = []
        
    def add_issue(self, category: str, severity: str, description: str, fix: str = ""):
        issue = {
            "category": category,
            "severity": severity,
            "description": description,
            "fix": fix,
            "timestamp": datetime.now().isoformat()
        }
        if severity == "CRITICAL":
            self.critical_issues.append(issue)
        else:
            self.issues.append(issue)
    
    def add_warning(self, category: str, description: str):
        self.warnings.append({
            "category": category,
            "description": description,
            "timestamp": datetime.now().isoformat()
        })
    
    def add_passed(self, category: str, description: str):
        self.passed_checks.append({
            "category": category,
            "description": description,
            "timestamp": datetime.now().isoformat()
        })
    
    def add_recommendation(self, category: str, description: str, priority: str):
        self.recommendations.append({
            "category": category,
            "description": description,
            "priority": priority,
            "timestamp": datetime.now().isoformat()
        })

class CalendarAuditor:
    def __init__(self, base_url: str = "http://localhost:5000"):
        self.base_url = base_url
        self.report = CalendarAuditReport()
        self.db_connection = None
        
    def connect_to_database(self):
        """Connect to the PostgreSQL database"""
        try:
            database_url = os.environ.get('DATABASE_URL')
            if not database_url:
                self.report.add_issue("DATABASE", "CRITICAL", 
                                    "DATABASE_URL environment variable not found",
                                    "Set DATABASE_URL environment variable")
                return False
                
            self.db_connection = psycopg2.connect(database_url)
            self.report.add_passed("DATABASE", "Successfully connected to PostgreSQL database")
            return True
        except Exception as e:
            self.report.add_issue("DATABASE", "CRITICAL", 
                                f"Failed to connect to database: {str(e)}",
                                "Check database connection and credentials")
            return False
    
    def audit_environment_variables(self):
        """Audit required environment variables"""
        print("🔍 Auditing Environment Variables...")
        
        required_vars = [
            ("DATABASE_URL", "Database connection string"),
            ("GOOGLE_CLIENT_ID", "Google OAuth client ID"),
            ("GOOGLE_CLIENT_SECRET", "Google OAuth client secret")
        ]
        
        optional_vars = [
            ("GOOGLE_API_KEY", "Google API key for additional services"),
            ("GEMINI_API_KEY", "Gemini API key"),
            ("OPENAI_API_KEY", "OpenAI API key")
        ]
        
        for var, description in required_vars:
            if os.environ.get(var):
                self.report.add_passed("ENVIRONMENT", f"{var} is set")
            else:
                self.report.add_issue("ENVIRONMENT", "CRITICAL", 
                                    f"Missing required environment variable: {var} - {description}",
                                    f"Set {var} environment variable")
        
        for var, description in optional_vars:
            if os.environ.get(var):
                self.report.add_passed("ENVIRONMENT", f"{var} is set")
            else:
                self.report.add_warning("ENVIRONMENT", f"Optional variable {var} not set - {description}")
    
    def audit_google_oauth_status(self):
        """Audit Google OAuth authentication status"""
        print("🔍 Auditing Google OAuth Status...")
        
        try:
            response = requests.get(f"{self.base_url}/api/auth/google/status", timeout=10)
            if response.status_code == 200:
                oauth_status = response.json()
                
                if oauth_status.get("authenticated"):
                    self.report.add_passed("OAUTH", "Google OAuth is authenticated")
                    
                    # Check token expiry
                    if oauth_status.get("tokenExpiry"):
                        expiry = datetime.fromisoformat(oauth_status["tokenExpiry"].replace('Z', '+00:00'))
                        if expiry < datetime.now().replace(tzinfo=expiry.tzinfo):
                            self.report.add_issue("OAUTH", "HIGH", 
                                                "OAuth token has expired",
                                                "Re-authenticate with Google Calendar")
                        else:
                            self.report.add_passed("OAUTH", "OAuth token is valid and not expired")
                    
                    # Check scopes
                    required_scopes = [
                        "https://www.googleapis.com/auth/calendar.readonly",
                        "https://www.googleapis.com/auth/calendar.events"
                    ]
                    
                    granted_scopes = oauth_status.get("scopes", [])
                    for scope in required_scopes:
                        if scope in granted_scopes:
                            self.report.add_passed("OAUTH", f"Required scope granted: {scope}")
                        else:
                            self.report.add_issue("OAUTH", "HIGH",
                                                f"Missing required scope: {scope}",
                                                "Re-authenticate with proper calendar scopes")
                else:
                    self.report.add_issue("OAUTH", "CRITICAL",
                                        "Google OAuth not authenticated",
                                        "Complete OAuth flow at /oauth-simple or /oauth-debug")
            else:
                self.report.add_issue("OAUTH", "CRITICAL",
                                    f"Failed to check OAuth status: HTTP {response.status_code}",
                                    "Check OAuth status endpoint")
        except requests.exceptions.RequestException as e:
            self.report.add_issue("OAUTH", "CRITICAL",
                                f"Cannot connect to OAuth status endpoint: {str(e)}",
                                "Ensure application server is running")
    
    def audit_database_schema(self):
        """Audit database schema for calendar-related tables"""
        print("🔍 Auditing Database Schema...")
        
        if not self.db_connection:
            return
        
        try:
            cursor = self.db_connection.cursor()
            
            # Check for required tables
            required_tables = [
                "calendar_events",
                "appointments", 
                "clients",
                "users"
            ]
            
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)
            existing_tables = [row[0] for row in cursor.fetchall()]
            
            for table in required_tables:
                if table in existing_tables:
                    self.report.add_passed("DATABASE", f"Table '{table}' exists")
                else:
                    self.report.add_issue("DATABASE", "CRITICAL",
                                        f"Missing required table: {table}",
                                        f"Create table {table} or run database migration")
            
            # Check calendar_events table structure
            if "calendar_events" in existing_tables:
                cursor.execute("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = 'calendar_events'
                    ORDER BY ordinal_position
                """)
                columns = cursor.fetchall()
                
                required_columns = [
                    "id", "title", "start_time", "end_time", "client_id", 
                    "therapist_id", "google_event_id", "google_calendar_id"
                ]
                
                existing_columns = [col[0] for col in columns]
                
                for req_col in required_columns:
                    if req_col in existing_columns:
                        self.report.add_passed("DATABASE", f"calendar_events has column '{req_col}'")
                    else:
                        self.report.add_issue("DATABASE", "HIGH",
                                            f"calendar_events missing column: {req_col}",
                                            f"Add column {req_col} to calendar_events table")
            
            # Check for calendar events data
            cursor.execute("SELECT COUNT(*) FROM calendar_events")
            event_count = cursor.fetchone()[0]
            
            if event_count > 0:
                self.report.add_passed("DATABASE", f"Found {event_count} calendar events in database")
                
                # Sample recent events
                cursor.execute("""
                    SELECT id, title, start_time, google_event_id, created_at 
                    FROM calendar_events 
                    ORDER BY created_at DESC 
                    LIMIT 5
                """)
                recent_events = cursor.fetchall()
                
                for event in recent_events:
                    self.report.add_passed("DATABASE", 
                                         f"Recent event: {event[1]} at {event[2]} (ID: {event[0]})")
            else:
                self.report.add_warning("DATABASE", 
                                      "No calendar events found in database - may need to sync from Google Calendar")
            
            cursor.close()
            
        except Exception as e:
            self.report.add_issue("DATABASE", "HIGH",
                                f"Error auditing database schema: {str(e)}",
                                "Check database connection and permissions")
    
    def audit_google_calendar_access(self):
        """Test Google Calendar API access"""
        print("🔍 Auditing Google Calendar API Access...")
        
        try:
            # Test calendar list endpoint
            response = requests.get(f"{self.base_url}/api/calendar/calendars", timeout=15)
            
            if response.status_code == 200:
                calendars = response.json()
                
                if calendars and len(calendars) > 0:
                    self.report.add_passed("GOOGLE_API", f"Successfully fetched {len(calendars)} calendars")
                    
                    # Look for the main calendar
                    main_calendar_found = False
                    for calendar in calendars:
                        calendar_id = calendar.get('id', '')
                        calendar_name = calendar.get('summary', 'Unnamed')
                        
                        self.report.add_passed("GOOGLE_API", 
                                             f"Available calendar: {calendar_name} ({calendar_id})")
                        
                        if 'simple' in calendar_name.lower() or 'practice' in calendar_name.lower():
                            main_calendar_found = True
                            
                            # Test events for this calendar
                            self.test_calendar_events(calendar_id)
                    
                    if not main_calendar_found:
                        self.report.add_warning("GOOGLE_API", 
                                              "No 'Simple Practice' calendar found - may need different calendar selection")
                else:
                    self.report.add_issue("GOOGLE_API", "HIGH",
                                        "No calendars returned from Google Calendar API",
                                        "Check calendar permissions and OAuth scopes")
            else:
                self.report.add_issue("GOOGLE_API", "CRITICAL",
                                    f"Failed to fetch calendars: HTTP {response.status_code}",
                                    "Check Google Calendar API connectivity and authentication")
        
        except requests.exceptions.RequestException as e:
            self.report.add_issue("GOOGLE_API", "CRITICAL",
                                f"Cannot connect to calendar API endpoint: {str(e)}",
                                "Ensure application server is running and accessible")
    
    def test_calendar_events(self, calendar_id: str):
        """Test fetching events from a specific calendar"""
        try:
            # Test with current date range
            now = datetime.now()
            start_time = now.strftime('%Y-%m-%dT00:00:00.000Z')
            end_time = (now + timedelta(days=30)).strftime('%Y-%m-%dT23:59:59.999Z')
            
            response = requests.get(
                f"{self.base_url}/api/calendar/events",
                params={
                    'calendarId': calendar_id,
                    'timeMin': start_time,
                    'timeMax': end_time
                },
                timeout=15
            )
            
            if response.status_code == 200:
                events = response.json()
                
                if events and len(events) > 0:
                    self.report.add_passed("GOOGLE_API", 
                                         f"Successfully fetched {len(events)} events from calendar")
                    
                    # Analyze event structure
                    sample_event = events[0]
                    required_fields = ['id', 'summary', 'start', 'end']
                    
                    for field in required_fields:
                        if field in sample_event:
                            self.report.add_passed("GOOGLE_API", f"Event has required field: {field}")
                        else:
                            self.report.add_issue("GOOGLE_API", "MEDIUM",
                                                f"Event missing field: {field}",
                                                "Check event data structure from Google Calendar")
                    
                    # Check for appointment events
                    appointment_events = [e for e in events if 'appointment' in e.get('summary', '').lower()]
                    
                    if appointment_events:
                        self.report.add_passed("GOOGLE_API", 
                                             f"Found {len(appointment_events)} appointment events")
                    else:
                        self.report.add_warning("GOOGLE_API", 
                                              "No appointment events found in current date range")
                
                else:
                    self.report.add_warning("GOOGLE_API", 
                                          f"No events found in calendar {calendar_id} for next 30 days")
            else:
                self.report.add_issue("GOOGLE_API", "HIGH",
                                    f"Failed to fetch events: HTTP {response.status_code}",
                                    f"Check event fetching for calendar {calendar_id}")
        
        except Exception as e:
            self.report.add_issue("GOOGLE_API", "MEDIUM",
                                f"Error testing events for calendar {calendar_id}: {str(e)}",
                                "Check event API endpoint")
    
    def audit_api_endpoints(self):
        """Audit critical API endpoints"""
        print("🔍 Auditing API Endpoints...")
        
        critical_endpoints = [
            ("/api/health", "Health check endpoint"),
            ("/api/auth/google/status", "OAuth status endpoint"),
            ("/api/calendar/calendars", "Calendar list endpoint"),
            ("/api/calendar/events", "Calendar events endpoint"),
            ("/api/dashboard/stats/e66b8b8e-e7a2-40b9-ae74-00c93ffe503c", "Dashboard stats")
        ]
        
        for endpoint, description in critical_endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                
                if response.status_code == 200:
                    self.report.add_passed("API_ENDPOINTS", f"{description} is accessible")
                else:
                    self.report.add_issue("API_ENDPOINTS", "HIGH",
                                        f"{description} returned HTTP {response.status_code}",
                                        f"Fix endpoint {endpoint}")
            
            except requests.exceptions.RequestException as e:
                self.report.add_issue("API_ENDPOINTS", "HIGH",
                                    f"{description} is not accessible: {str(e)}",
                                    f"Ensure server is running and {endpoint} is implemented")
    
    def audit_frontend_calendar_components(self):
        """Audit frontend calendar components for issues"""
        print("🔍 Auditing Frontend Calendar Components...")
        
        # Check if calendar page loads
        try:
            # This would be done via browser automation in a real scenario
            # For now, we'll check if the server serves the calendar page
            response = requests.get(f"{self.base_url}/calendar", timeout=10)
            
            if response.status_code == 200:
                self.report.add_passed("FRONTEND", "Calendar page is accessible")
            else:
                self.report.add_issue("FRONTEND", "HIGH",
                                    f"Calendar page not accessible: HTTP {response.status_code}",
                                    "Check frontend routing for /calendar")
        
        except requests.exceptions.RequestException as e:
            self.report.add_issue("FRONTEND", "HIGH",
                                f"Cannot access calendar page: {str(e)}",
                                "Ensure frontend server is running")
        
        # Check for critical frontend files
        frontend_files = [
            "client/src/pages/calendar.tsx",
            "client/src/components/calendar/WeeklyCalendarGrid.tsx",
            "client/src/components/calendar/DailyView.tsx",
            "client/src/types/calendar.ts",
            "client/src/utils/dateUtils.ts"
        ]
        
        for file_path in frontend_files:
            if os.path.exists(file_path):
                self.report.add_passed("FRONTEND", f"Frontend file exists: {file_path}")
            else:
                self.report.add_issue("FRONTEND", "HIGH",
                                    f"Missing critical frontend file: {file_path}",
                                    f"Restore file {file_path}")
    
    def audit_error_logs(self):
        """Audit recent error logs"""
        print("🔍 Auditing Recent Error Logs...")
        
        # This would analyze application logs in a real scenario
        # For now, we'll check if logging is properly configured
        
        self.report.add_recommendation("LOGGING", 
                                     "Implement comprehensive error logging for calendar operations",
                                     "HIGH")
        
        self.report.add_recommendation("MONITORING", 
                                     "Set up monitoring alerts for calendar API failures",
                                     "MEDIUM")
    
    def run_comprehensive_audit(self):
        """Run the complete calendar audit"""
        print("🔍 Starting Comprehensive Calendar Audit...")
        print("=" * 60)
        
        # Connect to database first
        db_connected = self.connect_to_database()
        
        # Run all audit checks
        self.audit_environment_variables()
        self.audit_google_oauth_status()
        
        if db_connected:
            self.audit_database_schema()
        
        self.audit_google_calendar_access()
        self.audit_api_endpoints()
        self.audit_frontend_calendar_components()
        self.audit_error_logs()
        
        # Generate final report
        self.generate_report()
    
    def generate_report(self):
        """Generate comprehensive audit report"""
        print("\n" + "=" * 60)
        print("📊 CALENDAR AUDIT REPORT")
        print("=" * 60)
        
        # Summary
        total_issues = len(self.report.critical_issues) + len(self.report.issues)
        print(f"\n📋 SUMMARY:")
        print(f"   ✅ Passed Checks: {len(self.report.passed_checks)}")
        print(f"   ⚠️  Warnings: {len(self.report.warnings)}")
        print(f"   🔥 Critical Issues: {len(self.report.critical_issues)}")
        print(f"   ❌ Other Issues: {len(self.report.issues)}")
        print(f"   💡 Recommendations: {len(self.report.recommendations)}")
        
        # Calculate audit score
        total_checks = len(self.report.passed_checks) + total_issues + len(self.report.warnings)
        if total_checks > 0:
            score = (len(self.report.passed_checks) / total_checks) * 100
            print(f"\n🎯 AUDIT SCORE: {score:.1f}%")
        
        # Critical Issues (Must Fix First)
        if self.report.critical_issues:
            print(f"\n🔥 CRITICAL ISSUES (Fix These First):")
            for i, issue in enumerate(self.report.critical_issues, 1):
                print(f"   {i}. [{issue['category']}] {issue['description']}")
                if issue['fix']:
                    print(f"      💡 Fix: {issue['fix']}")
        
        # Other Issues  
        if self.report.issues:
            print(f"\n❌ OTHER ISSUES:")
            for i, issue in enumerate(self.report.issues, 1):
                print(f"   {i}. [{issue['category']} - {issue['severity']}] {issue['description']}")
                if issue['fix']:
                    print(f"      💡 Fix: {issue['fix']}")
        
        # Warnings
        if self.report.warnings:
            print(f"\n⚠️  WARNINGS:")
            for i, warning in enumerate(self.report.warnings, 1):
                print(f"   {i}. [{warning['category']}] {warning['description']}")
        
        # Recommendations
        if self.report.recommendations:
            print(f"\n💡 RECOMMENDATIONS:")
            for i, rec in enumerate(self.report.recommendations, 1):
                print(f"   {i}. [{rec['priority']}] {rec['description']}")
        
        # Passed Checks
        if self.report.passed_checks:
            print(f"\n✅ PASSED CHECKS:")
            for check in self.report.passed_checks:
                print(f"   • [{check['category']}] {check['description']}")
        
        print("\n" + "=" * 60)
        
        # Save detailed report to file
        self.save_detailed_report()
        
        # Provide next steps
        self.provide_next_steps()
    
    def save_detailed_report(self):
        """Save detailed audit report to JSON file"""
        report_data = {
            "audit_timestamp": datetime.now().isoformat(),
            "summary": {
                "passed_checks": len(self.report.passed_checks),
                "warnings": len(self.report.warnings),
                "critical_issues": len(self.report.critical_issues),
                "other_issues": len(self.report.issues),
                "recommendations": len(self.report.recommendations)
            },
            "critical_issues": self.report.critical_issues,
            "issues": self.report.issues,
            "warnings": self.report.warnings,
            "recommendations": self.report.recommendations,
            "passed_checks": self.report.passed_checks
        }
        
        with open("calendar_audit_report.json", "w") as f:
            json.dump(report_data, f, indent=2, default=str)
        
        print(f"📄 Detailed report saved to: calendar_audit_report.json")
    
    def provide_next_steps(self):
        """Provide prioritized next steps"""
        print(f"\n🎯 PRIORITIZED NEXT STEPS:")
        
        if self.report.critical_issues:
            print(f"   1. 🔥 Fix all CRITICAL issues first")
            print(f"   2. 🧪 Test calendar functionality after each critical fix")
            print(f"   3. ❌ Address remaining issues in order of severity")
            print(f"   4. ⚠️  Review and address warnings")
            print(f"   5. 💡 Implement recommendations for improved reliability")
        elif self.report.issues:
            print(f"   1. ❌ Fix remaining issues in order of severity")
            print(f"   2. ⚠️  Review and address warnings") 
            print(f"   3. 💡 Implement recommendations")
            print(f"   4. ✅ Calendar should be working!")
        else:
            print(f"   1. ✅ Calendar audit passed!")
            print(f"   2. ⚠️  Consider addressing warnings for optimization")
            print(f"   3. 💡 Implement recommendations for improved reliability")
        
        print(f"\n🔧 IMMEDIATE ACTIONS:")
        if self.report.critical_issues:
            print(f"   • Start with the first critical issue and fix one at a time")
            print(f"   • Test calendar loading after each fix")
            print(f"   • Re-run this audit script after fixes: python calendar_audit_script.py")

def main():
    """Main entry point"""
    print("🚀 TrevorAI Calendar System Audit")
    print("=" * 60)
    
    # Initialize auditor
    auditor = CalendarAuditor()
    
    # Run comprehensive audit
    auditor.run_comprehensive_audit()
    
    print(f"\n🎉 Audit Complete! Check calendar_audit_report.json for full details.")

if __name__ == "__main__":
    main()