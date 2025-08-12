import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

interface ClientLinkProps {
  clientId: string;
  clientName: string;
  variant?: 'default' | 'link' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  showIcon?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * ClientLink - Makes any client name clickable to navigate to their chart
 * Use this component anywhere you display client names to enable EHR-style navigation
 */
export function ClientLink({ 
  clientId, 
  clientName, 
  variant = 'link',
  size = 'sm',
  showIcon = false,
  className = '',
  children
}: ClientLinkProps) {
  const [, setLocation] = useLocation();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocation(`/clients/${clientId}/chart`);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={`
        h-auto p-1 text-left justify-start
        hover:text-blue-600 hover:underline
        ${className}
      `}
      data-testid={`client-link-${clientId}`}
    >
      {showIcon && <User className="w-4 h-4 mr-1" />}
      {children || clientName}
    </Button>
  );
}

interface ClientNameProps {
  clientId: string;
  firstName: string;
  lastName: string;
  variant?: 'default' | 'link' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * ClientName - Convenience component for displaying full client names as clickable links
 */
export function ClientName({ 
  clientId, 
  firstName, 
  lastName, 
  ...props 
}: ClientNameProps) {
  const fullName = `${firstName} ${lastName}`;
  
  return (
    <ClientLink
      clientId={clientId}
      clientName={fullName}
      {...props}
    >
      {fullName}
    </ClientLink>
  );
}

export default ClientLink;