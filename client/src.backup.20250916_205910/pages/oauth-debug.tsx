import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Copy,
  ExternalLink,
  Settings
} from 'lucide-react';

export default function OAuthDebug() {
  const [copied, setCopied] = useState(false);

  const { data: status, refetch } = useQuery({
    queryKey: ['google-calendar-debug-status'],
    queryFn: async () => {
      const response = await fetch('/api/auth/google/status');
      return response.json();
    }
  });

  const redirectURI = `${window.location.origin}/api/auth/google/callback`;

  const copyRedirectURI = () => {
    navigator.clipboard.writeText(redirectURI);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testGoogleOAuth = () => {
//window.location.href = '/api/auth/google';
  };

  const openGoogleCloudConsole = () => {
    window.open('https://console.cloud.google.com/apis/credentials', '_blank');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">OAuth Debug & Setup</h1>
          <p className="text-gray-600 mt-2">Troubleshoot Google Calendar connection issues</p>
        </div>
        <Button onClick={openGoogleCloudConsole} variant="outline" className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4" />
          Google Cloud Console
        </Button>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Current Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                status?.connected ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {status?.connected ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <h4 className="font-medium">Google Calendar</h4>
                <Badge variant={status?.connected ? 'default' : 'destructive'}>
                  {status?.connected ? 'Connected' : 'Not Connected'}
                </Badge>
              </div>
            </div>
            <Button onClick={() => refetch()} size="sm" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-sm font-medium">Required Redirect URI for Google Cloud Console:</p>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-white p-2 rounded border flex-1 break-all">
                  {redirectURI}
                </code>
                <Button size="sm" variant="outline" onClick={copyRedirectURI}>
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step-by-step troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              <strong>Most common issue:</strong> The redirect URI above must be EXACTLY configured in your Google Cloud Console OAuth client credentials.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">1</div>
              <div>
                <h4 className="font-medium">Check Google Cloud Console Setup</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Ensure you have OAuth 2.0 credentials created with the exact redirect URI shown above
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">2</div>
              <div>
                <h4 className="font-medium">Verify Environment Variables</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in Replit Secrets
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">3</div>
              <div>
                <h4 className="font-medium">Test OAuth Flow</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Click the button below to test the Google OAuth flow. Make sure to click "Allow" when prompted.
                </p>
                <Button onClick={testGoogleOAuth} className="mt-2">
                  Test Google OAuth
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Required Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Required Google Cloud Console Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-sm">Application Type</h4>
              <p className="text-sm text-gray-600">Web application</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-sm">Authorized Redirect URI</h4>
              <code className="text-xs bg-gray-100 p-1 rounded block break-all">{redirectURI}</code>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-800">Required Scopes</h4>
            <ul className="text-sm text-yellow-700 mt-2 space-y-1">
              <li>• https://www.googleapis.com/auth/calendar.readonly</li>
              <li>• https://www.googleapis.com/auth/calendar.events</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}