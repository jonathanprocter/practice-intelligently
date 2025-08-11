#!/usr/bin/env python3
"""
Comprehensive Clinical Documentation System Audit
Verifies full functionality and AI integration of the therapy management platform
"""

import requests
import json
import psycopg2
from datetime import datetime, timedelta
import os
import sys
from typing import Dict, List, Any, Tuple
import time

class ClinicalSystemAuditor:
    def __init__(self):
        self.base_url = "http://localhost:5000"
        self.therapist_id = "e66b8b8e-e7a2-40b9-ae74-00c93ffe503c"
        self.audit_results = {
            "critical_issues": [],
            "warnings": [],
            "passed_tests": [],
            "failed_tests": [],
            "test_summary": {}
        }
        self.db_connection = None
        
    def connect_to_database(self):
        """Connect to PostgreSQL database"""
        try:
            database_url = os.getenv('DATABASE_URL')
            if not database_url:
                raise Exception("DATABASE_URL environment variable not set")
            
            self.db_connection = psycopg2.connect(database_url)
            print("✅ Database connection established")
            return True
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            self.audit_results["critical_issues"].append(f"Database connection failed: {e}")
            return False

    def test_api_endpoint(self, endpoint: str, method: str = "GET", data: Dict = None) -> Tuple[bool, Dict]:
        """Test API endpoint and return success status with response"""
        try:
            url = f"{self.base_url}{endpoint}"
            headers = {'Content-Type': 'application/json'} if data else {}
            
            if method == "GET":
                response = requests.get(url, timeout=10)
            elif method == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == "PUT":
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == "DELETE":
                response = requests.delete(url, timeout=10)
                
            if response.status_code in [200, 201, 304]:
                return True, response.json() if response.content else {}
            else:
                return False, {"error": f"Status {response.status_code}: {response.text}"}
                
        except Exception as e:
            return False, {"error": str(e)}

    def audit_core_api_endpoints(self):
        """Audit core API endpoints for basic functionality"""
        print("\n🔍 AUDITING CORE API ENDPOINTS")
        
        endpoints_to_test = [
            ("/api/health", "GET"),
            ("/api/health/ai-services", "GET"),
            (f"/api/clients", "GET"),
            (f"/api/appointments/today/{self.therapist_id}", "GET"),
            (f"/api/session-notes/today/{self.therapist_id}", "GET"),
            (f"/api/calendar/events", "GET"),
            (f"/api/dashboard/stats/{self.therapist_id}", "GET"),
            (f"/api/recent-activity/{self.therapist_id}", "GET")
        ]
        
        for endpoint, method in endpoints_to_test:
            success, response = self.test_api_endpoint(endpoint, method)
            if success:
                print(f"✅ {method} {endpoint}")
                self.audit_results["passed_tests"].append(f"{method} {endpoint}")
            else:
                print(f"❌ {method} {endpoint}: {response.get('error', 'Unknown error')}")
                self.audit_results["failed_tests"].append(f"{method} {endpoint}: {response.get('error', 'Unknown error')}")

    def audit_database_integrity(self):
        """Audit database tables and data integrity"""
        print("\n🔍 AUDITING DATABASE INTEGRITY")
        
        if not self.db_connection:
            self.audit_results["critical_issues"].append("Cannot audit database - no connection")
            return
            
        cursor = self.db_connection.cursor()
        
        # Check critical tables exist
        critical_tables = [
            'clients', 'appointments', 'session_notes', 'progress_notes',
            'therapists', 'users', 'calendar_events'
        ]
        
        for table in critical_tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"✅ Table '{table}': {count} records")
                self.audit_results["passed_tests"].append(f"Database table '{table}' exists with {count} records")
            except Exception as e:
                print(f"❌ Table '{table}': {e}")
                self.audit_results["critical_issues"].append(f"Database table '{table}' issue: {e}")

        # Check for orphaned session notes (fix data type mismatch)
        try:
            cursor.execute("""
                SELECT COUNT(*) FROM session_notes sn
                LEFT JOIN clients c ON sn.client_id = c.id::text
                WHERE c.id IS NULL
            """)
            orphaned_notes = cursor.fetchone()[0]
            if orphaned_notes > 0:
                print(f"⚠️  Found {orphaned_notes} orphaned session notes")
                self.audit_results["warnings"].append(f"Found {orphaned_notes} orphaned session notes")
            else:
                print("✅ No orphaned session notes found")
                self.audit_results["passed_tests"].append("No orphaned session notes")
        except Exception as e:
            print(f"❌ Error checking orphaned session notes: {e}")
            self.audit_results["failed_tests"].append(f"Orphaned session notes check failed: {e}")

    def audit_ai_integration(self):
        """Audit AI service integration and functionality"""
        print("\n🔍 AUDITING AI INTEGRATION")
        
        # Test AI services health
        success, response = self.test_api_endpoint("/api/health/ai-services", "GET")
        if success and isinstance(response, list):
            for service in response:
                service_name = service.get('service', 'unknown')
                service_status = service.get('status', 'unknown')
                if service_status == 'online':
                    print(f"✅ AI Service '{service_name}': {service_status}")
                    self.audit_results["passed_tests"].append(f"AI Service '{service_name}' is online")
                else:
                    print(f"⚠️  AI Service '{service_name}': {service_status}")
                    self.audit_results["warnings"].append(f"AI Service '{service_name}' status: {service_status}")
        else:
            print(f"❌ AI services health check failed")
            self.audit_results["critical_issues"].append("AI services health check failed")

    def audit_session_note_creation(self):
        """Audit session note creation functionality"""
        print("\n🔍 AUDITING SESSION NOTE CREATION")
        
        # Get a test client ID
        success, clients_response = self.test_api_endpoint("/api/clients", "GET")
        if not success or not clients_response:
            print("❌ Cannot test session note creation - no clients available")
            self.audit_results["critical_issues"].append("Cannot test session note creation - no clients available")
            return
            
        test_client_id = clients_response[0]['id']
        print(f"Using test client ID: {test_client_id}")
        
        # Test session note creation
        test_session_note = {
            "clientId": test_client_id,
            "therapistId": self.therapist_id,
            "content": "AUDIT TEST SESSION NOTE - This is a test note created during system audit to verify functionality.",
            "source": "audit_test"
        }
        
        success, response = self.test_api_endpoint("/api/session-notes", "POST", test_session_note)
        if success:
            print("✅ Session note creation successful")
            self.audit_results["passed_tests"].append("Session note creation works")
            
            # Clean up test note
            if 'id' in response:
                cleanup_success, _ = self.test_api_endpoint(f"/api/session-notes/{response['id']}", "DELETE")
                if cleanup_success:
                    print("✅ Test session note cleaned up")
                else:
                    print("⚠️  Test session note cleanup failed")
        else:
            print(f"❌ Session note creation failed: {response.get('error', 'Unknown error')}")
            self.audit_results["critical_issues"].append(f"Session note creation failed: {response.get('error', 'Unknown error')}")

    def audit_appointment_integration(self):
        """Audit appointment and calendar integration"""
        print("\n🔍 AUDITING APPOINTMENT & CALENDAR INTEGRATION")
        
        # Test today's appointments
        success, appointments = self.test_api_endpoint(f"/api/appointments/today/{self.therapist_id}", "GET")
        if success:
            appointment_count = len(appointments)
            print(f"✅ Today's appointments retrieved: {appointment_count} appointments")
            self.audit_results["passed_tests"].append(f"Today's appointments: {appointment_count} found")
        else:
            print(f"❌ Failed to retrieve today's appointments")
            self.audit_results["critical_issues"].append("Failed to retrieve today's appointments")
            
        # Test calendar events
        success, events = self.test_api_endpoint("/api/calendar/events", "GET")
        if success:
            events_count = len(events)
            print(f"✅ Calendar events retrieved: {events_count} events")
            self.audit_results["passed_tests"].append(f"Calendar events: {events_count} found")
        else:
            print(f"❌ Failed to retrieve calendar events")
            self.audit_results["critical_issues"].append("Failed to retrieve calendar events")

    def audit_client_chart_functionality(self):
        """Audit client chart and clinical documentation functionality"""
        print("\n🔍 AUDITING CLIENT CHART FUNCTIONALITY")
        
        # Get clients and test client chart data retrieval
        success, clients = self.test_api_endpoint("/api/clients", "GET")
        if not success or not clients:
            print("❌ No clients available for chart testing")
            self.audit_results["critical_issues"].append("No clients available for chart testing")
            return
            
        test_client = clients[0]
        client_id = test_client['id']
        print(f"Testing client chart for: {test_client.get('firstName', '')} {test_client.get('lastName', '')}")
        
        # Test client-specific endpoints
        client_endpoints = [
            (f"/api/session-notes/client/{client_id}", "GET"),
            (f"/api/appointments/client/{client_id}", "GET"),
            (f"/api/progress-notes/client/{client_id}", "GET"),
        ]
        
        for endpoint, method in client_endpoints:
            success, response = self.test_api_endpoint(endpoint, method)
            if success:
                data_count = len(response) if isinstance(response, list) else 1
                print(f"✅ {endpoint}: {data_count} records")
                self.audit_results["passed_tests"].append(f"Client data endpoint {endpoint}: {data_count} records")
            else:
                print(f"❌ {endpoint}: {response.get('error', 'Unknown error')}")
                self.audit_results["failed_tests"].append(f"Client data endpoint {endpoint} failed")

    def audit_document_processing(self):
        """Audit document processing and AI extraction functionality"""
        print("\n🔍 AUDITING DOCUMENT PROCESSING")
        
        # Test document processing endpoint availability
        success, response = self.test_api_endpoint("/api/progress-notes/process-comprehensive", "POST", {
            "content": "TEST CONTENT",
            "clientName": "Test Client"
        })
        
        # We expect this to potentially fail with validation, but endpoint should exist
        if "error" in str(response) and "content" in str(response).lower():
            print("✅ Document processing endpoint exists (validation working)")
            self.audit_results["passed_tests"].append("Document processing endpoint exists")
        elif success:
            print("✅ Document processing endpoint functional")
            self.audit_results["passed_tests"].append("Document processing endpoint functional")
        else:
            print(f"❌ Document processing endpoint failed: {response.get('error', 'Unknown error')}")
            self.audit_results["critical_issues"].append(f"Document processing endpoint failed")

    def run_comprehensive_audit(self):
        """Run complete system audit"""
        print("🚀 STARTING COMPREHENSIVE CLINICAL SYSTEM AUDIT")
        print("=" * 60)
        
        start_time = time.time()
        
        # Connect to database
        self.connect_to_database()
        
        # Run all audit components
        self.audit_core_api_endpoints()
        self.audit_database_integrity()
        self.audit_ai_integration()
        self.audit_session_note_creation()
        self.audit_appointment_integration()
        self.audit_client_chart_functionality()
        self.audit_document_processing()
        
        # Generate summary
        end_time = time.time()
        duration = end_time - start_time
        
        print("\n" + "=" * 60)
        print("🏁 AUDIT COMPLETE")
        print("=" * 60)
        
        total_tests = len(self.audit_results["passed_tests"]) + len(self.audit_results["failed_tests"])
        pass_rate = (len(self.audit_results["passed_tests"]) / total_tests * 100) if total_tests > 0 else 0
        
        print(f"⏱️  Audit Duration: {duration:.2f} seconds")
        print(f"📊 Pass Rate: {pass_rate:.1f}% ({len(self.audit_results['passed_tests'])}/{total_tests})")
        print(f"🚨 Critical Issues: {len(self.audit_results['critical_issues'])}")
        print(f"⚠️  Warnings: {len(self.audit_results['warnings'])}")
        
        # Display critical issues
        if self.audit_results["critical_issues"]:
            print("\n🚨 CRITICAL ISSUES TO FIX:")
            for i, issue in enumerate(self.audit_results["critical_issues"], 1):
                print(f"  {i}. {issue}")
        
        # Display warnings
        if self.audit_results["warnings"]:
            print("\n⚠️  WARNINGS:")
            for i, warning in enumerate(self.audit_results["warnings"], 1):
                print(f"  {i}. {warning}")
                
        # Display successful tests
        if self.audit_results["passed_tests"]:
            print(f"\n✅ SUCCESSFUL TESTS ({len(self.audit_results['passed_tests'])}):")
            for test in self.audit_results["passed_tests"]:
                print(f"  • {test}")
        
        # Save results to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = f"clinical_audit_results_{timestamp}.json"
        
        with open(results_file, 'w') as f:
            json.dump({
                "audit_timestamp": datetime.now().isoformat(),
                "duration_seconds": duration,
                "pass_rate_percent": pass_rate,
                "total_tests": total_tests,
                "results": self.audit_results
            }, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: {results_file}")
        
        if self.db_connection:
            self.db_connection.close()
            
        return pass_rate >= 100.0  # Return True if 100% pass rate

if __name__ == "__main__":
    auditor = ClinicalSystemAuditor()
    success = auditor.run_comprehensive_audit()
    sys.exit(0 if success else 1)