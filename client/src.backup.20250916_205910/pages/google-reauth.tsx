import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react';

export default function GoogleReauth() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Check OAuth connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    setConnectionStatus('checking');
    try {
      const response = await fetch('/api/auth/google/status');
      const data = await response.json();
      
      if (data.authenticated) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
        if (data.error) {
          setErrorMessage(data.error);
        }
      }
    } catch (error) {
      console.error('Error checking OAuth status:', error);
      setConnectionStatus('error');
      setErrorMessage('Failed to check authentication status');
    }
  };

  const startAuthentication = () => {
    setIsAuthenticating(true);
    // Redirect to OAuth flow
    window.location.href = '/api/auth/google';
  };

  const disconnect = async () => {
    try {
      const response = await fetch('/api/auth/google/disconnect', { method: 'POST' });
      if (response.ok) {
        setConnectionStatus('disconnected');
        setErrorMessage('');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      setErrorMessage('Failed to disconnect');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Google Calendar Authentication</CardTitle>
          <CardDescription>
            Manage your Google Calendar connection for appointment syncing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Alert */}
          {connectionStatus === 'checking' && (
            <Alert>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <AlertTitle>Checking Connection</AlertTitle>
              <AlertDescription>
                Verifying your Google Calendar authentication status...
              </AlertDescription>
            </Alert>
          )}

          {connectionStatus === 'connected' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Connected</AlertTitle>
              <AlertDescription className="text-green-700">
                Your Google Calendar is successfully connected and syncing.
              </AlertDescription>
            </Alert>
          )}

          {connectionStatus === 'disconnected' && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-800">Authentication Required</AlertTitle>
              <AlertDescription className="text-orange-700">
                {errorMessage || 'Your Google Calendar needs to be reconnected. This typically happens when:'}
                {!errorMessage && (
                  <ul className="mt-2 ml-4 list-disc">
                    <li>Tokens have expired after 6 months of inactivity</li>
                    <li>Google OAuth permissions were revoked</li>
                    <li>The application's OAuth credentials changed</li>
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          {connectionStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>
                {errorMessage || 'Unable to verify authentication status. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">How to Re-authenticate:</h3>
            <ol className="list-decimal ml-4 space-y-1 text-sm">
              <li>Click the "Connect Google Calendar" button below</li>
              <li>You'll be redirected to Google's secure login page</li>
              <li>Sign in with your Google account</li>
              <li>Grant calendar access permissions when prompted</li>
              <li>You'll be redirected back here once complete</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            {connectionStatus === 'disconnected' && (
              <Button 
                onClick={startAuthentication}
                disabled={isAuthenticating}
                className="flex items-center gap-2"
                size="lg"
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Redirecting to Google...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Connect Google Calendar
                  </>
                )}
              </Button>
            )}

            {connectionStatus === 'connected' && (
              <>
                <Button 
                  onClick={checkConnectionStatus}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Status
                </Button>
                <Button 
                  onClick={disconnect}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  Disconnect
                </Button>
              </>
            )}

            {connectionStatus === 'error' && (
              <Button 
                onClick={checkConnectionStatus}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            )}
          </div>

          {/* Additional Help */}
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Note:</strong> Calendar sync happens automatically once connected. 
              Your calendar data remains secure and is only accessed when needed for appointment syncing.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}