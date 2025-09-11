import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { rotateAnimation } from "@/lib/animations";
import { Loader2, RefreshCw, CircleDashed } from "lucide-react";

interface AnimatedSpinnerProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'dots' | 'pulse' | 'bars';
  label?: string;
  showLabel?: boolean;
}

export function AnimatedSpinner({ 
  className, 
  size = 'md', 
  variant = 'default',
  label = "Loading...",
  showLabel = false
}: AnimatedSpinnerProps) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  if (variant === 'dots') {
    return (
      <div className={cn("flex items-center space-x-1", className)}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={cn(
              "bg-therapy-primary rounded-full",
              size === 'xs' && "w-1 h-1",
              size === 'sm' && "w-1.5 h-1.5",
              size === 'md' && "w-2 h-2",
              size === 'lg' && "w-2.5 h-2.5",
              size === 'xl' && "w-3 h-3"
            )}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          />
        ))}
        {showLabel && (
          <span className={cn("ml-2 text-muted-foreground", textSizes[size])}>
            {label}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn("flex items-center", className)}>
        <motion.div
          className={cn(
            "relative",
            sizeClasses[size]
          )}
        >
          <motion.div
            className="absolute inset-0 bg-therapy-primary rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <div className="relative bg-therapy-primary rounded-full w-full h-full" />
        </motion.div>
        {showLabel && (
          <span className={cn("ml-2 text-muted-foreground", textSizes[size])}>
            {label}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'bars') {
    return (
      <div className={cn("flex items-center space-x-1", className)}>
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className={cn(
              "bg-therapy-primary",
              size === 'xs' && "w-0.5 h-3",
              size === 'sm' && "w-1 h-4",
              size === 'md' && "w-1.5 h-6",
              size === 'lg' && "w-2 h-8",
              size === 'xl' && "w-2.5 h-12"
            )}
            animate={{
              scaleY: [0.3, 1, 0.3],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.1,
            }}
          />
        ))}
        {showLabel && (
          <span className={cn("ml-2 text-muted-foreground", textSizes[size])}>
            {label}
          </span>
        )}
      </div>
    );
  }

  // Default spinning loader
  return (
    <div className={cn("flex items-center", className)} role="status" aria-label={label}>
      <motion.div
        animate={rotateAnimation}
        className={cn(sizeClasses[size])}
      >
        <Loader2 className="w-full h-full text-therapy-primary" />
      </motion.div>
      {showLabel && (
        <span className={cn("ml-2 text-muted-foreground", textSizes[size])}>
          {label}
        </span>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}

// Button with loading state
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingButton({ 
  loading = false, 
  loadingText = "Loading...",
  children, 
  disabled,
  className,
  variant = 'default',
  size = 'md',
  ...props 
}: LoadingButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  const variantClasses = {
    default: 'bg-therapy-primary text-white hover:bg-therapy-primary/90',
    secondary: 'bg-therapy-secondary text-therapy-secondary-foreground hover:bg-therapy-secondary/80',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
  };

  return (
    <motion.button
      whileHover={!loading && !disabled ? { scale: 1.02 } : {}}
      whileTap={!loading && !disabled ? { scale: 0.98 } : {}}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <>
          <AnimatedSpinner size="sm" className="mr-2" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}

// Full page loader
export function PageLoader({ message = "Loading page..." }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center space-y-4">
        <AnimatedSpinner size="xl" variant="dots" />
        <p className="text-lg text-muted-foreground animate-pulse">{message}</p>
      </div>
    </motion.div>
  );
}

// Inline loader for sections
export function SectionLoader({ title = "Loading..." }: { title?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12"
    >
      <AnimatedSpinner size="lg" variant="bars" />
      <p className="mt-4 text-sm text-muted-foreground">{title}</p>
    </motion.div>
  );
}