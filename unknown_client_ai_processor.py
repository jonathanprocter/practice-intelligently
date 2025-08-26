
#!/usr/bin/env python3
"""
Unknown Client AI Processor
Processes clients marked as "Unknown" or with incomplete information using AI extraction
"""

import psycopg2
import openai
import json
import os
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

class UnknownClientAIProcessor:
    def __init__(self):
        self.base_url = "http://localhost:5000"
        self.therapist_id = "e66b8b8e-e7a2-40b9-ae74-00c93ffe503c"
        self.db_connection = None
        self.processed_count = 0
        self.corrected_count = 0
        self.openai_client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
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

    def get_unknown_clients(self):
        """Get all clients with 'Unknown' in their name or incomplete information"""
        cursor = self.db_connection.cursor()
        
        query = """
        SELECT 
            c.id,
            c.first_name,
            c.last_name,
            c.email,
            c.phone,
            c.date_of_birth,
            c.created_at,
            COUNT(sn.id) as session_count
        FROM clients c
        LEFT JOIN session_notes sn ON c.id = sn.client_id
        WHERE 
            c.therapist_id = %s
            AND (
                LOWER(c.first_name) LIKE '%unknown%' 
                OR LOWER(c.last_name) LIKE '%unknown%'
                OR c.first_name IS NULL 
                OR c.last_name IS NULL
                OR c.first_name = ''
                OR c.last_name = ''
                OR (c.first_name = 'Client' AND c.last_name LIKE '%[0-9]%')
            )
        GROUP BY c.id, c.first_name, c.last_name, c.email, c.phone, c.date_of_birth, c.created_at
        ORDER BY session_count DESC, c.created_at DESC
        """
        
        cursor.execute(query, (self.therapist_id,))
        results = cursor.fetchall()
        
        columns = ['id', 'first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'created_at', 'session_count']
        unknown_clients = []
        
        for row in results:
            client_data = dict(zip(columns, row))
            unknown_clients.append(client_data)
        
        cursor.close()
        return unknown_clients

    def get_client_session_content(self, client_id: str):
        """Get all session content for a client to analyze"""
        cursor = self.db_connection.cursor()
        
        query = """
        SELECT 
            sn.id,
            sn.content,
            sn.title,
            sn.subjective,
            sn.objective,
            sn.assessment,
            sn.plan,
            sn.session_date,
            sn.created_at
        FROM session_notes sn
        WHERE sn.client_id = %s
        ORDER BY sn.session_date DESC, sn.created_at DESC
        """
        
        cursor.execute(query, (client_id,))
        results = cursor.fetchall()
        
        columns = ['id', 'content', 'title', 'subjective', 'objective', 'assessment', 'plan', 'session_date', 'created_at']
        sessions = []
        
        for row in results:
            session_data = dict(zip(columns, row))
            sessions.append(session_data)
        
        cursor.close()
        return sessions

    def extract_client_info_with_ai(self, client_data: Dict, sessions: List[Dict]) -> Dict[str, Any]:
        """Use AI to extract proper client information from session content"""
        
        # Combine all session content for analysis
        combined_content = ""
        for session in sessions:
            if session['content']:
                combined_content += f"Session {session['created_at']}: {session['content']}\n\n"
            if session['title']:
                combined_content += f"Title: {session['title']}\n"
            if session['subjective']:
                combined_content += f"Subjective: {session['subjective']}\n"
            if session['objective']:
                combined_content += f"Objective: {session['objective']}\n"
            if session['assessment']:
                combined_content += f"Assessment: {session['assessment']}\n"
            if session['plan']:
                combined_content += f"Plan: {session['plan']}\n"
            combined_content += "\n" + "="*50 + "\n\n"

        if not combined_content.strip():
            return {"success": False, "reason": "No session content available"}

        # AI extraction prompt
        prompt = f"""
You are an expert clinical data analyst. Analyze the following therapy session content to extract the correct client information.

CURRENT CLIENT RECORD:
- ID: {client_data['id']}
- Current Name: {client_data['first_name']} {client_data['last_name']}
- Email: {client_data.get('email', 'Not provided')}
- Phone: {client_data.get('phone', 'Not provided')}

SESSION CONTENT TO ANALYZE:
{combined_content[:8000]}  

EXTRACTION TASK:
1. Find the REAL client name mentioned in the sessions
2. Extract any contact information (email, phone)
3. Look for demographic information (age, DOB, location)
4. Identify consistent patterns across sessions
5. Provide confidence scores for each extraction

RESPOND WITH JSON ONLY:
{{
    "extraction_success": true/false,
    "extracted_info": {{
        "first_name": "extracted first name or null",
        "last_name": "extracted last name or null",
        "full_name": "complete name if found",
        "email": "extracted email or null",
        "phone": "extracted phone or null",
        "age": "extracted age or null",
        "date_of_birth": "YYYY-MM-DD format or null",
        "location": "city/state if mentioned",
        "gender": "if clearly mentioned"
    }},
    "confidence_scores": {{
        "name_confidence": 0.0-1.0,
        "contact_confidence": 0.0-1.0,
        "demographic_confidence": 0.0-1.0
    }},
    "evidence": {{
        "name_sources": ["quotes where name appears"],
        "contact_sources": ["quotes with contact info"],
        "demographic_sources": ["quotes with demographic info"]
    }},
    "recommendations": {{
        "should_update": true/false,
        "update_priority": "high/medium/low",
        "manual_review_needed": true/false,
        "reason": "explanation of recommendation"
    }}
}}
"""

        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert clinical data analyst specializing in extracting client information from therapy session notes. Always respond with valid JSON only."
                    },
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=1500
            )
            
            result = json.loads(response.choices[0].message.content)
            result['session_count'] = len(sessions)
            return result
            
        except Exception as e:
            print(f"❌ AI extraction failed for client {client_data['id']}: {e}")
            return {"success": False, "error": str(e)}

    def update_client_information(self, client_id: str, extracted_info: Dict) -> bool:
        """Update client information in database"""
        cursor = self.db_connection.cursor()
        
        try:
            update_fields = []
            update_values = []
            
            info = extracted_info.get('extracted_info', {})
            
            if info.get('first_name'):
                update_fields.append("first_name = %s")
                update_values.append(info['first_name'])
            
            if info.get('last_name'):
                update_fields.append("last_name = %s")
                update_values.append(info['last_name'])
            
            if info.get('email'):
                update_fields.append("email = %s")
                update_values.append(info['email'])
            
            if info.get('phone'):
                update_fields.append("phone = %s")
                update_values.append(info['phone'])
            
            if info.get('date_of_birth'):
                update_fields.append("date_of_birth = %s")
                update_values.append(info['date_of_birth'])
            
            if not update_fields:
                return False
            
            # Add updated timestamp
            update_fields.append("updated_at = NOW()")
            update_values.append(client_id)
            
            query = f"""
            UPDATE clients 
            SET {', '.join(update_fields)}
            WHERE id = %s
            """
            
            cursor.execute(query, update_values)
            self.db_connection.commit()
            cursor.close()
            return True
            
        except Exception as e:
            print(f"❌ Failed to update client {client_id}: {e}")
            self.db_connection.rollback()
            cursor.close()
            return False

    def process_unknown_clients(self):
        """Main processing function"""
        print("🚀 STARTING UNKNOWN CLIENT AI PROCESSING")
        print("=" * 60)
        
        if not self.connect_to_database():
            return False
        
        unknown_clients = self.get_unknown_clients()
        total_clients = len(unknown_clients)
        
        if total_clients == 0:
            print("✅ No unknown clients found!")
            return True
        
        print(f"📋 Found {total_clients} unknown/incomplete clients to process")
        
        results = []
        
        for i, client in enumerate(unknown_clients, 1):
            print(f"\n[{i}/{total_clients}] Processing client: {client['first_name']} {client['last_name']} (ID: {client['id']})")
            print(f"  Sessions: {client['session_count']}")
            
            if client['session_count'] == 0:
                print("  ⚠️ No sessions found - skipping")
                continue
            
            # Get session content
            sessions = self.get_client_session_content(client['id'])
            
            # Extract information with AI
            extraction_result = self.extract_client_info_with_ai(client, sessions)
            
            if extraction_result.get('extraction_success'):
                extracted = extraction_result.get('extracted_info', {})
                confidence = extraction_result.get('confidence_scores', {})
                recommendations = extraction_result.get('recommendations', {})
                
                print(f"  🤖 AI Extraction Results:")
                if extracted.get('full_name'):
                    print(f"    Name: {extracted['full_name']} (confidence: {confidence.get('name_confidence', 0):.2f})")
                if extracted.get('email'):
                    print(f"    Email: {extracted['email']}")
                if extracted.get('phone'):
                    print(f"    Phone: {extracted['phone']}")
                
                # Decide whether to update
                should_update = (
                    recommendations.get('should_update', False) and
                    confidence.get('name_confidence', 0) >= 0.7 and
                    not recommendations.get('manual_review_needed', True)
                )
                
                if should_update:
                    success = self.update_client_information(client['id'], extraction_result)
                    if success:
                        print("  ✅ Client information updated successfully")
                        self.corrected_count += 1
                    else:
                        print("  ❌ Failed to update client information")
                else:
                    print(f"  ⚠️ Manual review recommended: {recommendations.get('reason', 'Low confidence')}")
                
                self.processed_count += 1
                
            else:
                print(f"  ❌ AI extraction failed: {extraction_result.get('reason', 'Unknown error')}")
            
            # Store result for reporting
            results.append({
                'client_id': client['id'],
                'original_name': f"{client['first_name']} {client['last_name']}",
                'session_count': client['session_count'],
                'extraction_result': extraction_result
            })
        
        # Generate final report
        self.generate_report(results)
        
        print("\n" + "=" * 60)
        print("🏁 UNKNOWN CLIENT PROCESSING COMPLETE")
        print("=" * 60)
        print(f"✅ Successfully processed: {self.processed_count} clients")
        print(f"✅ Successfully corrected: {self.corrected_count} clients")
        print(f"📄 Detailed report saved to: unknown_clients_ai_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        
        return True

    def generate_report(self, results: List[Dict]):
        """Generate detailed report of processing results"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"unknown_clients_ai_report_{timestamp}.json"
        
        report = {
            "processing_summary": {
                "total_processed": self.processed_count,
                "total_corrected": self.corrected_count,
                "processing_timestamp": datetime.now().isoformat(),
                "therapist_id": self.therapist_id
            },
            "detailed_results": results,
            "recommendations": {
                "high_confidence_updates": [
                    r for r in results 
                    if r.get('extraction_result', {}).get('confidence_scores', {}).get('name_confidence', 0) >= 0.8
                ],
                "manual_review_needed": [
                    r for r in results 
                    if r.get('extraction_result', {}).get('recommendations', {}).get('manual_review_needed', True)
                ],
                "no_sessions": [
                    r for r in results 
                    if r.get('session_count', 0) == 0
                ]
            }
        }
        
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)

if __name__ == "__main__":
    processor = UnknownClientAIProcessor()
    success = processor.process_unknown_clients()
    
    if success:
        print("\n🎉 Unknown client AI processing completed successfully!")
    else:
        print("\n💥 Unknown client AI processing failed!")
