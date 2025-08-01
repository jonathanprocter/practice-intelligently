import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient, type Client } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Users, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Complete real client data from the provided CSV files
const REAL_CLIENTS = [
  { firstName: 'William', lastName: 'Aymami', dateOfBirth: '1972-07-01', phone: '(917) 495-9421', email: 'waymami@yahoo.com', address: 'Hempstead, NY 11550', employment: 'Unemployed' },
  { firstName: 'Billy', lastName: 'Aymami', dateOfBirth: '', phone: '(917) 495-9421', email: 'waymami@yahoo.com', address: 'Hempstead, NY 11550', employment: 'Unemployed' },
  { firstName: 'Christopher', lastName: 'Balabanick', dateOfBirth: '1998-10-28', phone: '(516) 738-2550', email: 'pattonswarrior0777@gmail.com', address: 'Port Saint Lucie, FL 34984', employment: 'Unemployed' },
  { firstName: 'Paul', lastName: 'Benjamin', dateOfBirth: '1995-09-04', phone: '(516) 297-7877', email: 'ssb95@aol.com', address: 'Plainview, NY 11803', employment: 'Part-Time' },
  { firstName: 'John', lastName: 'Best', dateOfBirth: '1962-06-01', phone: '(646) 208-3202', email: 'bestjm@gmail.com', address: 'Malverne, NY 11565', employment: '' },
  { firstName: 'Nicholas', lastName: 'Bonomi', dateOfBirth: '1992-05-22', phone: '(516) 816-6064', email: 'nick.bonomi22@gmail.com', address: 'Syosset, NY 11791', employment: 'Unemployed' },
  { firstName: 'Michael', lastName: 'Bower', dateOfBirth: '1962-09-27', phone: '(516) 313-4616', email: 'mlbower1234@gmail.com', address: 'Freeport, NY 11520', employment: 'Full-Time' },
  { firstName: 'Brianna', lastName: 'Brickman', dateOfBirth: '1995-09-19', phone: '(845) 826-2186', email: 'bbrickman1@gmail.com', address: 'Oceanside, NY 11572', employment: 'Full-Time' },
  { firstName: 'Mary', lastName: 'Camarano', dateOfBirth: '1995-03-19', phone: '(516) 361-6960', email: 'mekc92016@gmail.com', address: '', employment: '' },
  { firstName: 'Bob', lastName: 'Delmond', dateOfBirth: '1963-01-10', phone: '(516) 313-3962', email: 'mikenbob1@gmail.com', address: 'Freeport, NY 11520', employment: 'Full-Time' },
  { firstName: 'Robert', lastName: 'Delmond', dateOfBirth: '1963-01-10', phone: '(516) 313-3962', email: 'mikenbob1@gmail.com', address: 'Freeport, NY 11520', employment: 'Full-Time' },
  { firstName: 'Steven', lastName: 'Deluca', dateOfBirth: '', phone: '(516) 477-1539', email: 'sdeluca25@yahoo.com', address: 'Farmingdale, NY 11735', employment: 'Full-Time' },
  { firstName: 'Nick', lastName: 'Dabreu', dateOfBirth: '', phone: '(631) 793-5564', email: 'nick.dabreu@gmail.com', address: '', employment: '' },
  { firstName: 'Maryellen', lastName: 'Dankenbrink', dateOfBirth: '1991-12-24', phone: '(516) 428-2797', email: 'Maryellendankenbrink@gmail.com', address: 'Massapequa Park, NY 11762', employment: 'Self-employed' },
  { firstName: 'Caitlin', lastName: 'Dunn', dateOfBirth: '1997-07-21', phone: '(516) 761-7775', email: 'caitlindunn0721@gmail.com', address: 'Long Beach, NY 11561', employment: 'Unemployed' },
  { firstName: 'Kenneth', lastName: 'Doyle', dateOfBirth: '1996-02-23', phone: '(516) 263-9242', email: 'kenjdoyleii@gmail.com', address: 'New York, NY 10031', employment: 'Unemployed' },
  { firstName: 'Michael', lastName: 'Cserenyi', dateOfBirth: '1990-03-27', phone: '(631) 449-0268', email: 'Kiuorno22@gmail.com', address: 'Shirley, NY 11967', employment: 'Full-Time' },
  { firstName: 'Gavin', lastName: 'Fisch', dateOfBirth: '2006-09-12', phone: '(631) 383-5781', email: 'gavindfisch@gmail.com', address: 'Melville, NY 11747', employment: 'Unemployed' },
  { firstName: 'Krista', lastName: 'Flood', dateOfBirth: '', phone: '(516) 468-0508', email: 'Krista.flood1@gmail.com', address: '', employment: '' },
  { firstName: 'Karen', lastName: 'Foster', dateOfBirth: '1993-08-27', phone: '(646) 642-7582', email: 'karendenise93@gmail.com', address: 'East Williston, NY 11596', employment: 'Full-Time' },
  { firstName: 'Zena', lastName: 'Frey', dateOfBirth: '', phone: '(516) 368-5468', email: 'Zena@ZenaFrey.com', address: '', employment: '' },
  { firstName: 'James', lastName: 'Fusco', dateOfBirth: '2004-10-14', phone: '(516) 459-5960', email: '', address: 'Farmingdale, NY 11735', employment: '' },
  { firstName: 'Valentina', lastName: 'Gjidoda', dateOfBirth: '', phone: '(914) 299-9442', email: 'vgjidoda@gmail.com', address: 'Lagrangeville, NY 12540', employment: 'Full-Time' },
  { firstName: 'David', lastName: 'Grossman', dateOfBirth: '1962-01-03', phone: '(516) 521-8497', email: 'david100@optonline.net', address: 'Woodbury, NY 11797', employment: '' },
  { firstName: 'Nancy', lastName: 'Grossman', dateOfBirth: '1963-11-24', phone: '(516) 521-7672', email: 'nancy100@optonline.net', address: 'Woodbury, NY 11797', employment: 'Part-Time' },
  { firstName: 'Lindsey', lastName: 'Grossman', dateOfBirth: '1993-03-03', phone: '', email: '', address: 'Forest Hills, NY 11375', employment: 'Full-Time' },
  { firstName: 'Carlos', lastName: 'Guerra', dateOfBirth: '1989-02-02', phone: '(347) 777-8930', email: 'solrac819@yahoo.com', address: 'Astoria, NY 11105', employment: 'Full-Time' },
  { firstName: 'Max', lastName: 'Hafker', dateOfBirth: '2005-07-27', phone: '(516) 416-1974', email: 'hafkermax@gmail.com', address: 'Malverne, NY 11565', employment: '' },
  { firstName: 'Susan', lastName: 'Hannigan', dateOfBirth: '', phone: '(516) 567-5710', email: 'susanhanniganrn@gmail.com', address: 'Long Beach, NY 11561', employment: 'Full-Time' },
  { firstName: 'Richard', lastName: 'Hayes', dateOfBirth: '1964-11-05', phone: '(516) 526-0206', email: 'richiehayesboe@hotmail.com', address: 'Island Park, NY 11558', employment: 'Full-Time' },
  { firstName: 'Jason', lastName: 'Laskin', dateOfBirth: '1994-09-29', phone: '', email: '', address: 'Woodbury, NY 11797', employment: '' },
  { firstName: 'Nico', lastName: 'Luppino', dateOfBirth: '1992-07-13', phone: '', email: '', address: 'Rockville Centre, NY 11570', employment: 'Unemployed' },
  { firstName: 'Nicola', lastName: 'Marasco', dateOfBirth: '1994-12-05', phone: '', email: '', address: 'Rockville Centre, NY 11570', employment: 'Full-Time' },
  { firstName: 'Noah', lastName: 'Silverman', dateOfBirth: '2004-08-28', phone: '', email: '', address: 'Syosset, NY 11797', employment: 'Full-time Student' },
  { firstName: 'Owen', lastName: 'Lennon', dateOfBirth: '2006-02-11', phone: '', email: '', address: 'Rockville Centre, NY 11570', employment: '' },
  { firstName: 'Robert', lastName: 'Abbot', dateOfBirth: '1962-11-29', phone: '', email: '', address: 'Malverne, NY 11565', employment: 'Full-Time' },
  { firstName: 'Ruben', lastName: 'Spilberg', dateOfBirth: '1988-01-18', phone: '', email: '', address: 'Philadelphia, PA 19127', employment: 'Full-Time' },
  { firstName: 'Sacha', lastName: 'Jones', dateOfBirth: '1992-09-29', phone: '', email: '', address: 'Nelson, BC V1W1P2', employment: 'Full-Time' },
  { firstName: 'Sarah', lastName: 'Thomas', dateOfBirth: '1990-03-15', phone: '', email: '', address: 'Bethpage, NY 11714', employment: 'Full-Time' },
  { firstName: 'Scott', lastName: 'Berger', dateOfBirth: '', phone: '', email: '', address: 'Philadelphia, PA 19103', employment: 'Full-Time' },
  { firstName: 'Sherrifa', lastName: 'Hoosein', dateOfBirth: '', phone: '', email: '', address: 'Queens Village, NY 11428', employment: 'Part-Time' },
  { firstName: 'Tom', lastName: 'Remy', dateOfBirth: '', phone: '', email: '', address: 'Rockville Centre, NY 11570', employment: '' },
  { firstName: 'Tracy', lastName: 'Storey', dateOfBirth: '', phone: '', email: '', address: 'Valley Stream, NY 11580', employment: '' },
  { firstName: 'Trendall', lastName: 'Storey', dateOfBirth: '', phone: '', email: '', address: 'Valley Stream, NY 11580', employment: 'Full-time Student' },
  { firstName: 'Vivian', lastName: 'Meador', dateOfBirth: '', phone: '', email: '', address: 'Jumping Branch, WV 25969', employment: '' },
  // Additional clients from extended list
  { firstName: 'Adelaida', lastName: 'Mongelli', dateOfBirth: '1996-11-30', phone: '', email: '', address: 'Levittown, NY 11756', employment: 'Full-Time' },
  { firstName: 'Amberly', lastName: 'Comeau', dateOfBirth: '1998-09-25', phone: '(516) 506-2821', email: 'afcomeau925@hotmail.com', address: 'New Rochelle, NY 10801', employment: '' },
  { firstName: 'Andrew', lastName: 'Ross', dateOfBirth: '1989-08-24', phone: '', email: '', address: 'Commack, NY 11725', employment: 'Full-Time' },
  { firstName: 'Angelica', lastName: 'Ruden', dateOfBirth: '1995-02-24', phone: '', email: '', address: 'Seaford, NY 11783', employment: 'Full-Time' },
  { firstName: 'Brian', lastName: 'Kolsch', dateOfBirth: '2002-02-17', phone: '', email: '', address: 'Bethpage, NY 11714', employment: 'Unemployed' },
  { firstName: 'Calvin', lastName: 'Hill', dateOfBirth: '1996-03-17', phone: '', email: '', address: 'Valley Stream, NY 11580', employment: '' },
  { firstName: 'Dan', lastName: 'Settle', dateOfBirth: '1965-09-01', phone: '', email: '', address: 'Syosset, NY 11791', employment: 'Full-Time' },
  { firstName: 'Freddy', lastName: 'Rodriguez', dateOfBirth: '1985-03-11', phone: '', email: '', address: 'Island Park, NY 11558', employment: 'Full-Time' },
  { firstName: 'Gavin', lastName: 'Perna', dateOfBirth: '2003-09-27', phone: '', email: '', address: 'Charleston, WV 25302', employment: '' },
  { firstName: 'Hector', lastName: 'Mendez', dateOfBirth: '1965-09-02', phone: '', email: '', address: 'Baldwin, NY 11510', employment: 'Full-Time' },
  { firstName: 'James', lastName: 'Wright', dateOfBirth: '2002-05-25', phone: '', email: '', address: 'Carle Place, NY 11514', employment: '' },
  { firstName: 'Jaquan', lastName: 'Williams', dateOfBirth: '1986-12-26', phone: '', email: '', address: 'Jamaica, NY 11435', employment: 'Full-Time' },
  { firstName: 'Jared', lastName: 'Vignola', dateOfBirth: '2003-05-17', phone: '', email: '', address: 'Mattituck, NY 11952', employment: '' },
  { firstName: 'Jennifer', lastName: 'McNally', dateOfBirth: '1993-01-11', phone: '', email: '', address: 'Wantagh, NY 11793', employment: 'Full-Time' },
  { firstName: 'Jerry', lastName: 'MacKey', dateOfBirth: '1984-09-20', phone: '', email: '', address: '', employment: '' },
  { firstName: 'Jordano', lastName: 'Sanchez', dateOfBirth: '1991-06-09', phone: '', email: '', address: 'Long Island City, NY 11101', employment: 'Full-Time' },
  { firstName: 'Kieran', lastName: 'Kriss', dateOfBirth: '1990-02-08', phone: '', email: '', address: 'Valley Stream, NY 11580', employment: 'Full-Time' },
  { firstName: 'Kristi', lastName: 'Rook', dateOfBirth: '1974-01-25', phone: '', email: '', address: 'Long Beach, NY 11561', employment: '' },
  { firstName: 'Luke', lastName: 'Knox', dateOfBirth: '1998-01-06', phone: '', email: '', address: 'Burbank, CA 91505', employment: 'Full-time Student' },
  { firstName: 'Matthew', lastName: 'Michelson', dateOfBirth: '1999-10-10', phone: '', email: '', address: 'Plainview, NY 11803', employment: 'Part-Time' },
  { firstName: 'Max', lastName: 'Moskowitz', dateOfBirth: '2000-06-04', phone: '', email: '', address: 'Windermere, FL 34786', employment: 'Part-Time' },
  { firstName: 'Meera', lastName: 'Zucker', dateOfBirth: '1981-06-05', phone: '', email: '', address: 'Brooklyn, NY 11211', employment: 'Full-Time' },
  { firstName: 'Michael', lastName: 'Neira', dateOfBirth: '1994-02-18', phone: '', email: '', address: '', employment: '' }
];

interface ImportResult {
  status: 'success' | 'failed';
  message?: string;
  name?: string;
  email?: string;
  phone?: string;
  error?: string;
}

interface ClientImportData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  status?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
}

export function RealClientImporter() {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; errors: number; details: ImportResult[] }>({ success: 0, errors: 0, details: [] });
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importClients = async () => {
    setIsImporting(true);
    setProgress(0);
    setShowResults(false);

    const successfulImports: ImportResult[] = [];
    const failedImports: ImportResult[] = [];

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
          // Store employment status and address in appropriate fields
          primaryConcerns: clientData.employment ? { employment: clientData.employment } : undefined,
          address: clientData.address ? { street: clientData.address } : undefined
        };

        const createdClient = await ApiClient.createClient(clientToCreate);
        successfulImports.push({ name: createdClient.firstName + ' ' + createdClient.lastName, email: createdClient.email, phone: createdClient.phone, status: 'success' });

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error(`Failed to import ${clientData.firstName} ${clientData.lastName}:`, error);
        failedImports.push({ 
          name: clientData.firstName + ' ' + clientData.lastName,
          email: clientData.email,
          phone: clientData.phone,
          status: 'failed',
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
            Ready to Import {REAL_CLIENTS.length} Real Clients
          </h3>
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            This will import all your actual clients with their names, dates of birth, contact information, addresses, and employment status from the CSV data you provided.
          </p>
        </div>

        {!isImporting && !showResults && (
          <Button 
            onClick={importClients}
            className="w-full bg-therapy-primary hover:bg-therapy-primary/90"
            size="lg"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import All {REAL_CLIENTS.length} Clients
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