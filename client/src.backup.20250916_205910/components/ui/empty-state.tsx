import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { fadeIn, floatingAnimation, slideUp } from "@/lib/animations";
import { Button } from "./button";
import { 
  Inbox, Users, Calendar, FileText, Search, AlertCircle, 
  Plus, Upload, RefreshCw, FolderOpen, MessageSquare, 
  Activity, ChartBar, Clock, Archive
} from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  variant?: 'default' | 'search' | 'error' | 'success';
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  animate?: boolean;
}

const iconMap = {
  inbox: Inbox,
  users: Users,
  calendar: Calendar,
  document: FileText,
  search: Search,
  error: AlertCircle,
  folder: FolderOpen,
  message: MessageSquare,
  activity: Activity,
  chart: ChartBar,
  clock: Clock,
  archive: Archive
};

export function EmptyState({
  title,
  description,
  icon: Icon,
  variant = 'default',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  animate = true
}: EmptyStateProps) {
  const variantStyles = {
    default: 'text-muted-foreground',
    search: 'text-blue-500',
    error: 'text-red-500',
    success: 'text-green-500'
  };

  const bgStyles = {
    default: 'bg-muted/30',
    search: 'bg-blue-50',
    error: 'bg-red-50',
    success: 'bg-green-50'
  };

  const DefaultIcon = Icon || Inbox;

  return (
    <motion.div
      variants={animate ? fadeIn : undefined}
      initial={animate ? "initial" : undefined}
      animate={animate ? "animate" : undefined}
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <motion.div
        animate={animate ? floatingAnimation : undefined}
        className={cn(
          "mb-6 rounded-full p-4",
          bgStyles[variant]
        )}
      >
        <DefaultIcon className={cn("h-12 w-12", variantStyles[variant])} />
      </motion.div>

      <motion.h3
        variants={animate ? slideUp : undefined}
        className="mb-2 text-lg font-semibold text-foreground"
      >
        {title}
      </motion.h3>

      {description && (
        <motion.p
          variants={animate ? slideUp : undefined}
          className="mb-6 max-w-sm text-sm text-muted-foreground"
        >
          {description}
        </motion.p>
      )}

      {(actionLabel || secondaryActionLabel) && (
        <motion.div
          variants={animate ? slideUp : undefined}
          className="flex flex-col sm:flex-row gap-3"
        >
          {actionLabel && onAction && (
            <Button
              onClick={onAction}
              variant={variant === 'error' ? 'destructive' : 'default'}
            >
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              onClick={onSecondaryAction}
              variant="outline"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// Pre-configured empty states for common scenarios
export function NoClientsEmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No clients yet"
      description="Start building your practice by adding your first client"
      actionLabel="Add First Client"
      onAction={onAdd}
      secondaryActionLabel="Import Clients"
    />
  );
}

export function NoAppointmentsEmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={Calendar}
      title="No appointments scheduled"
      description="Your calendar is clear. Schedule your next session"
      actionLabel="Schedule Appointment"
      onAction={onAdd}
    />
  );
}

export function NoSessionNotesEmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={FileText}
      title="No session notes"
      description="Document your sessions by creating progress notes"
      actionLabel="Create Note"
      onAction={onAdd}
    />
  );
}

export function NoSearchResultsEmptyState({ query }: { query?: string }) {
  return (
    <EmptyState
      icon={Search}
      variant="search"
      title="No results found"
      description={query ? `We couldn't find anything matching "${query}"` : "Try adjusting your search criteria"}
    />
  );
}

export function ErrorEmptyState({ 
  onRetry,
  message = "Something went wrong"
}: { 
  onRetry?: () => void;
  message?: string;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      variant="error"
      title="Error loading data"
      description={message}
      actionLabel="Try Again"
      onAction={onRetry}
    />
  );
}

// Animated illustration component for larger empty states
export function IllustratedEmptyState({
  title,
  description,
  illustration,
  actionLabel,
  onAction,
  className
}: {
  title: string;
  description?: string;
  illustration?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "flex flex-col items-center justify-center min-h-[400px] px-4 text-center",
        className
      )}
    >
      {illustration && (
        <motion.div
          animate={{
            y: [0, -10, 0],
            rotate: [-2, 2, -2]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mb-8"
        >
          {illustration}
        </motion.div>
      )}

      <h2 className="mb-3 text-2xl font-bold text-foreground">
        {title}
      </h2>

      {description && (
        <p className="mb-8 max-w-md text-muted-foreground">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button size="lg" onClick={onAction}>
            <Plus className="mr-2 h-5 w-5" />
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}