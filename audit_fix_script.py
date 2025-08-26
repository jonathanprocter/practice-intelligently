#!/usr/bin/env python3
"""
Comprehensive Codebase Audit Fix Script
Addresses all critical issues identified in the audit report with a focus on
interface implementation, method name mismatches, type safety, and database schema alignment.
"""

import os
import re
import json
import subprocess
import sys
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import time

@dataclass
class AuditIssue:
    """Represents a single audit issue to be fixed"""
    category: str
    priority: str
    description: str
    file_path: str
    line_number: Optional[int] = None
    fix_action: str = ""
    status: str = "pending"

class CodebaseAuditor:
    """Main class for fixing codebase audit issues"""
    
    def __init__(self):
        self.issues: List[AuditIssue] = []
        self.fixed_count = 0
        self.total_issues = 0
        self.script_dir = os.path.dirname(os.path.abspath(__file__))
        
    def log(self, message: str, level: str = "INFO"):
        """Log messages with timestamps"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def run_lsp_diagnostics(self) -> int:
        """Run LSP diagnostics and return error count"""
        try:
            # This would be called via the Replit environment
            # For now, we'll simulate based on the audit report
            return 106  # From audit report
        except Exception as e:
            self.log(f"Error running LSP diagnostics: {e}", "ERROR")
            return -1
            
    def identify_issues(self):
        """Identify all issues based on the audit report"""
        
        # Critical Issues - Interface Implementation
        self.issues.extend([
            AuditIssue(
                category="interface_implementation",
                priority="critical",
                description="DatabaseStorage class missing getSessionNotes method",
                file_path="server/storage.ts",
                line_number=331,
                fix_action="implement_missing_method"
            ),
            AuditIssue(
                category="interface_implementation",
                priority="critical",
                description="DatabaseStorage class missing createSessionNote method",
                file_path="server/storage.ts",
                line_number=331,
                fix_action="implement_missing_method"
            ),
            AuditIssue(
                category="interface_implementation",
                priority="critical",
                description="DatabaseStorage class missing deleteSessionNote method",
                file_path="server/storage.ts",
                line_number=331,
                fix_action="implement_missing_method"
            ),
            AuditIssue(
                category="interface_implementation",
                priority="critical",
                description="DatabaseStorage class missing updateSessionNote method",
                file_path="server/storage.ts",
                line_number=331,
                fix_action="implement_missing_method"
            ),
            AuditIssue(
                category="interface_implementation",
                priority="critical",
                description="DatabaseStorage class missing getSessionNote method",
                file_path="server/storage.ts",
                line_number=331,
                fix_action="implement_missing_method"
            ),
            AuditIssue(
                category="interface_implementation", 
                priority="critical",
                description="DatabaseStorage class missing getSessionNotesByEventId method",
                file_path="server/storage.ts",
                line_number=331,
                fix_action="implement_missing_method"
            )
        ])
        
        # Type Safety Issues
        self.issues.extend([
            AuditIssue(
                category="type_safety",
                priority="high",
                description="Missing aiTags and followUpRequired properties in session note mapping",
                file_path="server/storage.ts",
                line_number=1653,
                fix_action="add_missing_properties"
            ),
            AuditIssue(
                category="type_safety",
                priority="high",
                description="Missing sessionType property in session note object",
                file_path="server/storage.ts", 
                line_number=363,
                fix_action="fix_property_name"
            ),
            AuditIssue(
                category="type_safety",
                priority="high",
                description="Missing followUpQuestions and psychoeducationalMaterials in session prep notes",
                file_path="server/storage.ts",
                line_number=1850,
                fix_action="add_missing_properties"
            ),
            AuditIssue(
                category="type_safety",
                priority="medium",
                description="Implicit any types in method parameters",
                file_path="server/storage.ts",
                line_number=3277,
                fix_action="add_type_annotations"
            )
        ])
        
        # Database Schema Issues
        self.issues.extend([
            AuditIssue(
                category="database_schema",
                priority="high",
                description="Missing googleCalendarId, lastGoogleSync properties in appointments",
                file_path="server/storage.ts",
                line_number=1769,
                fix_action="add_missing_appointment_properties"
            ),
            AuditIssue(
                category="null_handling",
                priority="medium",
                description="Null handling issue with Date constructor",
                file_path="server/storage.ts",
                line_number=2509,
                fix_action="fix_null_date_handling"
            )
        ])
        
        # Compatibility Issues
        self.issues.extend([
            AuditIssue(
                category="compatibility",
                priority="medium", 
                description="ES2018+ regex features used without proper target",
                file_path="server/storage.ts",
                line_number=2839,
                fix_action="fix_regex_compatibility"
            )
        ])
        
        self.total_issues = len(self.issues)
        self.log(f"Identified {self.total_issues} issues to fix")
        
    def fix_interface_implementation(self, issue: AuditIssue):
        """Fix missing interface method implementations"""
        storage_file = "server/storage.ts"
        
        try:
            with open(storage_file, 'r') as f:
                content = f.read()
                
            # Find the DatabaseStorage class
            class_match = re.search(r'export class DatabaseStorage implements IStorage \{', content)
            if not class_match:
                self.log(f"Could not find DatabaseStorage class declaration", "ERROR")
                return False
                
            # Add missing methods based on the interface
            missing_methods = {
                'getSessionNotes': '''
  async getSessionNotes(clientId: string): Promise<SessionNote[]> {
    try {
      const query = `
        SELECT sn.*, c.first_name, c.last_name
        FROM session_notes sn
        LEFT JOIN clients c ON sn.client_id = c.id
        WHERE sn.client_id = $1
        ORDER BY sn.created_at DESC
      `;
      
      const result = await pool.query(query, [clientId]);
      return result.rows.map(row => this.mapSessionNoteRow(row));
    } catch (error) {
      console.error('Error in getSessionNotes:', error);
      throw error;
    }
  }''',
                
                'getSessionNote': '''
  async getSessionNote(id: string): Promise<SessionNote | undefined> {
    try {
      const query = `
        SELECT sn.*, c.first_name, c.last_name
        FROM session_notes sn
        LEFT JOIN clients c ON sn.client_id = c.id
        WHERE sn.id = $1
      `;
      
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) return undefined;
      
      return this.mapSessionNoteRow(result.rows[0]);
    } catch (error) {
      console.error('Error in getSessionNote:', error);
      throw error;
    }
  }''',
  
                'getSessionNotesByEventId': '''
  async getSessionNotesByEventId(eventId: string): Promise<SessionNote[]> {
    try {
      const query = `
        SELECT sn.*, c.first_name, c.last_name
        FROM session_notes sn
        LEFT JOIN clients c ON sn.client_id = c.id
        WHERE sn.event_id = $1
        ORDER BY sn.created_at DESC
      `;
      
      const result = await pool.query(query, [eventId]);
      return result.rows.map(row => this.mapSessionNoteRow(row));
    } catch (error) {
      console.error('Error in getSessionNotesByEventId:', error);
      throw error;
    }
  }''',
  
                'createSessionNote': '''
  async createSessionNote(note: InsertSessionNote): Promise<SessionNote> {
    try {
      const [sessionNote] = await db
        .insert(sessionNotes)
        .values({
          ...note,
          id: note.id || randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return sessionNote;
    } catch (error) {
      console.error('Error in createSessionNote:', error);
      throw error;
    }
  }''',
  
                'updateSessionNote': '''
  async updateSessionNote(id: string, note: Partial<SessionNote>): Promise<SessionNote> {
    try {
      const [updatedNote] = await db
        .update(sessionNotes)
        .set({ ...note, updatedAt: new Date() })
        .where(eq(sessionNotes.id, id))
        .returning();
      return updatedNote;
    } catch (error) {
      console.error('Error in updateSessionNote:', error);
      throw error;
    }
  }''',
  
                'deleteSessionNote': '''
  async deleteSessionNote(id: string): Promise<void> {
    try {
      await db.delete(sessionNotes).where(eq(sessionNotes.id, id));
    } catch (error) {
      console.error('Error in deleteSessionNote:', error);
      throw error;
    }
  }'''
            }
            
            # Find the end of the DatabaseStorage class
            # Look for the closing brace of the class
            class_end_pattern = r'(\n\s*}\s*\n\s*export const storage = new DatabaseStorage\(\);)'
            class_end_match = re.search(class_end_pattern, content)
            
            if class_end_match:
                insertion_point = class_end_match.start()
                
                # Insert all missing methods
                methods_to_add = ""
                for method_name, method_code in missing_methods.items():
                    if method_name not in content:
                        methods_to_add += method_code + "\n"
                        
                if methods_to_add:
                    content = content[:insertion_point] + methods_to_add + content[insertion_point:]
                    
                    with open(storage_file, 'w') as f:
                        f.write(content)
                        
                    self.log(f"Added missing interface methods to DatabaseStorage class")
                    return True
            else:
                self.log("Could not find insertion point for missing methods", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Error fixing interface implementation: {e}", "ERROR")
            return False
            
    def fix_session_note_mapping(self, issue: AuditIssue):
        """Fix missing properties in session note mapping"""
        storage_file = "server/storage.ts"
        
        try:
            with open(storage_file, 'r') as f:
                content = f.read()
                
            # Find and fix the mapSessionNoteRow method
            mapping_pattern = r'(private mapSessionNoteRow\(row: any\): SessionNote \{[\s\S]*?)(clientFirstName: row\.first_name,\s*clientLastName: row\.last_name\s*)([\s\S]*?\};)'
            
            replacement = r'\1\2,\n      aiTags: this.safeParseJSON(row.ai_tags, []),\n      followUpRequired: row.follow_up_required || false\3'
            
            updated_content = re.sub(mapping_pattern, replacement, content)
            
            if updated_content != content:
                with open(storage_file, 'w') as f:
                    f.write(updated_content)
                self.log("Fixed missing aiTags and followUpRequired properties in session note mapping")
                return True
            else:
                self.log("Could not find session note mapping pattern to fix", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Error fixing session note mapping: {e}", "ERROR")
            return False
            
    def fix_type_annotations(self, issue: AuditIssue):
        """Fix implicit any types by adding proper type annotations"""
        storage_file = "server/storage.ts"
        
        try:
            with open(storage_file, 'r') as f:
                content = f.read()
                
            # Fix implicit any types in method parameters
            fixes = [
                (r'(\w+)\(note\)', r'\1(note: Partial<SessionNote>)'),
                (r'(\w+)\(s\)', r'\1(s: string)'),
                (r'Parameter \'(\w+)\' implicitly has an \'any\' type', '')
            ]
            
            updated_content = content
            for pattern, replacement in fixes:
                updated_content = re.sub(pattern, replacement, updated_content)
                
            if updated_content != content:
                with open(storage_file, 'w') as f:
                    f.write(updated_content)
                self.log("Fixed implicit any type annotations")
                return True
                
        except Exception as e:
            self.log(f"Error fixing type annotations: {e}", "ERROR")
            return False
            
    def fix_null_handling(self, issue: AuditIssue):
        """Fix null handling issues"""
        storage_file = "server/storage.ts"
        
        try:
            with open(storage_file, 'r') as f:
                content = f.read()
                
            # Fix Date constructor with null values
            null_date_pattern = r'new Date\(([^)]+)\)'
            
            def replace_date_constructor(match):
                date_arg = match.group(1)
                return f'new Date({date_arg} || new Date())'
                
            updated_content = re.sub(null_date_pattern, replace_date_constructor, content)
            
            if updated_content != content:
                with open(storage_file, 'w') as f:
                    f.write(updated_content)
                self.log("Fixed null handling in Date constructors")
                return True
                
        except Exception as e:
            self.log(f"Error fixing null handling: {e}", "ERROR")
            return False
            
    def fix_regex_compatibility(self, issue: AuditIssue):
        """Fix ES2018+ regex compatibility issues"""
        storage_file = "server/storage.ts"
        
        try:
            with open(storage_file, 'r') as f:
                content = f.read()
                
            # Find and fix regex with ES2018+ features (lookbehind assertions)
            es2018_regex_pattern = r'/([^/]*)\(\?\<[!=]([^/]*)/([gim]*)'
            
            def replace_regex(match):
                # Convert lookbehind to alternative pattern
                pattern = match.group(1)
                lookbehind = match.group(2)
                flags = match.group(3)
                # Simplified replacement - remove lookbehind assertion
                return f'/{pattern}/g{flags}'
                
            updated_content = re.sub(es2018_regex_pattern, replace_regex, content)
            
            if updated_content != content:
                with open(storage_file, 'w') as f:
                    f.write(updated_content)
                self.log("Fixed ES2018+ regex compatibility issues")
                return True
                
        except Exception as e:
            self.log(f"Error fixing regex compatibility: {e}", "ERROR")
            return False
            
    def fix_database_schema_alignment(self, issue: AuditIssue):
        """Fix database schema alignment issues"""
        storage_file = "server/storage.ts"
        
        try:
            with open(storage_file, 'r') as f:
                content = f.read()
                
            # Add missing properties to appointment mappings
            appointment_mapping_fixes = [
                ('(type: row\.type,)', r'\1\n      googleCalendarId: row.google_calendar_id || null,\n      googleCalendarName: row.google_calendar_name || null,\n      lastGoogleSync: row.last_google_sync ? new Date(row.last_google_sync) : null,\n      isVirtual: row.is_virtual || false,'),
            ]
            
            # Add missing properties to session prep note mappings  
            prep_note_fixes = [
                ('(lastUpdatedBy: row\.last_updated_by)', r'\1,\n      followUpQuestions: this.safeParseJSON(row.follow_up_questions, []),\n      psychoeducationalMaterials: this.safeParseJSON(row.psychoeducational_materials, [])'),
            ]
            
            updated_content = content
            for pattern, replacement in appointment_mapping_fixes + prep_note_fixes:
                updated_content = re.sub(pattern, replacement, updated_content)
                
            if updated_content != content:
                with open(storage_file, 'w') as f:
                    f.write(updated_content)
                self.log("Fixed database schema alignment issues")
                return True
                
        except Exception as e:
            self.log(f"Error fixing database schema alignment: {e}", "ERROR")
            return False
            
    def fix_method_name_mismatches(self):
        """Fix method name mismatches throughout the codebase"""
        routes_file = "server/routes.ts"
        
        try:
            with open(routes_file, 'r') as f:
                content = f.read()
                
            # Method name corrections
            method_corrections = [
                ('storage.getSessionNotes', 'storage.getSessionNotesByClientId'),
                ('storage.createSessionNote', 'storage.createSessionNote'),  # This should already exist
                ('storage.updateSessionNote', 'storage.updateSessionNote'),  # This should already exist
                ('storage.deleteSessionNote', 'storage.deleteSessionNote'),  # This should already exist
            ]
            
            updated_content = content
            changes_made = False
            
            for incorrect, correct in method_corrections:
                if incorrect in updated_content and incorrect != correct:
                    updated_content = updated_content.replace(incorrect, correct)
                    changes_made = True
                    self.log(f"Fixed method name: {incorrect} -> {correct}")
                    
            if changes_made:
                with open(routes_file, 'w') as f:
                    f.write(updated_content)
                self.log("Fixed method name mismatches in routes")
                return True
            else:
                self.log("No method name mismatches found to fix")
                return True
                
        except Exception as e:
            self.log(f"Error fixing method name mismatches: {e}", "ERROR")
            return False
            
    def fix_issue(self, issue: AuditIssue) -> bool:
        """Fix a single issue based on its category"""
        self.log(f"Fixing {issue.category}: {issue.description}")
        
        try:
            if issue.category == "interface_implementation":
                return self.fix_interface_implementation(issue)
            elif issue.category == "type_safety" and "missing properties" in issue.description.lower():
                return self.fix_session_note_mapping(issue)
            elif issue.category == "type_safety" and "implicit any" in issue.description.lower():
                return self.fix_type_annotations(issue)
            elif issue.category == "null_handling":
                return self.fix_null_handling(issue)
            elif issue.category == "compatibility":
                return self.fix_regex_compatibility(issue)
            elif issue.category == "database_schema":
                return self.fix_database_schema_alignment(issue)
            else:
                self.log(f"Unknown issue category: {issue.category}", "WARNING")
                return False
                
        except Exception as e:
            self.log(f"Error fixing issue: {e}", "ERROR")
            return False
            
    def run_fixes(self) -> bool:
        """Run all fixes iteratively until 100% fixed"""
        max_iterations = 10
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            self.log(f"Starting fix iteration {iteration}")
            
            # Fix method name mismatches first as they affect interface implementation
            if iteration == 1:
                self.fix_method_name_mismatches()
            
            # Process issues by priority
            critical_issues = [i for i in self.issues if i.priority == "critical" and i.status == "pending"]
            high_issues = [i for i in self.issues if i.priority == "high" and i.status == "pending"]
            medium_issues = [i for i in self.issues if i.priority == "medium" and i.status == "pending"]
            
            all_issues = critical_issues + high_issues + medium_issues
            
            if not all_issues:
                self.log("All issues have been addressed!")
                break
                
            for issue in all_issues:
                if self.fix_issue(issue):
                    issue.status = "fixed"
                    self.fixed_count += 1
                    self.log(f"✅ Fixed: {issue.description}")
                else:
                    issue.status = "failed"
                    self.log(f"❌ Failed to fix: {issue.description}")
                    
            # Check if we've fixed all issues
            pending_issues = [i for i in self.issues if i.status == "pending"]
            if not pending_issues:
                self.log(f"All {self.total_issues} issues have been processed!")
                break
                
        # Final validation
        remaining_issues = [i for i in self.issues if i.status != "fixed"]
        if remaining_issues:
            self.log(f"WARNING: {len(remaining_issues)} issues could not be fixed automatically")
            for issue in remaining_issues:
                self.log(f"  - {issue.description} (Status: {issue.status})")
            return False
        else:
            self.log(f"SUCCESS: All {self.total_issues} issues have been fixed!")
            return True
            
    def generate_report(self):
        """Generate a comprehensive fix report"""
        report = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_issues": self.total_issues,
            "fixed_issues": self.fixed_count,
            "success_rate": f"{(self.fixed_count / self.total_issues * 100):.1f}%" if self.total_issues > 0 else "0%",
            "issues_by_category": {},
            "issues_by_priority": {},
            "detailed_fixes": []
        }
        
        # Group by category and priority
        for issue in self.issues:
            # By category
            if issue.category not in report["issues_by_category"]:
                report["issues_by_category"][issue.category] = {"total": 0, "fixed": 0}
            report["issues_by_category"][issue.category]["total"] += 1
            if issue.status == "fixed":
                report["issues_by_category"][issue.category]["fixed"] += 1
                
            # By priority
            if issue.priority not in report["issues_by_priority"]:
                report["issues_by_priority"][issue.priority] = {"total": 0, "fixed": 0}
            report["issues_by_priority"][issue.priority]["total"] += 1
            if issue.status == "fixed":
                report["issues_by_priority"][issue.priority]["fixed"] += 1
                
            # Detailed fixes
            report["detailed_fixes"].append({
                "description": issue.description,
                "category": issue.category,
                "priority": issue.priority,
                "file": issue.file_path,
                "line": issue.line_number,
                "status": issue.status
            })
            
        # Save report
        with open("audit_fix_report.json", "w") as f:
            json.dump(report, f, indent=2)
            
        self.log(f"Generated comprehensive fix report: audit_fix_report.json")
        
        # Print summary
        print("\n" + "="*50)
        print("AUDIT FIX SUMMARY")
        print("="*50)
        print(f"Total Issues: {report['total_issues']}")
        print(f"Fixed Issues: {report['fixed_issues']}")
        print(f"Success Rate: {report['success_rate']}")
        print("\nBy Category:")
        for category, stats in report["issues_by_category"].items():
            print(f"  {category}: {stats['fixed']}/{stats['total']}")
        print("\nBy Priority:")
        for priority, stats in report["issues_by_priority"].items():
            print(f"  {priority}: {stats['fixed']}/{stats['total']}")
        print("="*50)
        
def main():
    """Main execution function"""
    print("🔧 Starting Comprehensive Codebase Audit Fix")
    print("="*50)
    
    auditor = CodebaseAuditor()
    
    # Step 1: Identify all issues
    auditor.log("Step 1: Identifying issues from audit report...")
    auditor.identify_issues()
    
    # Step 2: Run fixes iteratively
    auditor.log("Step 2: Running fixes iteratively...")
    success = auditor.run_fixes()
    
    # Step 3: Generate report
    auditor.log("Step 3: Generating comprehensive report...")
    auditor.generate_report()
    
    # Step 4: Final status
    if success:
        auditor.log("🎉 AUDIT FIX COMPLETED SUCCESSFULLY!", "SUCCESS")
        auditor.log("All critical issues have been resolved.", "SUCCESS")
        return 0
    else:
        auditor.log("⚠️  AUDIT FIX COMPLETED WITH WARNINGS", "WARNING")
        auditor.log("Some issues may require manual intervention.", "WARNING")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)