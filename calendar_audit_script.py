#!/usr/bin/env python3
"""
Comprehensive Calendar Event Loading Audit Script
Identifies all issues preventing calendar events from 2015-2030 from loading properly
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Any

def find_files_with_pattern(directory: str, pattern: str, extensions: List[str]) -> List[Dict[str, Any]]:
    """Find files containing specific patterns"""
    matches = []
    for root, dirs, files in os.walk(directory):
        # Skip node_modules and other unnecessary directories
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'dist', 'build']]
        
        for file in files:
            if any(file.endswith(ext) for ext in extensions):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if re.search(pattern, content, re.IGNORECASE):
                            matches.append({
                                'file': file_path,
                                'pattern': pattern,
                                'content_preview': content[:200] + '...' if len(content) > 200 else content
                            })
                except (UnicodeDecodeError, PermissionError):
                    continue
    return matches

def audit_calendar_date_restrictions():
    """Audit all calendar-related date restrictions"""
    issues = []
    
    print("🔍 CALENDAR EVENT LOADING AUDIT")
    print("=" * 50)
    
    # 1. Check for restricted date ranges in backend
    print("\n1. Checking backend date restrictions...")
    
    date_restriction_patterns = [
        r'new Date\(\)\s*[+-]',  # Current date calculations
        r'setDate\([^)]*[+-]',   # Date modifications
        r'timeMin.*2025-08-04',  # Hardcoded today's date
        r'timeMax.*2025-08-04',  # Hardcoded today's date
        r'getDate\(\)\s*[+-]',   # Date arithmetic
        r'startOf.*day',         # Day restrictions
        r'endOf.*day',           # Day restrictions
    ]
    
    for pattern in date_restriction_patterns:
        matches = find_files_with_pattern('.', pattern, ['.ts', '.js', '.tsx', '.jsx'])
        if matches:
            issues.append({
                'category': 'Date Restrictions',
                'severity': 'HIGH',
                'pattern': pattern,
                'files': [m['file'] for m in matches],
                'description': f'Found date restrictions that may limit calendar events to current dates'
            })
    
    # 2. Check for API endpoints with date defaults
    print("2. Checking API endpoint date defaults...")
    
    api_endpoints = find_files_with_pattern('./server', r'/api/.*events', ['.ts', '.js'])
    for match in api_endpoints:
        issues.append({
            'category': 'API Endpoints',
            'severity': 'MEDIUM', 
            'file': match['file'],
            'description': 'API endpoint that handles calendar events - verify date range defaults'
        })
    
    # 3. Check frontend queries
    print("3. Checking frontend calendar queries...")
    
    query_patterns = [
        r'useQuery.*calendar',
        r'fetch.*calendar/events',
        r'queryKey.*calendar',
    ]
    
    for pattern in query_patterns:
        matches = find_files_with_pattern('./client', pattern, ['.ts', '.tsx', '.js', '.jsx'])
        if matches:
            for match in matches:
                issues.append({
                    'category': 'Frontend Queries',
                    'severity': 'HIGH',
                    'file': match['file'],
                    'pattern': pattern,
                    'description': 'Frontend query that fetches calendar events - verify date range'
                })
    
    # 4. Check for cache invalidation issues
    print("4. Checking cache configuration...")
    
    cache_patterns = [
        r'staleTime',
        r'gcTime',
        r'cacheTime',
        r'queryClient\.invalidateQueries',
    ]
    
    for pattern in cache_patterns:
        matches = find_files_with_pattern('./client', pattern, ['.ts', '.tsx'])
        if matches:
            for match in matches:
                issues.append({
                    'category': 'Cache Issues', 
                    'severity': 'MEDIUM',
                    'file': match['file'],
                    'description': 'Cache configuration that may be preventing new queries from executing'
                })
    
    # 5. Check for dashboard-specific calendar calls
    print("5. Checking dashboard calendar integrations...")
    
    dashboard_patterns = [
        r'/api/oauth/events/today',
        r'/api/dashboard.*events',
        r'events.*today',
    ]
    
    for pattern in dashboard_patterns:
        matches = find_files_with_pattern('.', pattern, ['.ts', '.tsx', '.js', '.jsx'])
        if matches:
            for match in matches:
                issues.append({
                    'category': 'Dashboard Integration',
                    'severity': 'HIGH', 
                    'file': match['file'],
                    'description': 'Dashboard making separate calendar calls with restricted date ranges'
                })
    
    return issues

def generate_fix_recommendations(issues: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Generate specific fix recommendations for each issue"""
    fixes = []
    
    for issue in issues:
        if issue['category'] == 'Date Restrictions':
            fixes.append({
                'issue': issue,
                'fix_type': 'Replace date restrictions',
                'recommendation': 'Replace current date calculations with 2015-2030 range',
                'code_example': """
// Instead of:
const startTime = new Date();
const endTime = new Date();
endTime.setDate(endTime.getDate() + 30);

// Use:
const startTime = new Date('2015-01-01T00:00:00.000Z');
const endTime = new Date('2030-12-31T23:59:59.999Z');
                """,
                'priority': 1
            })
        
        elif issue['category'] == 'Dashboard Integration':
            fixes.append({
                'issue': issue,
                'fix_type': 'Update dashboard API calls',
                'recommendation': 'Modify dashboard API calls to use broader date ranges',
                'priority': 1
            })
        
        elif issue['category'] == 'Frontend Queries':
            fixes.append({
                'issue': issue,
                'fix_type': 'Update query parameters',
                'recommendation': 'Ensure frontend queries pass 2015-2030 date range to backend',
                'priority': 1
            })
        
        elif issue['category'] == 'Cache Issues':
            fixes.append({
                'issue': issue,
                'fix_type': 'Cache invalidation',
                'recommendation': 'Invalidate calendar queries to force new data fetch',
                'priority': 2
            })
    
    return fixes

def main():
    """Run the comprehensive audit"""
    
    # Run audit
    issues = audit_calendar_date_restrictions()
    
    # Generate fixes
    fixes = generate_fix_recommendations(issues)
    
    # Create comprehensive report
    report = {
        'audit_timestamp': '2025-08-04T14:52:00Z',
        'total_issues': len(issues),
        'high_priority_issues': len([i for i in issues if i.get('severity') == 'HIGH']),
        'issues_by_category': {},
        'issues': issues,
        'fixes': fixes,
        'summary': {
            'problem': 'Over 4,000 calendar events should load from 2015-2030 but only showing 0-1 events',
            'root_cause': 'Multiple parts of system using current date restrictions instead of historical range',
            'immediate_actions': [
                'Fix all date restriction patterns in backend/frontend',
                'Update dashboard API calls to use 2015-2030 range', 
                'Invalidate calendar query cache',
                'Verify Simple Practice calendar events are being processed correctly'
            ]
        }
    }
    
    # Group issues by category
    for issue in issues:
        category = issue['category']
        if category not in report['issues_by_category']:
            report['issues_by_category'][category] = 0
        report['issues_by_category'][category] += 1
    
    # Print report
    print(f"\n📊 AUDIT RESULTS")
    print("=" * 50)
    print(f"Total Issues Found: {report['total_issues']}")
    print(f"High Priority: {report['high_priority_issues']}")
    
    print(f"\n📋 Issues by Category:")
    for category, count in report['issues_by_category'].items():
        print(f"  • {category}: {count}")
    
    print(f"\n🎯 Priority Fixes:")
    priority_fixes = sorted([f for f in fixes if f['priority'] == 1], key=lambda x: x['fix_type'])
    for i, fix in enumerate(priority_fixes[:5], 1):
        print(f"  {i}. {fix['fix_type']}: {fix['recommendation']}")
    
    # Save detailed report
    with open('calendar_audit_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n💾 Detailed report saved to: calendar_audit_report.json")
    print(f"\n🚀 Ready to implement fixes!")
    
    return report

if __name__ == "__main__":
    main()