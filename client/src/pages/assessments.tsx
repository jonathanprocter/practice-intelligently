import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Filter, Search, FileText, Clock, CheckCircle, AlertCircle, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AssessmentCatalogItem, ClientAssessment, ClientSelect } from "@shared/schema";
import { format } from "date-fns";

const therapistId = "e66b8b8e-e7a2-40b9-ae74-00c93ffe503c";

export default function Assessments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentCatalogItem | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch assessment catalog
  const { data: assessmentCatalog = [], isLoading: isLoadingCatalog } = useQuery({
    queryKey: ["/api/assessment-catalog"],
  });

  // Fetch client assessments for the therapist
  const { data: clientAssessments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["/api/client-assessments/therapist", therapistId],
  });

  // Fetch clients for assignment dropdown
  const { data: clients = [] } = useQuery<ClientSelect[]>({
    queryKey: ["/api/clients", therapistId],
  });

  const filteredCatalog = assessmentCatalog.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredAssignments = clientAssessments.filter((assignment: ClientAssessment) => {
    return statusFilter === "all" || assignment.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, icon: Clock, text: "Pending" },
      in_progress: { variant: "default" as const, icon: FileText, text: "In Progress" },
      completed: { variant: "default" as const, icon: CheckCircle, text: "Completed" },
      overdue: { variant: "destructive" as const, icon: AlertCircle, text: "Overdue" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  const getUniqueCategories = () => {
    const categories = assessmentCatalog.map((item: any) => item.category);
    return [...new Set(categories)];
  };

  const assignAssessmentMutation = useMutation({
    mutationFn: async (data: { catalogId: string; clientId: string; dueDate?: string; notes?: string }) => {
      const response = await fetch("/api/client-assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogId: data.catalogId,
          clientId: data.clientId,
          therapistId,
          assignedDate: new Date().toISOString(),
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
          notes: data.notes,
          status: "pending"
        }),
      });
      if (!response.ok) throw new Error("Failed to assign assessment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-assessments/therapist", therapistId] });
      setIsAssignDialogOpen(false);
      setSelectedAssessment(null);
      toast({
        title: "Assessment Assigned",
        description: "The assessment has been successfully assigned to the client.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign assessment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const AssignmentDialog = () => {
    const [selectedClient, setSelectedClient] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [notes, setNotes] = useState("");

    const handleAssign = () => {
      if (!selectedAssessment || !selectedClient) return;
      
      assignAssessmentMutation.mutate({
        catalogId: selectedAssessment.id,
        clientId: selectedClient,
        dueDate,
        notes,
      });
    };

    return (
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Assessment</DialogTitle>
            <DialogDescription>
              Assign "{selectedAssessment?.name}" to a client
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label>Client</label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label>Due Date (Optional)</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label>Notes (Optional)</label>
              <Input
                placeholder="Add any specific instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign} 
              disabled={!selectedClient || assignAssessmentMutation.isPending}
            >
              {assignAssessmentMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assessment Management</h1>
          <p className="text-muted-foreground">
            Manage assessment templates and track client progress
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList>
          <TabsTrigger value="catalog">Assessment Catalog</TabsTrigger>
          <TabsTrigger value="assignments">Client Assignments</TabsTrigger>
          <TabsTrigger value="packages">Assessment Packages</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assessments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {getUniqueCategories().map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoadingCatalog ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))
            ) : filteredCatalog.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No assessments found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm || categoryFilter !== "all" 
                    ? "Try adjusting your search or filter criteria" 
                    : "Create your first assessment template to get started"}
                </p>
              </div>
            ) : (
              filteredCatalog.map((item: any) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <Badge variant="outline">{item.category}</Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{item.estimated_time_minutes} minutes</span>
                      <span>{item.type}</span>
                    </div>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => {
                        setSelectedAssessment(item);
                        setIsAssignDialogOpen(true);
                      }}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Assign to Client
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <div className="flex justify-between items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {isLoadingAssignments ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </CardContent>
                </Card>
              ))
            ) : filteredAssignments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No assignments found</h3>
                  <p className="text-sm text-muted-foreground">
                    {statusFilter !== "all" 
                      ? "No assignments match the selected status filter" 
                      : "Start by assigning assessments to clients from the catalog"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredAssignments.map((assignment: ClientAssessment) => (
                <Card key={assignment.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-medium">{assignment.catalogId}</h3>
                        <p className="text-sm text-muted-foreground">Client: {assignment.clientId}</p>
                      </div>
                      {getStatusBadge(assignment.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Assigned:</span>
                        <p>{format(new Date(assignment.assignedDate), "MMM d, yyyy")}</p>
                      </div>
                      {assignment.dueDate && (
                        <div>
                          <span className="text-muted-foreground">Due:</span>
                          <p>{format(new Date(assignment.dueDate), "MMM d, yyyy")}</p>
                        </div>
                      )}
                      {assignment.startedDate && (
                        <div>
                          <span className="text-muted-foreground">Started:</span>
                          <p>{format(new Date(assignment.startedDate), "MMM d, yyyy")}</p>
                        </div>
                      )}
                      {assignment.completedDate && (
                        <div>
                          <span className="text-muted-foreground">Completed:</span>
                          <p>{format(new Date(assignment.completedDate), "MMM d, yyyy")}</p>
                        </div>
                      )}
                    </div>
                    {assignment.notes && (
                      <div className="mt-4 p-3 bg-muted rounded-md">
                        <p className="text-sm">{assignment.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="packages" className="space-y-4">
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Assessment Packages</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create and manage assessment packages for common treatment protocols
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Package
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AssignmentDialog />
    </div>
  );
}