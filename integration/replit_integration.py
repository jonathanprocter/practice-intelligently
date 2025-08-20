"""
Replit Integration Functions for Bidirectional Export
"""

import os
import json
from datetime import datetime

class ReplitBidirectionalIntegration:
    def __init__(self):
        self.project_root = os.getcwd()
        self.integration_log = []
    
    def setup_bidirectional_export(self):
        """Set up bidirectional export in Replit environment"""
        print("🔧 Setting up bidirectional export integration...")
        
        # Check required directories
        required_dirs = [
            'client/src/utils',
            'client/src/pages',
            'server',
            'api',
            'audit',
            'tests'
        ]
        
        for dir_path in required_dirs:
            full_path = os.path.join(self.project_root, dir_path)
            if os.path.exists(full_path):
                self.log_integration(f"✅ Directory exists: {dir_path}")
            else:
                self.log_integration(f"❌ Missing directory: {dir_path}")
        
        # Check required files
        required_files = [
            'client/src/utils/bidirectionalWeeklyPackage.ts',
            'client/src/utils/bidirectionalWeeklyPackageLinked.ts',
            'client/src/utils/bidirectionalLinkedPDFExport.ts',
            'client/src/pages/planner.tsx'
        ]
        
        for file_path in required_files:
            full_path = os.path.join(self.project_root, file_path)
            if os.path.exists(full_path):
                self.log_integration(f"✅ File exists: {file_path}")
            else:
                self.log_integration(f"❌ Missing file: {file_path}")
        
        return self.generate_integration_report()
    
    def log_integration(self, message):
        """Log integration step"""
        timestamp = datetime.now().isoformat()
        log_entry = {
            'timestamp': timestamp,
            'message': message
        }
        self.integration_log.append(log_entry)
        print(f"[{timestamp}] {message}")
    
    def generate_integration_report(self):
        """Generate integration report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'project_root': self.project_root,
            'integration_steps': len(self.integration_log),
            'log': self.integration_log,
            'status': 'completed'
        }
        
        # Save report
        report_path = os.path.join(self.project_root, 'bidirectional_integration_report.json')
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"📊 Integration report saved: {report_path}")
        return report

if __name__ == "__main__":
    integration = ReplitBidirectionalIntegration()
    integration.setup_bidirectional_export()
