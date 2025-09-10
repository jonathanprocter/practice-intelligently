import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Column<T> {
  key: string;
  header: string;
  accessor: (item: T) => any;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  mobileLabel?: string;
  renderCell?: (value: any, item: T) => React.ReactNode;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  actions?: Array<{
    label: string;
    onClick: (item: T) => void;
    icon?: any;
  }>;
  emptyMessage?: string;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
  loading?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

export function ResponsiveTable<T extends { id?: string | number }>({
  data,
  columns,
  onRowClick,
  actions,
  emptyMessage = "No data available",
  className,
  striped = true,
  hoverable = true,
  loading = false,
}: ResponsiveTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [mobileView, setMobileView] = useState<'table' | 'cards'>('cards');

  // Sort data based on current sort settings
  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0;
    
    const column = columns.find(c => c.key === sortColumn);
    if (!column) return 0;

    const aValue = column.accessor(a);
    const bValue = column.accessor(b);

    if (aValue === bValue) return 0;
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    const comparison = aValue < bValue ? -1 : 1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortColumn !== columnKey) {
      return <ChevronsUpDown className="h-4 w-4 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-therapy-primary" />
      : <ChevronDown className="h-4 w-4 text-therapy-primary" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-therapy-primary"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-therapy-text/60">
        {emptyMessage}
      </div>
    );
  }

  // Mobile card view
  const CardView = () => (
    <div className="space-y-3 animate-fadeIn">
      {sortedData.map((item, index) => (
        <div
          key={item.id || index}
          className={cn(
            "therapy-card p-4 space-y-3 cursor-pointer hover:shadow-lg transition-all duration-200",
            "animate-slideIn"
          )}
          style={{ animationDelay: `${index * 50}ms` }}
          onClick={() => onRowClick?.(item)}
        >
          {columns.map((column) => {
            const value = column.accessor(item);
            const displayValue = column.renderCell ? column.renderCell(value, item) : value;
            
            return (
              <div key={column.key} className="flex justify-between items-start">
                <span className="text-sm text-therapy-text/60 font-medium">
                  {column.mobileLabel || column.header}:
                </span>
                <span className={cn(
                  "text-sm text-therapy-text",
                  column.align === 'right' && "text-right"
                )}>
                  {displayValue}
                </span>
              </div>
            );
          })}
          
          {actions && actions.length > 0 && (
            <div className="flex justify-end pt-2 border-t border-therapy-border">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {actions.map((action, actionIndex) => (
                    <DropdownMenuItem
                      key={actionIndex}
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick(item);
                      }}
                    >
                      {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // Desktop table view
  const TableView = () => (
    <div className="overflow-x-auto rounded-lg border border-therapy-border animate-fadeIn">
      <table className="w-full">
        <thead className="bg-gradient-to-r from-therapy-primary/5 to-therapy-primary/10">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "px-4 py-3 text-left text-sm font-semibold text-therapy-text",
                  column.sortable && "cursor-pointer hover:bg-therapy-primary/10 transition-colors",
                  column.align === 'center' && "text-center",
                  column.align === 'right' && "text-right",
                  column.width
                )}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className={cn(
                  "flex items-center gap-2",
                  column.align === 'center' && "justify-center",
                  column.align === 'right' && "justify-end"
                )}>
                  {column.header}
                  {column.sortable && <SortIcon columnKey={column.key} />}
                </div>
              </th>
            ))}
            {actions && actions.length > 0 && (
              <th className="px-4 py-3 text-right text-sm font-semibold text-therapy-text w-20">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-therapy-border">
          {sortedData.map((item, index) => (
            <tr
              key={item.id || index}
              className={cn(
                "transition-all duration-200",
                striped && index % 2 === 0 && "bg-therapy-accent/30",
                hoverable && "hover:bg-therapy-primary/5",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => {
                const value = column.accessor(item);
                const displayValue = column.renderCell ? column.renderCell(value, item) : value;
                
                return (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-3 text-sm text-therapy-text",
                      column.align === 'center' && "text-center",
                      column.align === 'right' && "text-right"
                    )}
                  >
                    {displayValue}
                  </td>
                );
              })}
              {actions && actions.length > 0 && (
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {actions.map((action, actionIndex) => (
                        <DropdownMenuItem
                          key={actionIndex}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(item);
                          }}
                        >
                          {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Mobile view toggle */}
      <div className="flex justify-end lg:hidden">
        <div className="flex gap-2 p-1 bg-therapy-accent rounded-lg">
          <Button
            size="sm"
            variant={mobileView === 'cards' ? 'default' : 'ghost'}
            onClick={() => setMobileView('cards')}
            className="text-xs"
          >
            Cards
          </Button>
          <Button
            size="sm"
            variant={mobileView === 'table' ? 'default' : 'ghost'}
            onClick={() => setMobileView('table')}
            className="text-xs"
          >
            Table
          </Button>
        </div>
      </div>

      {/* Responsive display */}
      <div className="block lg:hidden">
        {mobileView === 'cards' ? <CardView /> : <TableView />}
      </div>
      <div className="hidden lg:block">
        <TableView />
      </div>
    </div>
  );
}