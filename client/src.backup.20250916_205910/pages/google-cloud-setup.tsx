import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, 
  ExternalLink, 
  CheckCircle, 
  Settings, 
  Calendar,
  Database,
  RefreshCw
} from 'lucide-react';
import { useState } from 'react';

export default function GoogleCloudSetup() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const redirectURI = `${window.location.origin}/api/auth/google/callback`;
  const currentDomain = window.location.origin;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const openGoogleCloudConsole = () => {
    window.open('https://console.cloud.google.com/apis/credentials', '_blank');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Google Cloud Console Setup</h1>
          <p className="text-gray-600 mt-2">Configure OAuth credentials for Google Calendar integration</p>
        </div>
        <Button onClick={openGoogleCloudConsole} className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4" />
          Open Google Cloud Console
        </Button>
      </div>

      {/* Current Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Current Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Current Domain</h4>
              <code className="text-sm bg-gray-100 p-2 rounded block break-all">
                {currentDomain}
              </code>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">OAuth Redirect URI</h4>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-yellow-100 p-2 rounded flex-1 break-all">
                  {redirectURI}
                </code>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => copyToClipboard(redirectURI, 'redirect')}
                >
                  {copiedText === 'redirect' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step-by-step Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Required Google Cloud Console Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">1</div>
              <div className="flex-1">
                <h4 className="font-medium">Create or Select Project</h4>
                <p className="text-sm text-gray-600 mt-1">Go to Google Cloud Console and create a new project or select an existing one</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">2</div>
              <div className="flex-1">
                <h4 className="font-medium">Enable Google Calendar API</h4>
                <p className="text-sm text-gray-600 mt-1">Navigate to "APIs & Services" → "Library" and enable Google Calendar API</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">3</div>
              <div className="flex-1">
                <h4 className="font-medium">Configure OAuth Consent Screen</h4>
                <p className="text-sm text-gray-600 mt-1">Set up OAuth consent screen with your application name and required scopes</p>
                <div className="mt-2 p-3 bg-gray-50 rounded">
                  <p className="text-sm font-medium">Required Scopes:</p>
                  <ul className="text-sm text-gray-600 mt-1 space-y-1">
                    <li>• https://www.googleapis.com/auth/calendar.readonly</li>
                    <li>• https://www.googleapis.com/auth/calendar.events</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-semibold">4</div>
              <div className="flex-1">
                <h4 className="font-medium">Create OAuth 2.0 Client ID</h4>
                <p className="text-sm text-gray-600 mt-1">Go to "Credentials" → "Create Credentials" → "OAuth client ID"</p>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-yellow-50 rounded">
                    <p className="text-sm font-medium">Application Type:</p>
                    <p className="text-sm text-gray-600">Web application</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded">
                    <p className="text-sm font-medium">Authorized Redirect URI:</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm bg-yellow-200 p-1 rounded flex-1">
                        {redirectURI}
                      </code>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(redirectURI, 'uri')}
                      >
                        {copiedText === 'uri' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold">5</div>
              <div className="flex-1">
                <h4 className="font-medium">Configure Environment Variables</h4>
                <p className="text-sm text-gray-600 mt-1">Add your OAuth credentials to Replit Secrets</p>
                <div className="mt-2 space-y-2">
                  <div className="p-3 bg-green-50 rounded">
                    <p className="text-sm font-medium">GOOGLE_CLIENT_ID</p>
                    <p className="text-sm text-gray-600">Your OAuth client ID from Google Cloud Console</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded">
                    <p className="text-sm font-medium">GOOGLE_CLIENT_SECRET</p>
                    <p className="text-sm text-gray-600">Your OAuth client secret from Google Cloud Console</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Integration Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <Database className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h4 className="font-medium">Database Storage</h4>
              <p className="text-sm text-gray-600 mt-1">Events stored locally for fast access</p>
              <Badge variant="outline" className="mt-2">Real-time sync</Badge>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <h4 className="font-medium">Live API Integration</h4>
              <p className="text-sm text-gray-600 mt-1">Direct connection to Google Calendar</p>
              <Badge variant="outline" className="mt-2">Bi-directional</Badge>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <h4 className="font-medium">Event Management</h4>
              <p className="text-sm text-gray-600 mt-1">Create, update, delete events</p>
              <Badge variant="outline" className="mt-2">Full CRUD</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>System Ready:</strong> Your Google Calendar integration is fully configured with database persistence, 
          live API endpoints, and real-time synchronization. Once you complete the Google Cloud Console setup, 
          your calendar will be ready for production use.
        </AlertDescription>
      </Alert>
    </div>
  );
}