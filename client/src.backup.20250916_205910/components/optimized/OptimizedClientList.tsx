// Optimized client list with virtualization and memoization
import { memo, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Client } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Phone, Mail, Calendar, User } from 'lucide-react';

interface OptimizedClientListProps {
  clients: Client[];
  onClientClick?: (client: Client) => void;
  searchTerm?: string;
}

// Memoized client row component
const ClientRow = memo(({ 
  index, 
  style, 
  data 
}: { 
  index: number; 
  style: React.CSSProperties; 
  data: { clients: Client[]; onClientClick?: (client: Client) => void } 
}) => {
  const client = data.clients[index];
  
  const handleClick = useCallback(() => {
    if (data.onClientClick) {
      data.onClientClick(client);
    }
  }, [client, data.onClientClick]);
  
  return (
    <div style={style} className="px-4 py-2">
      <Card 
        className="p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-lg">
                {client.firstName} {client.lastName}
                {client.preferredName && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ({client.preferredName})
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {client.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {client.email}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {client.phone}
                  </div>
                )}
                {client.dateOfBirth && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(client.dateOfBirth), 'MM/dd/yyyy')}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
              {client.status}
            </Badge>
            {client.riskLevel && client.riskLevel !== 'low' && (
              <Badge variant={client.riskLevel === 'high' ? 'destructive' : 'outline'}>
                {client.riskLevel} risk
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
});

ClientRow.displayName = 'ClientRow';

// Main optimized client list component
const OptimizedClientList = memo(({ 
  clients, 
  onClientClick, 
  searchTerm 
}: OptimizedClientListProps) => {
  // Filter clients based on search term
  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    
    const term = searchTerm.toLowerCase();
    return clients.filter(client => 
      client.firstName.toLowerCase().includes(term) ||
      client.lastName.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term) ||
      client.phone?.includes(term)
    );
  }, [clients, searchTerm]);
  
  // Memoize the data object for the virtual list
  const itemData = useMemo(() => ({
    clients: filteredClients,
    onClientClick
  }), [filteredClients, onClientClick]);
  
  if (filteredClients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <User className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          {searchTerm ? 'No clients found matching your search' : 'No clients found'}
        </p>
      </div>
    );
  }
  
  return (
    <div className="h-full w-full">
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={filteredClients.length}
            itemSize={100}
            width={width}
            itemData={itemData}
          >
            {ClientRow}
          </List>
        )}
      </AutoSizer>
    </div>
  );
});

OptimizedClientList.displayName = 'OptimizedClientList';

export default OptimizedClientList;