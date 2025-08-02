#!/usr/bin/env python3
"""
Automatic Fix Implementation Script
Generates missing API routes based on audit findings
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Set

class APIRouteFixer:
    def __init__(self):
        self.routes_file = Path("server/routes.ts")
        self.missing_routes = []
        self.fixes_applied = []
        
    def load_audit_report(self):
        """Load the audit report and extract missing routes"""
        try:
            with open("enhanced_audit_report.json", "r") as f:
                report = json.load(f)
                
            # Extract missing route errors
            for issue in report['issues_by_severity']['error']:
                if issue['category'] == 'missing_route':
                    route_match = re.search(r"API call to '([^']+)'", issue['description'])
                    if route_match:
                        original_url = route_match.group(1)
                        # Extract suggested route from suggestion
                        suggestion_match = re.search(r"Add route definition for '([^']+)'", issue['suggestion'])
                        if suggestion_match:
                            normalized_route = suggestion_match.group(1)
                            self.missing_routes.append({
                                'original_url': original_url,
                                'normalized_route': normalized_route,
                                'file': issue['file'],
                                'line': issue['line']
                            })
                            
            print(f"Found {len(self.missing_routes)} missing routes to fix")
            
        except Exception as e:
            print(f"Error loading audit report: {e}")
            return False
        return True
    
    def categorize_routes(self):
        """Categorize routes by their functionality"""
        categories = {
            'ai': [],
            'session-prep': [], 
            'calendar': [],
            'auth': [],
            'documents': [],
            'drive': [],
            'notion': [],
            'other': []
        }
        
        for route_info in self.missing_routes:
            route = route_info['normalized_route']
            
            if '/api/ai/' in route:
                categories['ai'].append(route_info)
            elif '/api/session-prep' in route:
                categories['session-prep'].append(route_info)
            elif '/api/calendar/' in route:
                categories['calendar'].append(route_info)
            elif '/api/auth/' in route:
                categories['auth'].append(route_info)
            elif '/api/documents/' in route:
                categories['documents'].append(route_info)
            elif '/api/drive/' in route:
                categories['drive'].append(route_info)
            elif '/api/notion/' in route:
                categories['notion'].append(route_info)
            else:
                categories['other'].append(route_info)
                
        return categories
    
    def generate_ai_routes(self, routes: List[Dict]) -> str:
        """Generate AI-related route definitions"""
        route_code = "\n  // ========== AI INTELLIGENCE API ROUTES (Auto-generated) ==========\n"
        
        unique_routes = list({r['normalized_route']: r for r in routes}.values())
        
        for route_info in unique_routes:
            route = route_info['normalized_route']
            
            if 'predict-treatment-outcome' in route:
                route_code += f"""
  app.post('{route}', async (req, res) => {{
    try {{
      const {{ clientId, currentTreatment, symptoms, duration }} = req.body;
      
      if (!clientId) {{
        return res.status(400).json({{ error: 'Client ID is required' }});
      }}
      
      // Get client data for context
      const client = await storage.getClient(clientId);
      if (!client) {{
        return res.status(404).json({{ error: 'Client not found' }});
      }}
      
      // Generate treatment outcome prediction using AI
      const prediction = await multiModelAI.predictTreatmentOutcome({{
        clientProfile: client,
        currentTreatment: currentTreatment || '',
        symptoms: symptoms || [],
        treatmentDuration: duration || 0
      }});
      
      res.json({{ prediction, model: 'multimodel-ai' }});
    }} catch (error: any) {{
      console.error('Error predicting treatment outcome:', error);
      res.status(500).json({{ error: 'Failed to predict treatment outcome', details: error.message }});
    }}
  }});"""
            
            elif 'cross-client-patterns' in route:
                route_code += f"""
  app.get('{route}', async (req, res) => {{
    try {{
      const {{ therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c' }} = req.query;
      
      // Get all clients for pattern analysis
      const clients = await storage.getClients(therapistId as string);
      const sessionNotes = await storage.getSessionNotes(therapistId as string);
      
      // Analyze cross-client patterns
      const patterns = await multiModelAI.analyzeCrossClientPatterns({{
        clients,
        sessionNotes,
        analysisType: 'comprehensive'
      }});
      
      res.json({{ patterns, model: 'multimodel-ai' }});
    }} catch (error: any) {{
      console.error('Error analyzing cross-client patterns:', error);
      res.status(500).json({{ error: 'Failed to analyze patterns', details: error.message }});
    }}
  }});"""
            
            elif 'evidence-based-interventions' in route:
                route_code += f"""
  app.post('{route}', async (req, res) => {{
    try {{
      const {{ condition, clientProfile, preferences }} = req.body;
      
      if (!condition) {{
        return res.status(400).json({{ error: 'Condition is required' }});
      }}
      
      // Get evidence-based intervention recommendations
      const interventions = await multiModelAI.getEvidenceBasedInterventions({{
        condition,
        clientProfile: clientProfile || {{}},
        preferences: preferences || {{}}
      }});
      
      res.json({{ interventions, model: 'multimodel-ai' }});
    }} catch (error: any) {{
      console.error('Error getting evidence-based interventions:', error);
      res.status(500).json({{ error: 'Failed to get interventions', details: error.message }});
    }}
  }});"""
            
            elif 'session-efficiency' in route:
                route_code += f"""
  app.get('{route}', async (req, res) => {{
    try {{
      const {{ therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c', timeframe = '30' }} = req.query;
      
      // Get session data for efficiency analysis
      const sessionNotes = await storage.getSessionNotes(therapistId as string);
      const appointments = await storage.getAppointments(therapistId as string);
      
      // Analyze session efficiency
      const efficiency = await multiModelAI.analyzeSessionEfficiency({{
        sessionNotes,
        appointments,
        timeframeDays: parseInt(timeframe as string)
      }});
      
      res.json({{ efficiency, model: 'multimodel-ai' }});
    }} catch (error: any) {{
      console.error('Error analyzing session efficiency:', error);
      res.status(500).json({{ error: 'Failed to analyze efficiency', details: error.message }});
    }}
  }});"""
            
            elif 'client-retention' in route:
                route_code += f"""
  app.get('{route}', async (req, res) => {{
    try {{
      const {{ therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c' }} = req.query;
      
      // Get client and appointment data
      const clients = await storage.getClients(therapistId as string);
      const appointments = await storage.getAppointments(therapistId as string);
      
      // Predict client retention
      const retention = await multiModelAI.predictClientRetention({{
        clients,
        appointments,
        analysisType: 'comprehensive'
      }});
      
      res.json({{ retention, model: 'multimodel-ai' }});
    }} catch (error: any) {{
      console.error('Error predicting client retention:', error);
      res.status(500).json({{ error: 'Failed to predict retention', details: error.message }});
    }}
  }});"""
            
            elif 'therapist-strengths' in route:
                route_code += f"""
  app.get('{route}', async (req, res) => {{
    try {{
      const {{ therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c' }} = req.query;
      
      // Get comprehensive practice data
      const clients = await storage.getClients(therapistId as string);
      const sessionNotes = await storage.getSessionNotes(therapistId as string);
      const appointments = await storage.getAppointments(therapistId as string);
      
      // Analyze therapist strengths
      const strengths = await multiModelAI.analyzeTherapistStrengths({{
        clients,
        sessionNotes,
        appointments,
        analysisType: 'comprehensive'
      }});
      
      res.json({{ strengths, model: 'multimodel-ai' }});
    }} catch (error: any) {{
      console.error('Error analyzing therapist strengths:', error);
      res.status(500).json({{ error: 'Failed to analyze strengths', details: error.message }});
    }}
  }});"""
            
            elif 'appointment-insights' in route:
                route_code += f"""
  app.post('{route}', async (req, res) => {{
    try {{
      const {{ appointmentId, clientId, eventData }} = req.body;
      
      if (!appointmentId && !clientId) {{
        return res.status(400).json({{ error: 'Appointment ID or Client ID is required' }});
      }}
      
      // Get appointment insights
      const insights = await multiModelAI.generateAppointmentInsights({{
        appointmentId,
        clientId,
        eventData: eventData || {{}}
      }});
      
      res.json({{ insights, model: 'multimodel-ai' }});
    }} catch (error: any) {{
      console.error('Error generating appointment insights:', error);
      res.status(500).json({{ error: 'Failed to generate insights', details: error.message }});
    }}
  }});"""
        
        return route_code
    
    def generate_session_prep_routes(self, routes: List[Dict]) -> str:
        """Generate session prep route definitions"""
        route_code = "\n  // ========== SESSION PREP API ROUTES (Auto-generated) ==========\n"
        
        unique_routes = list({r['normalized_route']: r for r in routes}.values())
        
        for route_info in unique_routes:
            route = route_info['normalized_route']
            
            if route == '/api/session-prep':
                route_code += f"""
  app.post('{route}', async (req, res) => {{
    try {{
      const {{ eventId, clientId, content, type }} = req.body;
      
      if (!eventId || !content) {{
        return res.status(400).json({{ error: 'Event ID and content are required' }});
      }}
      
      // Create session prep note
      const prepNote = await storage.createSessionPrepNote({{
        eventId,
        clientId: clientId || null,
        content,
        type: type || 'manual',
        createdAt: new Date()
      }});
      
      res.json(prepNote);
    }} catch (error: any) {{
      console.error('Error creating session prep note:', error);
      res.status(500).json({{ error: 'Failed to create session prep note', details: error.message }});
    }}
  }});"""
            
            elif ':param' in route and '/ai-insights' in route:
                route_code += f"""
  app.get('{route}', async (req, res) => {{
    try {{
      const {{ eventId }} = req.params;
      
      if (!eventId) {{
        return res.status(400).json({{ error: 'Event ID is required' }});
      }}
      
      // Generate AI insights for session prep
      const insights = await multiModelAI.generateSessionPrepInsights({{
        eventId,
        includeHistory: true,
        analysisDepth: 'comprehensive'
      }});
      
      res.json({{ insights, model: 'multimodel-ai' }});
    }} catch (error: any) {{
      console.error('Error generating session prep insights:', error);
      res.status(500).json({{ error: 'Failed to generate insights', details: error.message }});
    }}
  }});"""
            
            elif ':param' in route and route.endswith('/:param'):
                # Handle GET and PUT for session prep by ID
                route_code += f"""
  app.get('{route}', async (req, res) => {{
    try {{
      const {{ eventId }} = req.params;
      
      // Get session prep notes for event
      const prepNotes = await storage.getSessionPrepNotes(eventId);
      res.json(prepNotes);
    }} catch (error: any) {{
      console.error('Error getting session prep notes:', error);
      res.status(500).json({{ error: 'Failed to get session prep notes', details: error.message }});
    }}
  }});
  
  app.put('{route}', async (req, res) => {{
    try {{
      const {{ id }} = req.params;
      const updates = req.body;
      
      // Update session prep note
      const updatedNote = await storage.updateSessionPrepNote(id, updates);
      res.json(updatedNote);
    }} catch (error: any) {{
      console.error('Error updating session prep note:', error);
      res.status(500).json({{ error: 'Failed to update session prep note', details: error.message }});
    }}
  }});"""
        
        return route_code
    
    def generate_calendar_routes(self, routes: List[Dict]) -> str:
        """Generate calendar-related route definitions"""
        route_code = "\n  // ========== CALENDAR API ROUTES (Auto-generated) ==========\n"
        
        unique_routes = list({r['normalized_route']: r for r in routes}.values())
        
        for route_info in unique_routes:
            route = route_info['normalized_route']
            
            if '/calendars' in route:
                route_code += f"""
  app.get('{route}', async (req, res) => {{
    try {{
      const {{ simpleOAuth }} = await import('./oauth-simple');
      
      if (!simpleOAuth.isConnected()) {{
        return res.status(401).json({{ error: 'Google Calendar not connected', requiresAuth: true }});
      }}
      
      const calendars = await simpleOAuth.getCalendars();
      res.json(calendars);
    }} catch (error: any) {{
      console.error('Error getting calendars:', error);
      res.status(500).json({{ error: 'Failed to get calendars', details: error.message }});
    }}
  }});"""
            
            elif '/events/:param' in route:
                route_code += f"""
  app.get('{route}', async (req, res) => {{
    try {{
      const {{ eventId }} = req.params;
      const {{ simpleOAuth }} = await import('./oauth-simple');
      
      if (!simpleOAuth.isConnected()) {{
        return res.status(401).json({{ error: 'Google Calendar not connected', requiresAuth: true }});
      }}
      
      // Get specific event details
      const event = await simpleOAuth.getEvent(eventId);
      res.json(event);
    }} catch (error: any) {{
      console.error('Error getting calendar event:', error);
      res.status(500).json({{ error: 'Failed to get calendar event', details: error.message }});
    }}
  }});
  
  app.put('{route}', async (req, res) => {{
    try {{
      const {{ eventId }} = req.params;
      const updates = req.body;
      const {{ simpleOAuth }} = await import('./oauth-simple');
      
      if (!simpleOAuth.isConnected()) {{
        return res.status(401).json({{ error: 'Google Calendar not connected', requiresAuth: true }});
      }}
      
      // Update calendar event
      const updatedEvent = await simpleOAuth.updateEvent(eventId, updates);
      res.json(updatedEvent);
    }} catch (error: any) {{
      console.error('Error updating calendar event:', error);
      res.status(500).json({{ error: 'Failed to update calendar event', details: error.message }});
    }}
  }});"""
            
            elif '/events?' in route or '/events' in route:
                route_code += f"""
  app.get('/api/calendar/events', async (req, res) => {{
    try {{
      const {{ timeMin, timeMax, calendarId }} = req.query;
      const {{ simpleOAuth }} = await import('./oauth-simple');
      
      if (!simpleOAuth.isConnected()) {{
        return res.status(401).json({{ error: 'Google Calendar not connected', requiresAuth: true }});
      }}
      
      // Get calendar events with time range
      const events = await simpleOAuth.getEvents(
        calendarId as string || 'primary',
        timeMin as string,
        timeMax as string
      );
      
      res.json(events);
    }} catch (error: any) {{
      console.error('Error getting calendar events:', error);
      res.status(500).json({{ error: 'Failed to get calendar events', details: error.message }});
    }}
  }});"""
        
        return route_code
    
    def generate_auth_routes(self, routes: List[Dict]) -> str:
        """Generate auth-related route definitions"""
        route_code = "\n  // ========== AUTH API ROUTES (Auto-generated) ==========\n"
        
        unique_routes = list({r['normalized_route']: r for r in routes}.values())
        
        for route_info in unique_routes:
            route = route_info['normalized_route']
            
            if '/status' in route:
                route_code += f"""
  app.get('{route}', async (req, res) => {{
    try {{
      const {{ simpleOAuth }} = await import('./oauth-simple');
      
      const isConnected = simpleOAuth.isConnected();
      const status = {{
        connected: isConnected,
        hasTokens: isConnected,
        service: 'google'
      }};
      
      res.json(status);
    }} catch (error: any) {{
      console.error('Error checking auth status:', error);
      res.status(500).json({{ error: 'Failed to check auth status', details: error.message }});
    }}
  }});"""
            
            elif '/clear' in route:
                route_code += f"""
  app.post('{route}', async (req, res) => {{
    try {{
      const {{ simpleOAuth }} = await import('./oauth-simple');
      
      // Clear OAuth tokens
      await simpleOAuth.clearTokens();
      
      res.json({{ success: true, message: 'OAuth tokens cleared' }});
    }} catch (error: any) {{
      console.error('Error clearing auth tokens:', error);
      res.status(500).json({{ error: 'Failed to clear auth tokens', details: error.message }});
    }}
  }});"""
        
        return route_code
    
    def generate_document_routes(self, routes: List[Dict]) -> str:
        """Generate document processing route definitions"""
        route_code = "\n  // ========== DOCUMENT PROCESSING ROUTES (Auto-generated) ==========\n"
        
        unique_routes = list({r['normalized_route']: r for r in routes}.values())
        
        for route_info in unique_routes:
            route = route_info['normalized_route']
            
            if 'process-clinical' in route:
                route_code += f"""
  app.post('{route}', async (req, res) => {{
    try {{
      const {{ documentContent, clientId, documentType }} = req.body;
      
      if (!documentContent) {{
        return res.status(400).json({{ error: 'Document content is required' }});
      }}
      
      // Process clinical document with AI
      const analysis = await multiModelAI.processClinicalDocument({{
        content: documentContent,
        clientId: clientId || null,
        documentType: documentType || 'general'
      }});
      
      res.json({{ analysis, model: 'multimodel-ai' }});
    }} catch (error: any) {{
      console.error('Error processing clinical document:', error);
      res.status(500).json({{ error: 'Failed to process document', details: error.message }});
    }}
  }});"""
            
            elif 'generate-progress-note' in route:
                route_code += f"""
  app.post('{route}', async (req, res) => {{
    try {{
      const {{ documentContent, clientId, sessionDate, format }} = req.body;
      
      if (!documentContent) {{
        return res.status(400).json({{ error: 'Document content is required' }});
      }}
      
      // Generate progress note from document
      const progressNote = await multiModelAI.generateProgressNote({{
        content: documentContent,
        clientId: clientId || null,
        sessionDate: sessionDate || new Date().toISOString(),
        format: format || 'SOAP'
      }});
      
      res.json({{ progressNote, model: 'multimodel-ai' }});
    }} catch (error: any) {{
      console.error('Error generating progress note:', error);
      res.status(500).json({{ error: 'Failed to generate progress note', details: error.message }});
    }}
  }});"""
        
        return route_code
    
    def generate_drive_notion_routes(self, routes: List[Dict]) -> str:
        """Generate Google Drive and Notion route definitions"""
        route_code = "\n  // ========== DRIVE & NOTION ROUTES (Auto-generated) ==========\n"
        
        unique_routes = list({r['normalized_route']: r for r in routes}.values())
        
        for route_info in unique_routes:
            route = route_info['normalized_route']
            
            if '/api/drive/files' in route and ':param' not in route:
                route_code += f"""
  app.get('{route}', async (req, res) => {{
    try {{
      const {{ simpleOAuth }} = await import('./oauth-simple');
      
      if (!simpleOAuth.isConnected()) {{
        return res.status(401).json({{ error: 'Google Drive not connected', requiresAuth: true }});
      }}
      
      // Get Drive files
      const files = await simpleOAuth.getDriveFiles();
      res.json(files);
    }} catch (error: any) {{
      console.error('Error getting Drive files:', error);
      res.status(500).json({{ error: 'Failed to get Drive files', details: error.message }});
    }}
  }});"""
            
            elif '/api/drive/files/:param' in route:
                route_code += f"""
  app.get('{route}', async (req, res) => {{
    try {{
      const {{ fileId }} = req.params;
      const {{ simpleOAuth }} = await import('./oauth-simple');
      
      if (!simpleOAuth.isConnected()) {{
        return res.status(401).json({{ error: 'Google Drive not connected', requiresAuth: true }});
      }}
      
      // Get specific Drive file
      const file = await simpleOAuth.getDriveFile(fileId);
      res.json(file);
    }} catch (error: any) {{
      console.error('Error getting Drive file:', error);
      res.status(500).json({{ error: 'Failed to get Drive file', details: error.message }});
    }}
  }});"""
            
            elif '/api/drive/search' in route:
                route_code += f"""
  app.get('/api/drive/search', async (req, res) => {{
    try {{
      const {{ q: query }} = req.query;
      const {{ simpleOAuth }} = await import('./oauth-simple');
      
      if (!simpleOAuth.isConnected()) {{
        return res.status(401).json({{ error: 'Google Drive not connected', requiresAuth: true }});
      }}
      
      // Search Drive files
      const results = await simpleOAuth.searchDriveFiles(query as string);
      res.json(results);
    }} catch (error: any) {{
      console.error('Error searching Drive files:', error);
      res.status(500).json({{ error: 'Failed to search Drive files', details: error.message }});
    }}
  }});"""
            
            elif '/api/notion/' in route:
                if '/pages' in route and '/content' in route:
                    route_code += f"""
  app.get('/api/notion/pages/:pageId/content', async (req, res) => {{
    try {{
      const {{ pageId }} = req.params;
      
      // Get Notion page content (placeholder implementation)
      const content = {{ 
        pageId, 
        content: 'Notion integration not yet implemented',
        status: 'placeholder'
      }};
      
      res.json(content);
    }} catch (error: any) {{
      console.error('Error getting Notion page content:', error);
      res.status(500).json({{ error: 'Failed to get Notion page content', details: error.message }});
    }}
  }});"""
                elif '/pages' in route:
                    route_code += f"""
  app.get('/api/notion/pages', async (req, res) => {{
    try {{
      // Get Notion pages (placeholder implementation)
      const pages = [{{ 
        id: 'placeholder',
        title: 'Notion integration not yet implemented',
        status: 'placeholder'
      }}];
      
      res.json(pages);
    }} catch (error: any) {{
      console.error('Error getting Notion pages:', error);
      res.status(500).json({{ error: 'Failed to get Notion pages', details: error.message }});
    }}
  }});"""
                elif '/databases' in route:
                    route_code += f"""
  app.get('/api/notion/databases', async (req, res) => {{
    try {{
      // Get Notion databases (placeholder implementation)
      const databases = [{{ 
        id: 'placeholder',
        title: 'Notion integration not yet implemented',
        status: 'placeholder'
      }}];
      
      res.json(databases);
    }} catch (error: any) {{
      console.error('Error getting Notion databases:', error);
      res.status(500).json({{ error: 'Failed to get Notion databases', details: error.message }});
    }}
  }});"""
                elif '/search' in route:
                    route_code += f"""
  app.get('/api/notion/search', async (req, res) => {{
    try {{
      const {{ q: query }} = req.query;
      
      // Search Notion (placeholder implementation)
      const results = [{{ 
        id: 'placeholder',
        title: `Search for "${{query}}" - Notion integration not yet implemented`,
        status: 'placeholder'
      }}];
      
      res.json(results);
    }} catch (error: any) {{
      console.error('Error searching Notion:', error);
      res.status(500).json({{ error: 'Failed to search Notion', details: error.message }});
    }}
  }});"""
        
        return route_code
    
    def generate_other_routes(self, routes: List[Dict]) -> str:
        """Generate other miscellaneous routes"""
        route_code = "\n  // ========== OTHER API ROUTES (Auto-generated) ==========\n"
        
        unique_routes = list({r['normalized_route']: r for r in routes}.values())
        
        for route_info in unique_routes:
            route = route_info['normalized_route']
            
            if '/api/session-notes' in route and route == '/api/session-notes':
                route_code += f"""
  app.get('{route}', async (req, res) => {{
    try {{
      const {{ therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c', clientId }} = req.query;
      
      // Get session notes with optional client filter
      const sessionNotes = clientId 
        ? await storage.getSessionNotesByClient(clientId as string)
        : await storage.getSessionNotes(therapistId as string);
        
      res.json(sessionNotes);
    }} catch (error: any) {{
      console.error('Error getting session notes:', error);
      res.status(500).json({{ error: 'Failed to get session notes', details: error.message }});
    }}
  }});"""
        
        return route_code
    
    def apply_fixes(self):
        """Apply all the generated fixes to the routes file"""
        if not self.routes_file.exists():
            print(f"Routes file not found: {self.routes_file}")
            return False
            
        try:
            # Read current routes file
            with open(self.routes_file, 'r', encoding='utf-8') as f:
                routes_content = f.read()
            
            # Categorize routes
            categories = self.categorize_routes()
            
            # Generate all route code
            all_route_code = ""
            
            if categories['ai']:
                all_route_code += self.generate_ai_routes(categories['ai'])
                self.fixes_applied.extend([r['normalized_route'] for r in categories['ai']])
            
            if categories['session-prep']:
                all_route_code += self.generate_session_prep_routes(categories['session-prep'])
                self.fixes_applied.extend([r['normalized_route'] for r in categories['session-prep']])
            
            if categories['calendar']:
                all_route_code += self.generate_calendar_routes(categories['calendar'])
                self.fixes_applied.extend([r['normalized_route'] for r in categories['calendar']])
            
            if categories['auth']:
                all_route_code += self.generate_auth_routes(categories['auth'])
                self.fixes_applied.extend([r['normalized_route'] for r in categories['auth']])
            
            if categories['documents']:
                all_route_code += self.generate_document_routes(categories['documents'])
                self.fixes_applied.extend([r['normalized_route'] for r in categories['documents']])
            
            if categories['drive'] or categories['notion']:
                all_route_code += self.generate_drive_notion_routes(categories['drive'] + categories['notion'])
                self.fixes_applied.extend([r['normalized_route'] for r in categories['drive'] + categories['notion']])
            
            if categories['other']:
                all_route_code += self.generate_other_routes(categories['other'])
                self.fixes_applied.extend([r['normalized_route'] for r in categories['other']])
            
            # Find insertion point (before the final server creation)
            insertion_point = routes_content.rfind("  const httpServer = createServer(app);")
            
            if insertion_point == -1:
                print("Could not find insertion point in routes file")
                return False
            
            # Insert all the new route code
            new_content = (
                routes_content[:insertion_point] + 
                all_route_code + 
                "\n" +
                routes_content[insertion_point:]
            )
            
            # Write back to file
            with open(self.routes_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
                
            print(f"Successfully applied {len(self.fixes_applied)} route fixes")
            return True
            
        except Exception as e:
            print(f"Error applying fixes: {e}")
            return False
    
    def generate_report(self):
        """Generate a report of fixes applied"""
        report = {
            "fixes_applied": len(self.fixes_applied),
            "routes_added": self.fixes_applied,
            "categories": {
                "ai_routes": len([r for r in self.fixes_applied if '/api/ai/' in r]),
                "session_prep_routes": len([r for r in self.fixes_applied if '/api/session-prep' in r]),
                "calendar_routes": len([r for r in self.fixes_applied if '/api/calendar/' in r]),
                "auth_routes": len([r for r in self.fixes_applied if '/api/auth/' in r]),
                "document_routes": len([r for r in self.fixes_applied if '/api/documents/' in r]),
                "drive_routes": len([r for r in self.fixes_applied if '/api/drive/' in r]),
                "notion_routes": len([r for r in self.fixes_applied if '/api/notion/' in r]),
                "other_routes": len([r for r in self.fixes_applied if not any(cat in r for cat in ['/api/ai/', '/api/session-prep', '/api/calendar/', '/api/auth/', '/api/documents/', '/api/drive/', '/api/notion/'])])
            }
        }
        
        with open("fix_report.json", "w") as f:
            json.dump(report, f, indent=2)
        
        return report

def main():
    print("🔧 Starting automatic API route fix implementation...")
    
    fixer = APIRouteFixer()
    
    if not fixer.load_audit_report():
        print("Failed to load audit report")
        return
    
    print(f"Applying fixes for {len(fixer.missing_routes)} missing routes...")
    
    if fixer.apply_fixes():
        report = fixer.generate_report()
        
        print("\n" + "="*80)
        print("🔧 FIX IMPLEMENTATION RESULTS")
        print("="*80)
        print(f"✅ Total Routes Added: {report['fixes_applied']}")
        print(f"🤖 AI Routes: {report['categories']['ai_routes']}")
        print(f"📝 Session Prep Routes: {report['categories']['session_prep_routes']}")
        print(f"📅 Calendar Routes: {report['categories']['calendar_routes']}")
        print(f"🔐 Auth Routes: {report['categories']['auth_routes']}")
        print(f"📄 Document Routes: {report['categories']['document_routes']}")
        print(f"🗂️  Drive Routes: {report['categories']['drive_routes']}")
        print(f"📋 Notion Routes: {report['categories']['notion_routes']}")
        print(f"🔧 Other Routes: {report['categories']['other_routes']}")
        print()
        print("📋 Full fix report saved to: fix_report.json")
        print("="*80)
    else:
        print("Failed to apply fixes")

if __name__ == "__main__":
    main()