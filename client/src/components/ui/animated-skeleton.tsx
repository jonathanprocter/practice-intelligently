import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { skeletonAnimation } from "@/lib/animations";

interface AnimatedSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circular' | 'text' | 'card';
  lines?: number;
  showIcon?: boolean;
}

function AnimatedSkeleton({
  className,
  variant = 'default',
  lines = 1,
  showIcon = false,
  ...props
}: AnimatedSkeletonProps) {
  const baseClasses = "bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]";
  
  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn("space-y-2", className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <motion.div
            key={i}
            variants={skeletonAnimation}
            initial="initial"
            animate="animate"
            className={cn(
              baseClasses,
              "h-4 rounded",
              i === lines - 1 && "w-3/4"
            )}
            style={{
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <motion.div
        variants={skeletonAnimation}
        initial="initial"
        animate="animate"
        className={cn("p-6 rounded-lg border bg-card", className)}
        {...props}
      >
        <div className="flex items-center space-x-4 mb-4">
          {showIcon && (
            <div className={cn(baseClasses, "h-12 w-12 rounded-lg animate-pulse")} />
          )}
          <div className="flex-1 space-y-2">
            <div className={cn(baseClasses, "h-4 w-1/4 rounded animate-pulse")} />
            <div className={cn(baseClasses, "h-3 w-1/2 rounded animate-pulse")} />
          </div>
        </div>
        <div className="space-y-2">
          <div className={cn(baseClasses, "h-4 rounded animate-pulse")} />
          <div className={cn(baseClasses, "h-4 w-5/6 rounded animate-pulse")} />
        </div>
      </motion.div>
    );
  }

  if (variant === 'circular') {
    return (
      <motion.div
        variants={skeletonAnimation}
        initial="initial"
        animate="animate"
        className={cn(
          baseClasses,
          "rounded-full",
          className
        )}
        {...props}
      />
    );
  }

  return (
    <motion.div
      variants={skeletonAnimation}
      initial="initial"
      animate="animate"
      className={cn(baseClasses, "rounded-md animate-pulse", className)}
      {...props}
    />
  );
}

// Pre-configured skeleton components for common use cases
export function ClientCardSkeleton() {
  return (
    <AnimatedSkeleton variant="card" showIcon className="h-32" />
  );
}

export function AppointmentCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 border rounded-lg bg-card"
    >
      <div className="flex items-start space-x-4">
        <AnimatedSkeleton variant="circular" className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <AnimatedSkeleton className="h-5 w-3/4" />
          <AnimatedSkeleton className="h-4 w-1/2" />
          <div className="flex space-x-2 mt-2">
            <AnimatedSkeleton className="h-6 w-16 rounded-full" />
            <AnimatedSkeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function DashboardStatSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-lg border bg-card"
    >
      <div className="flex items-center justify-between mb-4">
        <AnimatedSkeleton className="h-12 w-12 rounded-lg" />
        <AnimatedSkeleton className="h-4 w-4 rounded" />
      </div>
      <AnimatedSkeleton className="h-8 w-24 mb-2" />
      <AnimatedSkeleton className="h-4 w-32" />
    </motion.div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <AnimatedSkeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export { AnimatedSkeleton };