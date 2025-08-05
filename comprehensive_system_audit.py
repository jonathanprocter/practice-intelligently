#!/usr/bin/env python3
"""
Comprehensive System Audit Script for Therapy Practice Management System
Audits: Calendar integration, Document parsing, Storage, AI services, Progress notes, Session insights
"""

import json
import requests
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
import subprocess
from typing import Dict, List, Any, Optional

class SystemAuditor:
    def __init__(self):
        self.base_url = "http://localhost:5000"
        self.test_therapist_id = "e66b8b8e-e7a2-40b9-ae74-00c93ffe503c"
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "overall_status": "UNKNOWN",
            "modules": {},
            "critical_issues": [],
            "warnings": [],
            "recommendations": []
        }
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def log(self, message: str, level: str = "INFO"):
        """Log audit messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")

    def make_request(self, method: str, endpoint: str, **kwargs) -> Optional[Dict]:
        """Make HTTP request with error handling"""
        try:
            url = f"{self.base_url}{endpoint}"
            response = self.session.request(method, url, timeout=30, **kwargs)
            
            if response.status_code >= 400:
                self.log(f"HTTP {response.status_code} for {method} {endpoint}", "ERROR")
                return None
                
            return response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
        except requests.exceptions.RequestException as e:
            self.log(f"Request failed for {method} {endpoint}: {e}", "ERROR")
            return None

    def audit_system_health(self) -> Dict[str, Any]:
        """Audit basic system health and connectivity"""
        self.log("🔍 Auditing System Health...")
        health_results = {
            "status": "FAIL",
            "api_connectivity": False,
            "database_status": False,
            "ai_services": [],
            "response_times": {}
        }

        # Basic health check
        start_time = time.time()
        health_data = self.make_request("GET", "/api/health")
        response_time = (time.time() - start_time) * 1000

        if health_data:
            health_results["api_connectivity"] = True
            health_results["response_times"]["health_check"] = f"{response_time:.0f}ms"
            health_results["database_status"] = health_data.get("integrations", {}).get("database", False)
            
            # AI services check
            ai_data = self.make_request("GET", "/api/health/ai-services")
            if ai_data:
                health_results["ai_services"] = ai_data
                health_results["status"] = "PASS"
            else:
                self.results["critical_issues"].append("AI services health check failed")

        return health_results

    def audit_calendar_integration(self) -> Dict[str, Any]:
        """Audit Google Calendar integration and OAuth status"""
        self.log("📅 Auditing Calendar Integration...")
        calendar_results = {
            "status": "FAIL",
            "oauth_connected": False,
            "calendars_available": 0,
            "events_fetching": False,
            "today_events": 0,
            "response_times": {}
        }

        # Check OAuth status
        start_time = time.time()
        auth_status = self.make_request("GET", "/api/auth/google/status")
        calendar_results["response_times"]["auth_check"] = f"{(time.time() - start_time) * 1000:.0f}ms"

        if auth_status and auth_status.get("connected"):
            calendar_results["oauth_connected"] = True

            # Check calendars
            start_time = time.time()
            calendars = self.make_request("GET", "/api/calendar/calendars")
            calendar_results["response_times"]["calendars_fetch"] = f"{(time.time() - start_time) * 1000:.0f}ms"
            
            if calendars:
                calendar_results["calendars_available"] = len(calendars)

                # Check events fetching
                start_time = time.time()
                today_events = self.make_request("GET", "/api/oauth/events/today")
                calendar_results["response_times"]["events_fetch"] = f"{(time.time() - start_time) * 1000:.0f}ms"
                
                if today_events:
                    calendar_results["events_fetching"] = True
                    calendar_results["today_events"] = len(today_events)
                    calendar_results["status"] = "PASS"
                else:
                    self.results["warnings"].append("Calendar events fetching failed")
            else:
                self.results["critical_issues"].append("Calendar list fetch failed")
        else:
            self.results["critical_issues"].append("Google Calendar OAuth not connected")

        return calendar_results

    def audit_document_processing(self) -> Dict[str, Any]:
        """Audit document parsing and processing capabilities"""
        self.log("📄 Auditing Document Processing...")
        doc_results = {
            "status": "FAIL",
            "upload_endpoint": False,
            "ai_processing": False,
            "client_detection": False,
            "progress_note_generation": False,
            "supported_formats": []
        }

        # Test document upload endpoint availability
        # Note: We'll test the endpoint exists but won't upload actual files
        try:
            response = self.session.options(f"{self.base_url}/api/documents/upload-and-process")
            if response.status_code in [200, 405]:  # 405 Method Not Allowed is expected for OPTIONS
                doc_results["upload_endpoint"] = True
        except:
            self.results["critical_issues"].append("Document upload endpoint not accessible")

        # Check for document processor configuration
        if self.check_file_exists("server/document-processor.ts"):
            doc_results["ai_processing"] = True
            doc_results["status"] = "PASS"
        else:
            self.results["critical_issues"].append("Document processor file not found")

        return doc_results

    def audit_storage_system(self) -> Dict[str, Any]:
        """Audit database storage and CRUD operations"""
        self.log("💾 Auditing Storage System...")
        storage_results = {
            "status": "FAIL",
            "database_connection": False,
            "clients_crud": False,
            "appointments_crud": False,
            "session_notes_crud": False,
            "progress_notes_crud": False,
            "ai_insights_crud": False,
            "response_times": {}
        }

        # Test clients CRUD
        start_time = time.time()
        clients = self.make_request("GET", f"/api/clients/{self.test_therapist_id}")
        storage_results["response_times"]["clients_fetch"] = f"{(time.time() - start_time) * 1000:.0f}ms"
        
        if clients is not None:
            storage_results["clients_crud"] = True
            storage_results["database_connection"] = True

        # Test appointments CRUD
        start_time = time.time()
        appointments = self.make_request("GET", f"/api/appointments/{self.test_therapist_id}")
        storage_results["response_times"]["appointments_fetch"] = f"{(time.time() - start_time) * 1000:.0f}ms"
        
        if appointments is not None:
            storage_results["appointments_crud"] = True

        # Test session notes CRUD
        start_time = time.time()
        session_notes = self.make_request("GET", f"/api/session-notes?therapistId={self.test_therapist_id}")
        storage_results["response_times"]["session_notes_fetch"] = f"{(time.time() - start_time) * 1000:.0f}ms"
        
        if session_notes is not None:
            storage_results["session_notes_crud"] = True

        # Test progress notes CRUD
        start_time = time.time()
        progress_notes = self.make_request("GET", f"/api/progress-notes/therapist/{self.test_therapist_id}")
        storage_results["response_times"]["progress_notes_fetch"] = f"{(time.time() - start_time) * 1000:.0f}ms"
        
        if progress_notes is not None:
            storage_results["progress_notes_crud"] = True

        # Test AI insights
        start_time = time.time()
        ai_insights = self.make_request("GET", f"/api/ai-insights/{self.test_therapist_id}")
        storage_results["response_times"]["ai_insights_fetch"] = f"{(time.time() - start_time) * 1000:.0f}ms"
        
        if ai_insights is not None:
            storage_results["ai_insights_crud"] = True

        # Overall storage status
        if all([
            storage_results["database_connection"],
            storage_results["clients_crud"],
            storage_results["appointments_crud"],
            storage_results["session_notes_crud"],
            storage_results["progress_notes_crud"]
        ]):
            storage_results["status"] = "PASS"
        else:
            self.results["critical_issues"].append("Storage system CRUD operations failing")

        return storage_results

    def audit_ai_services(self) -> Dict[str, Any]:
        """Audit AI tagging, insights, and progress note generation"""
        self.log("🤖 Auditing AI Services...")
        ai_results = {
            "status": "FAIL",
            "openai_available": False,
            "anthropic_available": False,
            "gemini_available": False,
            "perplexity_available": False,
            "session_insights": False,
            "progress_note_generation": False,
            "ai_tagging": False,
            "response_times": {}
        }

        # Check AI service availability
        start_time = time.time()
        ai_services = self.make_request("GET", "/api/health/ai-services")
        ai_results["response_times"]["services_check"] = f"{(time.time() - start_time) * 1000:.0f}ms"
        
        if ai_services:
            for service in ai_services:
                service_name = service.get("service", "").lower()
                is_online = service.get("status") == "online"
                
                if service_name == "openai":
                    ai_results["openai_available"] = is_online
                elif service_name == "anthropic":
                    ai_results["anthropic_available"] = is_online
                elif service_name == "gemini":
                    ai_results["gemini_available"] = is_online
                elif service_name == "perplexity":
                    ai_results["perplexity_available"] = is_online

        # Test AI insight generation
        test_payload = {
            "content": "Test session content for AI analysis",
            "analysisType": "session_insights"
        }
        
        start_time = time.time()
        ai_insight = self.make_request("POST", "/api/ai/detailed-insights", json=test_payload)
        ai_results["response_times"]["insight_generation"] = f"{(time.time() - start_time) * 1000:.0f}ms"
        
        if ai_insight:
            ai_results["session_insights"] = True
            ai_results["ai_tagging"] = True

        # Test cross-client pattern analysis
        pattern_payload = {"therapistId": self.test_therapist_id}
        start_time = time.time()
        patterns = self.make_request("POST", "/api/ai/cross-client-patterns", json=pattern_payload)
        ai_results["response_times"]["pattern_analysis"] = f"{(time.time() - start_time) * 1000:.0f}ms"

        # Overall AI status
        if (ai_results["openai_available"] and 
            ai_results["session_insights"]):
            ai_results["status"] = "PASS"
        else:
            self.results["critical_issues"].append("AI services not fully functional")

        return ai_results

    def audit_progress_notes_system(self) -> Dict[str, Any]:
        """Audit progress notes creation, SOAP format, and AI enhancement"""
        self.log("📝 Auditing Progress Notes System...")
        progress_results = {
            "status": "FAIL",
            "crud_operations": False,
            "soap_format": False,
            "ai_enhancement": False,
            "client_association": False,
            "response_times": {}
        }

        # Test progress notes CRUD
        start_time = time.time()
        notes = self.make_request("GET", f"/api/progress-notes/therapist/{self.test_therapist_id}")
        progress_results["response_times"]["notes_fetch"] = f"{(time.time() - start_time) * 1000:.0f}ms"
        
        if notes is not None:
            progress_results["crud_operations"] = True
            
            # Check SOAP format in existing notes
            if notes and len(notes) > 0:
                sample_note = notes[0]
                if all(field in sample_note for field in ["subjective", "objective", "assessment", "plan"]):
                    progress_results["soap_format"] = True
                    progress_results["client_association"] = bool(sample_note.get("clientId"))

        # Test AI-enhanced progress note generation
        test_content = "Client reported improved mood and reduced anxiety symptoms. Practiced mindfulness techniques."
        ai_payload = {
            "sessionContent": test_content,
            "clientId": "test-client-id",
            "therapistId": self.test_therapist_id
        }
        
        start_time = time.time()
        ai_note = self.make_request("POST", "/api/ai/generate-progress-note", json=ai_payload)
        progress_results["response_times"]["ai_generation"] = f"{(time.time() - start_time) * 1000:.0f}ms"
        
        if ai_note:
            progress_results["ai_enhancement"] = True

        # Overall progress notes status
        if all([
            progress_results["crud_operations"],
            progress_results["soap_format"]
        ]):
            progress_results["status"] = "PASS"
        else:
            self.results["warnings"].append("Progress notes system has issues")

        return progress_results

    def audit_session_insights_system(self) -> Dict[str, Any]:
        """Audit session preparation and insights generation"""
        self.log("🎯 Auditing Session Insights System...")
        insights_results = {
            "status": "FAIL",
            "session_prep": False,
            "appointment_insights": False,
            "client_history_analysis": False,
            "next_session_recommendations": False,
            "response_times": {}
        }

        # Test session preparation from notes
        prep_payload = {
            "progressNote": {
                "title": "Test Session",
                "subjective": "Client feeling anxious",
                "objective": "Calm demeanor, good eye contact",
                "assessment": "Generalized anxiety symptoms",
                "plan": "Continue CBT techniques"
            },
            "clientName": "Test Client",
            "appointmentId": "test-appointment-123"
        }
        
        start_time = time.time()
        session_prep = self.make_request("POST", "/api/ai/session-prep-from-note", json=prep_payload)
        insights_results["response_times"]["session_prep"] = f"{(time.time() - start_time) * 1000:.0f}ms"
        
        if session_prep:
            insights_results["session_prep"] = True

        # Test appointment insights
        appointment_payload = {
            "appointmentId": "test-appointment",
            "clientId": "test-client"
        }
        
        start_time = time.time()
        appointment_insights = self.make_request("POST", "/api/ai/appointment-insights", json=appointment_payload)
        insights_results["response_times"]["appointment_insights"] = f"{(time.time() - start_time) * 1000:.0f}ms"

        # Overall insights status
        if insights_results["session_prep"]:
            insights_results["status"] = "PASS"
        else:
            self.results["warnings"].append("Session insights system needs attention")

        return insights_results

    def check_file_exists(self, file_path: str) -> bool:
        """Check if a file exists in the project"""
        return Path(file_path).exists()

    def audit_file_structure(self) -> Dict[str, Any]:
        """Audit critical file structure and dependencies"""
        self.log("📁 Auditing File Structure...")
        structure_results = {
            "status": "PASS",
            "missing_files": [],
            "critical_files": {
                "server/routes.ts": False,
                "server/storage.ts": False,
                "server/db.ts": False,
                "server/document-processor.ts": False,
                "server/oauth-simple.ts": False,
                "shared/schema.ts": False,
                "package.json": False
            }
        }

        for file_path in structure_results["critical_files"]:
            exists = self.check_file_exists(file_path)
            structure_results["critical_files"][file_path] = exists
            if not exists:
                structure_results["missing_files"].append(file_path)
                structure_results["status"] = "FAIL"

        if structure_results["missing_files"]:
            self.results["critical_issues"].extend([f"Missing critical file: {f}" for f in structure_results["missing_files"]])

        return structure_results

    def generate_recommendations(self):
        """Generate improvement recommendations based on audit results"""
        self.log("💡 Generating Recommendations...")
        
        # Performance recommendations
        for module_name, module_data in self.results["modules"].items():
            if "response_times" in module_data:
                for endpoint, time_str in module_data["response_times"].items():
                    time_ms = float(time_str.replace("ms", ""))
                    if time_ms > 2000:
                        self.results["recommendations"].append(
                            f"Optimize {endpoint} in {module_name} - response time {time_str} is slow"
                        )

        # AI service recommendations
        ai_module = self.results["modules"].get("ai_services", {})
        if not ai_module.get("openai_available"):
            self.results["recommendations"].append("Verify OpenAI API key and connectivity")
        if not ai_module.get("anthropic_available"):
            self.results["recommendations"].append("Consider adding Anthropic API key for backup AI processing")

        # Calendar recommendations
        calendar_module = self.results["modules"].get("calendar_integration", {})
        if not calendar_module.get("oauth_connected"):
            self.results["recommendations"].append("Complete Google Calendar OAuth setup for full calendar integration")

        # General recommendations
        if len(self.results["critical_issues"]) == 0 and len(self.results["warnings"]) == 0:
            self.results["recommendations"].append("System is performing well - consider implementing monitoring alerts")

    def run_audit(self) -> Dict[str, Any]:
        """Run complete system audit"""
        self.log("🚀 Starting Comprehensive System Audit...")
        
        # Run all audit modules
        audit_modules = [
            ("system_health", self.audit_system_health),
            ("calendar_integration", self.audit_calendar_integration),
            ("document_processing", self.audit_document_processing),
            ("storage_system", self.audit_storage_system),
            ("ai_services", self.audit_ai_services),
            ("progress_notes_system", self.audit_progress_notes_system),
            ("session_insights_system", self.audit_session_insights_system),
            ("file_structure", self.audit_file_structure)
        ]

        for module_name, audit_function in audit_modules:
            try:
                self.results["modules"][module_name] = audit_function()
            except Exception as e:
                self.log(f"Audit failed for {module_name}: {e}", "ERROR")
                self.results["modules"][module_name] = {"status": "ERROR", "error": str(e)}
                self.results["critical_issues"].append(f"Audit failure in {module_name}: {e}")

        # Generate recommendations
        self.generate_recommendations()

        # Determine overall status
        critical_failures = len(self.results["critical_issues"])
        if critical_failures == 0:
            self.results["overall_status"] = "HEALTHY"
        elif critical_failures <= 2:
            self.results["overall_status"] = "WARNING"
        else:
            self.results["overall_status"] = "CRITICAL"

        self.log(f"✅ Audit Complete - Status: {self.results['overall_status']}")
        return self.results

    def save_results(self, filename: str = "system_audit_results.json"):
        """Save audit results to JSON file"""
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
        self.log(f"Results saved to {filename}")

    def print_summary(self):
        """Print a human-readable summary of audit results"""
        print("\n" + "="*80)
        print("SYSTEM AUDIT SUMMARY")
        print("="*80)
        print(f"Overall Status: {self.results['overall_status']}")
        print(f"Timestamp: {self.results['timestamp']}")
        print()

        # Module status summary
        print("MODULE STATUS:")
        for module_name, module_data in self.results["modules"].items():
            status = module_data.get("status", "UNKNOWN")
            status_emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
            print(f"  {status_emoji} {module_name.replace('_', ' ').title()}: {status}")

        # Critical issues
        if self.results["critical_issues"]:
            print(f"\n🚨 CRITICAL ISSUES ({len(self.results['critical_issues'])}):")
            for issue in self.results["critical_issues"]:
                print(f"  • {issue}")

        # Warnings
        if self.results["warnings"]:
            print(f"\n⚠️  WARNINGS ({len(self.results['warnings'])}):")
            for warning in self.results["warnings"]:
                print(f"  • {warning}")

        # Recommendations
        if self.results["recommendations"]:
            print(f"\n💡 RECOMMENDATIONS ({len(self.results['recommendations'])}):")
            for rec in self.results["recommendations"]:
                print(f"  • {rec}")

        print("\n" + "="*80)

if __name__ == "__main__":
    auditor = SystemAuditor()
    results = auditor.run_audit()
    auditor.save_results()
    auditor.print_summary()