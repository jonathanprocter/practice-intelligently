import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Users, 
  Search, 
  Plus, 
  ExternalLink, 
  Clock, 
  Target, 
  PlayCircle, 
  Eye, 
  Calendar,
  CheckCircle,
  Save,
  RefreshCw,
  MessageSquare,
  Brain,
  Wrench,
  Stethoscope
} from "lucide-react";
import { format } from "date-fns";
import { ValuesMatrix } from "@/components/assessments/ValuesMatrix";

const therapistId = "e66b8b8e-e7a2-40b9-ae74-00c93ffe503c";

export default function Assessments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentCatalogItem | null>(null);
  const [inSessionMode, setInSessionMode] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [inSessionAssessments, setInSessionAssessments] = useState<any[]>([]);
  const [activeIframe, setActiveIframe] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('catalog');
  const [showValuesMatrix, setShowValuesMatrix] = useState(false);
  const [valuesMatrixClientId, setValuesMatrixClientId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Data fetching queries
  const { data: catalogData, isLoading: isLoadingCatalog } = useQuery({
    queryKey: ["/api/assessment-catalog"],
  });

  const { data: assignmentsData, isLoading: isLoadingAssignments } = useQuery({
    queryKey: [`/api/client-assessments/therapist/${therapistId}`],
  });

  const { data: clientsData } = useQuery({
    queryKey: [`/api/clients/${therapistId}`],
  });

  // Filtering logic
  const getUniqueCategories = () => {
    if (!catalogData || !Array.isArray(catalogData)) return [];
    return Array.from(new Set(catalogData.map((item: any) => item.category)));
  };

  const filteredCatalog = (catalogData && Array.isArray(catalogData) ? catalogData : []).filter((item: any) => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredAssignments = (assignmentsData && Array.isArray(assignmentsData) ? assignmentsData : []).filter((assignment: any) => {
    return statusFilter === "all" || assignment.status === statusFilter;
  });

  // Helper functions
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Depression": "bg-purple-50 text-purple-700 border-purple-200",
      "Anxiety": "bg-blue-50 text-blue-700 border-blue-200",
      "Personality": "bg-green-50 text-green-700 border-green-200",
      "Trauma": "bg-red-50 text-red-700 border-red-200",
      "Substance Use": "bg-orange-50 text-orange-700 border-orange-200",
      "Couples": "bg-pink-50 text-pink-700 border-pink-200",
      "Tools": "bg-cyan-50 text-cyan-700 border-cyan-200",
      "tools": "bg-cyan-50 text-cyan-700 border-cyan-200",
      "self_discovery": "bg-emerald-50 text-emerald-700 border-emerald-200",
      "General": "bg-gray-50 text-gray-700 border-gray-200"
    };
    return colors[category] || "bg-gray-50 text-gray-700 border-gray-200";
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; text: string; className?: string }> = {
      assigned: { variant: "secondary", text: "Assigned" },
      in_progress: { variant: "default", text: "In Progress", className: "bg-blue-500" },
      completed: { variant: "default", text: "Completed", className: "bg-green-500" },
      overdue: { variant: "destructive", text: "Overdue" }
    };
    const config = statusConfig[status] || statusConfig.assigned;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.text}
      </Badge>
    );
  };

  // Session management functions
  const startLiveSession = () => {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentSessionId(sessionId);
    setInSessionMode(true);
    setActiveTab('session');
    toast({
      title: "Live Session Started",
      description: "Assessment session is now active for real-time administration."
    });
  };

  const endLiveSession = () => {
    setInSessionMode(false);
    setCurrentSessionId(null);
    setInSessionAssessments([]);
    setActiveIframe(null);
    toast({
      title: "Session Ended",
      description: "Assessment session has been completed and progress saved."
    });
  };

  // Assignment logic
  const assignMutation = useMutation({
    mutationFn: async (assignmentData: any) => {
      const response = await fetch("/api/client-assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignmentData),
      });
      if (!response.ok) throw new Error("Failed to assign assessment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/client-assessments/therapist/${therapistId}`] });
      toast({
        title: "Assessment Assigned",
        description: "The assessment has been successfully assigned to the client."
      });
    },
  });

  const handleAssign = (clientId: string, dueDate?: string, notes?: string) => {
    if (!selectedAssessment) return;
    
    assignMutation.mutate({
      clientId,
      catalogId: selectedAssessment.id,
      therapistId,
      assignedDate: new Date().toISOString(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      status: "assigned",
      notes,
    });
    
    setIsAssignDialogOpen(false);
    setSelectedAssessment(null);
  };

  // Assignment Dialog Component
  const AssignAssessmentDialog = ({ isOpen, onClose, assessment, clients, onAssign }: any) => {
    const [selectedClient, setSelectedClient] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [notes, setNotes] = useState("");

    if (!assessment) return null;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Assessment</DialogTitle>
            <DialogDescription>
              Assign "{assessment.name}" to a client with optional due date and notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Client</label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Due Date (Optional)</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Input
                placeholder="Add any specific instructions or notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button 
                onClick={() => onAssign(selectedClient, dueDate, notes)}
                disabled={!selectedClient}
              >
                Assign Assessment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Assessment Center</h1>
          <p className="text-sm text-gray-600 mt-1">Comprehensive assessment management</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
              activeTab === 'catalog' 
                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-4 h-4 mr-3" />
            Assessment Catalog
          </button>
          
          <button
            onClick={() => setActiveTab('assignments')}
            className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
              activeTab === 'assignments' 
                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4 mr-3" />
            Assigned Assessments
          </button>
          
          <button
            onClick={() => setActiveTab('packages')}
            className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
              activeTab === 'packages' 
                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Target className="w-4 h-4 mr-3" />
            Assessment Bundles
          </button>
          
          <button
            onClick={() => setActiveTab('session')}
            className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
              activeTab === 'session' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : inSessionMode 
                ? 'bg-green-100 text-green-800' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <PlayCircle className="w-4 h-4 mr-3" />
            {inSessionMode ? 'Live Session Active' : 'Session Mode'}
            {inSessionMode && <div className="w-2 h-2 bg-green-500 rounded-full ml-auto animate-pulse"></div>}
          </button>
          
          <button
            onClick={() => setActiveTab('progress')}
            className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-colors ${
              activeTab === 'progress' 
                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Eye className="w-4 h-4 mr-3" />
            Progress & Notes
          </button>
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Quick Actions</div>
          <div className="space-y-2">
            <Button size="sm" className="w-full justify-start" variant="outline">
              <Plus className="w-3 h-3 mr-2" />
              Create Template
            </Button>
            <Button size="sm" className="w-full justify-start" variant="outline">
              <Calendar className="w-3 h-3 mr-2" />
              View Schedule
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Sticky Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {activeTab === 'catalog' && 'Assessment Catalog'}
                  {activeTab === 'assignments' && 'Client Assignments'}
                  {activeTab === 'packages' && 'Assessment Bundles'}
                  {activeTab === 'session' && (inSessionMode ? 'Live Session' : 'Session Mode')}
                  {activeTab === 'progress' && 'Progress & Notes'}
                </h2>
                <p className="text-sm text-gray-600">
                  {activeTab === 'catalog' && 'Professional assessment tools and templates'}
                  {activeTab === 'assignments' && 'Track client assessment progress and completion'}
                  {activeTab === 'packages' && 'Pre-configured assessment packages for clinical workflows'}
                  {activeTab === 'session' && (inSessionMode ? 'Real-time assessment administration' : 'Start live assessment sessions')}
                  {activeTab === 'progress' && 'Assessment history and progress note integration'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {inSessionMode && (
                <div className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Session Active
                </div>
              )}
              
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Assign Assessment
              </Button>
              
              {!inSessionMode ? (
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={startLiveSession}>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Start Live Session
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={endLiveSession}>
                  End Session
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-auto">
          {renderActiveTab()}
        </div>
      </div>

      {/* Assign Assessment Dialog */}
      {selectedAssessment && (
        <AssignAssessmentDialog
          isOpen={isAssignDialogOpen}
          onClose={() => {
            setIsAssignDialogOpen(false);
            setSelectedAssessment(null);
          }}
          assessment={selectedAssessment}
          clients={clientsData || []}
          onAssign={handleAssign}
        />
      )}

      {/* Values Matrix Dialog */}
      <Dialog open={showValuesMatrix} onOpenChange={setShowValuesMatrix}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden" aria-describedby="values-matrix-description">
          <DialogHeader>
            <DialogTitle>Values Matrix Assessment</DialogTitle>
            <DialogDescription id="values-matrix-description">
              Complete this interactive assessment to identify and rank your personal values through pairwise comparisons.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <ValuesMatrix
              clientId={valuesMatrixClientId || undefined}
              onComplete={(results) => {
                // Handle completion - could save results, show success message, etc.
                toast({
                  title: "Values Matrix Completed",
                  description: "Your values have been successfully ranked and results exported."
                });
                setShowValuesMatrix(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderActiveTab() {
    switch (activeTab) {
      case 'catalog':
        return renderCatalogTab();
      case 'assignments':
        return renderAssignmentsTab();
      case 'packages':
        return renderPackagesTab();
      case 'session':
        return renderSessionTab();
      case 'progress':
        return renderProgressTab();
      default:
        return renderCatalogTab();
    }
  }

  function renderCatalogTab() {
    return (
      <div className="space-y-6">
        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border border-gray-200">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search assessments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
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

        {/* Assessment Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoadingCatalog ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-16 bg-gray-200 rounded mb-4"></div>
                  <div className="flex space-x-2">
                    <div className="h-8 bg-gray-200 rounded flex-1"></div>
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredCatalog.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments found</h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm || categoryFilter !== "all" 
                      ? "Try adjusting your search or filter criteria" 
                      : "Create your first assessment template to get started"}
                  </p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Assessment
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredCatalog.map((item: any) => (
              <Card key={item.id} className={`hover:shadow-lg transition-shadow border-l-4 ${(item.category === 'Tools' || item.category === 'tools' || item.category === 'self_discovery') ? 'border-l-cyan-500' : 'border-l-blue-500'}`}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      {(item.category === 'Tools' || item.category === 'tools' || item.category === 'self_discovery') ? (
                        <Wrench className="w-4 h-4 mr-2 text-cyan-600" />
                      ) : (
                        <Stethoscope className="w-4 h-4 mr-2 text-blue-600" />
                      )}
                      <CardTitle className="text-base font-semibold text-gray-900">{item.name}</CardTitle>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs px-2 py-1 ${getCategoryColor(item.category)}`}
                    >
                      {item.category}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm text-gray-600 line-clamp-2">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-xs text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {item.estimated_time_minutes} min
                    </div>
                    <div className="flex items-center">
                      <Target className="w-3 h-3 mr-1" />
                      {item.type}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedAssessment(item);
                        setIsAssignDialogOpen(true);
                      }}
                    >
                      <Users className="w-3 h-3 mr-1" />
                      Assign
                    </Button>
                    {item.name === 'Values Matrix' ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setShowValuesMatrix(true);
                          setValuesMatrixClientId(null); // Can be set to specific client if needed
                        }}
                      >
                        <PlayCircle className="w-3 h-3 mr-1" />
                        Start Tool
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(item.url, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  function renderAssignmentsTab() {
    return (
      <div className="space-y-6">
        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="font-medium text-gray-900">Client Assignments</h3>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {filteredAssignments.length} total
              </Badge>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Assignments Table/Cards */}
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
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
                <p className="text-gray-600 mb-6">
                  {statusFilter !== "all" 
                    ? "No assignments match the selected status filter" 
                    : "Start by assigning assessments to clients from the catalog"}
                </p>
                <Button onClick={() => setActiveTab('catalog')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Browse Catalog
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredAssignments.map((assignment: any) => (
              <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{assignment.catalogId}</h3>
                      <p className="text-sm text-gray-600">Client: {assignment.clientId}</p>
                    </div>
                    {getStatusBadge(assignment.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-500 block">Assigned:</span>
                      <span className="font-medium">{format(new Date(assignment.assignedDate), "MMM d, yyyy")}</span>
                    </div>
                    {assignment.dueDate && (
                      <div>
                        <span className="text-gray-500 block">Due:</span>
                        <span className="font-medium">{format(new Date(assignment.dueDate), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </div>
                  
                  {assignment.notes && (
                    <div className="p-3 bg-gray-50 rounded-lg mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Notes:</h4>
                      <p className="text-sm text-gray-700">{assignment.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  function renderPackagesTab() {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Assessment Bundles</h3>
          <p className="text-gray-600 mb-6">
            Pre-configured assessment packages for common therapeutic protocols and clinical workflows.
          </p>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Initial Comprehensive</CardTitle>
                <CardDescription>Complete intake assessment package</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 mb-3">
                  CCI-55 + 16PF + VLQ (~84 min)
                </div>
                <Button size="sm" className="w-full">
                  <Target className="w-3 h-3 mr-2" />
                  Assign Bundle
                </Button>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Personality</CardTitle>
                <CardDescription>Efficient personality assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 mb-3">
                  MBTI + Therapy Form (~30 min)
                </div>
                <Button size="sm" className="w-full">
                  <Target className="w-3 h-3 mr-2" />
                  Assign Bundle
                </Button>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Couples Package</CardTitle>
                <CardDescription>Relationship assessment bundle</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 mb-3">
                  Schema + VLQ (~47 min)
                </div>
                <Button size="sm" className="w-full">
                  <Target className="w-3 h-3 mr-2" />
                  Assign Bundle
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  function renderSessionTab() {
    if (!inSessionMode) {
      return (
        <div className="space-y-6">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center text-green-700">
                <PlayCircle className="w-5 h-5 mr-2" />
                Live Session Mode
              </CardTitle>
              <CardDescription>
                Start a real-time assessment session for immediate client administration during appointments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Session Benefits</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Real-time assessment administration</li>
                    <li>• Automatic progress tracking</li>
                    <li>• Direct session note integration</li>
                    <li>• Client engagement monitoring</li>
                  </ul>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">How It Works</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Select assessments to administer</li>
                    <li>• Client completes in real-time</li>
                    <li>• Results auto-save to notes</li>
                    <li>• Session summary generated</li>
                  </ul>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={startLiveSession}
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Start Live Assessment Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Live Session Header */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <h3 className="text-lg font-semibold text-gray-900">Live Session Active</h3>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-green-100 text-green-800">
                Session: {currentSessionId?.substring(0, 8)}
              </Badge>
              <Button 
                size="sm" 
                variant="outline" 
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={endLiveSession}
              >
                End Session
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Access Assessment Tools */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCatalog.slice(0, 6).map((item: any) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <Badge variant="outline" className="text-xs">{item.category}</Badge>
                </div>
                <CardDescription className="text-sm line-clamp-2">
                  {item.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{item.estimated_time_minutes} minutes</span>
                  <span>{item.type}</span>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      window.open(item.url, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
                      setActiveIframe(item.id);
                    }}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Open
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: "Added to Session Notes",
                        description: "Assessment template added to session notes for this client."
                      });
                    }}
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Add to Notes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  function renderProgressTab() {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Assessment History & Progress Notes</h3>
          <p className="text-gray-600 mb-6">
            View completed assessments and their integration with session notes and treatment progress.
          </p>
          
          <div className="space-y-4">
            <Card>
              <CardContent className="p-12 text-center">
                <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Assessment History</h3>
                <p className="text-gray-600 mb-6">
                  Completed assessments and progress notes will appear here as clients complete their assignments.
                </p>
                <Button onClick={() => setActiveTab('assignments')}>
                  <Target className="w-4 h-4 mr-2" />
                  View Assignments
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
}

// Define types for better TypeScript support
interface AssessmentCatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  estimated_time_minutes: number;
  url: string;
}

interface ClientAssessment {
  id: string;
  clientId: string;
  catalogId: string;
  therapistId: string;
  status: string;
  assignedDate: string;
  dueDate?: string;
  startedDate?: string;
  completedDate?: string;
  notes?: string;
}