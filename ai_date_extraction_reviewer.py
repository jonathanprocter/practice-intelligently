
#!/usr/bin/env python3
"""
AI Date Extraction Reviewer
Reviews all existing progress notes and session notes to extract correct service dates using AI
"""

import psycopg2
import openai
import json
import os
import re
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple

class AIDateExtractionReviewer:
    def __init__(self):
        # Database connection
        self.db_connection = None
        
        # OpenAI client
        openai.api_key = os.environ.get('OPENAI_API_KEY')
        if not openai.api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        # Statistics tracking
        self.processed_count = 0
        self.corrected_count = 0
        self.error_count = 0
        self.review_results = []

    def connect_to_database(self) -> bool:
        """Establish database connection"""
        try:
            database_url = os.environ.get('DATABASE_URL')
            if not database_url:
                print("❌ DATABASE_URL environment variable not found")
                return False
            
            self.db_connection = psycopg2.connect(database_url)
            print("✅ Connected to database")
            return True
        except Exception as error:
            print(f"❌ Database connection failed: {error}")
            return False

    def extract_service_date_with_ai(self, content: str, title: str = "", current_date: str = "") -> Optional[str]:
        """Use AI to extract the actual service date from note content"""
        try:
            prompt = f"""
You are an expert at extracting service dates from clinical therapy notes. 

Analyze this clinical note content and extract the ACTUAL SESSION/SERVICE DATE, not the creation date or upload date.

Look for:
- Explicit date mentions like "Session Date: 2025-01-15" or "Date: January 15, 2025"
- Contextual clues like "Today's session..." with dates in headers
- References to "this week", "last Tuesday", etc. that can help determine the session date
- Date stamps within the clinical content itself

Current stored date: {current_date}
Note title: {title}

Clinical note content:
{content[:3000]}

Respond with ONLY a JSON object in this exact format:
{{
    "extracted_date": "YYYY-MM-DD or null if no clear service date found",
    "confidence": "high/medium/low",
    "reasoning": "Brief explanation of how the date was determined",
    "date_indicators": ["list of text snippets that indicated the date"]
}}

Be conservative - only return a date if you're confident it represents the actual service/session date.
"""

            response = openai.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a clinical date extraction expert. Always respond with valid JSON only."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,
                max_tokens=500
            )

            response_text = response.choices[0].message.content.strip()
            
            # Clean potential markdown formatting
            if response_text.startswith('```json'):
                response_text = response_text.replace('```json', '').replace('```', '').strip()
            
            result = json.loads(response_text)
            
            return result

        except Exception as error:
            print(f"  ❌ AI date extraction failed: {error}")
            return None

    def validate_date(self, date_str: str) -> bool:
        """Validate if a date string is reasonable for a therapy session"""
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            
            # Check if date is reasonable (not too far in past/future)
            now = datetime.now()
            two_years_ago = now - timedelta(days=730)
            one_month_future = now + timedelta(days=30)
            
            if two_years_ago <= date_obj <= one_month_future:
                return True
            else:
                print(f"  ⚠️ Date {date_str} is outside reasonable range")
                return False
                
        except ValueError:
            print(f"  ❌ Invalid date format: {date_str}")
            return False

    def get_progress_notes_for_review(self) -> List[Dict]:
        """Get all progress notes that need date review"""
        try:
            cursor = self.db_connection.cursor()
            cursor.execute("""
                SELECT pn.id, pn.title, pn.subjective, pn.objective, pn.assessment, pn.plan,
                       pn.session_date, pn.created_at, pn.updated_at, pn.client_id,
                       c.first_name, c.last_name
                FROM progress_notes pn
                JOIN clients c ON pn.client_id = c.id
                ORDER BY pn.created_at DESC
            """)
            
            notes = []
            for row in cursor.fetchall():
                notes.append({
                    'id': row[0],
                    'title': row[1] or '',
                    'subjective': row[2] or '',
                    'objective': row[3] or '',
                    'assessment': row[4] or '',
                    'plan': row[5] or '',
                    'session_date': row[6].strftime('%Y-%m-%d') if row[6] else None,
                    'created_at': row[7].strftime('%Y-%m-%d') if row[7] else None,
                    'updated_at': row[8].strftime('%Y-%m-%d') if row[8] else None,
                    'client_id': row[9],
                    'client_name': f"{row[10]} {row[11]}"
                })
            
            return notes
            
        except Exception as error:
            print(f"❌ Error fetching progress notes: {error}")
            return []

    def get_session_notes_for_review(self) -> List[Dict]:
        """Get all session notes that need date review"""
        try:
            cursor = self.db_connection.cursor()
            cursor.execute("""
                SELECT sn.id, sn.content, sn.session_date, sn.created_at, sn.updated_at,
                       sn.client_id, c.first_name, c.last_name, sn.type
                FROM session_notes sn
                JOIN clients c ON sn.client_id = c.id
                ORDER BY sn.created_at DESC
            """)
            
            notes = []
            for row in cursor.fetchall():
                notes.append({
                    'id': row[0],
                    'content': row[1] or '',
                    'session_date': row[2].strftime('%Y-%m-%d') if row[2] else None,
                    'created_at': row[3].strftime('%Y-%m-%d') if row[3] else None,
                    'updated_at': row[4].strftime('%Y-%m-%d') if row[4] else None,
                    'client_id': row[5],
                    'client_name': f"{row[6]} {row[7]}",
                    'type': row[8] or 'session_note'
                })
            
            return notes
            
        except Exception as error:
            print(f"❌ Error fetching session notes: {error}")
            return []

    def review_progress_note_date(self, note: Dict) -> Dict:
        """Review and potentially correct a progress note's service date"""
        print(f"\n🔍 Reviewing Progress Note: {note['client_name']} - {note['title'][:50]}...")
        
        # Combine all content for AI analysis
        full_content = f"""
Title: {note['title']}
Subjective: {note['subjective']}
Objective: {note['objective']}
Assessment: {note['assessment']}
Plan: {note['plan']}
        """.strip()
        
        current_date = note['session_date'] or note['created_at']
        
        ai_result = self.extract_service_date_with_ai(
            full_content, 
            note['title'], 
            current_date
        )
        
        result = {
            'note_id': note['id'],
            'note_type': 'progress_note',
            'client_name': note['client_name'],
            'title': note['title'][:100],
            'current_date': current_date,
            'ai_extracted_date': None,
            'date_changed': False,
            'confidence': 'none',
            'reasoning': 'AI extraction failed',
            'action_taken': 'none'
        }
        
        if ai_result and ai_result.get('extracted_date'):
            extracted_date = ai_result['extracted_date']
            confidence = ai_result.get('confidence', 'low')
            reasoning = ai_result.get('reasoning', 'No reasoning provided')
            
            result['ai_extracted_date'] = extracted_date
            result['confidence'] = confidence
            result['reasoning'] = reasoning
            
            # Only update if we have high confidence and the date is different
            if (confidence == 'high' and 
                extracted_date != current_date and 
                self.validate_date(extracted_date)):
                
                try:
                    cursor = self.db_connection.cursor()
                    cursor.execute("""
                        UPDATE progress_notes 
                        SET session_date = %s, updated_at = NOW()
                        WHERE id = %s
                    """, (extracted_date, note['id']))
                    
                    self.db_connection.commit()
                    result['date_changed'] = True
                    result['action_taken'] = 'date_updated'
                    self.corrected_count += 1
                    
                    print(f"  ✅ Updated date: {current_date} → {extracted_date}")
                    
                except Exception as error:
                    print(f"  ❌ Database update failed: {error}")
                    result['action_taken'] = 'update_failed'
                    self.error_count += 1
            else:
                if confidence != 'high':
                    print(f"  ⚠️ Low confidence ({confidence}), no update made")
                elif extracted_date == current_date:
                    print(f"  ✅ Date confirmed correct: {current_date}")
                else:
                    print(f"  ⚠️ Invalid date or other issue, no update made")
                
                result['action_taken'] = 'no_change_needed'
        
        self.processed_count += 1
        return result

    def review_session_note_date(self, note: Dict) -> Dict:
        """Review and potentially correct a session note's service date"""
        print(f"\n🔍 Reviewing Session Note: {note['client_name']} - {note['type']}")
        
        current_date = note['session_date'] or note['created_at']
        
        ai_result = self.extract_service_date_with_ai(
            note['content'], 
            f"{note['type']} for {note['client_name']}", 
            current_date
        )
        
        result = {
            'note_id': note['id'],
            'note_type': 'session_note',
            'client_name': note['client_name'],
            'title': f"{note['type']} - {note['client_name']}",
            'current_date': current_date,
            'ai_extracted_date': None,
            'date_changed': False,
            'confidence': 'none',
            'reasoning': 'AI extraction failed',
            'action_taken': 'none'
        }
        
        if ai_result and ai_result.get('extracted_date'):
            extracted_date = ai_result['extracted_date']
            confidence = ai_result.get('confidence', 'low')
            reasoning = ai_result.get('reasoning', 'No reasoning provided')
            
            result['ai_extracted_date'] = extracted_date
            result['confidence'] = confidence
            result['reasoning'] = reasoning
            
            # Only update if we have high confidence and the date is different
            if (confidence == 'high' and 
                extracted_date != current_date and 
                self.validate_date(extracted_date)):
                
                try:
                    cursor = self.db_connection.cursor()
                    cursor.execute("""
                        UPDATE session_notes 
                        SET session_date = %s, updated_at = NOW()
                        WHERE id = %s
                    """, (extracted_date, note['id']))
                    
                    self.db_connection.commit()
                    result['date_changed'] = True
                    result['action_taken'] = 'date_updated'
                    self.corrected_count += 1
                    
                    print(f"  ✅ Updated date: {current_date} → {extracted_date}")
                    
                except Exception as error:
                    print(f"  ❌ Database update failed: {error}")
                    result['action_taken'] = 'update_failed'
                    self.error_count += 1
            else:
                result['action_taken'] = 'no_change_needed'
                if confidence != 'high':
                    print(f"  ⚠️ Low confidence ({confidence}), no update made")
                elif extracted_date == current_date:
                    print(f"  ✅ Date confirmed correct: {current_date}")
        
        self.processed_count += 1
        return result

    def generate_review_report(self) -> str:
        """Generate a comprehensive review report"""
        corrected_notes = [r for r in self.review_results if r['date_changed']]
        confirmed_notes = [r for r in self.review_results if r['action_taken'] == 'no_change_needed' and r['confidence'] == 'high']
        
        report = f"""
🔍 AI DATE EXTRACTION REVIEW COMPLETE
{'=' * 50}

📊 SUMMARY:
• Total Notes Reviewed: {self.processed_count}
• Dates Corrected: {self.corrected_count}
• Dates Confirmed Correct: {len(confirmed_notes)}
• Errors Encountered: {self.error_count}

✅ CORRECTED DATES ({len(corrected_notes)} notes):
"""
        
        for note in corrected_notes:
            report += f"""
• {note['client_name']}: {note['current_date']} → {note['ai_extracted_date']}
  Type: {note['note_type']}
  Reasoning: {note['reasoning']}
"""
        
        if confirmed_notes:
            report += f"\n✅ CONFIRMED CORRECT DATES ({len(confirmed_notes)} notes):\n"
            for note in confirmed_notes:
                report += f"• {note['client_name']}: {note['current_date']} (confirmed)\n"
        
        # Show high-confidence suggestions that weren't applied
        suggestions = [r for r in self.review_results 
                      if r['confidence'] == 'high' and not r['date_changed'] and r['ai_extracted_date']]
        
        if suggestions:
            report += f"\n⚠️ HIGH-CONFIDENCE SUGGESTIONS NOT APPLIED ({len(suggestions)} notes):\n"
            for note in suggestions:
                report += f"• {note['client_name']}: {note['current_date']} → {note['ai_extracted_date']}\n"
                report += f"  Reason: {note['reasoning']}\n"
        
        return report.strip()

    def review_all_notes(self):
        """Main method to review all notes"""
        print("🚀 STARTING AI DATE EXTRACTION REVIEW")
        print("=" * 60)
        
        if not self.connect_to_database():
            return False
        
        # Review progress notes
        print("\n📋 REVIEWING PROGRESS NOTES")
        print("-" * 30)
        progress_notes = self.get_progress_notes_for_review()
        print(f"Found {len(progress_notes)} progress notes to review")
        
        for note in progress_notes:
            result = self.review_progress_note_date(note)
            self.review_results.append(result)
        
        # Review session notes
        print("\n📝 REVIEWING SESSION NOTES")
        print("-" * 30)
        session_notes = self.get_session_notes_for_review()
        print(f"Found {len(session_notes)} session notes to review")
        
        for note in session_notes:
            result = self.review_session_note_date(note)
            self.review_results.append(result)
        
        # Generate and display report
        print("\n" + "=" * 60)
        report = self.generate_review_report()
        print(report)
        
        # Save detailed results to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = f"date_extraction_review_{timestamp}.json"
        
        with open(results_file, 'w') as f:
            json.dump({
                'summary': {
                    'total_reviewed': self.processed_count,
                    'dates_corrected': self.corrected_count,
                    'errors': self.error_count,
                    'review_timestamp': datetime.now().isoformat()
                },
                'detailed_results': self.review_results
            }, f, indent=2, default=str)
        
        print(f"\n💾 Detailed results saved to: {results_file}")
        
        return True

def main():
    reviewer = AIDateExtractionReviewer()
    success = reviewer.review_all_notes()
    
    if success:
        print("\n🎉 Date extraction review completed successfully!")
    else:
        print("\n❌ Date extraction review failed!")

if __name__ == "__main__":
    main()
