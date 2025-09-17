import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClient, type Client } from "@/lib/api";
import { 
  Users, Plus, Search, Filter, Edit2, Calendar, Phone, Mail, UserCheck, 
  Upload, FileText, Archive, ChartLine, Trash2, Download, Tags, History, 
  AlertCircle, CheckCircle, XCircle, Clock, MapPin, Heart, Shield,
  MoreVertical, Eye, Copy, Printer, RefreshCw, UserPlus
} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { pageTransition, cardAnimation, listAnimation, listItemAnimation, fadeIn } from "@/lib/animations";
import { ClientCardSkeleton } from "@/components/ui/animated-skeleton";
import { AnimatedSpinner, LoadingButton } from "@/components/ui/animated-spinner";
import { NoClientsEmptyState, ErrorEmptyState } from "@/components/ui/empty-state";
import { AnimatedFormField } from "@/components/ui/animated-form-field";
import { Badge } from "@/components/ui/badge";
import { ClientForm } from "@/components/forms/ClientForm";
import { ClientListGenerator } from "@/components/clients/ClientListGenerator";
import { RealClientImporter } from "@/components/clients/RealClientImporter";
import { QuickClientUpdate } from "@/components/clients/QuickClientUpdate";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useMemo, useEffect } from "react";
import { format, differenceInYears, parseISO, isValid } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Enhanced Client Interface with additional fields
interface EnhancedClient extends Client {
  tags?: string[];
  lastAppointment?: string;
  nextAppointment?: string;
  totalSessions?: number;
  missedSessions?: number;
  flags?: string[];
}

// Export utilities
const exportToCSV = (clients: Client[]) => {
  // Ensure clients is always an array
  const clientList = Array.isArray(clients) ? clients : [];
  
  const headers = [
    'First Name', 'Last Name', 'Preferred Name', 'Email', 'Phone', 
    'Date of Birth', 'Gender', 'Status', 'Risk Level', 'Referral Source',
    'Emergency Contact', 'Created Date'
  ];
  
  const rows = clientList.map(client => [
    client.firstName,
    client.lastName,
    client.preferredName || '',
    client.email || '',
    client.phone || '',
    client.dateOfBirth && isValid(new Date(client.dateOfBirth)) ? format(new Date(client.dateOfBirth), 'MM/dd/yyyy') : '',
    client.gender || '',
    client.status,
    client.riskLevel || '',
    client.referralSource || '',
    client.emergencyContact ? JSON.stringify(client.emergencyContact) : '',
    client.createdAt && isValid(new Date(client.createdAt)) ? format(new Date(client.createdAt), 'MM/dd/yyyy') : 'Unknown date'
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `clients_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const exportToPDF = async (clients: Client[]) => {
  // Ensure clients is always an array
  const clientList = Array.isArray(clients) ? clients : [];
  
  // Dynamic import to avoid bundle size issues
  const jsPDF = (await import('jspdf')).default;
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Client List', 14, 22);
  doc.setFontSize(11);
  doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, 14, 30);
  
  let yPos = 40;
  const lineHeight = 8;
  const pageHeight = doc.internal.pageSize.height;
  
  clientList.forEach((client, index) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.text(`${index + 1}. ${client.firstName} ${client.lastName}`, 14, yPos);
    yPos += lineHeight;
    
    doc.setFontSize(10);
    if (client.email) {
      doc.text(`   Email: ${client.email}`, 14, yPos);
      yPos += lineHeight;
    }
    if (client.phone) {
      doc.text(`   Phone: ${client.phone}`, 14, yPos);
      yPos += lineHeight;
    }
    doc.text(`   Status: ${client.status}`, 14, yPos);
    yPos += lineHeight * 1.5;
  });
  
  doc.save(`clients_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showClientForm, setShowClientForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>("all");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('clientSearchHistory');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);
  
  const { data: clients, isLoading, error, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: () => ApiClient.getClients(),
  });

  const deleteClientMutation = useMutation({
    mutationFn: ({ clientId, force }: { clientId: string; force: boolean }) => ApiClient.deleteClient(clientId, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: "Client Deleted",
        description: "The client has been permanently deleted from the system.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "There was an error deleting the client. Please try again.",
        variant: "destructive",
      });
    },
  });

  const archiveClientsMutation = useMutation({
    mutationFn: async (clientIds: string[]) => {
      const promises = clientIds.map(id => 
        ApiClient.updateClient(id, { status: 'archived' })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setSelectedClients(new Set());
      toast({
        title: "Clients Archived",
        description: `${selectedClients.size} client(s) have been archived.`,
      });
    },
  });

  // Advanced fuzzy search implementation
  const performFuzzySearch = (client: Client, searchTermLower: string): boolean => {
    const searchableFields = [
      client.firstName,
      client.lastName,
      client.preferredName,
      client.email,
      client.phone,
      client.alternatePhone,
      client.referralSource,
      client.gender,
      client.clientNumber,
      client.pronouns
    ].filter(Boolean).map(field => field!.toLowerCase());

    // Check if search term is in any field
    const directMatch = searchableFields.some(field => 
      field.includes(searchTermLower)
    );
    
    if (directMatch) return true;

    // Check for partial matches across fields
    const searchWords = searchTermLower.split(' ').filter(Boolean);
    return searchWords.every(word => 
      searchableFields.some(field => field.includes(word))
    );
  };

  // Enhanced filtering and sorting
  const processedClients = useMemo(() => {
    if (!clients || !Array.isArray(clients)) return [];
    
    let filtered = [...clients];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(client => performFuzzySearch(client, searchLower));
      
      // Save to search history
      if (!searchHistory.includes(searchTerm)) {
        const newHistory = [searchTerm, ...searchHistory].slice(0, 10);
        setSearchHistory(newHistory);
        localStorage.setItem('clientSearchHistory', JSON.stringify(newHistory));
      }
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(client => client.status === filterStatus);
    }
    
    // Apply risk level filter
    if (filterRiskLevel !== 'all') {
      filtered = filtered.filter(client => client.riskLevel === filterRiskLevel);
    }
    
    // Apply gender filter
    if (filterGender !== 'all') {
      filtered = filtered.filter(client => client.gender === filterGender);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const aName = `${a.firstName} ${a.lastName}`.toLowerCase();
          const bName = `${b.firstName} ${b.lastName}`.toLowerCase();
          return aName.localeCompare(bName);
        case 'lastName':
          return (a.lastName || '').localeCompare(b.lastName || '');
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'risk':
          const riskOrder = { high: 0, medium: 1, low: 2 };
          return (riskOrder[a.riskLevel as keyof typeof riskOrder] || 3) - 
                 (riskOrder[b.riskLevel as keyof typeof riskOrder] || 3);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [clients, searchTerm, filterStatus, filterRiskLevel, filterGender, sortBy, searchHistory]);

  const activeClients = processedClients.filter(client => client.status === 'active');
  const inactiveClients = processedClients.filter(client => client.status === 'inactive');
  const archivedClients = processedClients.filter(client => client.status === 'archived');

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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const formatAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null;
    try {
      const date = parseISO(dateOfBirth);
      if (!isValid(date)) return null;
      return differenceInYears(new Date(), date);
    } catch {
      return null;
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedClients.size === 0) {
      toast({
        title: "No clients selected",
        description: "Please select at least one client to perform this action.",
        variant: "destructive",
      });
      return;
    }
    
    switch (action) {
      case 'delete':
        const clientNames = (Array.isArray(clients) ? clients : [])
          .filter(c => selectedClients.has(c.id))
          .map(c => `${c.firstName} ${c.lastName}`)
          .slice(0, 5)
          .join(', ');
        const moreCount = selectedClients.size > 5 ? ` and ${selectedClients.size - 5} more` : '';
        
        if (confirm(`Are you sure you want to permanently delete ${selectedClients.size} client(s)?\n\n${clientNames}${moreCount}\n\nThis action cannot be undone.`)) {
          try {
            // Delete each client sequentially
            for (const clientId of Array.from(selectedClients)) {
              const client = (Array.isArray(clients) ? clients : []).find(c => c.id === clientId);
              const isFakeClient = client && !client.email && !client.phone && !client.dateOfBirth;
              await ApiClient.deleteClient(clientId, isFakeClient || false);
            }
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            setSelectedClients(new Set());
            toast({
              title: "Clients Deleted",
              description: `Successfully deleted ${selectedClients.size} client(s).`,
            });
          } catch (error) {
            toast({
              title: "Delete Failed",
              description: "Some clients could not be deleted. They may have associated data.",
              variant: "destructive",
            });
          }
        }
        break;
      case 'archive':
        archiveClientsMutation.mutate(Array.from(selectedClients));
        break;
      case 'export-csv':
        const clientsToExport = (Array.isArray(clients) ? clients : []).filter(c => selectedClients.has(c.id));
        exportToCSV(clientsToExport);
        break;
      case 'export-pdf':
        const clientsForPDF = (Array.isArray(clients) ? clients : []).filter(c => selectedClients.has(c.id));
        exportToPDF(clientsForPDF);
        break;
    }
  };

  const toggleSelectAll = () => {
    if (selectedClients.size === processedClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(processedClients.map(c => c.id)));
    }
  };

  const toggleSelectClient = (clientId: string) => {
    const newSelection = new Set(selectedClients);
    if (newSelection.has(clientId)) {
      newSelection.delete(clientId);
    } else {
      newSelection.add(clientId);
    }
    setSelectedClients(newSelection);
  };

  const renderClientCard = (client: Client) => {
    const age = client.dateOfBirth ? formatAge(client.dateOfBirth) : null;
    const emergencyContact = client.emergencyContact as any;
    
    return (
      <Card 
        key={client.id} 
        className={`therapy-card hover:shadow-lg transition-all duration-200 ${
          selectedClients.has(client.id) ? 'ring-2 ring-therapy-primary' : ''
        }`}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-4 flex-1">
              <div className="relative">
                <Checkbox
                  checked={selectedClients.has(client.id)}
                  onCheckedChange={() => toggleSelectClient(client.id)}
                  className="absolute -top-2 -left-2 z-10"
                  data-testid={`checkbox-client-${client.id}`}
                />
                <Avatar className="h-12 w-12">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${client.firstName}${client.lastName}`} />
                  <AvatarFallback className="bg-therapy-primary/10 text-therapy-primary font-medium">
                    {getInitials(client.firstName, client.lastName)}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg text-therapy-text">
                    <button
                      onClick={() => setLocation(`/clients/${client.id}/chart`)}
                      className="hover:text-therapy-primary transition-colors text-left hover:underline"
                      data-testid={`link-client-name-${client.id}`}
                    >
                      {client.firstName} {client.lastName}
                    </button>
                  </h3>
                  {client.preferredName && (
                    <Badge variant="secondary" className="text-xs">
                      "{client.preferredName}"
                    </Badge>
                  )}
                  {client.pronouns && (
                    <Badge variant="outline" className="text-xs">
                      {client.pronouns}
                    </Badge>
                  )}
                  {(!client.email && !client.phone && !client.dateOfBirth) && (
                    <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Calendar Entry
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-therapy-text/70">
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {age !== null && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>Age {age}</span>
                    </div>
                  )}
                  {client.address && typeof client.address === 'object' && (client.address as any).city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">
                        {(client.address as any).city}, {(client.address as any).state}
                      </span>
                    </div>
                  )}
                </div>

                {emergencyContact && emergencyContact.name && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                      <Heart className="h-3 w-3" />
                      <span className="font-medium">Emergency:</span>
                      <span>{emergencyContact.name} - {emergencyContact.phone}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <Badge className={getStatusColor(client.status)}>
                  {client.status}
                </Badge>
                {client.riskLevel && client.riskLevel !== 'low' && (
                  <Badge className={getRiskLevelColor(client.riskLevel)}>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {client.riskLevel}
                  </Badge>
                )}
              </div>
              
              <div className="flex gap-1">
                {/* Quick Delete Button for fake clients without email/phone */}
                {!client.email && !client.phone && !client.dateOfBirth && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (confirm(`Delete "${client.firstName} ${client.lastName}"? This appears to be a calendar-generated entry.`)) {
                            deleteClientMutation.mutate({ clientId: client.id, force: true });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Quick delete (no client info)</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setLocation(`/clients/${client.id}/chart`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Chart
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setEditingClient(client);
                        setShowClientForm(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Client
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        navigator.clipboard.writeText(client.email || '');
                        toast({
                          title: "Email copied",
                          description: "Client email has been copied to clipboard.",
                        });
                      }}
                      disabled={!client.email}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Email
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => window.open(`tel:${client.phone}`, '_self')}
                      disabled={!client.phone}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Call Client
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${client.firstName} ${client.lastName}?`)) {
                          const isFakeClient = !client.email && !client.phone && !client.dateOfBirth;
                          deleteClientMutation.mutate({ clientId: client.id, force: isFakeClient });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Client
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Clients</h1>
          <Button disabled>
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        </div>
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2 w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Clients</h2>
          <p className="text-gray-600 mb-4">There was an error loading your clients. Please try again.</p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-therapy-text">Client Management</h1>
            <p className="text-therapy-text/60 mt-1">
              {clients?.length || 0} total clients • {activeClients.length} active
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {selectedClients.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {selectedClients.size} Selected
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => handleBulkAction('delete')}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleBulkAction('archive')}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction('export-csv')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction('export-pdf')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <Button variant="outline" onClick={() => setShowBulkImport(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportToCSV(processedClients)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToPDF(processedClients)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              className="bg-therapy-primary hover:bg-therapy-primary/90"
              onClick={() => {
                setEditingClient(null);
                setShowClientForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, phone, or any field..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-clients"
                />
                {searchHistory.length > 0 && searchTerm === '' && (
                  <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 p-2">
                    <p className="text-xs text-gray-500 mb-2">Recent searches</p>
                    {searchHistory.slice(0, 5).map((term, i) => (
                      <button
                        key={i}
                        onClick={() => setSearchTerm(term)}
                        className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <Clock className="h-3 w-3 inline mr-2" />
                        {term}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <Button 
                variant={showAdvancedSearch ? "default" : "outline"}
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? '☰' : '⊞'}
              </Button>
            </div>
            
            {showAdvancedSearch && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs">Risk Level</Label>
                  <Select value={filterRiskLevel} onValueChange={setFilterRiskLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="low">Low Risk</SelectItem>
                      <SelectItem value="medium">Medium Risk</SelectItem>
                      <SelectItem value="high">High Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs">Gender</Label>
                  <Select value={filterGender} onValueChange={setFilterGender}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genders</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs">Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">First Name</SelectItem>
                      <SelectItem value="lastName">Last Name</SelectItem>
                      <SelectItem value="recent">Recently Added</SelectItem>
                      <SelectItem value="risk">Risk Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {(filterStatus !== 'all' || filterRiskLevel !== 'all' || filterGender !== 'all') && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Active filters:</span>
                {filterStatus !== 'all' && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterStatus('all')}>
                    Status: {filterStatus}
                    <XCircle className="h-3 w-3 ml-1" />
                  </Badge>
                )}
                {filterRiskLevel !== 'all' && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterRiskLevel('all')}>
                    Risk: {filterRiskLevel}
                    <XCircle className="h-3 w-3 ml-1" />
                  </Badge>
                )}
                {filterGender !== 'all' && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterGender('all')}>
                    Gender: {filterGender}
                    <XCircle className="h-3 w-3 ml-1" />
                  </Badge>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Quick Update Component */}
        {activeClients.length > 0 && (
          <QuickClientUpdate clients={activeClients} />
        )}

        {/* Client List */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active ({activeClients.length})
            </TabsTrigger>
            <TabsTrigger value="inactive" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Inactive ({inactiveClients.length})
            </TabsTrigger>
            <TabsTrigger value="archived" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Archived ({archivedClients.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-6">
            {activeClients.length > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <Checkbox
                  checked={selectedClients.size === activeClients.length && activeClients.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <Label className="text-sm">Select all {activeClients.length} clients</Label>
              </div>
            )}
            <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2' : 'space-y-4'}>
              {activeClients.length > 0 ? (
                activeClients.map(renderClientCard)
              ) : (
                <Card className="p-12 text-center col-span-2">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active clients found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first client'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setShowClientForm(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Your First Client
                    </Button>
                  )}
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="inactive" className="mt-6">
            <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2' : 'space-y-4'}>
              {inactiveClients.length > 0 ? (
                inactiveClients.map(renderClientCard)
              ) : (
                <Card className="p-12 text-center col-span-2">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No inactive clients</h3>
                  <p className="text-gray-600">Inactive clients will appear here</p>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="archived" className="mt-6">
            <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2' : 'space-y-4'}>
              {archivedClients.length > 0 ? (
                archivedClients.map(renderClientCard)
              ) : (
                <Card className="p-12 text-center col-span-2">
                  <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No archived clients</h3>
                  <p className="text-gray-600">Archived clients will appear here</p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Client Form Dialog */}
        <ClientForm
          client={editingClient || undefined}
          open={showClientForm}
          onOpenChange={setShowClientForm}
        />

        {/* Bulk Import Dialog */}
        <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Import Client List</DialogTitle>
              <DialogDescription>
                Import multiple clients at once from your existing data
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[70vh]">
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
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}