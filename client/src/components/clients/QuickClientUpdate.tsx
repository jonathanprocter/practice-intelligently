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

const SAMPLE_CLIENTS: QuickUpdateData[] = [
  {
    id: '', // Will be filled from database
    firstName: 'Sarah',
    lastName: 'Johnson',
    dateOfBirth: '1985-03-15',
    email: 'sarah.j@email.com',
    phone: '555-0101'
  },
  {
    id: '',
    firstName: 'Michael',
    lastName: 'Chen',
    dateOfBirth: '1990-08-22',
    email: 'michael.c@email.com',
    phone: '555-0102'
  },
  {
    id: '',
    firstName: 'Emma',
    lastName: 'Davis',
    dateOfBirth: '1988-12-08',
    email: 'emma.d@email.com',
    phone: '555-0103'
  },
  {
    id: '',
    firstName: 'Jason',
    lastName: 'Laskin',
    dateOfBirth: '1992-06-18',
    email: 'jason.laskin@email.com',
    phone: '555-0104'
  }
];

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

  const fillSampleData = () => {
    const newUpdates: Record<string, Partial<Client>> = {};
    
    clients.forEach(client => {
      const sampleClient = SAMPLE_CLIENTS.find(
        s => s.firstName === client.firstName && s.lastName === client.lastName
      );
      
      if (sampleClient) {
        newUpdates[client.id] = {
          dateOfBirth: sampleClient.dateOfBirth,
          email: sampleClient.email,
          phone: sampleClient.phone
        };
      }
    });
    
    setUpdates(newUpdates);
    toast({
      title: 'Sample Data Loaded',
      description: 'Sample dates of birth and contact info have been filled in. Review and save to update.',
    });
  };

  const clientsNeedingUpdates = clients.filter(client => 
    !client.dateOfBirth || !client.email || !client.phone
  );

  if (clientsNeedingUpdates.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Complete Client Information</span>
          </div>
          <Button variant="outline" onClick={fillSampleData}>
            Fill Sample Data
          </Button>
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