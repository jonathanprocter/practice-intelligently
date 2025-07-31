import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function OAuthTroubleshoot() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Google Calendar OAuth Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>403 Error Detected:</strong> This indicates a Google Cloud Console configuration issue.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Common 403 Error Causes & Solutions:</h3>
            
            <div className="grid gap-4">
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">OAuth Consent Screen Not Published</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Your OAuth consent screen may be in "Testing" mode with limited users.
                    </p>
                    <p className="text-sm font-medium mt-2 text-blue-600">
                      Solution: Publish your OAuth consent screen or add your email to test users.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Incorrect Redirect URI</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      The redirect URI might not match exactly what's configured.
                    </p>
                    <p className="text-sm font-medium mt-2 text-blue-600">
                      Current URI: <code className="bg-gray-100 px-1 rounded text-xs">
                        {window.location.origin}/api/auth/google/callback
                      </code>
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">API Not Enabled</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Google Calendar API might not be enabled in your project.
                    </p>
                    <p className="text-sm font-medium mt-2 text-blue-600">
                      Solution: Enable Google Calendar API in Google Cloud Console.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Client ID/Secret Mismatch</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      The client credentials might be incorrect or from a different project.
                    </p>
                    <p className="text-sm font-medium mt-2 text-blue-600">
                      Solution: Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900">Required Google Cloud Console Setup:</h3>
            <ol className="list-decimal list-inside space-y-2 mt-2 text-sm text-blue-800">
              <li>Go to Google Cloud Console → APIs & Services → Credentials</li>
              <li>Ensure Google Calendar API is enabled</li>
              <li>Verify OAuth 2.0 Client IDs are configured correctly</li>
              <li>Add authorized redirect URI: <code className="bg-blue-100 px-1 rounded">{window.location.origin}/api/auth/google/callback</code></li>
              <li>Configure OAuth consent screen and publish it (or add test users)</li>
              <li>Ensure scopes include: calendar.readonly</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Quick Actions:</h3>
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={() => window.location.href = '/api/auth/google'} 
                className="bg-green-600 hover:bg-green-700"
              >
                Try OAuth Again
              </Button>
              <Button 
                onClick={() => window.location.href = '/calendar'} 
                variant="outline"
              >
                Back to Calendar
              </Button>
              <Button 
                onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')} 
                variant="outline"
              >
                Open Google Cloud Console
              </Button>
            </div>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Once you fix the Google Cloud Console configuration, 
              the OAuth flow should work immediately without needing code changes.
            </AlertDescription>
          </Alert>

        </CardContent>
      </Card>
    </div>
  );
}