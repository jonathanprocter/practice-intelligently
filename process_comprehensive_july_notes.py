#!/usr/bin/env python3

import sys
import json
import requests
import re
from datetime import datetime
import os

# Read the comprehensive progress notes document
def read_document():
    with open('attached_assets/7-20-2025-Clinical_Progress_Notes_Final_1754546212157.docx', 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    return content

# Parse the document for individual sessions using pattern matching
def parse_sessions_from_document(content):
    sessions = []
    
    # Extract the table of contents to get session info
    toc_section = content.split('Table of Contents')[1].split('Comprehensive Clinical Progress Note for')[0]
    
    # Extract client names, dates, and times from TOC
    session_patterns = []
    for line in toc_section.split('\n'):
        if re.search(r'\d+\.\s+(.+?)\s+-\s+(.+?)\s+at\s+(\d{4})\s+hours', line):
            match = re.search(r'\d+\.\s+(.+?)\s+-\s+(.+?)\s+at\s+(\d{4})\s+hours', line)
            if match:
                client_name = match.group(1).strip()
                session_date_str = match.group(2).strip() 
                session_time_str = match.group(3).strip()
                
                # Convert date string to ISO format
                try:
                    session_date = datetime.strptime(session_date_str, '%B %d, %Y').strftime('%Y-%m-%d')
                except:
                    try:
                        session_date = datetime.strptime(session_date_str, '%B %d, %Y').strftime('%Y-%m-%d')
                    except:
                        continue
                
                # Convert military time to HH:MM format
                hour = int(session_time_str[:2])
                minute = int(session_time_str[2:]) if len(session_time_str) > 2 else 0
                session_time = f"{hour:02d}:{minute:02d}"
                
                session_patterns.append({
                    'clientName': client_name,
                    'sessionDate': session_date,
                    'sessionTime': session_time,
                    'sessionTimeStr': session_time_str
                })
    
    # Now extract full session content for each client
    current_pos = 0
    for i, pattern in enumerate(session_patterns):
        # Find the start of this session's content
        session_start = content.find(f"Comprehensive Clinical Progress Note for {pattern['clientName']}", current_pos)
        if session_start == -1:
            # Try alternative patterns
            session_start = content.find(f"Clinical Progress Note for {pattern['clientName']}", current_pos)
        
        if session_start == -1:
            continue
            
        # Find the end (start of next session or end of document)
        if i + 1 < len(session_patterns):
            next_client = session_patterns[i + 1]['clientName']
            session_end = content.find(f"Comprehensive Clinical Progress Note for {next_client}", session_start + 1)
            if session_end == -1:
                session_end = content.find(f"Clinical Progress Note for {next_client}", session_start + 1)
        else:
            session_end = len(content)
        
        if session_end == -1:
            session_end = len(content)
            
        session_content = content[session_start:session_end]
        
        # Extract SOAP sections from the content
        subjective = extract_section(session_content, 'Subjective')
        objective = extract_section(session_content, 'Objective')
        assessment = extract_section(session_content, 'Assessment')
        plan = extract_section(session_content, 'Plan')
        tonal_analysis = extract_section(session_content, 'Tonal Analysis')
        
        # Extract key points and quotes
        key_points = extract_key_points(session_content)
        significant_quotes = extract_significant_quotes(session_content)
        
        # Generate narrative summary
        narrative_summary = generate_narrative_summary(subjective, assessment)
        
        # Generate AI tags
        ai_tags = generate_ai_tags(session_content)
        
        sessions.append({
            'clientName': pattern['clientName'],
            'sessionDate': pattern['sessionDate'],
            'sessionTime': pattern['sessionTime'],
            'duration': '50 minutes',
            'sessionType': 'Individual Therapy',
            'subjective': subjective,
            'objective': objective,
            'assessment': assessment,
            'plan': plan,
            'tonalAnalysis': tonal_analysis,
            'keyPoints': key_points,
            'significantQuotes': significant_quotes,
            'narrativeSummary': narrative_summary,
            'aiTags': ai_tags
        })
        
        current_pos = session_end
    
    return sessions

def extract_section(content, section_name):
    """Extract a SOAP section from the content"""
    pattern = rf'{section_name}\s*\n(.*?)(?=\n[A-Z][a-z]+\s*\n|\n\n[A-Z]|\Z)'
    match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return ""

def extract_key_points(content):
    """Extract key clinical points from the session"""
    key_points = []
    
    # Look for bullet points or numbered lists
    bullet_pattern = r'(?:^|\n)(?:[\-\•\*]|\d+\.)\s+(.+?)(?=\n|$)'
    matches = re.findall(bullet_pattern, content, re.MULTILINE)
    
    # Also extract from "Key Points" section if it exists
    key_points_section = extract_section(content, 'Key Points')
    if key_points_section:
        for line in key_points_section.split('\n'):
            if line.strip() and not line.strip().startswith('Context:') and not line.strip().startswith('Significance:'):
                key_points.append(line.strip())
    
    # Add general clinical themes
    if 'chronic illness' in content.lower() or 'rheumatoid arthritis' in content.lower():
        key_points.append("Chronic illness management and adaptation")
    if 'family' in content.lower() and 'conflict' in content.lower():
        key_points.append("Family relationship dynamics and boundary setting")
    if 'pain' in content.lower():
        key_points.append("Pain management and coping strategies")
    if 'medication' in content.lower():
        key_points.append("Medication management and adherence")
    if 'therapy' in content.lower() and 'progress' in content.lower():
        key_points.append("Therapeutic progress and skill application")
    
    return key_points[:7] if key_points else ["Clinical session documented"]

def extract_significant_quotes(content):
    """Extract significant client quotes from the session"""
    quotes = []
    
    # Look for quoted text patterns
    quote_patterns = [
        r'"([^"]+)"',
        r'\'([^\']+)\'',
        r'"([^"]+)"'
    ]
    
    for pattern in quote_patterns:
        matches = re.findall(pattern, content)
        for match in matches:
            if len(match) > 20 and len(match) < 200:  # Reasonable quote length
                quotes.append(match.strip())
    
    # Look for specific quote sections
    quotes_section = extract_section(content, 'Significant Quotes')
    if quotes_section:
        quote_lines = quotes_section.split('\n')
        for line in quote_lines:
            if '"' in line and len(line) > 20:
                quote_match = re.search(r'"([^"]+)"', line)
                if quote_match:
                    quotes.append(quote_match.group(1))
    
    return quotes[:5] if quotes else ["Session content documented"]

def generate_narrative_summary(subjective, assessment):
    """Generate a brief narrative summary"""
    if subjective and assessment:
        # Extract first sentence or key theme from each
        subj_summary = subjective.split('.')[0] if subjective else ""
        assess_summary = assessment.split('.')[0] if assessment else ""
        return f"{subj_summary}. {assess_summary}."[:200]
    return "Comprehensive clinical session addressing ongoing therapeutic goals."

def generate_ai_tags(content):
    """Generate relevant AI tags based on content"""
    tags = []
    
    # Clinical themes
    if 'anxiety' in content.lower():
        tags.append("anxiety-management")
    if 'depression' in content.lower():
        tags.append("depression-symptoms")
    if 'chronic illness' in content.lower() or 'rheumatoid arthritis' in content.lower():
        tags.append("chronic-illness-adaptation")
    if 'family' in content.lower():
        tags.append("family-dynamics")
    if 'pain' in content.lower():
        tags.append("pain-management")
    if 'medication' in content.lower():
        tags.append("medication-compliance")
    if 'boundary' in content.lower() or 'boundaries' in content.lower():
        tags.append("boundary-setting")
    if 'relationship' in content.lower():
        tags.append("relationship-issues")
    if 'coping' in content.lower():
        tags.append("coping-strategies")
    if 'therapy' in content.lower() and 'progress' in content.lower():
        tags.append("therapeutic-progress")
    
    # Therapy modalities
    if 'ACT' in content or 'Acceptance and Commitment' in content:
        tags.append("act-therapy")
    if 'Narrative Therapy' in content:
        tags.append("narrative-therapy")
    if 'mindfulness' in content.lower():
        tags.append("mindfulness-based")
    
    # Default tags if none found
    if not tags:
        tags = ["individual-therapy", "clinical-progress", "therapeutic-intervention"]
    
    return tags[:8]

# Create session records via API
def create_session_records(sessions, therapist_id):
    results = {
        'created': 0,
        'matched': 0,
        'unmatched': [],
        'sessions': []
    }
    
    for session in sessions:
        try:
            print(f"Processing session for: {session['clientName']}")
            
            # Get client ID
            client_response = requests.get(f"http://localhost:5000/api/clients/{therapist_id}")
            if client_response.status_code != 200:
                print(f"Failed to get clients list")
                continue
                
            clients = client_response.json()
            client_id = None
            
            for client in clients:
                full_name = f"{client.get('firstName', '')} {client.get('lastName', '')}".strip()
                if full_name == session['clientName']:
                    client_id = client['id']
                    break
            
            if not client_id:
                print(f"Client not found: {session['clientName']}")
                results['unmatched'].append(session['clientName'])
                continue
            
            print(f"Found client: {session['clientName']} ({client_id[:8]}...)")
            results['matched'] += 1
            
            # Create appointment
            session_datetime = f"{session['sessionDate']}T{session['sessionTime']}:00"
            appointment_data = {
                'clientId': client_id,
                'therapistId': therapist_id,
                'startTime': session_datetime,
                'endTime': session_datetime,  # Will be adjusted by server
                'type': session['sessionType'],
                'status': 'completed',
                'location': 'Office',
                'notes': f"{session['sessionType']} session - {session['narrativeSummary']}"
            }
            
            appointment_response = requests.post(
                f"http://localhost:5000/api/appointments",
                json=appointment_data
            )
            
            if appointment_response.status_code not in [200, 201]:
                print(f"Failed to create appointment: {appointment_response.text}")
                continue
                
            appointment = appointment_response.json()
            appointment_id = appointment['id']
            print(f"Created appointment: {appointment_id[:8]}...")
            
            # Create progress note
            progress_note_data = {
                'clientId': client_id,
                'therapistId': therapist_id,
                'appointmentId': appointment_id,
                'title': f"Clinical Progress Note - {session['clientName']} - {session['sessionDate']}",
                'subjective': session['subjective'],
                'objective': session['objective'],
                'assessment': session['assessment'],
                'plan': session['plan'],
                'tonalAnalysis': session['tonalAnalysis'],
                'keyPoints': session['keyPoints'],
                'significantQuotes': session['significantQuotes'],
                'narrativeSummary': session['narrativeSummary'],
                'aiTags': session['aiTags'],
                'sessionDate': session_datetime
            }
            
            progress_response = requests.post(
                f"http://localhost:5000/api/progress-notes",
                json=progress_note_data
            )
            
            if progress_response.status_code not in [200, 201]:
                print(f"Failed to create progress note: {progress_response.text}")
                continue
                
            progress_note = progress_response.json()
            print(f"Created progress note: {progress_note['id'][:8]}...")
            
            results['created'] += 1
            results['sessions'].append({
                'clientName': session['clientName'],
                'clientId': client_id,
                'appointmentId': appointment_id,
                'progressNoteId': progress_note['id'],
                'sessionDate': session['sessionDate'],
                'sessionTime': session['sessionTime']
            })
            
        except Exception as e:
            print(f"Error processing {session['clientName']}: {e}")
            results['unmatched'].append(f"{session['clientName']} (error: {str(e)})")
    
    return results

def main():
    print("Reading comprehensive progress notes document...")
    content = read_document()
    
    print("Parsing individual therapy sessions...")
    sessions = parse_sessions_from_document(content)
    print(f"Extracted {len(sessions)} therapy sessions")
    
    if len(sessions) == 0:
        print("No sessions found in document")
        return
    
    # Show first few sessions
    print("\nFirst few sessions found:")
    for i, session in enumerate(sessions[:3]):
        print(f"  {i+1}. {session['clientName']} - {session['sessionDate']} at {session['sessionTime']}")
    
    print(f"\nCreating session records...")
    therapist_id = "e66b8b8e-e7a2-40b9-ae74-00c93ffe503c"
    results = create_session_records(sessions, therapist_id)
    
    print(f"\n✅ Processing complete:")
    print(f"   Created: {results['created']} session records")
    print(f"   Matched: {results['matched']} clients")
    print(f"   Unmatched: {len(results['unmatched'])} clients")
    
    if results['unmatched']:
        print(f"\n❌ Unmatched clients:")
        for client in results['unmatched']:
            print(f"   - {client}")
    
    if results['sessions']:
        print(f"\n📝 Created sessions:")
        for session in results['sessions']:
            print(f"   - {session['clientName']}: {session['sessionDate']} at {session['sessionTime']}")

if __name__ == "__main__":
    main()