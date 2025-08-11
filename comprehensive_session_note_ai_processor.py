#!/usr/bin/env python3
"""
Comprehensive Session Note AI Processor
Processes session notes that need AI summaries, tags, and appointment linking
"""

import requests
import json
import psycopg2
import os
import time
from datetime import datetime
import re
from typing import Dict, List, Any, Optional, Tuple

class SessionNoteAIProcessor:
    def __init__(self):
        self.base_url = "http://localhost:5000"
        self.therapist_id = "e66b8b8e-e7a2-40b9-ae74-00c93ffe503c"
        self.db_connection = None
        self.processed_count = 0
        self.error_count = 0
        
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
            return False

    def call_ai_service(self, content: str, client_name: str) -> Tuple[Optional[str], Optional[List[str]]]:
        """Call AI service to generate summary and tags for session note"""
        try:
            # Use the existing AI processing endpoint
            response = requests.post(f"{self.base_url}/api/ai-analysis/session-insights", 
                json={
                    "content": content,
                    "clientName": client_name,
                    "therapistId": self.therapist_id
                }, 
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                summary = data.get('summary', '')
                tags = data.get('tags', [])
                return summary, tags
            else:
                print(f"⚠️  AI service returned status {response.status_code}")
                return None, None
                
        except Exception as e:
            print(f"❌ AI service call failed: {e}")
            return None, None

    def extract_therapeutic_tags(self, content: str) -> List[str]:
        """Extract therapeutic tags from content using pattern matching as backup"""
        therapeutic_keywords = {
            # Therapeutic approaches
            'CBT': ['cognitive behavioral', 'cbt', 'cognitive restructuring', 'thought record'],
            'ACT': ['acceptance commitment', 'act', 'mindfulness', 'psychological flexibility'],
            'DBT': ['dialectical behavior', 'dbt', 'distress tolerance', 'emotion regulation'],
            'Narrative Therapy': ['narrative', 'externalize', 're-authoring', 'dominant story'],
            
            # Clinical issues
            'Anxiety': ['anxiety', 'anxious', 'worry', 'panic', 'fear'],
            'Depression': ['depression', 'depressed', 'mood', 'sadness', 'hopeless'],
            'Trauma': ['trauma', 'ptsd', 'flashback', 'triggered'],
            'Relationship Issues': ['relationship', 'partner', 'couple', 'conflict'],
            'Family Dynamics': ['family', 'parent', 'sibling', 'family system'],
            
            # Treatment elements
            'Coping Skills': ['coping', 'skills', 'strategies', 'techniques'],
            'Homework': ['homework', 'assignment', 'practice', 'between sessions'],
            'Follow-up': ['follow', 'next session', 'continue', 'progress'],
            'Progress': ['progress', 'improvement', 'better', 'growth']
        }
        
        tags = []
        content_lower = content.lower()
        
        for tag, keywords in therapeutic_keywords.items():
            if any(keyword in content_lower for keyword in keywords):
                tags.append(tag)
        
        # Add demographic tags
        if 'adolescent' in content_lower or 'teen' in content_lower:
            tags.append('Adolescent')
        else:
            tags.append('Adult')
            
        return tags[:10]  # Limit to 10 tags

    def generate_summary(self, content: str) -> str:
        """Generate a brief summary from content"""
        # Simple extractive summary - take first meaningful sentence
        sentences = content.split('.')
        for sentence in sentences:
            if len(sentence.strip()) > 50 and any(word in sentence.lower() for word in ['client', 'session', 'discussed', 'reported', 'presented']):
                return sentence.strip()[:200] + "..."
        
        # Fallback to first 150 characters
        return content[:150] + "..." if len(content) > 150 else content

    def find_matching_appointment(self, client_id: str, session_date: datetime) -> Optional[str]:
        """Find matching appointment for session note"""
        try:
            cursor = self.db_connection.cursor()
            
            # Look for appointments within 7 days of the session note
            cursor.execute("""
                SELECT id, start_time 
                FROM appointments 
                WHERE client_id = %s 
                AND start_time::date BETWEEN %s::date - INTERVAL '7 days' 
                AND %s::date + INTERVAL '7 days'
                ORDER BY ABS(EXTRACT(EPOCH FROM (start_time - %s)))
                LIMIT 1
            """, (client_id, session_date, session_date, session_date))
            
            result = cursor.fetchone()
            if result:
                appointment_id, appointment_time = result
                print(f"  📅 Found matching appointment: {appointment_id} at {appointment_time}")
                return str(appointment_id)
            else:
                print(f"  ⚠️  No matching appointment found for client {client_id}")
                return None
                
        except Exception as e:
            print(f"  ❌ Error finding appointment: {e}")
            return None

    def process_session_note(self, note_id: str, client_id: str, client_name: str, content: str, created_at: datetime, current_appointment_id: Optional[str]) -> bool:
        """Process a single session note with AI analysis and appointment linking"""
        try:
            print(f"\n🔄 Processing note {note_id} for {client_name}")
            
            # Generate AI summary and tags
            ai_summary, ai_tags = self.call_ai_service(content, client_name)
            
            # Fallback to pattern-based processing if AI fails
            if not ai_summary or not ai_tags:
                print("  🔄 Using fallback processing...")
                ai_summary = self.generate_summary(content)
                ai_tags = self.extract_therapeutic_tags(content)
            
            # Find appointment if not already linked
            appointment_id = current_appointment_id
            if not appointment_id:
                appointment_id = self.find_matching_appointment(client_id, created_at)
            
            # Update the session note
            cursor = self.db_connection.cursor()
            cursor.execute("""
                UPDATE session_notes 
                SET ai_summary = %s,
                    tags = %s,
                    appointment_id = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (ai_summary, json.dumps(ai_tags), appointment_id, note_id))
            
            self.db_connection.commit()
            self.processed_count += 1
            
            print(f"  ✅ Updated with summary ({len(ai_summary)} chars), {len(ai_tags)} tags" + 
                  (f", linked to appointment" if appointment_id else ""))
            return True
            
        except Exception as e:
            print(f"  ❌ Error processing note {note_id}: {e}")
            self.error_count += 1
            return False

    def get_notes_needing_processing(self) -> List[Dict]:
        """Get all session notes that need AI processing"""
        try:
            cursor = self.db_connection.cursor()
            cursor.execute("""
                SELECT 
                    sn.id,
                    sn.client_id,
                    c.first_name || ' ' || c.last_name as client_name,
                    sn.content,
                    sn.created_at,
                    sn.appointment_id,
                    CASE WHEN sn.ai_summary IS NULL THEN 'NEEDS_SUMMARY' ELSE 'HAS_SUMMARY' END as summary_status,
                    CASE WHEN sn.tags IS NULL THEN 'NEEDS_TAGS' ELSE 'HAS_TAGS' END as tags_status,
                    CASE WHEN sn.appointment_id IS NULL THEN 'NEEDS_APPOINTMENT' ELSE 'HAS_APPOINTMENT' END as appointment_status
                FROM session_notes sn
                LEFT JOIN clients c ON sn.client_id = c.id::text
                WHERE sn.ai_summary IS NULL OR sn.tags IS NULL OR sn.appointment_id IS NULL
                ORDER BY sn.created_at DESC
            """)
            
            results = cursor.fetchall()
            notes = []
            
            for row in results:
                notes.append({
                    'id': str(row[0]),
                    'client_id': row[1],
                    'client_name': row[2],
                    'content': row[3],
                    'created_at': row[4],
                    'appointment_id': str(row[5]) if row[5] else None,
                    'summary_status': row[6],
                    'tags_status': row[7],
                    'appointment_status': row[8]
                })
            
            return notes
            
        except Exception as e:
            print(f"❌ Error getting notes: {e}")
            return []

    def process_all_notes(self):
        """Process all session notes that need AI processing"""
        print("🚀 STARTING SESSION NOTE AI PROCESSING")
        print("=" * 60)
        
        if not self.connect_to_database():
            return False
        
        # Get notes that need processing
        notes = self.get_notes_needing_processing()
        total_notes = len(notes)
        
        if total_notes == 0:
            print("✅ All session notes are already processed!")
            return True
        
        print(f"📋 Found {total_notes} session notes that need processing")
        
        # Process each note
        for i, note in enumerate(notes, 1):
            print(f"\n[{i}/{total_notes}] Processing note for {note['client_name']}")
            print(f"  Status: {note['summary_status']}, {note['tags_status']}, {note['appointment_status']}")
            
            self.process_session_note(
                note['id'],
                note['client_id'],
                note['client_name'],
                note['content'],
                note['created_at'],
                note['appointment_id']
            )
            
            # Small delay to prevent overwhelming the AI service
            time.sleep(0.5)
        
        # Final summary
        print("\n" + "=" * 60)
        print("🏁 AI PROCESSING COMPLETE")
        print("=" * 60)
        print(f"✅ Successfully processed: {self.processed_count} notes")
        print(f"❌ Errors: {self.error_count} notes")
        success_rate = (self.processed_count / total_notes * 100) if total_notes > 0 else 0
        print(f"📊 Success rate: {success_rate:.1f}%")
        
        if self.db_connection:
            self.db_connection.close()
        
        return self.error_count == 0

if __name__ == "__main__":
    processor = SessionNoteAIProcessor()
    success = processor.process_all_notes()
    exit(0 if success else 1)