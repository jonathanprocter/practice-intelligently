import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OAuthSimple() {
  const handleOAuthRedirect = () => {
    window.location.href = '/api/auth/google';
  };

  const testConnection = async () => {
    try {
      const response = await fetch('/api/auth/google/status');
      const data = await response.json();
//alert(`Connected: ${data.connected}`);
    } catch (error) {
      console.error('Error checking status:', error);
      alert('Error checking connection status');
    }
  };

  return (
    <div className="p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Google Calendar Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            This page provides a simple way to connect your Google Calendar.
          </p>

          <div className="space-y-2">
            <Button onClick={handleOAuthRedirect} className="w-full">
              Connect Google Calendar
            </Button>

            <Button onClick={testConnection} variant="outline" className="w-full">
              Test Connection Status
            </Button>

            <Button 
              onClick={() => window.location.href = '/calendar'} 
              variant="secondary" 
              className="w-full"
            >
              Back to Calendar
            </Button>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Current Domain:</strong> {window.location.origin}</p>
            <p><strong>Callback URL:</strong> {window.location.origin}/api/auth/google/callback</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}