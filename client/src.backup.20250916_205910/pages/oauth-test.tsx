import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useState } from 'react';

export default function OAuthTest() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const testDirectOAuth = async () => {
    addLog('Testing direct OAuth URL generation...');
    try {
      const response = await fetch('/api/auth/google');
      addLog(`Response status: ${response.status}`);
      addLog(`Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
      
      if (response.redirected) {
        addLog(`Redirected to: ${response.url}`);
      }
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  const testManualRedirect = () => {
    addLog('Testing manual redirect...');
    window.open('/api/auth/google', '_blank');
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="p-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <h1 className="text-2xl font-bold">OAuth Testing & Debugging</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Current Environment:</h3>
              <div className="text-sm bg-gray-100 p-2 rounded">
                <p><strong>Domain:</strong> {window.location.origin}</p>
                <p><strong>User Agent:</strong> {navigator.userAgent.substring(0, 50)}...</p>
                <p><strong>Cookies Enabled:</strong> {navigator.cookieEnabled ? 'Yes' : 'No'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Expected Redirect URI:</h3>
              <div className="text-sm bg-blue-100 p-2 rounded font-mono">
                {window.location.origin}/api/auth/google/callback
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Test Actions:</h3>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={testDirectOAuth} variant="outline">
                Test OAuth URL Fetch
              </Button>
              <Button onClick={testManualRedirect} className="bg-blue-600 hover:bg-blue-700">
                Open OAuth in New Tab
              </Button>
              <Button onClick={() => window.location.href = '/api/auth/google'} className="bg-green-600 hover:bg-green-700">
                Direct OAuth Redirect
              </Button>
              <Button onClick={clearLogs} variant="destructive">
                Clear Logs
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Debug Logs:</h3>
            <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500">No logs yet. Try one of the test actions above.</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))
              )}
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded">
            <h3 className="font-semibold text-yellow-800">Troubleshooting Tips:</h3>
            <ul className="text-sm text-yellow-700 mt-2 space-y-1">
              <li>• Check that the redirect URI is exactly configured in Google Cloud Console</li>
              <li>• Ensure Google Calendar API is enabled in your project</li>
              <li>• Wait 5-10 minutes after making changes to Google Cloud Console</li>
              <li>• Try opening OAuth in a new tab to see any error messages</li>
              <li>• Check browser console for JavaScript errors</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}