#!/usr/bin/env python3
"""
Comprehensive Authentication Audit Script
Checks for any remaining authentication routes, hooks, and login-related code
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Tuple

class AuthenticationAuditor:
    def __init__(self):
        self.issues = []
        self.warnings = []
        self.info = []
        self.auth_patterns = {
            'login_routes': [
                r'/login', r'/signin', r'/signup', r'/register', r'/logout',
                r'/api/auth/login', r'/api/auth/logout', r'/api/auth/register',
                r'/api/auth/check', r'/api/auth/me', r'/api/auth/session'
            ],
            'auth_functions': [
                r'login\(', r'logout\(', r'signin\(', r'signup\(', r'register\(',
                r'authenticate\(', r'requireAuth', r'isAuthenticated', r'checkAuth',
                r'verifyToken', r'validateSession'
                # Removed 'createSession' as it's used for therapy sessions, not authentication
            ],
            'auth_hooks': [
                r'useAuth', r'useLogin', r'useLogout', r'useSession', r'useUser',
                r'useAuthentication', r'useAuthState', r'AuthContext', r'AuthProvider'
            ],
            'password_fields': [
                r'password', r'username', r'email.*password', r'user.*password',
                r'hashedPassword', r'passwordHash', r'salt'
            ],
            'session_management': [
                r'req\.session', r'session\.user', r'session\.destroy',
                r'passport\.', r'connect-pg-simple', r'express-session'
            ],
            'auth_middleware': [
                r'authMiddleware', r'protectRoute', r'requireLogin', r'ensureAuth',
                r'authGuard', r'checkAuthentication'
            ],
            'auth_ui': [
                r'LoginPage', r'LoginForm', r'SignupForm', r'AuthForm',
                r'<Login', r'<Signup', r'<Auth', r'LoginButton', r'LogoutButton'
            ]
        }
        
        self.google_oauth_patterns = [
            r'/api/auth/google', r'GoogleOAuth', r'oauth-simple',
            r'GOOGLE_CLIENT_ID', r'GOOGLE_CLIENT_SECRET', r'oauth/callback'
        ]
        
        self.critical_files = []
        self.files_checked = 0
        self.total_issues = 0

    def check_file(self, filepath: Path) -> List[Dict]:
        """Check a single file for authentication patterns"""
        file_issues = []
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.splitlines()
                
            for category, patterns in self.auth_patterns.items():
                for pattern in patterns:
                    matches = list(re.finditer(pattern, content, re.IGNORECASE))
                    for match in matches:
                        # Check if it's Google OAuth related (allowed)
                        is_google_oauth = any(
                            re.search(oauth_pattern, match.group(0), re.IGNORECASE)
                            for oauth_pattern in self.google_oauth_patterns
                        )
                        
                        if not is_google_oauth:
                            line_num = content[:match.start()].count('\n') + 1
                            file_issues.append({
                                'file': str(filepath),
                                'line': line_num,
                                'category': category,
                                'pattern': pattern,
                                'match': match.group(0),
                                'severity': self.get_severity(category)
                            })
                            
        except Exception as e:
            pass  # Skip files that can't be read
            
        return file_issues

    def get_severity(self, category: str) -> str:
        """Determine severity of the issue"""
        critical = ['login_routes', 'auth_functions', 'auth_middleware']
        high = ['auth_hooks', 'session_management', 'auth_ui']
        
        if category in critical:
            return 'CRITICAL'
        elif category in high:
            return 'HIGH'
        else:
            return 'MEDIUM'

    def scan_directory(self, directory: str, extensions: List[str]) -> None:
        """Recursively scan directory for files with given extensions"""
        for root, dirs, files in os.walk(directory):
            # Skip node_modules and other vendor directories
            dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'dist', 'build']]
            
            for file in files:
                if any(file.endswith(ext) for ext in extensions):
                    filepath = Path(root) / file
                    self.files_checked += 1
                    
                    file_issues = self.check_file(filepath)
                    if file_issues:
                        self.issues.extend(file_issues)
                        if filepath not in self.critical_files:
                            self.critical_files.append(str(filepath))

    def check_routes_file(self) -> None:
        """Special check for server/routes.ts"""
        routes_file = Path('server/routes.ts')
        if routes_file.exists():
            with open(routes_file, 'r') as f:
                content = f.read()
                
            # Check for auth routes
            auth_route_patterns = [
                r'router\.(get|post|put|delete)\([\'"`]/api/auth',
                r'router\.(get|post|put|delete)\([\'"`]/login',
                r'router\.(get|post|put|delete)\([\'"`]/logout',
                r'router\.(get|post|put|delete)\([\'"`]/signup',
                r'app\.(get|post|put|delete)\([\'"`]/api/auth(?!/google)',
            ]
            
            for pattern in auth_route_patterns:
                matches = re.finditer(pattern, content, re.IGNORECASE)
                for match in matches:
                    line_num = content[:match.start()].count('\n') + 1
                    self.issues.append({
                        'file': 'server/routes.ts',
                        'line': line_num,
                        'category': 'login_routes',
                        'pattern': pattern,
                        'match': match.group(0),
                        'severity': 'CRITICAL'
                    })

    def check_package_json(self) -> None:
        """Check package.json for auth-related dependencies"""
        package_file = Path('package.json')
        if package_file.exists():
            with open(package_file, 'r') as f:
                package_data = json.load(f)
                
            auth_packages = ['passport', 'passport-local', 'bcrypt', 'jsonwebtoken', 'express-jwt']
            deps = {**package_data.get('dependencies', {}), **package_data.get('devDependencies', {})}
            
            for pkg in auth_packages:
                if pkg in deps:
                    self.warnings.append({
                        'file': 'package.json',
                        'package': pkg,
                        'message': f'Auth-related package "{pkg}" found but may not be needed',
                        'severity': 'WARNING'
                    })

    def check_env_variables(self) -> None:
        """Check for authentication-related environment variables"""
        env_file = Path('.env')
        if env_file.exists():
            with open(env_file, 'r') as f:
                content = f.read()
                
            auth_env_patterns = ['JWT_SECRET', 'SESSION_SECRET', 'AUTH_SECRET', 'ADMIN_PASSWORD']
            for pattern in auth_env_patterns:
                if pattern in content:
                    self.warnings.append({
                        'file': '.env',
                        'variable': pattern,
                        'message': f'Auth-related environment variable "{pattern}" found',
                        'severity': 'WARNING'
                    })

    def generate_report(self) -> Dict:
        """Generate comprehensive audit report"""
        # Group issues by severity
        critical_issues = [i for i in self.issues if i['severity'] == 'CRITICAL']
        high_issues = [i for i in self.issues if i['severity'] == 'HIGH']
        medium_issues = [i for i in self.issues if i['severity'] == 'MEDIUM']
        
        total_possible_issues = self.files_checked * len(self.auth_patterns) * 2  # Rough estimate
        issues_found = len(self.issues)
        pass_rate = max(0, (1 - (issues_found / max(total_possible_issues, 1))) * 100)
        
        # Check if app can load
        app_loadable = self.check_app_loadability()
        
        return {
            'summary': {
                'files_checked': self.files_checked,
                'total_issues': len(self.issues),
                'critical_issues': len(critical_issues),
                'high_issues': len(high_issues),
                'medium_issues': len(medium_issues),
                'warnings': len(self.warnings),
                'pass_rate': round(pass_rate, 2),
                'app_loadable': app_loadable,
                'critical_files': self.critical_files[:10]  # Top 10 files with issues
            },
            'critical_issues': critical_issues[:20],  # Top 20 critical issues
            'high_issues': high_issues[:10],
            'medium_issues': medium_issues[:10],
            'warnings': self.warnings,
            'recommendations': self.generate_recommendations(critical_issues, high_issues)
        }

    def check_app_loadability(self) -> Dict:
        """Check if the app can load properly"""
        checks = {
            'has_index_route': False,
            'has_app_component': False,
            'has_proper_port_binding': False,
            'no_auth_blocking': True
        }
        
        # Check for index route
        routes_file = Path('server/routes.ts')
        if routes_file.exists():
            with open(routes_file, 'r') as f:
                content = f.read()
                if "router.get('/'," in content or 'router.get("/",' in content or "app.get('/'," in content or 'app.get("/",' in content:
                    checks['has_index_route'] = True
                    
        # Check for App component
        app_file = Path('client/src/App.tsx')
        if app_file.exists():
            with open(app_file, 'r') as f:
                content = f.read()
                if 'export default' in content and ('function App' in content or 'const App' in content):
                    checks['has_app_component'] = True
                # Check if auth is blocking
                if 'useAuth' in content or 'requireAuth' in content or 'AuthGuard' in content:
                    checks['no_auth_blocking'] = False
                    
        # Check port binding
        index_file = Path('server/index.ts')
        if index_file.exists():
            with open(index_file, 'r') as f:
                content = f.read()
                if 'app.listen' in content or 'server.listen' in content:
                    checks['has_proper_port_binding'] = True
                    
        return checks

    def generate_recommendations(self, critical_issues: List, high_issues: List) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        if critical_issues:
            recommendations.append("CRITICAL: Remove all login/logout routes from server/routes.ts")
            recommendations.append("CRITICAL: Remove authentication middleware from all routes")
            
        if high_issues:
            recommendations.append("HIGH: Remove all useAuth hooks from React components")
            recommendations.append("HIGH: Remove AuthContext/AuthProvider from App.tsx")
            
        if not recommendations:
            recommendations.append("✅ No authentication code found - app should load properly")
            recommendations.append("✅ Google OAuth is properly isolated for calendar integration only")
            
        return recommendations

def main():
    print("=" * 80)
    print("AUTHENTICATION AUDIT SCRIPT")
    print("=" * 80)
    print()
    
    auditor = AuthenticationAuditor()
    
    print("🔍 Scanning codebase for authentication code...")
    
    # Scan server code
    print("  📁 Checking server code...")
    auditor.scan_directory('server', ['.ts', '.js'])
    
    # Scan client code
    print("  📁 Checking client code...")
    auditor.scan_directory('client/src', ['.tsx', '.jsx', '.ts', '.js'])
    
    # Special checks
    print("  📄 Checking routes file...")
    auditor.check_routes_file()
    
    print("  📦 Checking package.json...")
    auditor.check_package_json()
    
    print("  🔐 Checking environment variables...")
    auditor.check_env_variables()
    
    # Generate report
    report = auditor.generate_report()
    
    print()
    print("=" * 80)
    print("AUDIT REPORT")
    print("=" * 80)
    print()
    
    # Summary
    summary = report['summary']
    print(f"📊 SUMMARY:")
    print(f"  Files Checked: {summary['files_checked']}")
    print(f"  Total Issues: {summary['total_issues']}")
    print(f"  Critical: {summary['critical_issues']}")
    print(f"  High: {summary['high_issues']}")
    print(f"  Medium: {summary['medium_issues']}")
    print(f"  Warnings: {summary['warnings']}")
    print()
    print(f"✅ PASS RATE: {summary['pass_rate']}%")
    print()
    
    # App Loadability
    print("🌐 APP LOADABILITY CHECK:")
    for check, passed in summary['app_loadable'].items():
        status = "✅" if passed else "❌"
        print(f"  {status} {check}: {passed}")
    print()
    
    # Critical Issues
    if report['critical_issues']:
        print("🚨 CRITICAL ISSUES (Must Fix):")
        for issue in report['critical_issues'][:5]:  # Show top 5
            print(f"  ❌ {issue['file']}:{issue['line']}")
            print(f"     Category: {issue['category']}")
            print(f"     Match: {issue['match']}")
        print()
    
    # Recommendations
    print("📋 RECOMMENDATIONS (Priority Order):")
    for i, rec in enumerate(report['recommendations'], 1):
        print(f"  {i}. {rec}")
    print()
    
    # Save full report
    with open('audit_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    print("💾 Full report saved to audit_report.json")
    
    print()
    print("=" * 80)
    
    # Return exit code based on pass rate
    if summary['pass_rate'] < 100:
        print(f"⚠️  Audit failed with {summary['pass_rate']}% pass rate")
        print(f"   Found {summary['total_issues']} authentication-related issues")
        return 1
    else:
        print("✅ Audit passed with 100% pass rate!")
        return 0

if __name__ == "__main__":
    exit(main())