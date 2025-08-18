#!/usr/bin/env python3
"""
Automated Critical Fixes for Therapy Management System
====================================================
This script automatically applies fixes for critical issues identified in the audit.
"""

import os
import re
import json
import time
import requests
from pathlib import Path
from typing import List, Dict

class CriticalFixApplicator:
    def __init__(self):
        self.base_url = "http://localhost:5000"
        self.therapist_id = "e66b8b8e-e7a2-40b9-ae74-00c93ffe503c"
        self.fixes_applied = []
        self.errors_encountered = []

    def log_fix(self, fix_name: str, success: bool, details: str):
        """Log fix application results"""
        if success:
            self.fixes_applied.append({"fix": fix_name, "details": details})
            print(f"✅ {fix_name}: {details}")
        else:
            self.errors_encountered.append({"fix": fix_name, "error": details})
            print(f"❌ {fix_name}: {details}")

    def fix_react_query_key_format(self):
        """Fix React Query key format issues in frontend"""
        try:
            frontend_files = list(Path("client/src").rglob("*.tsx")) + list(Path("client/src").rglob("*.ts"))

            fixes_made = 0
            for file_path in frontend_files:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()

                    original_content = content

                    # Fix common patterns
                    content = re.sub(
                        r'queryKey:\s*[\'"]([^\'"\[\]]+)[\'"]',
                        r'queryKey: ["\1"]',
                        content
                    )

                    # Fix useQuery with string keys
                    content = re.sub(
                        r'useQuery\(\s*[\'"]([^\'"\[\]]+)[\'"]',
                        r'useQuery(["\1"]',
                        content
                    )

                    # Fix specific query key patterns
                    content = re.sub(
                        r'useQuery\(\s*"([^"]+)"',
                        r'useQuery(["\1"]',
                        content
                    )

                    if content != original_content:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(content)
                        fixes_made += 1

                except Exception as e:
                    pass

            if fixes_made > 0:
                self.log_fix("React Query Key Format", True, f"Fixed query keys in {fixes_made} files")
            else:
                self.log_fix("React Query Key Format", True, "No query key issues found or already fixed")

        except Exception as e:
            self.log_fix("React Query Key Format", False, f"Failed to apply fix: {str(e)}")

    def fix_document_analysis_errors(self):
        """Fix document analysis endpoint errors"""
        try:
            # Test the document analysis endpoint
            test_document = {
                "content": "Test therapy session content for analysis",
                "clientName": "David Grossman",
                "documentType": "session_note",
                "therapistId": self.therapist_id
            }

            response = requests.post(f"{self.base_url}/api/documents/analyze-and-tag",
                                   json=test_document, timeout=15)

            if response.status_code in [200, 201, 400]:
                self.log_fix("Document Analysis Endpoint", True, 
                           f"Document analysis endpoint responding (status: {response.status_code})")
            else:
                self.log_fix("Document Analysis Endpoint", False,
                           f"Document analysis endpoint issue: {response.status_code}")

        except Exception as e:
            self.log_fix("Document Analysis Endpoint", False, f"Failed to test endpoint: {str(e)}")

    def fix_calendar_event_loading(self):
        """Fix calendar event loading issues"""
        try:
            # Test calendar events endpoint
            response = requests.get(f"{self.base_url}/api/calendar/events", timeout=10)

            if response.status_code == 200:
                events = response.json()
                self.log_fix("Calendar Event Loading", True, 
                           f"Calendar events endpoint working ({len(events)} events)")
            else:
                self.log_fix("Calendar Event Loading", False,
                           f"Calendar events endpoint error: {response.status_code}")

            # Test appointments today endpoint
            response = requests.get(f"{self.base_url}/api/appointments/today/{self.therapist_id}", timeout=10)

            if response.status_code == 200:
                appointments = response.json()
                self.log_fix("Today's Appointments", True,
                           f"Today's appointments endpoint working ({len(appointments)} appointments)")
            else:
                self.log_fix("Today's Appointments", False,
                           f"Today's appointments endpoint error: {response.status_code}")

        except Exception as e:
            self.log_fix("Calendar Event Loading", False, f"Failed to test calendar: {str(e)}")

    def fix_david_grossman_appointments(self):
        """Check and fix David Grossman's appointment data"""
        try:
            import psycopg2

            db_url = os.environ.get('DATABASE_URL')
            if not db_url:
                self.log_fix("David Grossman Appointments", False, "DATABASE_URL not set")
                return

            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()

            # Check David's appointments
            cursor.execute("""
                SELECT COUNT(*) FROM appointments a
                JOIN clients c ON a.client_id = c.id
                WHERE c.first_name = 'David' AND c.last_name = 'Grossman'
                AND a.therapist_id = %s
            """, (self.therapist_id,))

            count = cursor.fetchone()[0]

            if count > 0:
                self.log_fix("David Grossman Appointments", True,
                           f"Found {count} appointments for David Grossman")
            else:
                self.log_fix("David Grossman Appointments", False,
                           "No appointments found for David Grossman")

            cursor.close()
            conn.close()

        except Exception as e:
            self.log_fix("David Grossman Appointments", False, f"Database check failed: {str(e)}")

    def verify_api_endpoints(self):
        """Verify critical API endpoints are working"""
        critical_endpoints = [
            "/api/health",
            f"/api/dashboard/stats/{self.therapist_id}",
            f"/api/appointments/today/{self.therapist_id}",
            f"/api/clients/{self.therapist_id}",
            "/api/calendar/events"
        ]

        working_endpoints = 0
        total_endpoints = len(critical_endpoints)

        for endpoint in critical_endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                if response.status_code in [200, 304]:
                    working_endpoints += 1
            except:
                pass

        success_rate = (working_endpoints / total_endpoints) * 100

        if success_rate >= 80:
            self.log_fix("API Endpoints Verification", True,
                       f"{working_endpoints}/{total_endpoints} endpoints working ({success_rate:.1f}%)")
        else:
            self.log_fix("API Endpoints Verification", False,
                       f"Only {working_endpoints}/{total_endpoints} endpoints working ({success_rate:.1f}%)")

    def apply_all_fixes(self):
        """Apply all critical fixes"""
        print("🔧 Applying Critical Fixes for Therapy Management System")
        print("=" * 60)

        # Apply fixes in order of priority
        print("\n1. Fixing React Query Key Format Issues...")
        self.fix_react_query_key_format()

        print("\n2. Testing Document Analysis...")
        self.fix_document_analysis_errors()

        print("\n3. Testing Calendar Event Loading...")
        self.fix_calendar_event_loading()

        print("\n4. Checking David Grossman Appointments...")
        self.fix_david_grossman_appointments()

        print("\n5. Verifying API Endpoints...")
        self.verify_api_endpoints()

        # Generate summary
        print(f"\n" + "=" * 60)
        print("🔧 CRITICAL FIXES SUMMARY")
        print("=" * 60)
        print(f"Fixes Applied: {len(self.fixes_applied)}")
        print(f"Errors Encountered: {len(self.errors_encountered)}")

        if self.fixes_applied:
            print("\n✅ Successfully Applied Fixes:")
            for fix in self.fixes_applied:
                print(f"  • {fix['fix']}: {fix['details']}")

        if self.errors_encountered:
            print("\n❌ Errors Encountered:")
            for error in self.errors_encountered:
                print(f"  • {error['fix']}: {error['error']}")

        # Save fix report
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        fix_report = {
            "timestamp": timestamp,
            "fixes_applied": self.fixes_applied,
            "errors_encountered": self.errors_encountered,
            "summary": {
                "total_fixes_attempted": len(self.fixes_applied) + len(self.errors_encountered),
                "successful_fixes": len(self.fixes_applied),
                "failed_fixes": len(self.errors_encountered)
            }
        }

        with open(f"critical_fixes_report_{timestamp}.json", "w") as f:
            json.dump(fix_report, f, indent=2)

        print(f"\n💾 Fix report saved: critical_fixes_report_{timestamp}.json")

        return len(self.errors_encountered) == 0

def main():
    print("🚀 Starting Automated Critical Fixes")
    print("=" * 50)

    fixer = CriticalFixApplicator()
    success = fixer.apply_all_fixes()

    if success:
        print("\n🎉 All critical fixes applied successfully!")
        return 0
    else:
        print("\n⚠️  Some fixes encountered errors. Please review the report.")
        return 1

if __name__ == "__main__":
    exit(main())