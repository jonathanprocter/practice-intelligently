import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react';

export default function OAuthFix() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking');
  const [message, setMessage] = useState<string>('');
  const [authUrl, setAuthUrl] = useState<string>('');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setStatus('checking');
    try {
      // Check current OAuth status
      const response = await fetch('/api/auth/google/status');
      const data = await response.json();
      
      if (data.authenticated) {
        setStatus('connected');
        setMessage('Google Calendar is connected and working');
      } else {
        setStatus('disconnected');
        setMessage('Google Calendar needs to be reconnected');
        // Get the auth URL
        getAuthUrl();
      }
    } catch (error) {
      console.error('Status check failed:', error);
      setStatus('disconnected');
      setMessage('Unable to check authentication status');
      getAuthUrl();
    }
  };

  const getAuthUrl = async () => {
    try {
      const response = await fetch('/api/auth/google?force=true');
      const data = await response.json();
      
      if (data.authUrl) {
        setAuthUrl(data.authUrl);
      }
    } catch (error) {
      console.error('Failed to get auth URL:', error);
      setMessage('Failed to get authentication URL');
      setStatus('error');
    }
  };

  const startAuth = () => {
    if (authUrl) {
      window.location.href = authUrl;
    } else {
      // Fallback to direct API route
      window.location.href = '/api/auth/google?force=true';
    }
  };

  const forceReauth = async () => {
    try {
      // Clear tokens and force re-authentication
      const response = await fetch('/api/auth/google/clear', { method: 'POST' });
      if (response.ok) {
        window.location.href = '/api/auth/google?force=true';
      } else {
        // Even if clear fails, try to re-auth
        window.location.href = '/api/auth/google?force=true';
      }
    } catch (error) {
      // On any error, still try to authenticate
      window.location.href = '/api/auth/google?force=true';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Fix Google Calendar Authentication</CardTitle>
          <CardDescription>
            Reconnect your Google Calendar for appointment syncing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'checking' && (
            <Alert>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertTitle>Checking Status</AlertTitle>
              <AlertDescription>
                Verifying your Google Calendar connection...
              </AlertDescription>
            </Alert>
          )}

          {status === 'connected' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Connected</AlertTitle>
              <AlertDescription className="text-green-700">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {status === 'disconnected' && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-800">Re-authentication Required</AlertTitle>
              <AlertDescription className="text-orange-700">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Quick Fix Options:</h3>
            <div className="space-y-2 text-sm">
              <p>• Option 1: Click "Connect to Google" below for standard authentication</p>
              <p>• Option 2: Click "Force Re-authentication" to clear old tokens and start fresh</p>
              <p>• Option 3: If buttons don't work, visit this URL directly:</p>
              <code className="block bg-gray-200 dark:bg-gray-800 p-2 rounded mt-2 text-xs break-all">
                {window.location.origin}/api/auth/google?force=true
              </code>
            </div>
          </div>

          <div className="flex gap-4 flex-wrap">
            {(status === 'disconnected' || status === 'error') && (
              <>
                <Button 
                  onClick={startAuth}
                  className="flex items-center gap-2"
                  size="lg"
                  variant="default"
                >
                  <ExternalLink className="h-4 w-4" />
                  Connect to Google
                </Button>
                
                <Button 
                  onClick={forceReauth}
                  className="flex items-center gap-2"
                  size="lg"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4" />
                  Force Re-authentication
                </Button>
              </>
            )}

            {status === 'connected' && (
              <>
                <Button 
                  onClick={checkStatus}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Status
                </Button>
                
                <Button 
                  onClick={forceReauth}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  Re-authenticate Anyway
                </Button>
              </>
            )}
          </div>

          <div className="border-t pt-4">
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p><strong>Direct Links (copy and paste if buttons don't work):</strong></p>
              <div className="space-y-1">
                <p>• Authentication: <code className="bg-gray-200 dark:bg-gray-800 px-1">{window.location.origin}/api/auth/google</code></p>
                <p>• Force new auth: <code className="bg-gray-200 dark:bg-gray-800 px-1">{window.location.origin}/api/auth/google?force=true</code></p>
                <p>• This page: <code className="bg-gray-200 dark:bg-gray-800 px-1">{window.location.origin}/oauth-fix</code></p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}