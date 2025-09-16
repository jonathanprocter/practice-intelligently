import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, RefreshCw, ExternalLink } from "lucide-react";

export default function OAuthTestVerification() {
  const [status, setStatus] = useState<any>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check OAuth status
  const checkStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/google/status');
      const data = await response.json();
      setStatus(data);
      console.log('OAuth Status:', data);
    } catch (err: any) {
      console.error('Error checking status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get auth URL using new JSON endpoint
  const getAuthUrl = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/google/url');
      const data = await response.json();
      
      if (data.success) {
        setAuthUrl(data.authUrl);
        console.log('Auth URL received:', data);
      } else {
        setError(data.error || 'Failed to get auth URL');
      }
    } catch (err: any) {
      console.error('Error getting auth URL:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clear OAuth tokens
  const clearTokens = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/google/clear', {
        method: 'POST'
      });
      const data = await response.json();
      console.log('Tokens cleared:', data);
      await checkStatus();
    } catch (err: any) {
      console.error('Error clearing tokens:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>OAuth Authentication Test</CardTitle>
          <CardDescription>
            Verify Google Calendar OAuth authentication is working correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Section */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Current Status</h3>
            {loading && !status ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking status...</span>
              </div>
            ) : status ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {status.authenticated ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-700">Authenticated</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="text-red-700">Not Authenticated</span>
                    </>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Connected: {status.connected ? 'Yes' : 'No'}</p>
                  <p>Has Tokens: {status.hasTokens ? 'Yes' : 'No'}</p>
                  {status.tokenExpiry && (
                    <p>Token Expiry: {new Date(status.tokenExpiry).toLocaleString()}</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Actions Section */}
          <div className="space-y-2">
            <Button 
              onClick={checkStatus} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Status
            </Button>

            {!status?.authenticated && (
              <Button 
                onClick={getAuthUrl} 
                disabled={loading}
                className="w-full"
              >
                Get Authentication URL
              </Button>
            )}

            {status?.authenticated && (
              <Button 
                onClick={clearTokens} 
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                Clear Tokens & Re-authenticate
              </Button>
            )}
          </div>

          {/* Auth URL Display */}
          {authUrl && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>Click the button below to authenticate with Google:</p>
                <Button 
                  asChild 
                  className="w-full"
                  variant="default"
                >
                  <a href={authUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Google Authentication
                  </a>
                </Button>
                <div className="mt-2 p-2 bg-white rounded text-xs break-all">
                  {authUrl}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Debug Info */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Debug Information
            </summary>
            <div className="mt-2 p-3 bg-muted rounded-lg">
              <pre className="text-xs overflow-auto">
                {JSON.stringify({ status, authUrl, error }, null, 2)}
              </pre>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}