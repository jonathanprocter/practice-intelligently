import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, Users, Download, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api';

interface ClientData {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  referralSource?: string;
}

export function ClientListGenerator() {
  const [clientText, setClientText] = useState('');
  const [parsedClients, setParsedClients] = useState<ClientData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createClientsMutation = useMutation({
    mutationFn: async (clientsData: ClientData[]) => {
      const results = [];
      for (const clientData of clientsData) {
        try {
          const client = await ApiClient.createClient({
            ...clientData,
            status: 'active',
            riskLevel: 'low'
          });
          results.push({ success: true, client });
        } catch (error) {
          results.push({ success: false, error: error.message, data: clientData });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      
      if (successful > 0) {
        toast({
          title: 'Clients Added',
          description: `Successfully added ${successful} client${successful > 1 ? 's' : ''}${failed > 0 ? `. ${failed} failed.` : '.'}`,
        });
      }
      
      if (failed > 0) {
        const failedClients = results.filter(r => !r.success);
        console.error('Failed to create clients:', failedClients);
      }
      
      setClientText('');
      setParsedClients([]);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create clients',
        variant: 'destructive',
      });
    },
  });

  const parseClientText = () => {
    if (!clientText.trim()) {
      toast({
        title: 'No Data',
        description: 'Please enter client information to parse',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const lines = clientText.split('\n').filter(line => line.trim());
      const clients: ClientData[] = [];
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Try to parse different formats:
        // 1. "First Last, DOB: MM/DD/YYYY, Email: email@example.com, Phone: (555) 123-4567"
        // 2. "First Last - MM/DD/YYYY"
        // 3. "First Last, Born: MM/DD/YYYY"
        // 4. Just "First Last"
        
        let firstName = '', lastName = '', dateOfBirth = '', email = '', phone = '';
        
        // Extract email if present
        const emailMatch = trimmedLine.match(/(?:email[:\s]+)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        if (emailMatch) {
          email = emailMatch[1];
        }
        
        // Extract phone if present
        const phoneMatch = trimmedLine.match(/(?:phone[:\s]+)?([\(\)\d\s\-\.]{10,})/i);
        if (phoneMatch) {
          phone = phoneMatch[1].replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
        }
        
        // Extract date of birth
        const datePatterns = [
          /(?:dob[:\s]+|born[:\s]+|birth[:\s]+)?(\d{1,2}\/\d{1,2}\/\d{4})/i,
          /(?:dob[:\s]+|born[:\s]+|birth[:\s]+)?(\d{1,2}-\d{1,2}-\d{4})/i,
          /(?:dob[:\s]+|born[:\s]+|birth[:\s]+)?(\d{4}-\d{1,2}-\d{1,2})/i,
        ];
        
        for (const pattern of datePatterns) {
          const dateMatch = trimmedLine.match(pattern);
          if (dateMatch) {
            let dateStr = dateMatch[1];
            // Convert MM/DD/YYYY or MM-DD-YYYY to YYYY-MM-DD
            if (dateStr.includes('/') || dateStr.includes('-')) {
              const separator = dateStr.includes('/') ? '/' : '-';
              const parts = dateStr.split(separator);
              if (parts.length === 3) {
                if (parts[0].length === 4) {
                  // Already YYYY-MM-DD format
                  dateOfBirth = dateStr.replace(/\//g, '-');
                } else {
                  // MM/DD/YYYY or MM-DD-YYYY format
                  dateOfBirth = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                }
              }
            }
            break;
          }
        }
        
        // Extract name (remove email, phone, date info)
        let nameText = trimmedLine
          .replace(emailMatch?.[0] || '', '')
          .replace(phoneMatch?.[0] || '', '')
          .replace(/(?:dob[:\s]+|born[:\s]+|birth[:\s]+)?\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/i, '')
          .replace(/,/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Remove common prefixes and clean up
        nameText = nameText.replace(/^(mr\.?|mrs\.?|ms\.?|dr\.?)\s+/i, '');
        
        const nameParts = nameText.split(/\s+/).filter(part => part.length > 0);
        if (nameParts.length >= 2) {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        } else if (nameParts.length === 1) {
          firstName = nameParts[0];
          lastName = '';
        }
        
        if (firstName) {
          clients.push({
            firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase(),
            lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase(),
            dateOfBirth: dateOfBirth || undefined,
            email: email || undefined,
            phone: phone || undefined,
          });
        }
      }
      
      if (clients.length === 0) {
        toast({
          title: 'No Clients Found',
          description: 'Could not parse any client information from the text',
          variant: 'destructive',
        });
      } else {
        setParsedClients(clients);
        toast({
          title: 'Parsing Complete',
          description: `Found ${clients.length} client${clients.length > 1 ? 's' : ''}`,
        });
      }
    } catch (error) {
      toast({
        title: 'Parsing Error',
        description: 'Failed to parse client information',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const addClientsToDatabase = () => {
    if (parsedClients.length === 0) {
      toast({
        title: 'No Clients',
        description: 'Please parse client information first',
        variant: 'destructive',
      });
      return;
    }
    
    createClientsMutation.mutate(parsedClients);
  };

  const exportExample = () => {
    const exampleText = `John Smith, DOB: 03/15/1985, Email: john.smith@email.com, Phone: (555) 123-4567
Jane Doe - 07/22/1990
Michael Johnson, Born: 12/08/1978, Phone: (555) 987-6543
Sarah Wilson
David Brown, Email: david.brown@gmail.com`;
    
    setClientText(exampleText);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Client List Generator</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="client-text">
            Paste your client list (names and dates of birth)
          </Label>
          <Textarea
            id="client-text"
            placeholder="Enter client information, one per line. Supported formats:
• John Smith, DOB: 03/15/1985, Email: john@email.com, Phone: (555) 123-4567
• Jane Doe - 07/22/1990
• Michael Johnson, Born: 12/08/1978
• Sarah Wilson"
            value={clientText}
            onChange={(e) => setClientText(e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
          <div className="flex space-x-2">
            <Button onClick={parseClientText} disabled={isProcessing}>
              <FileText className="w-4 h-4 mr-2" />
              {isProcessing ? 'Parsing...' : 'Parse Client List'}
            </Button>
            <Button variant="outline" onClick={exportExample}>
              <Download className="w-4 h-4 mr-2" />
              Load Example
            </Button>
          </div>
        </div>

        {parsedClients.length > 0 && (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/10">
              <h3 className="font-semibold mb-3">Parsed Clients ({parsedClients.length})</h3>
              <div className="space-y-2">
                {parsedClients.map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-background rounded border">
                    <div className="flex-1">
                      <span className="font-medium">
                        {client.firstName} {client.lastName}
                      </span>
                      {client.dateOfBirth && (
                        <span className="text-sm text-muted-foreground ml-2">
                          DOB: {new Date(client.dateOfBirth).toLocaleDateString()}
                        </span>
                      )}
                      {client.email && (
                        <span className="text-sm text-muted-foreground ml-2">
                          {client.email}
                        </span>
                      )}
                      {client.phone && (
                        <span className="text-sm text-muted-foreground ml-2">
                          {client.phone}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <Button 
              onClick={addClientsToDatabase}
              disabled={createClientsMutation.isPending}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {createClientsMutation.isPending ? 'Adding Clients...' : 'Add All Clients to Database'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}