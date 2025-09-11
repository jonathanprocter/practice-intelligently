import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { cardAnimation } from "@/lib/animations";
import { MoreVertical, ChevronRight } from "lucide-react";
import { useState } from "react";

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  expandable?: boolean;
  expandedContent?: React.ReactNode;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'default' | 'highlighted' | 'success' | 'warning' | 'error';
  hoverable?: boolean;
  clickable?: boolean;
  selected?: boolean;
  loading?: boolean;
  index?: number;
}

const variantStyles = {
  default: "bg-card border-border",
  highlighted: "bg-primary/5 border-primary/20",
  success: "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800",
  warning: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800",
  error: "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800"
};

export function AnimatedCard({
  title,
  description,
  icon,
  actions,
  expandable = false,
  expandedContent,
  badge,
  footer,
  variant = 'default',
  hoverable = true,
  clickable = false,
  selected = false,
  loading = false,
  index = 0,
  className,
  children,
  onClick,
  ...props
}: AnimatedCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (expandable && !onClick) {
      setIsExpanded(!isExpanded);
    }
    onClick?.(e);
  };

  return (
    <motion.div
      variants={cardAnimation}
      initial="initial"
      animate="animate"
      whileHover={hoverable ? "hover" : undefined}
      whileTap={clickable ? "tap" : undefined}
      transition={{ delay: index * 0.05 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn(
        "relative rounded-lg border shadow-sm transition-all",
        variantStyles[variant],
        selected && "ring-2 ring-primary ring-offset-2",
        clickable && "cursor-pointer",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm"
          >
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badge */}
      {badge && (
        <motion.div
          initial={{ scale: 0, x: 10, y: -10 }}
          animate={{ scale: 1, x: 0, y: 0 }}
          transition={{ delay: index * 0.05 + 0.2, type: "spring", stiffness: 200 }}
          className="absolute -right-2 -top-2 z-20"
        >
          {badge}
        </motion.div>
      )}

      {/* Header */}
      {(title || description || icon || actions) && (
        <div className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {icon && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    delay: index * 0.05 + 0.1,
                    type: "spring",
                    stiffness: 260,
                    damping: 20
                  }}
                  className="flex-shrink-0"
                >
                  {icon}
                </motion.div>
              )}
              
              <div className="flex-1">
                {title && (
                  <motion.h3
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 + 0.15 }}
                    className="font-semibold leading-tight flex items-center gap-2"
                  >
                    {title}
                    {expandable && (
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    )}
                  </motion.h3>
                )}
                
                {description && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 + 0.2 }}
                    className="mt-1 text-sm text-muted-foreground"
                  >
                    {description}
                  </motion.p>
                )}
              </div>
            </div>
            
            {actions && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: isHovered ? 1 : 0.7, scale: 1 }}
                transition={{ delay: index * 0.05 + 0.25 }}
                className="flex-shrink-0"
              >
                {actions}
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {children && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 + 0.3 }}
          className="p-6"
        >
          {children}
        </motion.div>
      )}

      {/* Expandable Content */}
      <AnimatePresence>
        {expandable && isExpanded && expandedContent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6">
              {expandedContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      {footer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.05 + 0.35 }}
          className="border-t px-6 py-3"
        >
          {footer}
        </motion.div>
      )}

      {/* Hover Effect Border */}
      {hoverable && (
        <motion.div
          className="absolute inset-0 rounded-lg border-2 border-primary pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 0.3 : 0 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.div>
  );
}

// Grid container for animated cards
export function AnimatedCardGrid({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        initial: { opacity: 0 },
        animate: {
          opacity: 1,
          transition: {
            staggerChildren: 0.05
          }
        }
      }}
      initial="initial"
      animate="animate"
      className={cn(
        "grid gap-4 md:gap-6",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

// List container for animated cards
export function AnimatedCardList({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={listAnimation}
      initial="initial"
      animate="animate"
      className={cn("space-y-4", className)}
    >
      {children}
    </motion.div>
  );
}

// Skeleton card for loading states
export function AnimatedCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-lg border bg-card p-6"
    >
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-lg bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-1/3 bg-muted rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 bg-muted rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
      </div>
    </motion.div>
  );
}