import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient, type Client } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Users, Save } from 'lucide-react';

interface QuickUpdateData {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email?: string;
  phone?: string;
}

// Note: This component now works exclusively with real client data from the database

interface Props {
  clients: Client[];
}

export function QuickClientUpdate({ clients }: Props) {
  const [updates, setUpdates] = useState<Record<string, Partial<Client>>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Client> }) => {
      return ApiClient.updateClient(data.id, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Success',
        description: 'Client information updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update client',
        variant: 'destructive',
      });
    },
  });

  const handleUpdateField = (clientId: string, field: string, value: string) => {
    setUpdates(prev => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        [field]: value
      }
    }));
  };

  const handleSaveClient = async (clientId: string) => {
    const clientUpdates = updates[clientId];
    if (!clientUpdates) return;

    await updateMutation.mutateAsync({ id: clientId, updates: clientUpdates });
    
    // Clear updates for this client
    setUpdates(prev => {
      const newUpdates = { ...prev };
      delete newUpdates[clientId];
      return newUpdates;
    });
  };

  // Note: Sample data functionality removed - component now works exclusively with real data

  const clientsNeedingUpdates = clients.filter(client => 
    !client.dateOfBirth || !client.email || !client.phone
  );

  if (clientsNeedingUpdates.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Complete Client Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {clientsNeedingUpdates.map(client => {
            const clientUpdates = updates[client.id] || {};
            const hasChanges = Object.keys(clientUpdates).length > 0;
            
            return (
              <div key={client.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">
                    {client.firstName} {client.lastName}
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => handleSaveClient(client.id)}
                    disabled={!hasChanges || updateMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`dob-${client.id}`}>Date of Birth</Label>
                    <Input
                      id={`dob-${client.id}`}
                      type="date"
                      value={clientUpdates.dateOfBirth || client.dateOfBirth || ''}
                      onChange={(e) => handleUpdateField(client.id, 'dateOfBirth', e.target.value)}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`email-${client.id}`}>Email</Label>
                    <Input
                      id={`email-${client.id}`}
                      type="email"
                      value={clientUpdates.email ?? client.email ?? ''}
                      onChange={(e) => handleUpdateField(client.id, 'email', e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`phone-${client.id}`}>Phone</Label>
                    <Input
                      id={`phone-${client.id}`}
                      type="tel"
                      value={clientUpdates.phone ?? client.phone ?? ''}
                      onChange={(e) => handleUpdateField(client.id, 'phone', e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}