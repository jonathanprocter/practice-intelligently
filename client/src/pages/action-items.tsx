import { useQuery, useMutation } from "@tanstack/react-query";
import { ApiClient, type ActionItem } from "@/lib/api";
import { CheckSquare, Plus, Search, Filter, AlertTriangle, Clock, FileText, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function ActionItems() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isCreating, setIsCreating] = useState(false);
  const [newItem, setNewItem] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    dueDate: ""
  });
  
  const { toast } = useToast();

  const { data: actionItems, isLoading } = useQuery({
    queryKey: ['action-items'],
    queryFn: ApiClient.getActionItems,
  });

  const createMutation = useMutation({
    mutationFn: (item: Omit<ActionItem, 'id'>) => ApiClient.createActionItem(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-items'] });
      queryClient.invalidateQueries({ queryKey: ['urgent-action-items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsCreating(false);
      setNewItem({ title: "", description: "", priority: "medium", dueDate: "" });
      toast({ title: "Action item created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create action item", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ActionItem> }) => 
      ApiClient.updateActionItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-items'] });
      queryClient.invalidateQueries({ queryKey: ['urgent-action-items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({ title: "Action item updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update action item", variant: "destructive" });
    }
  });

  const filteredItems = actionItems?.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === "all" || item.priority === filterPriority;
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  }) || [];

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return AlertTriangle;
      case 'medium': return Clock;
      default: return FileText;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 border-red-200 text-red-800';
      case 'medium': return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      default: return 'bg-blue-100 border-blue-200 text-blue-800';
    }
  };

  const getBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-therapy-error/10 text-therapy-error';
      case 'medium': return 'bg-therapy-warning/10 text-therapy-warning';
      default: return 'bg-therapy-primary/10 text-therapy-primary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDueDate = (dateString?: string) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`;
    return `Due ${date.toLocaleDateString()}`;
  };

  const handleCreateItem = () => {
    if (!newItem.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    createMutation.mutate({
      ...newItem,
      status: 'pending',
      dueDate: newItem.dueDate || undefined
    });
  };

  const handleStatusChange = (id: string, status: string) => {
    updateMutation.mutate({ 
      id, 
      updates: { 
        status: status as ActionItem['status'],
        ...(status === 'completed' ? { completedAt: new Date().toISOString() } : {})
      } 
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Action Items</h1>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Action Item
          </Button>
        </div>
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="therapy-card p-6 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-6 h-6 bg-gray-200 rounded-lg"></div>
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
          <h1 className="text-2xl font-bold text-therapy-text">Action Items</h1>
          <p className="text-therapy-text/60">Manage therapy-related tasks and follow-ups</p>
        </div>
        <Button 
          className="bg-therapy-primary hover:bg-therapy-primary/90"
          onClick={() => setIsCreating(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Action Item
        </Button>
      </div>

      {isCreating && (
        <div className="therapy-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Create Action Item</h3>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsCreating(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input
                placeholder="Enter action item title..."
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea 
                placeholder="Enter description (optional)..."
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <Select value={newItem.priority} onValueChange={(value) => setNewItem({ ...newItem, priority: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Due Date</label>
                <Input
                  type="date"
                  value={newItem.dueDate}
                  onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateItem}
              disabled={createMutation.isPending}
              className="bg-therapy-success hover:bg-therapy-success/90"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Item'}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search action items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const IconComponent = getPriorityIcon(item.priority);
            return (
              <div 
                key={item.id} 
                className={`therapy-card border-l-4 ${
                  item.priority === 'high' ? 'border-l-red-500' :
                  item.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mt-1 ${
                        item.priority === 'high' ? 'bg-red-100 text-red-600' :
                        item.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold text-therapy-text mb-1 ${
                          item.status === 'completed' ? 'line-through opacity-60' : ''
                        }`}>
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className="text-therapy-text/70 text-sm mb-3">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-3">
                          <Badge className={getBadgeColor(item.priority)}>
                            {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)} Priority
                          </Badge>
                          <Badge className={getStatusColor(item.status)}>
                            {item.status.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-therapy-text/50">
                            {formatDueDate(item.dueDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {item.status !== 'completed' && (
                        <>
                          {item.status === 'pending' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(item.id, 'in_progress')}
                              disabled={updateMutation.isPending}
                            >
                              Start
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(item.id, 'pending')}
                              disabled={updateMutation.isPending}
                            >
                              Pause
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="bg-therapy-success hover:bg-therapy-success/90"
                            onClick={() => handleStatusChange(item.id, 'completed')}
                            disabled={updateMutation.isPending}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="therapy-card p-12 text-center">
            <CheckSquare className="h-12 w-12 text-therapy-text/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-therapy-text mb-2">
              {searchTerm ? 'No matching action items' : 'No action items yet'}
            </h3>
            <p className="text-therapy-text/60 mb-4">
              {searchTerm 
                ? 'Try adjusting your search or filters'
                : 'Create action items to track therapy-related tasks and follow-ups'
              }
            </p>
            {!searchTerm && (
              <Button 
                className="bg-therapy-primary hover:bg-therapy-primary/90"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Action Item
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
