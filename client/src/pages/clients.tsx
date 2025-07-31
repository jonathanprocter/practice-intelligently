import { useQuery } from "@tanstack/react-query";
import { ApiClient, type Client } from "@/lib/api";
import { Users, Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: ApiClient.getClients,
  });

  const filteredClients = clients?.filter(client =>
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
        <Button className="bg-therapy-primary hover:bg-therapy-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
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

      <div className="grid gap-4">
        {filteredClients.length > 0 ? (
          filteredClients.map((client) => (
            <div key={client.id} className="therapy-card p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-therapy-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-therapy-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-therapy-text">
                      {client.firstName} {client.lastName}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-therapy-text/60">
                      {client.email && <span>{client.email}</span>}
                      {client.phone && client.email && <span>•</span>}
                      {client.phone && <span>{client.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge className={getStatusColor(client.status)}>
                    {client.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    View Profile
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="therapy-card p-12 text-center">
            <Users className="h-12 w-12 text-therapy-text/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-therapy-text mb-2">
              {searchTerm ? 'No clients found' : 'No clients yet'}
            </h3>
            <p className="text-therapy-text/60 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Start by adding your first client to begin managing their therapy journey'
              }
            </p>
            {!searchTerm && (
              <Button className="bg-therapy-primary hover:bg-therapy-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Client
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
