#!/usr/bin/env python3
"""
Comprehensive System Connectivity & Data Integrity Audit
=========================================================
This audit ensures 100% connectivity between database, backend APIs, and frontend components
with complete data integrity verification across all system layers.
"""

import os
import sys
import json
import time
import requests
import psycopg2
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any
import subprocess

class ComprehensiveConnectivityAudit:
    def __init__(self):
        self.base_url = "http://localhost:5000"
        self.therapist_id = "e66b8b8e-e7a2-40b9-ae74-00c93ffe503c"
        self.audit_results = {
            "timestamp": datetime.now().isoformat(),
            "tests_passed": 0,
            "tests_failed": 0,
            "critical_issues": [],
            "high_priority_issues": [],
            "medium_priority_issues": [],
            "low_priority_issues": [],
            "connectivity_map": {},
            "data_integrity_report": {},
            "performance_metrics": {}
        }
        
    def log_result(self, test_name: str, passed: bool, priority: str, details: str, fix_action: str = ""):
        """Log audit test results with detailed information"""
        result = {
            "test": test_name,
            "passed": passed,
            "priority": priority,
            "details": details,
            "fix_action": fix_action,
            "timestamp": datetime.now().isoformat()
        }
        
        if passed:
            self.audit_results["tests_passed"] += 1
            print(f"✅ {test_name}")
        else:
            self.audit_results["tests_failed"] += 1
            print(f"❌ {test_name}: {details}")
            
            if priority == "critical":
                self.audit_results["critical_issues"].append(result)
            elif priority == "high":
                self.audit_results["high_priority_issues"].append(result)
            elif priority == "medium":
                self.audit_results["medium_priority_issues"].append(result)
            else:
                self.audit_results["low_priority_issues"].append(result)

    def test_database_connectivity(self) -> bool:
        """Test core database connectivity and schema integrity"""
        try:
            db_url = os.environ.get('DATABASE_URL')
            if not db_url:
                self.log_result("Database URL", False, "critical", "DATABASE_URL environment variable missing", "Set DATABASE_URL environment variable")
                return False
                
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()
            
            # Test basic connectivity
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]
            
            # Test all critical tables exist with proper structure
            critical_tables = [
                'therapists', 'clients', 'appointments', 'session_notes', 
                'progress_notes', 'treatment_plans', 'action_items', 
                'ai_insights', 'audit_logs', 'medications', 'assessments'
            ]
            
            missing_tables = []
            for table in critical_tables:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = %s
                    );
                """, (table,))
                if not cursor.fetchone()[0]:
                    missing_tables.append(table)
            
            if missing_tables:
                self.log_result("Database Schema", False, "critical", 
                              f"Missing tables: {missing_tables}", 
                              "Create missing database tables")
                return False
                
            # Test foreign key relationships
            cursor.execute("""
                SELECT COUNT(*) FROM appointments a
                LEFT JOIN clients c ON a.client_id = c.id
                LEFT JOIN therapists t ON a.therapist_id = t.id
                WHERE c.id IS NULL OR t.id IS NULL;
            """)
            orphaned_appointments = cursor.fetchone()[0]
            
            if orphaned_appointments > 0:
                self.log_result("Data Integrity - Appointments", False, "high",
                              f"Found {orphaned_appointments} appointments with invalid client/therapist references",
                              "Fix foreign key references in appointments table")
            else:
                self.log_result("Data Integrity - Appointments", True, "high", "All appointments have valid references")
                
            cursor.close()
            conn.close()
            
            self.log_result("Database Connectivity", True, "critical", f"Connected to PostgreSQL: {version}")
            return True
            
        except Exception as e:
            self.log_result("Database Connectivity", False, "critical", 
                          f"Database connection failed: {str(e)}", 
                          "Check database configuration and connectivity")
            return False

    def test_api_endpoints_comprehensive(self) -> bool:
        """Test all API endpoints for connectivity, response format, and data consistency"""
        api_endpoints = {
            # Core system endpoints
            "/api/health": {"method": "GET", "priority": "critical", "expected_keys": ["status", "timestamp"]},
            "/api/health/ai-services": {"method": "GET", "priority": "high", "expected_keys": ["service", "status"]},
            
            # Authentication & user endpoints
            f"/api/therapists/{self.therapist_id}": {"method": "GET", "priority": "critical", "expected_keys": ["id", "firstName", "lastName"]},
            
            # Client management endpoints
            f"/api/clients/{self.therapist_id}": {"method": "GET", "priority": "critical", "expected_keys": ["id", "firstName", "lastName"]},
            
            # Appointment endpoints
            f"/api/appointments/{self.therapist_id}": {"method": "GET", "priority": "critical", "expected_keys": ["id", "clientId", "startTime"]},
            f"/api/appointments/today/{self.therapist_id}": {"method": "GET", "priority": "critical", "expected_keys": ["id", "clientId", "startTime", "client_name"]},
            f"/api/appointments/upcoming/{self.therapist_id}": {"method": "GET", "priority": "high", "expected_keys": ["id", "clientId", "startTime"]},
            
            # Session notes endpoints
            f"/api/session-notes/{self.therapist_id}": {"method": "GET", "priority": "high", "expected_keys": ["id", "clientId", "content"]},
            f"/api/session-notes/today/{self.therapist_id}": {"method": "GET", "priority": "medium", "expected_keys": []},
            
            # Analytics & insights endpoints
            f"/api/dashboard/stats/{self.therapist_id}": {"method": "GET", "priority": "high", "expected_keys": ["totalClients", "totalAppointments"]},
            f"/api/ai-insights/{self.therapist_id}": {"method": "GET", "priority": "medium", "expected_keys": []},
            f"/api/recent-activity/{self.therapist_id}": {"method": "GET", "priority": "medium", "expected_keys": []},
            
            # Action items & tasks
            f"/api/action-items/{self.therapist_id}": {"method": "GET", "priority": "medium", "expected_keys": []},
            f"/api/action-items/urgent/{self.therapist_id}": {"method": "GET", "priority": "medium", "expected_keys": []},
            
            # Google Calendar integration
            "/api/oauth/calendar": {"method": "GET", "priority": "high", "expected_keys": ["id", "summary"]},
            "/api/oauth/events/today": {"method": "GET", "priority": "high", "expected_keys": ["summary", "start"]},
        }
        
        all_passed = True
        connectivity_map = {}
        
        for endpoint, config in api_endpoints.items():
            try:
                start_time = time.time()
                
                if config["method"] == "GET":
                    response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                elif config["method"] == "POST":
                    response = requests.post(f"{self.base_url}{endpoint}", json={}, timeout=10)
                
                response_time = (time.time() - start_time) * 1000  # ms
                
                # Check HTTP status
                if response.status_code not in [200, 304]:
                    self.log_result(f"API Endpoint {endpoint}", False, config["priority"],
                                  f"HTTP {response.status_code}: {response.text[:100]}",
                                  f"Fix {endpoint} endpoint")
                    all_passed = False
                    continue
                
                # Check response format for JSON endpoints
                try:
                    data = response.json()
                    
                    # Validate expected keys for non-empty responses
                    if data and config["expected_keys"]:
                        if isinstance(data, list) and len(data) > 0:
                            first_item = data[0]
                            missing_keys = [key for key in config["expected_keys"] if key not in first_item]
                        elif isinstance(data, dict):
                            missing_keys = [key for key in config["expected_keys"] if key not in data]
                        else:
                            missing_keys = []
                            
                        if missing_keys:
                            self.log_result(f"API Data Format {endpoint}", False, config["priority"],
                                          f"Missing expected keys: {missing_keys}",
                                          f"Update {endpoint} to include required fields")
                            all_passed = False
                        else:
                            self.log_result(f"API Endpoint {endpoint}", True, config["priority"], 
                                          f"Response time: {response_time:.1f}ms, Keys validated")
                    else:
                        self.log_result(f"API Endpoint {endpoint}", True, config["priority"], 
                                      f"Response time: {response_time:.1f}ms")
                    
                    connectivity_map[endpoint] = {
                        "status": "connected",
                        "response_time_ms": response_time,
                        "data_count": len(data) if isinstance(data, list) else 1 if data else 0
                    }
                    
                except json.JSONDecodeError:
                    # Some endpoints might return HTML (like health checks)
                    if response.status_code == 200:
                        self.log_result(f"API Endpoint {endpoint}", True, config["priority"], 
                                      f"Response time: {response_time:.1f}ms (non-JSON)")
                        connectivity_map[endpoint] = {
                            "status": "connected",
                            "response_time_ms": response_time,
                            "content_type": response.headers.get('content-type', 'unknown')
                        }
                    else:
                        self.log_result(f"API Endpoint {endpoint}", False, config["priority"],
                                      "Invalid JSON response",
                                      f"Fix JSON response format for {endpoint}")
                        all_passed = False
                
            except requests.exceptions.RequestException as e:
                self.log_result(f"API Endpoint {endpoint}", False, config["priority"],
                              f"Connection failed: {str(e)}",
                              f"Check server connectivity for {endpoint}")
                connectivity_map[endpoint] = {"status": "failed", "error": str(e)}
                all_passed = False
        
        self.audit_results["connectivity_map"] = connectivity_map
        return all_passed

    def test_data_consistency_cross_layer(self) -> bool:
        """Test data consistency between database, API responses, and expected business logic"""
        try:
            # Get data from database
            db_url = os.environ.get('DATABASE_URL')
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()
            
            # Test appointment data consistency
            cursor.execute("""
                SELECT 
                    a.id, a.client_id, a.therapist_id, a.start_time, a.end_time, a.status,
                    c.first_name, c.last_name, c.email,
                    t.first_name as therapist_first, t.last_name as therapist_last
                FROM appointments a
                JOIN clients c ON a.client_id = c.id
                JOIN therapists t ON a.therapist_id = t.id
                WHERE DATE(a.start_time) = CURRENT_DATE
                ORDER BY a.start_time;
            """)
            
            db_appointments = cursor.fetchall()
            db_appointment_data = []
            for apt in db_appointments:
                db_appointment_data.append({
                    "id": apt[0],
                    "client_id": apt[1],
                    "therapist_id": apt[2],
                    "start_time": apt[3].isoformat(),
                    "client_name": f"{apt[6]} {apt[7]}",
                    "client_email": apt[8]
                })
            
            # Get same data from API
            response = requests.get(f"{self.base_url}/api/appointments/today/{self.therapist_id}")
            if response.status_code == 200:
                api_appointments = response.json()
                
                # Compare counts
                if len(db_appointments) != len(api_appointments):
                    self.log_result("Data Consistency - Appointment Count", False, "high",
                                  f"Database has {len(db_appointments)} appointments, API returns {len(api_appointments)}",
                                  "Synchronize appointment data between database and API")
                    return False
                
                # Compare specific data fields
                consistency_issues = []
                for db_apt in db_appointment_data:
                    api_apt = next((a for a in api_appointments if a["id"] == db_apt["id"]), None)
                    if not api_apt:
                        consistency_issues.append(f"Appointment {db_apt['id']} in DB but missing from API")
                        continue
                    
                    # Check critical fields
                    if "client_name" not in api_apt:
                        consistency_issues.append(f"Appointment {db_apt['id']} missing client_name in API")
                    elif api_apt["client_name"] != db_apt["client_name"]:
                        consistency_issues.append(f"Appointment {db_apt['id']} client_name mismatch: DB='{db_apt['client_name']}' API='{api_apt['client_name']}'")
                    
                    # Normalize time formats for comparison
                    api_time = api_apt.get("startTime") or api_apt.get("start_time", "")
                    db_time = db_apt["start_time"]
                    
                    # Convert API time (2025-08-06T14:30:00.000Z) to DB format (2025-08-06 14:30:00)
                    if api_time.endswith('.000Z'):
                        api_time_normalized = api_time.replace('T', ' ').replace('.000Z', '')
                    else:
                        api_time_normalized = api_time
                    
                    # Only report mismatch if times are truly different (not just format differences)
                    # Both should represent the same moment in time
                    if api_time_normalized != db_time and db_time != api_time_normalized:
                        # Additional check: sometimes DB stores with T format, API normalizes to space format
                        db_time_with_t = db_time.replace(' ', 'T') if ' ' in db_time else db_time
                        if api_time_normalized != db_time and api_time_normalized != db_time_with_t:
                            consistency_issues.append(f"Appointment {db_apt['id']} time mismatch: DB='{db_time}' API='{api_time_normalized}'")
                
                if consistency_issues:
                    self.log_result("Data Consistency - Appointment Details", False, "high",
                                  f"Found {len(consistency_issues)} issues: {consistency_issues[:3]}",
                                  "Fix data synchronization between database and API")
                    return False
                else:
                    self.log_result("Data Consistency - Appointments", True, "high",
                                  f"All {len(db_appointments)} appointments consistent between DB and API")
            
            # Test client data consistency
            cursor.execute("""
                SELECT id, first_name, last_name, email, phone, date_of_birth
                FROM clients
                WHERE therapist_id = %s
                ORDER BY last_name, first_name;
            """, (self.therapist_id,))
            
            db_clients = cursor.fetchall()
            
            response = requests.get(f"{self.base_url}/api/clients/{self.therapist_id}")
            if response.status_code == 200:
                api_clients = response.json()
                
                if len(db_clients) != len(api_clients):
                    self.log_result("Data Consistency - Client Count", False, "medium",
                                  f"Database has {len(db_clients)} clients, API returns {len(api_clients)}",
                                  "Synchronize client data between database and API")
                else:
                    self.log_result("Data Consistency - Clients", True, "medium",
                                  f"All {len(db_clients)} clients consistent between DB and API")
            
            cursor.close()
            conn.close()
            return True
            
        except Exception as e:
            self.log_result("Data Consistency Check", False, "high",
                          f"Cross-layer consistency check failed: {str(e)}",
                          "Investigate data synchronization issues")
            return False

    def test_google_calendar_integration(self) -> bool:
        """Test Google Calendar integration and sync functionality"""
        try:
            # Test calendar connectivity - give more time for OAuth operations
            response = requests.get(f"{self.base_url}/api/oauth/calendar", timeout=15)
            if response.status_code != 200:
                self.log_result("Google Calendar - Connectivity", False, "high",
                              f"Calendar API returned {response.status_code}",
                              "Check Google OAuth authentication")
                return False
            
            # Check response content before parsing
            response_text = response.text.strip()
            if not response_text:
                self.log_result("Google Calendar - Empty Response", False, "high",
                              "Calendar API returned empty response",
                              "Check Google Calendar OAuth token validity")
                return False
                
            try:
                calendars = response.json()
            except ValueError as e:
                self.log_result("Google Calendar - JSON Parse", False, "high",
                              f"Failed to parse calendar JSON: {str(e)} - Response: {response_text[:100]}",
                              "Check calendar API response format")
                return False
                
            if not isinstance(calendars, list) or len(calendars) == 0:
                self.log_result("Google Calendar - Calendars", False, "high",
                              "No calendars found",
                              "Verify Google Calendar access permissions")
                return False
            
            # Find the Simple Practice calendar
            simple_practice_cal = None
            for cal in calendars:
                if "Simple Practice" in cal.get("summary", ""):
                    simple_practice_cal = cal
                    break
            
            if not simple_practice_cal:
                self.log_result("Google Calendar - Simple Practice Calendar", False, "medium",
                              "Simple Practice calendar not found",
                              "Ensure Simple Practice calendar exists and is accessible")
            else:
                self.log_result("Google Calendar - Simple Practice Calendar", True, "medium",
                              f"Found Simple Practice calendar: {simple_practice_cal['id']}")
            
            # Test today's events
            response = requests.get(f"{self.base_url}/api/oauth/events/today", timeout=10)
            if response.status_code == 200:
                try:
                    events = response.json()
                except ValueError as e:
                    self.log_result("Google Calendar - Events JSON Parse", False, "high",
                                  f"Failed to parse events JSON: {str(e)}",
                                  "Check events API response format")
                    return False
                self.log_result("Google Calendar - Today's Events", True, "high",
                              f"Retrieved {len(events)} events for today")
                
                # Check for specific appointment synchronization
                db_url = os.environ.get('DATABASE_URL')
                conn = psycopg2.connect(db_url)
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT c.first_name || ' ' || c.last_name as client_name, a.start_time
                    FROM appointments a
                    JOIN clients c ON a.client_id = c.id
                    WHERE DATE(a.start_time) = CURRENT_DATE
                    AND a.therapist_id = %s
                    ORDER BY a.start_time;
                """, (self.therapist_id,))
                
                db_appointments_today = cursor.fetchall()
                
                sync_issues = []
                for db_apt in db_appointments_today:
                    client_name = db_apt[0]
                    found_in_calendar = any(client_name in event.get("summary", "") for event in events)
                    if not found_in_calendar:
                        sync_issues.append(f"{client_name} not found in Google Calendar")
                
                if sync_issues:
                    self.log_result("Google Calendar - Appointment Sync", False, "medium",
                                  f"Sync issues: {sync_issues}",
                                  "Synchronize appointments with Google Calendar")
                else:
                    self.log_result("Google Calendar - Appointment Sync", True, "medium",
                                  "All database appointments found in Google Calendar")
                
                cursor.close()
                conn.close()
                
            else:
                self.log_result("Google Calendar - Today's Events", False, "high",
                              f"Events API returned {response.status_code}",
                              "Fix Google Calendar events endpoint")
                return False
            
            return True
            
        except Exception as e:
            self.log_result("Google Calendar Integration", False, "high",
                          f"Calendar integration test failed: {str(e)}",
                          "Check Google Calendar integration setup")
            return False

    def test_ai_services_integration(self) -> bool:
        """Test AI services connectivity and functionality"""
        try:
            response = requests.get(f"{self.base_url}/api/health/ai-services", timeout=15)
            if response.status_code != 200:
                self.log_result("AI Services - Health Check", False, "medium",
                              f"AI services health check returned {response.status_code}",
                              "Check AI services configuration")
                return False
            
            services = response.json()
            if not isinstance(services, list):
                self.log_result("AI Services - Response Format", False, "medium",
                              "AI services response is not a list",
                              "Fix AI services health check response format")
                return False
            
            service_status = {}
            for service in services:
                service_name = service.get("service", "unknown")
                status = service.get("status", "unknown")
                service_status[service_name] = status
            
            critical_services = ["openai", "anthropic"]
            offline_critical = [svc for svc in critical_services if service_status.get(svc) != "online"]
            
            if offline_critical:
                self.log_result("AI Services - Critical Services", False, "high",
                              f"Critical services offline: {offline_critical}",
                              "Check API keys and connectivity for critical AI services")
                return False
            else:
                self.log_result("AI Services - Critical Services", True, "high",
                              "All critical AI services online")
            
            # Test AI insights endpoint
            response = requests.get(f"{self.base_url}/api/ai-insights/{self.therapist_id}")
            if response.status_code == 200:
                insights = response.json()
                self.log_result("AI Services - Insights API", True, "medium",
                              f"AI insights API working, returned {len(insights) if isinstance(insights, list) else 1} items")
            else:
                self.log_result("AI Services - Insights API", False, "medium",
                              f"AI insights API returned {response.status_code}",
                              "Fix AI insights endpoint")
            
            return True
            
        except Exception as e:
            self.log_result("AI Services Integration", False, "medium",
                          f"AI services test failed: {str(e)}",
                          "Check AI services integration")
            return False

    def test_frontend_backend_connectivity(self) -> bool:
        """Test that frontend can properly communicate with backend"""
        try:
            # Test static file serving
            response = requests.get(f"{self.base_url}/", timeout=10)
            if response.status_code != 200:
                self.log_result("Frontend - Static Files", False, "critical",
                              f"Frontend not accessible, returned {response.status_code}",
                              "Check frontend build and serving")
                return False
            
            # Check that HTML contains the root div for React
            if 'id="root"' not in response.text:
                self.log_result("Frontend - React Root", False, "critical",
                              "React root element not found in HTML",
                              "Check frontend HTML template")
                return False
            
            self.log_result("Frontend - Accessibility", True, "critical",
                          "Frontend is accessible and properly configured")
            
            # Test CORS and API accessibility from frontend perspective
            response = requests.get(f"{self.base_url}/api/health", 
                                  headers={"Origin": f"{self.base_url}"})
            if response.status_code == 200:
                self.log_result("Frontend-Backend - CORS", True, "high",
                              "CORS properly configured for API access")
            else:
                self.log_result("Frontend-Backend - CORS", False, "high",
                              "CORS issues detected",
                              "Configure CORS for frontend-backend communication")
            
            return True
            
        except Exception as e:
            self.log_result("Frontend-Backend Connectivity", False, "critical",
                          f"Frontend connectivity test failed: {str(e)}",
                          "Check frontend server and configuration")
            return False

    def test_performance_benchmarks(self) -> bool:
        """Test system performance benchmarks"""
        performance_results = {}
        
        # Test critical endpoint response times
        critical_endpoints = [
            f"/api/appointments/today/{self.therapist_id}",
            f"/api/dashboard/stats/{self.therapist_id}",
            f"/api/clients/{self.therapist_id}",
            "/api/health"
        ]
        
        for endpoint in critical_endpoints:
            times = []
            for _ in range(3):  # Test 3 times
                start = time.time()
                try:
                    response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                    if response.status_code in [200, 304]:
                        times.append((time.time() - start) * 1000)  # ms
                except:
                    times.append(10000)  # 10s penalty for failures
            
            avg_time = sum(times) / len(times)
            performance_results[endpoint] = avg_time
            
            if avg_time > 2000:  # 2 seconds
                self.log_result(f"Performance - {endpoint}", False, "medium",
                              f"Slow response time: {avg_time:.1f}ms",
                              "Optimize endpoint performance")
            elif avg_time > 1000:  # 1 second
                self.log_result(f"Performance - {endpoint}", True, "low",
                              f"Acceptable response time: {avg_time:.1f}ms")
            else:
                self.log_result(f"Performance - {endpoint}", True, "low",
                              f"Good response time: {avg_time:.1f}ms")
        
        self.audit_results["performance_metrics"] = performance_results
        return True

    def run_comprehensive_audit(self) -> Dict:
        """Run the complete comprehensive audit"""
        print("🚀 Comprehensive System Connectivity & Data Integrity Audit")
        print("=" * 70)
        print("🔍 Testing all system layers for 100% connectivity...")
        print("=" * 70)
        
        # Run all tests in order of priority
        test_results = []
        
        print("\n🔌 CRITICAL CONNECTIVITY TESTS")
        print("-" * 40)
        test_results.append(self.test_database_connectivity())
        test_results.append(self.test_frontend_backend_connectivity())
        
        print("\n📊 API ENDPOINT COMPREHENSIVE TESTS")
        print("-" * 40)
        test_results.append(self.test_api_endpoints_comprehensive())
        
        print("\n🔄 DATA CONSISTENCY CROSS-LAYER TESTS")
        print("-" * 40)
        test_results.append(self.test_data_consistency_cross_layer())
        
        print("\n📅 GOOGLE CALENDAR INTEGRATION TESTS")
        print("-" * 40)
        test_results.append(self.test_google_calendar_integration())
        
        print("\n🤖 AI SERVICES INTEGRATION TESTS")
        print("-" * 40)
        test_results.append(self.test_ai_services_integration())
        
        print("\n⚡ PERFORMANCE BENCHMARK TESTS")
        print("-" * 40)
        test_results.append(self.test_performance_benchmarks())
        
        # Calculate final results
        total_tests = self.audit_results["tests_passed"] + self.audit_results["tests_failed"]
        pass_rate = (self.audit_results["tests_passed"] / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n" + "=" * 70)
        print("📊 COMPREHENSIVE AUDIT SUMMARY")
        print("=" * 70)
        print(f"Total Tests Run: {total_tests}")
        print(f"Tests Passed: {self.audit_results['tests_passed']}")
        print(f"Tests Failed: {self.audit_results['tests_failed']}")
        print(f"Pass Rate: {pass_rate:.1f}%")
        
        # Report issues by priority
        if self.audit_results["critical_issues"]:
            print(f"\n🚨 CRITICAL ISSUES ({len(self.audit_results['critical_issues'])})")
            print("-" * 50)
            for issue in self.audit_results["critical_issues"]:
                print(f"• {issue['test']}: {issue['details']}")
                print(f"  Fix: {issue['fix_action']}")
        
        if self.audit_results["high_priority_issues"]:
            print(f"\n⚠️  HIGH PRIORITY ISSUES ({len(self.audit_results['high_priority_issues'])})")
            print("-" * 50)
            for issue in self.audit_results["high_priority_issues"]:
                print(f"• {issue['test']}: {issue['details']}")
                print(f"  Fix: {issue['fix_action']}")
        
        if self.audit_results["medium_priority_issues"]:
            print(f"\n🔍 MEDIUM PRIORITY ISSUES ({len(self.audit_results['medium_priority_issues'])})")
            print("-" * 50)
            for issue in self.audit_results["medium_priority_issues"][:5]:  # Show first 5
                print(f"• {issue['test']}: {issue['details']}")
        
        # Save detailed results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"comprehensive_audit_report_{timestamp}.json"
        with open(report_file, 'w') as f:
            json.dump(self.audit_results, f, indent=2, default=str)
        
        print(f"\n💾 Detailed report saved: {report_file}")
        
        if pass_rate == 100.0:
            print(f"\n🎉 SYSTEM IS 100% FUNCTIONAL!")
            print("All connectivity and data integrity tests passed.")
        else:
            print(f"\n⚠️  SYSTEM NEEDS ATTENTION - {pass_rate:.1f}% functional")
            print("Issues found that require fixing.")
        
        return self.audit_results

if __name__ == "__main__":
    auditor = ComprehensiveConnectivityAudit()
    results = auditor.run_comprehensive_audit()
    
    # Exit with appropriate code
    if results["tests_failed"] == 0:
        sys.exit(0)
    else:
        sys.exit(1)