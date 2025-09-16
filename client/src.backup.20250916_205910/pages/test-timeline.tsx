import ClientProgressTimeline from '@/components/ClientProgressTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function TestTimeline() {
  const [, navigate] = useLocation();
  
  // Test with Caitlin Dunn who has 22 notes and 28 appointments
  const TEST_CLIENT_ID = '61406635-327c-401d-b209-c20342f4b28a';
  const TEST_CLIENT_NAME = 'Caitlin Dunn';
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Timeline Test - {TEST_CLIENT_NAME}</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Progress Timeline Component Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>Testing client: <span className="font-semibold text-foreground">{TEST_CLIENT_NAME}</span></p>
            <p>Client ID: <span className="font-mono text-xs">{TEST_CLIENT_ID}</span></p>
            <p>Expected: 22 session notes, 28 appointments, 7 AI insights</p>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">✓ Appointments linked</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">✓ AI insights generated</span>
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">✓ SOAP format available</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <ClientProgressTimeline 
        clientId={TEST_CLIENT_ID}
        clientName={TEST_CLIENT_NAME}
      />
    </div>
  );
}