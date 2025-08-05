import { useQuery } from "@tanstack/react-query";
import { ApiClient, type Client } from "@/lib/api";
import { Users, Plus, Search, Filter, Edit2, Calendar, Phone, Mail, UserCheck, Upload, FileText, Archive, ChartLine } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ClientForm } from "@/components/forms/ClientForm";
import { ClientListGenerator } from "@/components/clients/ClientListGenerator";
import { RealClientImporter } from "@/components/clients/RealClientImporter";
import { QuickClientUpdate } from "@/components/clients/QuickClientUpdate";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { format } from "date-fns";

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showClientForm, setShowClientForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [, setLocation] = useLocation();
  
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: () => ApiClient.getClients(),
  });

  // Debug logging - check for API errors
  if (error) {
    console.error('Clients API error:', error);
  }
  


  // Filter clients by status
  const activeClients = clients?.filter(client => client.status === 'active') || [];
  const archivedClients = clients?.filter(client => client.status === 'archived') || [];
  
  const sortClientsAlphabetically = (clientList: Client[]) => {
    return clientList.sort((a, b) => {
      const aName = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase().trim();
      const bName = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase().trim();
      return aName.localeCompare(bName);
    });
  };

  const filterClientsBySearch = (clientList: Client[]) => {
    if (!searchTerm.trim()) return sortClientsAlphabetically(clientList);
    
    const searchLower = searchTerm.toLowerCase().trim();
    const filtered = clientList.filter(client => {
      const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
      const preferredName = client.preferredName?.toLowerCase() || '';
      const email = client.email?.toLowerCase() || '';
      const phone = client.phone?.toLowerCase() || '';
      
      return fullName.includes(searchLower) ||
             preferredName.includes(searchLower) ||
             email.includes(searchLower) ||
             phone.includes(searchLower) ||
             client.firstName?.toLowerCase().includes(searchLower) ||
             client.lastName?.toLowerCase().includes(searchLower);
    });
    
    return sortClientsAlphabetically(filtered);
  };

  const filteredActiveClients = filterClientsBySearch(activeClients);
  const filteredArchivedClients = filterClientsBySearch(archivedClients);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'archived': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const handleAddClient = () => {
    setEditingClient(null);
    setShowClientForm(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowClientForm(true);
  };

  const handleCloseForm = () => {
    setShowClientForm(false);
    setEditingClient(null);
  };

  const formatAge = (dateOfBirth: string) => {
    const age = new Date().getFullYear() - new Date(dateOfBirth).getFullYear();
    return age;
  };

  const renderClientList = (clientList: Client[], emptyMessage: string, emptyDescription: string) => (
    <div className="grid gap-4">
      {clientList.length > 0 ? (
        clientList.map((client) => (
          <div key={client.id} className="therapy-card p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className="w-12 h-12 bg-therapy-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-therapy-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-semibold text-therapy-text text-lg">
                      {client.firstName} {client.lastName}
                      {client.preferredName && (
                        <span className="text-sm text-therapy-text/60 ml-2">
                          "{client.preferredName}"
                        </span>
                      )}
                    </h3>
                    {client.pronouns && (
                      <span className="text-xs bg-therapy-accent/10 text-therapy-accent px-2 py-1 rounded">
                        {client.pronouns}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-therapy-text/60 mb-3">
                    {client.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.dateOfBirth && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(client.dateOfBirth), 'MMM d, yyyy')} 
                          <span className="ml-1 text-therapy-text/40">
                            (Age {formatAge(client.dateOfBirth)})
                          </span>
                        </span>
                      </div>
                    )}
                    {client.gender && (
                      <div className="flex items-center space-x-2">  
                        <UserCheck className="h-4 w-4" />
                        <span className="capitalize">{client.gender}</span>
                      </div>
                    )}
                    {client.address && typeof client.address === 'object' && (client.address as any).street && (
                      <div className="flex items-center space-x-2 col-span-full">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">
                          {(client.address as any).street}, {(client.address as any).city}, {(client.address as any).state} {(client.address as any).zipCode}
                        </span>
                      </div>
                    )}
                    {client.alternatePhone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4" />
                        <span className="text-xs">{client.alternatePhone} (alt)</span>
                      </div>
                    )}
                  </div>

                  {client.referralSource && (
                    <div className="text-xs text-therapy-text/50 mb-2">
                      Referred by: {client.referralSource}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 flex-shrink-0">
                <div className="flex flex-col space-y-2">
                  <Badge className={getStatusColor(client.status)}>
                    {client.status}
                  </Badge>
                  {client.riskLevel && client.riskLevel !== 'low' && (
                    <Badge className={getRiskLevelColor(client.riskLevel)}>
                      {client.riskLevel} risk
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setLocation(`/clients/${client.id}/chart`)}
                    data-testid={`button-chart-${client.id}`}
                  >
                    <ChartLine className="w-4 h-4 mr-1" />
                    Chart
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditClient(client)}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`tel:${client.phone}`, '_self')}
                    disabled={!client.phone}
                  >
                    Call
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="therapy-card p-12 text-center">
          <Users className="h-12 w-12 text-therapy-text/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-therapy-text mb-2">
            {searchTerm ? 'No clients found' : emptyMessage}
          </h3>
          <p className="text-therapy-text/60 mb-4">
            {searchTerm 
              ? 'Try adjusting your search terms'
              : emptyDescription
            }
          </p>
          {!searchTerm && emptyMessage === 'No clients yet' && (
            <Button 
              className="bg-therapy-primary hover:bg-therapy-primary/90"
              onClick={handleAddClient}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Client
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Clients</h1>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        </div>
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="therapy-card p-6 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-therapy-text">Clients</h1>
          <p className="text-therapy-text/60">Manage your client roster and profiles</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Import List
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Import Client List</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto">
                <Tabs defaultValue="real-data" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="real-data">Your Real Clients ({clients?.length || 0})</TabsTrigger>
                    <TabsTrigger value="manual-import">Manual Import</TabsTrigger>
                  </TabsList>
                  <TabsContent value="real-data" className="mt-4">
                    <RealClientImporter />
                  </TabsContent>
                  <TabsContent value="manual-import" className="mt-4">
                    <ClientListGenerator />
                  </TabsContent>
                </Tabs>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button 
            className="bg-therapy-primary hover:bg-therapy-primary/90"
            onClick={handleAddClient}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        </div>
      </div>

      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Quick Update Component for existing clients missing data */}
      {activeClients && activeClients.length > 0 && (
        <QuickClientUpdate clients={activeClients} />
      )}

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Active Clients ({activeClients.length})</span>
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center space-x-2">
            <Archive className="h-4 w-4" />
            <span>Archived ({archivedClients.length})</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-6">
          {renderClientList(
            filteredActiveClients,
            'No active clients yet',
            'Start by adding your first client to begin managing their therapy journey'
          )}
        </TabsContent>
        
        <TabsContent value="archived" className="mt-6">
          {renderClientList(
            filteredArchivedClients,
            'No archived clients',
            'Archived clients will appear here when you archive them'
          )}
        </TabsContent>
      </Tabs>

      <ClientForm
        client={editingClient || undefined}
        open={showClientForm}
        onOpenChange={handleCloseForm}
      />
    </div>
  );
}
