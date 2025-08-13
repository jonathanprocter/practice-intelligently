#!/usr/bin/env python3
"""
Security Cleanup Script - Removes exposed secrets and hardcoded API keys
"""

import os
import re
from pathlib import Path

def clean_security_issues():
    """Clean security issues by removing hardcoded secrets"""
    
    print("🔒 Cleaning security issues...")
    
    # Patterns that might indicate hardcoded secrets (but are actually just variable names/patterns)
    safe_patterns = [
        r'process\.env\.',
        r'apiKey:\s*process\.env\.',
        r'key:\s*process\.env\.',
        r'secret:\s*process\.env\.',
        r'token:\s*process\.env\.',
        r'API_KEY',
        r'SECRET',
        r'TOKEN'
    ]
    
    files_processed = 0
    
    for root, dirs, files in os.walk("."):
        # Skip irrelevant directories
        dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '.next', 'dist', '__pycache__']]
        
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Check if file has any potential security issues that need fixing
                    # Most of our "security issues" are actually just environment variable references
                    # which are correct. We'll focus on actual hardcoded values.
                    
                    # Look for actual hardcoded API keys (long alphanumeric strings)
                    hardcoded_patterns = [
                        r'["\']sk-[a-zA-Z0-9]{32,}["\']',  # OpenAI API keys
                        r'["\']pk_[a-zA-Z0-9]{32,}["\']',  # Public keys
                        r'["\'][A-Za-z0-9]{32,}["\'](?=.*(?:api|key|secret|token))'  # Generic long strings near key words
                    ]
                    
                    modified = False
                    for pattern in hardcoded_patterns:
                        if re.search(pattern, content):
                            # Replace with environment variable reference
                            content = re.sub(pattern, '"process.env.API_KEY"', content)
                            modified = True
                    
                    if modified:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(content)
                        files_processed += 1
                        print(f"  Cleaned: {file_path}")
                        
                except Exception as e:
                    print(f"  Error processing {file_path}: {e}")
                    continue
    
    print(f"🔒 Security cleanup completed. {files_processed} files processed.")
    return files_processed

def clean_console_logs():
    """Remove console.log statements from client code"""
    
    print("🧹 Cleaning console.log statements...")
    
    files_cleaned = 0
    statements_removed = 0
    
    for root, dirs, files in os.walk("client"):
        for file in files:
            if file.endswith(('.ts', '.tsx', '.js', '.jsx')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                    
                    modified = False
                    new_lines = []
                    
                    for line in lines:
                        # Check if line contains console.log and is not already commented
                        if 'console.log' in line and not line.strip().startswith('//'):
                            # Comment out the line instead of removing it
                            indentation = len(line) - len(line.lstrip())
                            new_lines.append(' ' * indentation + '// ' + line.lstrip())
                            modified = True
                            statements_removed += 1
                        else:
                            new_lines.append(line)
                    
                    if modified:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.writelines(new_lines)
                        files_cleaned += 1
                        print(f"  Cleaned: {file_path}")
                        
                except Exception as e:
                    print(f"  Error processing {file_path}: {e}")
                    continue
    
    print(f"🧹 Console.log cleanup completed. {statements_removed} statements commented out in {files_cleaned} files.")
    return files_cleaned, statements_removed

def main():
    print("🚀 Starting security and code quality cleanup...")
    
    security_files = clean_security_issues()
    console_files, console_statements = clean_console_logs()
    
    print(f"\n📊 Cleanup Summary:")
    print(f"  Security issues processed: {security_files} files")
    print(f"  Console.log statements cleaned: {console_statements} in {console_files} files")
    
    return security_files + console_files

if __name__ == "__main__":
    main()