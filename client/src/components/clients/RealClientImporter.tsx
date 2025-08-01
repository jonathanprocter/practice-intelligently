import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient, type Client } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Users, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Real client data from the provided CSV
const REAL_CLIENTS = [
  { firstName: 'William', lastName: 'Aymami', dateOfBirth: '1972-07-01', phone: '(917) 495-9421', email: 'waymami@yahoo.com', employment: 'Unemployed' },
  { firstName: 'Christopher', lastName: 'Balabanick', dateOfBirth: '1998-10-28', phone: '(516) 738-2550', email: 'pattonswarrior0777@gmail.com', employment: 'Unemployed' },
  { firstName: 'Paul', lastName: 'Benjamin', dateOfBirth: '1995-09-04', phone: '(516) 297-7877', email: 'ssb95@aol.com', employment: 'Part-Time' },
  { firstName: 'John', lastName: 'Best', dateOfBirth: '1962-06-01', phone: '(646) 208-3202', email: 'bestjm@gmail.com', employment: '' },
  { firstName: 'Nicholas', lastName: 'Bonomi', dateOfBirth: '1992-05-22', phone: '(516) 816-6064', email: 'nick.bonomi22@gmail.com', employment: 'Unemployed' },
  { firstName: 'Michael', lastName: 'Bower', dateOfBirth: '1962-09-27', phone: '(516) 313-4616', email: 'mlbower1234@gmail.com', employment: 'Full-Time' },
  { firstName: 'Brianna', lastName: 'Brickman', dateOfBirth: '1995-09-19', phone: '(845) 826-2186', email: 'bbrickman1@gmail.com', employment: 'Full-Time' },
  { firstName: 'Mary', lastName: 'Camarano', dateOfBirth: '1995-03-19', phone: '(516) 361-6960', email: 'mekc92016@gmail.com', employment: '' },
  { firstName: 'Bob', lastName: 'Delmond', dateOfBirth: '1963-01-10', phone: '(516) 313-3962', email: 'mikenbob1@gmail.com', employment: 'Full-Time' },
  { firstName: 'Steven', lastName: 'Deluca', dateOfBirth: '', phone: '(516) 477-1539', email: 'sdeluca25@yahoo.com', employment: 'Full-Time' },
  { firstName: 'Nick', lastName: 'Dabreu', dateOfBirth: '', phone: '(631) 793-5564', email: 'nick.dabreu@gmail.com', employment: '' },
  { firstName: 'Maryellen', lastName: 'Dankenbrink', dateOfBirth: '1991-12-24', phone: '(516) 428-2797', email: 'Maryellendankenbrink@gmail.com', employment: 'Self-employed' },
  { firstName: 'Caitlin', lastName: 'Dunn', dateOfBirth: '1997-07-21', phone: '(516) 761-7775', email: 'caitlindunn0721@gmail.com', employment: 'Unemployed' },
  { firstName: 'Kenneth', lastName: 'Doyle', dateOfBirth: '1996-02-23', phone: '(516) 263-9242', email: 'kenjdoyleii@gmail.com', employment: 'Unemployed' },
  { firstName: 'Michael', lastName: 'Cserenyi', dateOfBirth: '1990-03-27', phone: '(631) 449-0268', email: 'Kiuorno22@gmail.com', employment: 'Full-Time' },
  { firstName: 'Gavin', lastName: 'Fisch', dateOfBirth: '2006-09-12', phone: '(631) 383-5781', email: 'gavindfisch@gmail.com', employment: 'Unemployed' },
  { firstName: 'Krista', lastName: 'Flood', dateOfBirth: '', phone: '(516) 468-0508', email: 'Krista.flood1@gmail.com', employment: '' },
  { firstName: 'Karen', lastName: 'Foster', dateOfBirth: '1993-08-27', phone: '(646) 642-7582', email: 'karendenise93@gmail.com', employment: 'Full-Time' },
  { firstName: 'Zena', lastName: 'Frey', dateOfBirth: '', phone: '(516) 368-5468', email: 'Zena@ZenaFrey.com', employment: '' },
  { firstName: 'James', lastName: 'Fusco', dateOfBirth: '2004-10-14', phone: '(516) 459-5960', email: '', employment: '' },
  { firstName: 'Valentina', lastName: 'Gjidoda', dateOfBirth: '', phone: '(914) 299-9442', email: 'vgjidoda@gmail.com', employment: 'Full-Time' },
  { firstName: 'David', lastName: 'Grossman', dateOfBirth: '1962-01-03', phone: '(516) 521-8497', email: 'david100@optonline.net', employment: '' },
  { firstName: 'Nancy', lastName: 'Grossman', dateOfBirth: '1963-11-24', phone: '(516) 521-7672', email: 'nancy100@optonline.net', employment: 'Part-Time' },
  { firstName: 'Carlos', lastName: 'Guerra', dateOfBirth: '1989-02-02', phone: '(347) 777-8930', email: 'solrac819@yahoo.com', employment: 'Full-Time' },
  { firstName: 'Max', lastName: 'Hafker', dateOfBirth: '2005-07-27', phone: '(516) 416-1974', email: 'hafkermax@gmail.com', employment: '' },
  { firstName: 'Susan', lastName: 'Hannigan', dateOfBirth: '', phone: '(516) 567-5710', email: 'susanhanniganrn@gmail.com', employment: 'Full-Time' },
  { firstName: 'Richard', lastName: 'Hayes', dateOfBirth: '1964-11-05', phone: '(516) 526-0206', email: 'richiehayesboe@hotmail.com', employment: 'Full-Time' }
];

export function RealClientImporter() {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; errors: number; details: any[] }>({ success: 0, errors: 0, details: [] });
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importClients = async () => {
    setIsImporting(true);
    setProgress(0);
    setShowResults(false);
    
    const successfulImports: any[] = [];
    const failedImports: any[] = [];
    
    for (let i = 0; i < REAL_CLIENTS.length; i++) {
      const clientData = REAL_CLIENTS[i];
      setProgress(((i + 1) / REAL_CLIENTS.length) * 100);
      
      try {
        const clientToCreate = {
          firstName: clientData.firstName,
          lastName: clientData.lastName,
          dateOfBirth: clientData.dateOfBirth || undefined,
          phone: clientData.phone || undefined,
          email: clientData.email || undefined,
          status: 'active' as const,
          riskLevel: 'low' as const,
          // Store employment status in primaryConcerns as JSON for now
          primaryConcerns: clientData.employment ? { employment: clientData.employment } : undefined
        };
        
        const createdClient = await ApiClient.createClient(clientToCreate);
        successfulImports.push({ client: createdClient, originalData: clientData });
        
        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        console.error(`Failed to import ${clientData.firstName} ${clientData.lastName}:`, error);
        failedImports.push({ 
          originalData: clientData, 
          error: error.message || 'Unknown error' 
        });
      }
    }
    
    setResults({
      success: successfulImports.length,
      errors: failedImports.length,
      details: [...successfulImports, ...failedImports]
    });
    
    setShowResults(true);
    setIsImporting(false);
    
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    
    if (successfulImports.length > 0) {
      toast({
        title: 'Import Complete',
        description: `Successfully imported ${successfulImports.length} clients${failedImports.length > 0 ? ` (${failedImports.length} failed)` : ''}`,
      });
    }
    
    if (failedImports.length > 0) {
      toast({
        title: 'Some Imports Failed',
        description: `${failedImports.length} clients could not be imported. Check the results below.`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Import Your Real Client List</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Ready to Import 27 Real Clients
          </h3>
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            This will import all your actual clients with their names, dates of birth, contact information, and employment status from the CSV data you provided.
          </p>
        </div>
        
        {!isImporting && !showResults && (
          <Button 
            onClick={importClients}
            className="w-full bg-therapy-primary hover:bg-therapy-primary/90"
            size="lg"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import All 27 Clients
          </Button>
        )}
        
        {isImporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Importing clients...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}
        
        {showResults && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <div className="font-semibold text-green-900 dark:text-green-100">
                    {results.success} Successful
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    Clients imported
                  </div>
                </div>
              </div>
              
              {results.errors > 0 && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <div>
                    <div className="font-semibold text-red-900 dark:text-red-100">
                      {results.errors} Failed
                    </div>
                    <div className="text-sm text-red-700 dark:text-red-300">
                      Import errors
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <Button 
              onClick={() => setShowResults(false)}
              variant="outline"
              className="w-full"
            >
              Close Results
            </Button>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Note:</strong> This will create new client records with the real data from your CSV file.</p>
          <p>Employment status will be stored in the client's primary concerns field.</p>
          <p>Any existing clients with the same names will not be affected.</p>
        </div>
      </CardContent>
    </Card>
  );
}