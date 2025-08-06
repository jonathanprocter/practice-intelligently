#!/usr/bin/env python3
"""
Comprehensive System Audit for Therapy Management System
Tests all critical functionality and prioritizes fixes by severity
"""

import requests
import json
import time
import psycopg2
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple
import sys

class SystemAuditor:
    def __init__(self):
        self.base_url = "http://localhost:5000"
        self.therapist_id = "e66b8b8e-e7a2-40b9-ae74-00c93ffe503c"
        self.test_results = {
            'critical': [],
            'high': [],
            'medium': [],
            'low': [],
            'passed': []
        }
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_result(self, test_name: str, passed: bool, severity: str, details: str = "", fix_suggestion: str = ""):
        """Log test result with severity classification"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            self.test_results['passed'].append({
                'test': test_name,
                'details': details
            })
            print(f"✅ {test_name}")
        else:
            self.test_results[severity].append({
                'test': test_name,
                'details': details,
                'fix_suggestion': fix_suggestion
            })
            print(f"❌ {test_name}: {details}")
    
    def test_server_health(self) -> bool:
        """Test basic server connectivity and health"""
        try:
            response = requests.get(f"{self.base_url}/api/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_result("Server Health Check", True, "critical", "Server is responding")
                return True
            else:
                self.log_result("Server Health Check", False, "critical", 
                              f"Server returned status {response.status_code}",
                              "Check server startup and configuration")
                return False
        except Exception as e:
            self.log_result("Server Health Check", False, "critical", 
                          f"Cannot connect to server: {str(e)}",
                          "Ensure server is running on localhost:5000")
            return False
    
    def test_database_connectivity(self) -> bool:
        """Test PostgreSQL database connection"""
        try:
            db_url = os.environ.get('DATABASE_URL')
            if not db_url:
                self.log_result("Database Connection", False, "critical",
                              "DATABASE_URL environment variable not set",
                              "Set DATABASE_URL environment variable")
                return False
                
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            conn.close()
            self.log_result("Database Connection", True, "critical", "Database is accessible")
            return True
        except Exception as e:
            self.log_result("Database Connection", False, "critical",
                          f"Database connection failed: {str(e)}",
                          "Check database server and credentials")
            return False
    
    def test_core_tables_exist(self) -> bool:
        """Test that all required database tables exist"""
        required_tables = ['therapists', 'clients', 'appointments', 'session_notes', 
                          'ai_insights', 'assessments']
        try:
            db_url = os.environ.get('DATABASE_URL')
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()
            
            for table in required_tables:
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = '{table}'
                    )
                """)
                exists = cursor.fetchone()[0]
                if not exists:
                    self.log_result(f"Table {table} exists", False, "critical",
                                  f"Required table {table} is missing",
                                  f"Run database migration to create {table} table")
                    return False
            
            cursor.close()
            conn.close()
            self.log_result("Core Tables Exist", True, "critical", "All required tables present")
            return True
        except Exception as e:
            self.log_result("Core Tables Exist", False, "critical",
                          f"Failed to check tables: {str(e)}",
                          "Check database schema and run migrations")
            return False
    
    def test_therapist_data(self) -> bool:
        """Test therapist data integrity"""
        try:
            db_url = os.environ.get('DATABASE_URL')
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()
            
            cursor.execute("SELECT id, email, first_name, last_name FROM therapists WHERE id = %s", 
                          (self.therapist_id,))
            therapist = cursor.fetchone()
            
            if not therapist:
                self.log_result("Therapist Data", False, "critical",
                              f"Therapist {self.therapist_id} not found in database",
                              "Create or restore therapist record")
                return False
            
            if not all([therapist[1], therapist[2], therapist[3]]):  # email, first_name, last_name
                self.log_result("Therapist Data", False, "high",
                              "Therapist missing required fields (email, name)",
                              "Update therapist record with complete information")
                return False
                
            cursor.close()
            conn.close()
            self.log_result("Therapist Data", True, "critical", "Therapist data is complete")
            return True
        except Exception as e:
            self.log_result("Therapist Data", False, "critical",
                          f"Failed to verify therapist: {str(e)}",
                          "Check database connection and therapist table")
            return False
    
    def test_dashboard_stats(self) -> bool:
        """Test dashboard statistics API"""
        try:
            response = requests.get(f"{self.base_url}/api/dashboard/stats/{self.therapist_id}")
            if response.status_code != 200:
                self.log_result("Dashboard Stats API", False, "high",
                              f"Stats API returned {response.status_code}",
                              "Check dashboard stats endpoint implementation")
                return False
            
            data = response.json()
            required_fields = ['todaysSessions', 'activeClients', 'calendarIntegrated']
            
            for field in required_fields:
                if field not in data:
                    self.log_result("Dashboard Stats API", False, "high",
                                  f"Missing required field: {field}",
                                  f"Update stats endpoint to include {field}")
                    return False
            
            # Verify today's session count is reasonable
            if not isinstance(data['todaysSessions'], int) or data['todaysSessions'] < 0:
                self.log_result("Dashboard Stats API", False, "medium",
                              f"Invalid todaysSessions value: {data['todaysSessions']}",
                              "Fix session counting logic")
                return False
                
            self.log_result("Dashboard Stats API", True, "high", 
                          f"Stats API working, today's sessions: {data['todaysSessions']}")
            return True
        except Exception as e:
            self.log_result("Dashboard Stats API", False, "high",
                          f"Stats API failed: {str(e)}",
                          "Check dashboard stats endpoint and database queries")
            return False
    
    def test_appointments_today(self) -> bool:
        """Test today's appointments API"""
        try:
            response = requests.get(f"{self.base_url}/api/appointments/today/{self.therapist_id}")
            if response.status_code != 200:
                self.log_result("Today's Appointments API", False, "high",
                              f"Appointments API returned {response.status_code}",
                              "Check appointments endpoint implementation")
                return False
            
            appointments = response.json()
            if not isinstance(appointments, list):
                self.log_result("Today's Appointments API", False, "high",
                              "Appointments API should return array",
                              "Fix appointments endpoint to return array")
                return False
            
            # Check appointment structure
            for apt in appointments:
                required_fields = ['id', 'client_name', 'start_time', 'end_time', 'status']
                for field in required_fields:
                    if field not in apt:
                        self.log_result("Today's Appointments API", False, "medium",
                                      f"Appointment missing field: {field}",
                                      f"Update appointment query to include {field}")
                        return False
            
            self.log_result("Today's Appointments API", True, "high",
                          f"Found {len(appointments)} appointments today")
            return True
        except Exception as e:
            self.log_result("Today's Appointments API", False, "high",
                          f"Appointments API failed: {str(e)}",
                          "Check appointments endpoint and database queries")
            return False
    
    def test_calendar_integration(self) -> bool:
        """Test Google Calendar integration"""
        try:
            # Test calendar list
            response = requests.get(f"{self.base_url}/api/calendar/calendars")
            if response.status_code != 200:
                self.log_result("Calendar Integration", False, "high",
                              f"Calendar API returned {response.status_code}",
                              "Check Google Calendar authentication and API setup")
                return False
            
            calendars = response.json()
            if not isinstance(calendars, list) or len(calendars) == 0:
                self.log_result("Calendar Integration", False, "high",
                              "No calendars found",
                              "Verify Google Calendar API credentials and permissions")
                return False
            
            # Test events fetch
            today = datetime.now().strftime('%Y-%m-%d')
            response = requests.get(f"{self.base_url}/api/oauth/events/today")
            if response.status_code != 200:
                self.log_result("Calendar Integration", False, "medium",
                              "Calendar events API not working",
                              "Check calendar events endpoint")
                return False
            
            self.log_result("Calendar Integration", True, "high",
                          f"Found {len(calendars)} calendars connected")
            return True
        except Exception as e:
            self.log_result("Calendar Integration", False, "high",
                          f"Calendar integration failed: {str(e)}",
                          "Check Google Calendar API credentials and network connectivity")
            return False
    
    def test_ai_services(self) -> bool:
        """Test AI services connectivity"""
        try:
            response = requests.get(f"{self.base_url}/api/health/ai-services", timeout=30)
            if response.status_code != 200:
                self.log_result("AI Services Health", False, "medium",
                              f"AI services health check returned {response.status_code}",
                              "Check AI service configurations and API keys")
                return False
            
            services = response.json()
            if not isinstance(services, list):
                self.log_result("AI Services Health", False, "medium",
                              "AI services should return array",
                              "Fix AI services health endpoint")
                return False
            
            online_count = sum(1 for service in services if service.get('status') == 'online')
            total_count = len(services)
            
            if online_count == 0:
                self.log_result("AI Services Health", False, "medium",
                              "No AI services are online",
                              "Check API keys for OpenAI, Anthropic, etc.")
                return False
            elif online_count < total_count:
                self.log_result("AI Services Health", True, "medium",
                              f"{online_count}/{total_count} AI services online")
                return True
            else:
                self.log_result("AI Services Health", True, "medium",
                              f"All {total_count} AI services online")
                return True
        except Exception as e:
            self.log_result("AI Services Health", False, "medium",
                          f"AI services check failed: {str(e)}",
                          "Check AI service endpoints and API credentials")
            return False
    
    def test_session_notes(self) -> bool:
        """Test session notes functionality"""
        try:
            response = requests.get(f"{self.base_url}/api/session-notes/today/{self.therapist_id}")
            if response.status_code != 200:
                self.log_result("Session Notes API", False, "medium",
                              f"Session notes API returned {response.status_code}",
                              "Check session notes endpoint")
                return False
            
            notes = response.json()
            if not isinstance(notes, list):
                self.log_result("Session Notes API", False, "medium",
                              "Session notes should return array",
                              "Fix session notes endpoint to return array")
                return False
            
            self.log_result("Session Notes API", True, "medium",
                          f"Found {len(notes)} session notes")
            return True
        except Exception as e:
            self.log_result("Session Notes API", False, "medium",
                          f"Session notes API failed: {str(e)}",
                          "Check session notes endpoint implementation")
            return False
    
    def test_client_data_integrity(self) -> bool:
        """Test client data completeness and integrity"""
        try:
            db_url = os.environ.get('DATABASE_URL')
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()
            
            # Check for clients with missing essential data
            cursor.execute("""
                SELECT COUNT(*) FROM clients 
                WHERE therapist_id = %s 
                AND (first_name IS NULL OR first_name = '' OR last_name IS NULL OR last_name = '')
            """, (self.therapist_id,))
            
            incomplete_clients = cursor.fetchone()[0]
            
            # Check total client count
            cursor.execute("SELECT COUNT(*) FROM clients WHERE therapist_id = %s", (self.therapist_id,))
            total_clients = cursor.fetchone()[0]
            
            cursor.close()
            conn.close()
            
            if total_clients == 0:
                self.log_result("Client Data Integrity", False, "high",
                              "No clients found in database",
                              "Import or create client records")
                return False
            
            if incomplete_clients > 0:
                self.log_result("Client Data Integrity", False, "medium",
                              f"{incomplete_clients} clients missing name data",
                              "Update client records with complete information")
                return False
            
            self.log_result("Client Data Integrity", True, "medium",
                          f"All {total_clients} clients have complete data")
            return True
        except Exception as e:
            self.log_result("Client Data Integrity", False, "high",
                          f"Client data check failed: {str(e)}",
                          "Check database connection and clients table")
            return False
    
    def test_appointment_sync(self) -> bool:
        """Test appointment synchronization between database and calendar"""
        try:
            # Get database appointments for today
            db_url = os.environ.get('DATABASE_URL')
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT COUNT(*) FROM appointments 
                WHERE therapist_id = %s AND DATE(start_time) = CURRENT_DATE
            """, (self.therapist_id,))
            db_count = cursor.fetchone()[0]
            
            cursor.close()
            conn.close()
            
            # Get API appointments
            response = requests.get(f"{self.base_url}/api/appointments/today/{self.therapist_id}")
            if response.status_code == 200:
                api_count = len(response.json())
            else:
                api_count = 0
            
            # Get dashboard stats
            response = requests.get(f"{self.base_url}/api/dashboard/stats/{self.therapist_id}")
            if response.status_code == 200:
                stats_count = response.json().get('todaysSessions', 0)
            else:
                stats_count = 0
            
            if db_count != api_count or db_count != stats_count:
                self.log_result("Appointment Sync", False, "high",
                              f"Appointment counts don't match: DB={db_count}, API={api_count}, Stats={stats_count}",
                              "Fix appointment counting logic and sync mechanisms")
                return False
            
            self.log_result("Appointment Sync", True, "high",
                          f"All appointment counts match: {db_count}")
            return True
        except Exception as e:
            self.log_result("Appointment Sync", False, "high",
                          f"Appointment sync check failed: {str(e)}",
                          "Check appointment APIs and database queries")
            return False
    
    def test_recent_activity(self) -> bool:
        """Test recent activity tracking"""
        try:
            response = requests.get(f"{self.base_url}/api/recent-activity/{self.therapist_id}")
            if response.status_code != 200:
                self.log_result("Recent Activity API", False, "low",
                              f"Recent activity API returned {response.status_code}",
                              "Check recent activity endpoint")
                return False
            
            activities = response.json()
            if not isinstance(activities, list):
                self.log_result("Recent Activity API", False, "low",
                              "Recent activity should return array",
                              "Fix recent activity endpoint")
                return False
            
            self.log_result("Recent Activity API", True, "low",
                          f"Found {len(activities)} recent activities")
            return True
        except Exception as e:
            self.log_result("Recent Activity API", False, "low",
                          f"Recent activity API failed: {str(e)}",
                          "Check recent activity endpoint implementation")
            return False
    
    def test_david_grossman_appointments(self) -> bool:
        """Test specific case: David Grossman's appointments are correctly scheduled"""
        try:
            db_url = os.environ.get('DATABASE_URL')
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()
            
            # Check today's appointment with more precise query
            cursor.execute("""
                SELECT a.start_time, a.end_time, a.status 
                FROM appointments a 
                JOIN clients c ON a.client_id = c.id 
                WHERE a.therapist_id = %s 
                AND c.first_name = 'David' 
                AND c.last_name = 'Grossman'
                AND DATE(a.start_time) = CURRENT_DATE
            """, (self.therapist_id,))
            
            today_apt = cursor.fetchone()
            
            # Check Saturday appointment
            cursor.execute("""
                SELECT a.start_time, a.end_time, a.status 
                FROM appointments a 
                JOIN clients c ON a.client_id = c.id 
                WHERE a.therapist_id = %s 
                AND c.first_name = 'David' 
                AND c.last_name = 'Grossman'
                AND DATE(a.start_time) = '2025-08-09'
            """, (self.therapist_id,))
            
            saturday_apt = cursor.fetchone()
            cursor.close()
            conn.close()
            
            issues = []
            
            if not today_apt:
                issues.append("David's today appointment (8:00 PM) missing")
            else:
                # Extract datetime from tuple and handle both datetime and string types
                today_datetime = today_apt[0]
                if hasattr(today_datetime, 'hour'):
                    if not (today_datetime.hour == 20 and today_datetime.minute == 0):  # 8:00 PM
                        issues.append(f"David's today appointment wrong time: {today_datetime}")
                else:
                    # If it's a string, try to parse it
                    from datetime import datetime
                    try:
                        parsed_dt = datetime.fromisoformat(str(today_datetime).replace('Z', '+00:00'))
                        if not (parsed_dt.hour == 20 and parsed_dt.minute == 0):
                            issues.append(f"David's today appointment wrong time: {parsed_dt}")
                    except:
                        issues.append(f"Could not parse David's today appointment time: {today_datetime}")
            
            if not saturday_apt:
                issues.append("David's Saturday appointment (11:00 AM) missing")
            else:
                # Extract datetime from tuple and handle both datetime and string types
                saturday_datetime = saturday_apt[0]
                if hasattr(saturday_datetime, 'hour'):
                    if not (saturday_datetime.hour == 11 and saturday_datetime.minute == 0):  # 11:00 AM
                        issues.append(f"David's Saturday appointment wrong time: {saturday_datetime}")
                else:
                    # If it's a string, try to parse it
                    from datetime import datetime
                    try:
                        parsed_dt = datetime.fromisoformat(str(saturday_datetime).replace('Z', '+00:00'))
                        if not (parsed_dt.hour == 11 and parsed_dt.minute == 0):
                            issues.append(f"David's Saturday appointment wrong time: {parsed_dt}")
                    except:
                        issues.append(f"Could not parse David's Saturday appointment time: {saturday_datetime}")
            
            if issues:
                self.log_result("David Grossman Appointments", False, "medium",
                              "; ".join(issues),
                              "Update David's appointment times to match calendar")
                return False
            
            self.log_result("David Grossman Appointments", True, "medium",
                          "David's appointments correctly scheduled")
            return True
        except Exception as e:
            self.log_result("David Grossman Appointments", False, "medium",
                          f"David's appointments check failed: {str(e)}",
                          "Check David Grossman's appointment records")
            return False
    
    def run_all_tests(self) -> Dict:
        """Run all tests and return comprehensive results"""
        print("🔍 Starting Comprehensive System Audit...")
        print("=" * 60)
        
        # Critical tests (must pass)
        self.test_server_health()
        self.test_database_connectivity()
        self.test_core_tables_exist()
        self.test_therapist_data()
        
        # High priority tests
        self.test_dashboard_stats()
        self.test_appointments_today()
        self.test_calendar_integration()
        self.test_client_data_integrity()
        self.test_appointment_sync()
        
        # Medium priority tests
        self.test_ai_services()
        self.test_session_notes()
        self.test_david_grossman_appointments()
        
        # Low priority tests
        self.test_recent_activity()
        
        return self.generate_report()
    
    def generate_report(self) -> Dict:
        """Generate comprehensive audit report"""
        pass_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        
        report = {
            'summary': {
                'total_tests': self.total_tests,
                'passed_tests': self.passed_tests,
                'failed_tests': self.total_tests - self.passed_tests,
                'pass_rate': round(pass_rate, 1),
                'timestamp': datetime.now().isoformat()
            },
            'results': self.test_results,
            'recommendations': self.generate_recommendations()
        }
        
        return report
    
    def generate_recommendations(self) -> List[Dict]:
        """Generate prioritized fix recommendations"""
        recommendations = []
        
        # Critical issues first
        for issue in self.test_results['critical']:
            recommendations.append({
                'priority': 'CRITICAL',
                'test': issue['test'],
                'issue': issue['details'],
                'fix': issue['fix_suggestion'],
                'impact': 'System non-functional'
            })
        
        # High priority issues
        for issue in self.test_results['high']:
            recommendations.append({
                'priority': 'HIGH',
                'test': issue['test'],
                'issue': issue['details'],
                'fix': issue['fix_suggestion'],
                'impact': 'Core functionality impaired'
            })
        
        # Medium priority issues
        for issue in self.test_results['medium']:
            recommendations.append({
                'priority': 'MEDIUM',
                'test': issue['test'],
                'issue': issue['details'],
                'fix': issue['fix_suggestion'],
                'impact': 'Feature limitations'
            })
        
        # Low priority issues
        for issue in self.test_results['low']:
            recommendations.append({
                'priority': 'LOW',
                'test': issue['test'],
                'issue': issue['details'],
                'fix': issue['fix_suggestion'],
                'impact': 'Minor functionality issues'
            })
        
        return recommendations

def main():
    """Main execution function"""
    print("🚀 Therapy Management System - Comprehensive Audit")
    print("=" * 60)
    
    auditor = SystemAuditor()
    report = auditor.run_all_tests()
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 AUDIT SUMMARY")
    print("=" * 60)
    print(f"Total Tests: {report['summary']['total_tests']}")
    print(f"Passed: {report['summary']['passed_tests']}")
    print(f"Failed: {report['summary']['failed_tests']}")
    print(f"Pass Rate: {report['summary']['pass_rate']}%")
    
    # Print recommendations
    if report['recommendations']:
        print("\n🔧 PRIORITIZED FIXES NEEDED:")
        print("=" * 60)
        for i, rec in enumerate(report['recommendations'], 1):
            print(f"\n{i}. [{rec['priority']}] {rec['test']}")
            print(f"   Issue: {rec['issue']}")
            print(f"   Fix: {rec['fix']}")
            print(f"   Impact: {rec['impact']}")
    
    # Save detailed report
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_file = f"audit_report_{timestamp}.json"
    
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    print(f"\n💾 Detailed report saved: {report_file}")
    
    if report['summary']['pass_rate'] == 100:
        print("\n🎉 SYSTEM IS 100% FUNCTIONAL!")
        return 0
    else:
        print(f"\n⚠️  SYSTEM NEEDS ATTENTION - {report['summary']['pass_rate']}% functional")
        return 1

if __name__ == "__main__":
    exit(main())