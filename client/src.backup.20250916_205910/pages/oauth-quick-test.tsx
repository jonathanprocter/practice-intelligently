import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ExternalLink, RefreshCw } from 'lucide-react';

export default function OAuthQuickTest() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/google/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Status check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const startOAuth = () => {
//window.location.href = '/api/auth/google';
  };

  const testCalendars = async () => {
    try {
      const response = await fetch('/api/calendar/calendars');
      const data = await response.json();
//alert(`Calendar test: ${response.ok ? 'SUCCESS' : 'FAILED'}\n${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error('Calendar test failed:', error);
      alert('Calendar test failed: ' + error);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            OAuth Quick Test
            <Button onClick={checkStatus} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                status?.connected ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-gray-600" />
                ) : status?.connected ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <h4 className="font-medium">OAuth Status</h4>
                <Badge variant={status?.connected ? 'default' : 'destructive'}>
                  {loading ? 'Checking...' : status?.connected ? 'Connected' : 'Not Connected'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {!status?.connected ? (
              <>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Step 1: Authenticate</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Click the button below to start the OAuth flow. You'll be redirected to Google to authorize access.
                  </p>
                  <Button onClick={startOAuth} className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Start OAuth Flow
                  </Button>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <h4 className="font-medium text-gray-900 mb-2">Instructions:</h4>
                  <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                    <li>Click "Start OAuth Flow" above</li>
                    <li>Sign in to your Google account</li>
                    <li>Click "Allow" to grant calendar permissions</li>
                    <li>You'll be redirected back here automatically</li>
                    <li>The status will change to "Connected"</li>
                  </ol>
                </div>
              </>
            ) : (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">✅ OAuth Connected!</h4>
                <p className="text-sm text-green-700 mb-3">
                  Your Google Calendar is now connected. Test calendar access below.
                </p>
                <div className="flex gap-2">
                  <Button onClick={testCalendars} variant="outline" className="flex-1">
                    Test Calendar Access
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/calendar'} 
                    className="flex-1"
                  >
                    Go to Calendar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Debug Info */}
          <details className="border rounded p-4">
            <summary className="cursor-pointer font-medium">Debug Information</summary>
            <div className="mt-3 p-3 bg-gray-100 rounded text-sm">
              <pre>{JSON.stringify(status, null, 2)}</pre>
            </div>
          </details>

        </CardContent>
      </Card>
    </div>
  );
}