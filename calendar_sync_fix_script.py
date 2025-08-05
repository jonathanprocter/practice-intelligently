#!/usr/bin/env python3
"""
Calendar Sync Fix Script
Addresses critical issues identified in the audit and implements fixes.
"""

import psycopg2
import os
from datetime import datetime

class CalendarSyncFixer:
    def __init__(self):
        self.db_url = os.environ.get('DATABASE_URL')
        if not self.db_url:
            raise ValueError("DATABASE_URL environment variable not set")
        
        self.conn = psycopg2.connect(self.db_url)
        self.fixes_applied = []
        
    def run_all_fixes(self):
        """Run all critical fixes"""
        print("🔧 Starting Calendar Sync Fixes...")
        print("=" * 50)
        
        # Fix 1: Remove duplicate appointments (CRITICAL)
        self.fix_duplicate_appointments()
        
        # Fix 2: Add missing database indexes (PERFORMANCE) 
        self.add_performance_indexes()
        
        # Fix 3: Analyze overlapping appointments (WARNING)
        self.analyze_overlapping_appointments()
        
        # Generate fix report
        self.generate_fix_report()
        
        return self.fixes_applied
    
    def fix_duplicate_appointments(self):
        """Remove duplicate appointments by time (CRITICAL FIX)"""
        print("🚨 CRITICAL: Fixing duplicate appointments...")
        
        cursor = self.conn.cursor()
        
        # Find potential duplicates by client, date, and time
        cursor.execute("""
            SELECT client_id, start_time, end_time, array_agg(id::text ORDER BY created_at) as appointment_ids
            FROM appointments 
            GROUP BY client_id, start_time, end_time 
            HAVING COUNT(*) > 1
        """)
        duplicates = cursor.fetchall()
        
        if not duplicates:
            print("   ✅ No duplicate appointments found")
            self.fixes_applied.append("No duplicate appointments found")
            cursor.close()
            return
        
        print(f"   Found {len(duplicates)} sets of duplicate appointments")
        
        total_removed = 0
        for client_id, start_time, end_time, appointment_ids in duplicates:
            # Keep the first appointment (earliest created_at), remove the rest
            appointments_to_remove = appointment_ids[1:]  # Skip first one
            
            if len(appointments_to_remove) > 0:
                print(f"   Removing {len(appointments_to_remove)} duplicate(s) for client {client_id} at {start_time}")
                
                # Delete the duplicate appointments
                for appointment_id in appointments_to_remove:
                    cursor.execute("DELETE FROM appointments WHERE id = %s::uuid", (appointment_id,))
                    total_removed += 1
        
        self.conn.commit()
        print(f"   ✅ Removed {total_removed} duplicate appointments")
        self.fixes_applied.append(f"Removed {total_removed} duplicate appointments")
        cursor.close()
    
    def add_performance_indexes(self):
        """Add missing database indexes for performance"""
        print("⚡ Adding performance indexes...")
        
        cursor = self.conn.cursor()
        
        # Check existing indexes
        cursor.execute("""
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'appointments'
        """)
        existing_indexes = cursor.fetchall()
        
        existing_columns = set()
        for idx_name, idx_def in existing_indexes:
            if 'client_id' in idx_def:
                existing_columns.add('client_id')
            if 'google_event_id' in idx_def:
                existing_columns.add('google_event_id')
            if 'start_time' in idx_def:
                existing_columns.add('start_time')
            if 'therapist_id' in idx_def:
                existing_columns.add('therapist_id')
        
        indexes_to_create = []
        
        # Critical indexes for performance
        if 'client_id' not in existing_columns:
            indexes_to_create.append(("idx_appointments_client_id", "client_id"))
        
        if 'google_event_id' not in existing_columns:
            indexes_to_create.append(("idx_appointments_google_event_id", "google_event_id"))
        
        if 'start_time' not in existing_columns:
            indexes_to_create.append(("idx_appointments_start_time", "start_time"))
        
        if 'therapist_id' not in existing_columns:
            indexes_to_create.append(("idx_appointments_therapist_id", "therapist_id"))
        
        # Create missing indexes
        for index_name, column in indexes_to_create:
            try:
                cursor.execute(f"CREATE INDEX CONCURRENTLY {index_name} ON appointments ({column})")
                print(f"   ✅ Created index: {index_name}")
                self.fixes_applied.append(f"Created index: {index_name}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"   ℹ️  Index {index_name} already exists")
                else:
                    print(f"   ❌ Failed to create index {index_name}: {e}")
        
        if not indexes_to_create:
            print("   ✅ All performance indexes already exist")
            self.fixes_applied.append("All performance indexes already exist")
        
        self.conn.commit()
        cursor.close()
    
    def analyze_overlapping_appointments(self):
        """Analyze overlapping appointments and provide fix recommendations"""
        print("📊 Analyzing overlapping appointments...")
        
        cursor = self.conn.cursor()
        
        # Find overlapping appointments for same client
        cursor.execute("""
            SELECT 
                c.first_name, c.last_name,
                a1.start_time as appt1_start, a1.end_time as appt1_end,
                a2.start_time as appt2_start, a2.end_time as appt2_end,
                a1.id as appt1_id, a2.id as appt2_id
            FROM appointments a1 
            INNER JOIN appointments a2 ON a1.client_id = a2.client_id 
            INNER JOIN clients c ON a1.client_id = c.id
            WHERE a1.id < a2.id  -- Avoid duplicates
            AND a1.start_time < a2.end_time 
            AND a1.end_time > a2.start_time
            ORDER BY c.first_name, c.last_name, a1.start_time
            LIMIT 10  -- Show first 10 cases
        """)
        overlaps = cursor.fetchall()
        
        if overlaps:
            print(f"   Found {len(overlaps)} overlapping appointment pairs (showing first 10):")
            for overlap in overlaps:
                first_name, last_name, start1, end1, start2, end2, id1, id2 = overlap
                print(f"   - {first_name} {last_name}: {start1}-{end1} overlaps {start2}-{end2}")
            
            print("   💡 Recommendation: Review these overlapping appointments manually")
            print("      They may represent legitimate back-to-back sessions or data entry errors")
            self.fixes_applied.append(f"Identified {len(overlaps)} overlapping appointment pairs for manual review")
        else:
            print("   ✅ No overlapping appointments found")
            self.fixes_applied.append("No overlapping appointments found")
        
        cursor.close()
    
    def generate_fix_report(self):
        """Generate comprehensive fix report"""
        print("\n" + "=" * 50)
        print("🔧 CALENDAR SYNC FIX REPORT")
        print("=" * 50)
        
        print(f"\n✅ FIXES APPLIED ({len(self.fixes_applied)}):")
        for i, fix in enumerate(self.fixes_applied, 1):
            print(f"   {i}. {fix}")
        
        # Verify current state
        cursor = self.conn.cursor()
        
        # Check for remaining duplicates
        cursor.execute("""
            SELECT COUNT(*) FROM (
                SELECT client_id, start_time, end_time, COUNT(*) 
                FROM appointments 
                GROUP BY client_id, start_time, end_time 
                HAVING COUNT(*) > 1
            ) as duplicates
        """)
        remaining_duplicates = cursor.fetchone()[0]
        
        # Check total appointments
        cursor.execute("SELECT COUNT(*) FROM appointments")
        total_appointments = cursor.fetchone()[0]
        
        # Check Google sync rate
        cursor.execute("""
            SELECT 
                SUM(CASE WHEN google_event_id IS NOT NULL AND google_event_id != '' THEN 1 ELSE 0 END) as synced,
                COUNT(*) as total
            FROM appointments
        """)
        synced, total = cursor.fetchone()
        sync_rate = (synced / total * 100) if total > 0 else 0
        
        print(f"\n📊 CURRENT SYSTEM STATE:")
        print(f"   Total Appointments: {total_appointments}")
        print(f"   Remaining Duplicates: {remaining_duplicates}")
        print(f"   Google Calendar Sync Rate: {sync_rate:.1f}%")
        
        if remaining_duplicates == 0:
            print(f"\n✅ SUCCESS: All duplicate appointment issues resolved!")
        else:
            print(f"\n⚠️  WARNING: {remaining_duplicates} duplicate appointment sets still exist")
        
        cursor.close()
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()

def main():
    """Main execution function"""
    try:
        fixer = CalendarSyncFixer()
        fixes = fixer.run_all_fixes()
        fixer.close()
        
        print(f"\n💾 Fix script completed successfully")
        print(f"Applied {len(fixes)} fixes")
        
        return 0
            
    except Exception as e:
        print(f"\n💥 Fix script failed with error: {str(e)}")
        return 1

if __name__ == "__main__":
    exit(main())