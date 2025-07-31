import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

export default function OAuthDebug() {
  const { data: status, refetch } = useQuery({
    queryKey: ['google-auth-status'],
    queryFn: async () => {
      const response = await fetch('/api/auth/google/status');
      return response.json();
    }
  });

  return (
    <div className="p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <h1 className="text-2xl font-bold">Google Calendar OAuth Debug</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">Current Connection Status:</h3>
            <p className="mt-1">
              {status ? (status.connected ? '✅ Connected' : '❌ Not Connected') : 'Loading...'}
            </p>
          </div>

          <div>
            <h3 className="font-semibold">Current Domain:</h3>
            <p className="mt-1 font-mono text-sm bg-gray-100 p-2 rounded">
              {window.location.origin}
            </p>
          </div>

          <div>
            <h3 className="font-semibold">Required Redirect URI:</h3>
            <p className="mt-1 font-mono text-sm bg-yellow-100 p-2 rounded">
              {window.location.origin}/api/auth/google/callback
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-semibold text-blue-800">Google Cloud Console Setup:</h3>
            <p className="text-blue-700 text-sm mt-2">
              To fix the OAuth issue, add this redirect URI to your Google Cloud Console:
            </p>
            <ol className="list-decimal list-inside mt-2 text-sm text-blue-700 space-y-1">
              <li>Go to Google Cloud Console → APIs & Services → Credentials</li>
              <li>Edit your OAuth 2.0 Client ID</li>
              <li>Add this exact URI to "Authorized redirect URIs":</li>
              <li className="font-mono bg-white p-1 rounded ml-4">
                {window.location.origin}/api/auth/google/callback
              </li>
              <li>Save the changes and wait 5-10 minutes for propagation</li>
            </ol>
          </div>

          <div className="space-x-2">
            <Button 
              onClick={() => {
                window.location.href = '/api/auth/google';
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Try Google OAuth
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              Refresh Status
            </Button>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold">Debug Info:</h3>
            <pre className="text-xs mt-2 overflow-auto">
              {JSON.stringify({ 
                status,
                currentDomain: window.location.origin,
                userAgent: navigator.userAgent.substring(0, 100),
                timestamp: new Date().toISOString()
              }, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}