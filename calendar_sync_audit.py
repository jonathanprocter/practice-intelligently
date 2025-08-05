#!/usr/bin/env python3
"""
Calendar Sync Audit Script
Comprehensive analysis of calendar synchronization results to identify issues and ensure data integrity.
"""

import psycopg2
import json
import os
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import re
from typing import Dict, List, Tuple, Any

class CalendarSyncAuditor:
    def __init__(self):
        self.db_url = os.environ.get('DATABASE_URL')
        if not self.db_url:
            raise ValueError("DATABASE_URL environment variable not set")
        
        self.conn = psycopg2.connect(self.db_url)
        self.issues = []
        self.warnings = []
        self.stats = {}
        
    def run_audit(self):
        """Run comprehensive audit of calendar sync results"""
        print("🔍 Starting Calendar Sync Audit...")
        print("=" * 60)
        
        # Core data integrity checks
        self.check_appointment_basics()
        self.check_client_linkages()
        self.check_google_calendar_integration()
        self.check_duplicate_appointments()
        self.check_orphaned_records()
        
        # Data consistency checks
        self.check_appointment_timing()
        self.check_client_name_matching()
        self.analyze_sync_patterns()
        
        # Performance and health checks
        self.check_database_performance()
        self.analyze_calendar_coverage()
        
        # Generate report
        self.generate_report()
        self.suggest_fixes()
        
        return {
            'issues': self.issues,
            'warnings': self.warnings,
            'stats': self.stats
        }
    
    def check_appointment_basics(self):
        """Check basic appointment data integrity"""
        print("📋 Checking appointment basics...")
        
        cursor = self.conn.cursor()
        
        # Total appointments
        cursor.execute("SELECT COUNT(*) FROM appointments")
        total_appointments = cursor.fetchone()[0]
        self.stats['total_appointments'] = total_appointments
        print(f"   Total appointments: {total_appointments}")
        
        # Recent sync appointments (last 24 hours)
        cursor.execute("""
            SELECT COUNT(*) FROM appointments 
            WHERE created_at > NOW() - INTERVAL '24 hours'
        """)
        recent_appointments = cursor.fetchone()[0]
        self.stats['recent_appointments'] = recent_appointments
        print(f"   Recent appointments (24h): {recent_appointments}")
        
        # Appointments with missing data
        cursor.execute("""
            SELECT COUNT(*) FROM appointments 
            WHERE client_id IS NULL OR therapist_id IS NULL 
            OR start_time IS NULL OR end_time IS NULL
        """)
        missing_data = cursor.fetchone()[0]
        if missing_data > 0:
            self.issues.append(f"CRITICAL: {missing_data} appointments have missing core data")
        
        # Appointments with invalid time ranges
        cursor.execute("""
            SELECT COUNT(*) FROM appointments 
            WHERE start_time >= end_time
        """)
        invalid_times = cursor.fetchone()[0]
        if invalid_times > 0:
            self.issues.append(f"CRITICAL: {invalid_times} appointments have invalid time ranges")
        
        cursor.close()
    
    def check_client_linkages(self):
        """Check client-appointment linkages"""
        print("👥 Checking client linkages...")
        
        cursor = self.conn.cursor()
        
        # Clients with appointments
        cursor.execute("""
            SELECT COUNT(DISTINCT c.id) 
            FROM clients c 
            INNER JOIN appointments a ON c.id = a.client_id
        """)
        clients_with_appointments = cursor.fetchone()[0]
        self.stats['clients_with_appointments'] = clients_with_appointments
        
        # Total active clients
        cursor.execute("SELECT COUNT(*) FROM clients")
        total_clients = cursor.fetchone()[0]
        self.stats['total_clients'] = total_clients
        
        coverage_pct = (clients_with_appointments / total_clients * 100) if total_clients > 0 else 0
        self.stats['client_coverage_percent'] = coverage_pct
        print(f"   Clients with appointments: {clients_with_appointments}/{total_clients} ({coverage_pct:.1f}%)")
        
        # Top clients by appointment count
        cursor.execute("""
            SELECT c.first_name, c.last_name, COUNT(a.id) as appointment_count
            FROM clients c 
            INNER JOIN appointments a ON c.id = a.client_id 
            GROUP BY c.id, c.first_name, c.last_name 
            ORDER BY appointment_count DESC 
            LIMIT 10
        """)
        top_clients = cursor.fetchall()
        self.stats['top_clients'] = [
            {'name': f"{row[0]} {row[1]}", 'appointments': row[2]} 
            for row in top_clients
        ]
        
        # Clients without appointments (potential issues)
        cursor.execute("""
            SELECT c.first_name, c.last_name 
            FROM clients c 
            LEFT JOIN appointments a ON c.id = a.client_id 
            WHERE a.id IS NULL
            ORDER BY c.first_name, c.last_name
        """)
        clients_no_appointments = cursor.fetchall()
        if len(clients_no_appointments) > 10:
            self.warnings.append(f"{len(clients_no_appointments)} clients have no appointments")
        
        cursor.close()
    
    def check_google_calendar_integration(self):
        """Check Google Calendar integration integrity"""
        print("📅 Checking Google Calendar integration...")
        
        cursor = self.conn.cursor()
        
        # Appointments with Google event IDs
        cursor.execute("""
            SELECT COUNT(*) FROM appointments 
            WHERE google_event_id IS NOT NULL AND google_event_id != ''
        """)
        synced_appointments = cursor.fetchone()[0]
        self.stats['google_synced_appointments'] = synced_appointments
        
        # Appointments without Google sync
        cursor.execute("""
            SELECT COUNT(*) FROM appointments 
            WHERE google_event_id IS NULL OR google_event_id = ''
        """)
        unsynced_appointments = cursor.fetchone()[0]
        self.stats['unsynced_appointments'] = unsynced_appointments
        
        sync_rate = (synced_appointments / (synced_appointments + unsynced_appointments) * 100) if (synced_appointments + unsynced_appointments) > 0 else 0
        self.stats['google_sync_rate'] = sync_rate
        print(f"   Google Calendar sync rate: {sync_rate:.1f}% ({synced_appointments}/{synced_appointments + unsynced_appointments})")
        
        # Check for duplicate Google event IDs
        cursor.execute("""
            SELECT google_event_id, COUNT(*) as count
            FROM appointments 
            WHERE google_event_id IS NOT NULL AND google_event_id != ''
            GROUP BY google_event_id 
            HAVING COUNT(*) > 1
        """)
        duplicate_events = cursor.fetchall()
        if duplicate_events:
            self.issues.append(f"CRITICAL: {len(duplicate_events)} Google event IDs are duplicated")
            for event_id, count in duplicate_events[:5]:  # Show first 5
                self.issues.append(f"  Event ID {event_id} appears {count} times")
        
        # Check calendar ID distribution
        cursor.execute("""
            SELECT google_calendar_id, COUNT(*) as count
            FROM appointments 
            WHERE google_calendar_id IS NOT NULL 
            GROUP BY google_calendar_id 
            ORDER BY count DESC
        """)
        calendar_distribution = cursor.fetchall()
        self.stats['calendar_distribution'] = [
            {'calendar_id': row[0][:20] + '...', 'appointments': row[1]} 
            for row in calendar_distribution
        ]
        
        cursor.close()
    
    def check_duplicate_appointments(self):
        """Check for duplicate appointments"""
        print("🔄 Checking for duplicate appointments...")
        
        cursor = self.conn.cursor()
        
        # Potential duplicates by client, date, and time
        cursor.execute("""
            SELECT client_id, start_time, end_time, COUNT(*) as count
            FROM appointments 
            GROUP BY client_id, start_time, end_time 
            HAVING COUNT(*) > 1
        """)
        time_duplicates = cursor.fetchall()
        if time_duplicates:
            self.issues.append(f"WARNING: {len(time_duplicates)} potential duplicate appointments by time")
        
        # Same client with overlapping appointments
        cursor.execute("""
            SELECT a1.client_id, COUNT(*) as overlaps
            FROM appointments a1 
            INNER JOIN appointments a2 ON a1.client_id = a2.client_id 
            WHERE a1.id != a2.id 
            AND a1.start_time < a2.end_time 
            AND a1.end_time > a2.start_time
            GROUP BY a1.client_id
        """)
        overlapping = cursor.fetchall()
        if overlapping:
            self.warnings.append(f"{len(overlapping)} clients have overlapping appointments")
        
        cursor.close()
    
    def check_orphaned_records(self):
        """Check for orphaned records"""
        print("🔗 Checking for orphaned records...")
        
        cursor = self.conn.cursor()
        
        # Appointments referencing non-existent clients
        cursor.execute("""
            SELECT COUNT(*) FROM appointments a 
            LEFT JOIN clients c ON a.client_id = c.id 
            WHERE c.id IS NULL
        """)
        orphaned_appointments = cursor.fetchone()[0]
        if orphaned_appointments > 0:
            self.issues.append(f"CRITICAL: {orphaned_appointments} appointments reference non-existent clients")
        
        # Appointments referencing non-existent therapists
        cursor.execute("""
            SELECT COUNT(*) FROM appointments a 
            LEFT JOIN users u ON a.therapist_id = u.id 
            WHERE u.id IS NULL
        """)
        orphaned_therapist_refs = cursor.fetchone()[0]
        if orphaned_therapist_refs > 0:
            self.issues.append(f"CRITICAL: {orphaned_therapist_refs} appointments reference non-existent therapists")
        
        cursor.close()
    
    def check_appointment_timing(self):
        """Check appointment timing patterns"""
        print("⏰ Checking appointment timing...")
        
        cursor = self.conn.cursor()
        
        # Appointments in the future vs past
        cursor.execute("""
            SELECT 
                SUM(CASE WHEN start_time > NOW() THEN 1 ELSE 0 END) as future_appointments,
                SUM(CASE WHEN start_time <= NOW() THEN 1 ELSE 0 END) as past_appointments
            FROM appointments
        """)
        future, past = cursor.fetchone()
        self.stats['future_appointments'] = future
        self.stats['past_appointments'] = past
        print(f"   Future appointments: {future}, Past appointments: {past}")
        
        # Appointments by day of week
        cursor.execute("""
            SELECT EXTRACT(DOW FROM start_time) as day_of_week, COUNT(*) as count
            FROM appointments 
            GROUP BY EXTRACT(DOW FROM start_time) 
            ORDER BY day_of_week
        """)
        day_distribution = cursor.fetchall()
        days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        self.stats['day_distribution'] = [
            {'day': days[int(row[0])], 'appointments': row[1]} 
            for row in day_distribution
        ]
        
        # Unusual appointment durations
        cursor.execute("""
            SELECT 
                EXTRACT(EPOCH FROM (end_time - start_time))/60 as duration_minutes,
                COUNT(*) as count
            FROM appointments 
            GROUP BY EXTRACT(EPOCH FROM (end_time - start_time))/60 
            ORDER BY count DESC
        """)
        duration_distribution = cursor.fetchall()
        unusual_durations = [row for row in duration_distribution if row[0] not in [45, 50, 60]]
        if unusual_durations:
            self.warnings.append(f"Found {len(unusual_durations)} unusual appointment durations")
        
        cursor.close()
    
    def check_client_name_matching(self):
        """Check client name matching effectiveness"""
        print("🔤 Checking client name matching...")
        
        cursor = self.conn.cursor()
        
        # Check for potential name variations that might have been missed
        cursor.execute("""
            SELECT first_name, last_name, COUNT(a.id) as appointment_count
            FROM clients c 
            LEFT JOIN appointments a ON c.id = a.client_id 
            GROUP BY c.id, first_name, last_name 
            ORDER BY first_name, last_name
        """)
        client_data = cursor.fetchall()
        
        # Look for similar names that might indicate matching issues
        name_groups = defaultdict(list)
        for first, last, count in client_data:
            # Group by last name for similarity checking
            name_groups[last.lower()].append((first, last, count))
        
        potential_duplicates = []
        for last_name, clients in name_groups.items():
            if len(clients) > 1:
                # Check for similar first names
                first_names = [client[0].lower() for client in clients]
                for i, name1 in enumerate(first_names):
                    for j, name2 in enumerate(first_names[i+1:], i+1):
                        if self._names_similar(name1, name2):
                            potential_duplicates.append((clients[i], clients[j]))
        
        if potential_duplicates:
            self.warnings.append(f"Found {len(potential_duplicates)} potential duplicate client name patterns")
        
        cursor.close()
    
    def analyze_sync_patterns(self):
        """Analyze calendar sync patterns"""
        print("📊 Analyzing sync patterns...")
        
        cursor = self.conn.cursor()
        
        # Sync by date range
        cursor.execute("""
            SELECT 
                DATE(start_time) as appointment_date,
                COUNT(*) as appointments
            FROM appointments 
            WHERE created_at > NOW() - INTERVAL '24 hours'
            GROUP BY DATE(start_time) 
            ORDER BY appointment_date
        """)
        recent_sync_dates = cursor.fetchall()
        self.stats['recent_sync_by_date'] = [
            {'date': str(row[0]), 'appointments': row[1]} 
            for row in recent_sync_dates
        ]
        
        # Year distribution of synced appointments
        cursor.execute("""
            SELECT 
                EXTRACT(YEAR FROM start_time) as year,
                COUNT(*) as appointments
            FROM appointments 
            GROUP BY EXTRACT(YEAR FROM start_time) 
            ORDER BY year
        """)
        year_distribution = cursor.fetchall()
        self.stats['year_distribution'] = [
            {'year': int(row[0]), 'appointments': row[1]} 
            for row in year_distribution
        ]
        
        cursor.close()
    
    def check_database_performance(self):
        """Check database performance metrics"""
        print("⚡ Checking database performance...")
        
        cursor = self.conn.cursor()
        
        # Table sizes
        cursor.execute("""
            SELECT 
                schemaname,
                tablename,
                attname,
                n_distinct,
                correlation
            FROM pg_stats 
            WHERE tablename IN ('appointments', 'clients', 'users')
            AND attname IN ('id', 'client_id', 'therapist_id', 'google_event_id')
        """)
        stats_data = cursor.fetchall()
        
        # Check for missing indexes on foreign keys
        cursor.execute("""
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'appointments'
        """)
        indexes = cursor.fetchall()
        
        index_columns = []
        for idx_name, idx_def in indexes:
            if 'client_id' in idx_def:
                index_columns.append('client_id')
            if 'google_event_id' in idx_def:
                index_columns.append('google_event_id')
        
        if 'client_id' not in index_columns:
            self.issues.append("PERFORMANCE: Missing index on appointments.client_id")
        if 'google_event_id' not in index_columns:
            self.warnings.append("PERFORMANCE: Consider index on appointments.google_event_id")
        
        cursor.close()
    
    def analyze_calendar_coverage(self):
        """Analyze calendar coverage and gaps"""
        print("🗓️ Analyzing calendar coverage...")
        
        cursor = self.conn.cursor()
        
        # Date range of appointments
        cursor.execute("""
            SELECT 
                MIN(start_time) as earliest_appointment,
                MAX(start_time) as latest_appointment,
                COUNT(*) as total_appointments
            FROM appointments
        """)
        earliest, latest, total = cursor.fetchone()
        self.stats['date_range'] = {
            'earliest': str(earliest) if earliest else None,
            'latest': str(latest) if latest else None,
            'total': total
        }
        
        # Monthly appointment distribution
        cursor.execute("""
            SELECT 
                DATE_TRUNC('month', start_time) as month,
                COUNT(*) as appointments
            FROM appointments 
            GROUP BY DATE_TRUNC('month', start_time)
            ORDER BY month
        """)
        monthly_data = cursor.fetchall()
        self.stats['monthly_distribution'] = [
            {'month': str(row[0])[:7], 'appointments': row[1]} 
            for row in monthly_data
        ]
        
        cursor.close()
    
    def _names_similar(self, name1: str, name2: str) -> bool:
        """Check if two names are similar (potential duplicates)"""
        # Simple similarity check for common name variations
        if abs(len(name1) - len(name2)) > 3:
            return False
        
        # Check for common abbreviations
        abbreviations = {
            'chris': 'christopher',
            'mike': 'michael',
            'dave': 'david',
            'bob': 'robert',
            'bill': 'william',
            'jim': 'james',
            'joe': 'joseph',
            'rich': 'richard',
            'richie': 'richard'
        }
        
        name1_full = abbreviations.get(name1, name1)
        name2_full = abbreviations.get(name2, name2)
        
        return name1_full == name2_full or name1 == name2_full or name2 == name1_full
    
    def generate_report(self):
        """Generate comprehensive audit report"""
        print("\n" + "=" * 60)
        print("📋 CALENDAR SYNC AUDIT REPORT")
        print("=" * 60)
        
        print(f"\n📊 STATISTICS:")
        print(f"   Total Appointments: {self.stats.get('total_appointments', 0)}")
        print(f"   Recent Appointments (24h): {self.stats.get('recent_appointments', 0)}")
        print(f"   Clients with Appointments: {self.stats.get('clients_with_appointments', 0)}/{self.stats.get('total_clients', 0)}")
        print(f"   Google Calendar Sync Rate: {self.stats.get('google_sync_rate', 0):.1f}%")
        
        print(f"\n🔝 TOP CLIENTS BY APPOINTMENTS:")
        for client in self.stats.get('top_clients', [])[:5]:
            print(f"   {client['name']}: {client['appointments']} appointments")
        
        if self.issues:
            print(f"\n❌ CRITICAL ISSUES ({len(self.issues)}):")
            for i, issue in enumerate(self.issues, 1):
                print(f"   {i}. {issue}")
        
        if self.warnings:
            print(f"\n⚠️  WARNINGS ({len(self.warnings)}):")
            for i, warning in enumerate(self.warnings, 1):
                print(f"   {i}. {warning}")
        
        if not self.issues and not self.warnings:
            print(f"\n✅ NO ISSUES FOUND - System appears healthy!")
    
    def suggest_fixes(self):
        """Suggest fixes for identified issues"""
        if not self.issues and not self.warnings:
            return
        
        print(f"\n🔧 SUGGESTED FIXES:")
        print("=" * 60)
        
        fix_priority = []
        
        # Critical issues first
        for issue in self.issues:
            if "CRITICAL" in issue:
                if "duplicate" in issue.lower():
                    fix_priority.append({
                        'priority': 1,
                        'issue': issue,
                        'fix': 'Run deduplication script to remove duplicate Google event IDs'
                    })
                elif "missing core data" in issue.lower():
                    fix_priority.append({
                        'priority': 1,
                        'issue': issue,
                        'fix': 'Identify and fix appointments with NULL required fields'
                    })
                elif "orphaned" in issue.lower():
                    fix_priority.append({
                        'priority': 1,
                        'issue': issue,
                        'fix': 'Clean up orphaned appointments or restore missing client/therapist records'
                    })
        
        # Performance issues
        for issue in self.issues + self.warnings:
            if "PERFORMANCE" in issue:
                fix_priority.append({
                    'priority': 2,
                    'issue': issue,
                    'fix': 'Add database indexes to improve query performance'
                })
        
        # Sort by priority and display
        fix_priority.sort(key=lambda x: x['priority'])
        
        for i, fix_item in enumerate(fix_priority, 1):
            priority_label = "HIGH" if fix_item['priority'] == 1 else "MEDIUM"
            print(f"\n{i}. [{priority_label}] {fix_item['issue']}")
            print(f"   FIX: {fix_item['fix']}")
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()

def main():
    """Main execution function"""
    try:
        auditor = CalendarSyncAuditor()
        results = auditor.run_audit()
        
        # Save results to file
        with open('calendar_sync_audit_results.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\n💾 Full audit results saved to: calendar_sync_audit_results.json")
        
        auditor.close()
        
        # Return exit code based on issues found
        if results['issues']:
            print(f"\n❌ Audit completed with {len(results['issues'])} critical issues")
            return 1
        elif results['warnings']:
            print(f"\n⚠️  Audit completed with {len(results['warnings'])} warnings")
            return 0
        else:
            print(f"\n✅ Audit completed successfully - no issues found")
            return 0
            
    except Exception as e:
        print(f"\n💥 Audit failed with error: {str(e)}")
        return 2

if __name__ == "__main__":
    exit(main())