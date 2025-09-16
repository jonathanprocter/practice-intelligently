import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export default function ReauthGoogle() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStatus, setAuthStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const startReauth = async () => {
    setIsAuthenticating(true);
    setAuthStatus('idle');
    setErrorMessage('');

    try {
      // Clear existing tokens
      await fetch('/api/auth/google/clear', { method: 'POST' });
      
      // Redirect to Google auth with expanded scopes
      window.location.href = '/api/auth/google';
    } catch (error) {
      setAuthStatus('error');
      setErrorMessage('Failed to start re-authentication');
      setIsAuthenticating(false);
    }
  };

  const testDriveAccess = async () => {
    try {
      const response = await fetch('/api/drive/files');
      if (response.ok) {
        setAuthStatus('success');
      } else {
        const error = await response.json();
        setAuthStatus('error');
        setErrorMessage(error.error || 'Drive access test failed');
      }
    } catch (error) {
      setAuthStatus('error');
      setErrorMessage('Failed to test Drive access');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="h-5 w-5 mr-2" />
            Google Drive Re-authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Your current Google tokens only have calendar access. To access Google Drive, you need to re-authenticate with expanded permissions.
          </p>

          {authStatus === 'success' && (
            <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800">Google Drive access is working!</span>
            </div>
          )}

          {authStatus === 'error' && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <div className="text-red-800">
                <p className="font-medium">Authentication Error</p>
                <p className="text-sm">{errorMessage}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button 
              onClick={startReauth}
              disabled={isAuthenticating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isAuthenticating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Redirecting to Google...
                </>
              ) : (
                'Re-authenticate with Google Drive'
              )}
            </Button>

            <Button 
              variant="outline" 
              onClick={testDriveAccess}
              className="w-full"
            >
              Test Drive Access
            </Button>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>• This will ask for calendar AND drive permissions</p>
            <p>• Your existing calendar data will remain intact</p>
            <p>• You only need read-only access to your Drive files</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}