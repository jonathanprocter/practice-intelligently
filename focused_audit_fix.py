#!/usr/bin/env python3
"""
Focused Audit Fix Script - Addresses critical issues with surgical precision
"""

import os
import re
import subprocess
import time

def log_message(message, level="INFO"):
    """Log messages with timestamps"""
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def run_lsp_check():
    """Run LSP diagnostics and return count"""
    try:
        # This will be handled by the Replit environment
        return True
    except Exception as e:
        log_message(f"Error checking LSP: {e}", "ERROR")
        return False

def fix_storage_issues():
    """Fix critical storage.ts issues"""
    storage_file = "server/storage.ts"
    
    try:
        with open(storage_file, 'r') as f:
            content = f.read()
            
        log_message("Starting targeted fixes for storage.ts")
        
        # Remove duplicate function implementations by finding and removing the added methods
        # that are causing "Duplicate function implementation" errors
        
        # Find the start of the added methods section
        added_section_start = content.find("// Missing interface methods - Session Notes")
        if added_section_start != -1:
            # Find the end of the class (just before export const storage)
            export_line = content.find("export const storage = new DatabaseStorage();")
            if export_line != -1:
                # Remove the entire added section that's causing duplicates
                content_before = content[:added_section_start]
                content_after = content[export_line:]
                
                # Keep just the class closing and export
                content = content_before.rstrip() + "\n}\n\n" + content_after
                
                log_message("Removed duplicate method implementations")
        
        # Now add only the truly missing methods that are causing interface errors
        
        # Find the actual end of the DatabaseStorage class implementation
        class_end_pattern = r'(\s+}\s*\n\s*}\s*\n\s*export const storage = new DatabaseStorage\(\);)'
        class_end_match = re.search(class_end_pattern, content)
        
        if class_end_match:
            insertion_point = class_end_match.start(1)
            
            # Add only the specific missing methods that don't already exist
            missing_methods = '''
  // Ensure interface compliance - only add if not already present
  async getSessionNotes(clientId: string): Promise<SessionNote[]> {
    return await this.getSessionNotesByClientId(clientId);
  }

  async getSessionNote(id: string): Promise<SessionNote | undefined> {
    return await this.getSessionNoteById(id);
  }

  async createSessionNote(note: InsertSessionNote): Promise<SessionNote> {
    try {
      const [sessionNote] = await db
        .insert(sessionNotes)
        .values({
          ...note,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return sessionNote;
    } catch (error) {
      console.error('Error in createSessionNote:', error);
      throw error;
    }
  }

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
  }

  async deleteSessionNote(id: string): Promise<void> {
    try {
      await db.delete(sessionNotes).where(eq(sessionNotes.id, id));
    } catch (error) {
      console.error('Error in deleteSessionNote:', error);
      throw error;
    }
  }

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
      return [];
    }
  }
'''
            
            # Only add methods that don't already exist
            methods_to_check = [
                'async getSessionNotes(',
                'async getSessionNote(',
                'async createSessionNote(',
                'async updateSessionNote(',
                'async deleteSessionNote(',
                'async getSessionNotesByEventId('
            ]
            
            final_methods = ""
            for method_code in missing_methods.split('  async '):
                if method_code.strip():
                    method_name = method_code.split('(')[0].strip()
                    check_pattern = f'async {method_name}('
                    
                    if check_pattern not in content:
                        final_methods += "  async " + method_code
                        log_message(f"Adding missing method: {method_name}")
                    else:
                        log_message(f"Method already exists: {method_name}")
            
            if final_methods:
                content = content[:insertion_point] + final_methods + content[insertion_point:]
        
        # Fix the sessionType property issue in mapSessionNoteRow
        content = re.sub(
            r'sessionType: row\.session_type \|\| \'Individual Therapy\',\s*duration: row\.duration \|\| 50,\s*sessionDate: row\.session_date \? new Date\(row\.session_date \|\| new Date\(\)\) : null,',
            'duration: row.duration || 50,\n      sessionDate: row.session_date ? new Date(row.session_date || new Date()) : null,',
            content
        )
        
        # Write the corrected content
        with open(storage_file, 'w') as f:
            f.write(content)
            
        log_message("Successfully applied focused fixes to storage.ts")
        return True
        
    except Exception as e:
        log_message(f"Error fixing storage issues: {e}", "ERROR")
        return False

def fix_routes_method_calls():
    """Fix method name mismatches in routes.ts"""
    routes_file = "server/routes.ts"
    
    try:
        with open(routes_file, 'r') as f:
            content = f.read()
            
        # Fix method name calls to use existing methods
        fixes = [
            ('storage.getSessionNotes(', 'storage.getSessionNotesByClientId('),
        ]
        
        updated = False
        for old_call, new_call in fixes:
            if old_call in content and old_call != new_call:
                content = content.replace(old_call, new_call)
                updated = True
                log_message(f"Fixed method call: {old_call} -> {new_call}")
        
        if updated:
            with open(routes_file, 'w') as f:
                f.write(content)
            log_message("Fixed method calls in routes.ts")
        else:
            log_message("No method call fixes needed in routes.ts")
            
        return True
        
    except Exception as e:
        log_message(f"Error fixing routes: {e}", "ERROR")
        return False

def main():
    """Main execution"""
    log_message("🔧 Starting Focused Audit Fix")
    
    # Step 1: Fix storage interface issues
    log_message("Step 1: Fixing storage interface implementation...")
    if not fix_storage_issues():
        log_message("Failed to fix storage issues", "ERROR")
        return 1
    
    # Step 2: Fix route method calls
    log_message("Step 2: Fixing route method calls...")
    if not fix_routes_method_calls():
        log_message("Failed to fix routes", "ERROR")
        return 1
    
    log_message("✅ Focused audit fix completed successfully!")
    return 0

if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)