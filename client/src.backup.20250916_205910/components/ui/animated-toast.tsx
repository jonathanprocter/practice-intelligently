import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { notificationAnimation } from "@/lib/animations";
import { 
  X, CheckCircle, AlertCircle, Info, AlertTriangle,
  CheckCircle2, XCircle, InfoIcon
} from "lucide-react";
import { useEffect, useState } from "react";

interface ToastProps {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: (id: string) => void;
  showProgress?: boolean;
}

const variantConfig = {
  default: {
    icon: CheckCircle2,
    className: 'bg-background border-border',
    iconColor: 'text-foreground'
  },
  success: {
    icon: CheckCircle,
    className: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  error: {
    icon: XCircle,
    className: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    iconColor: 'text-red-600 dark:text-red-400'
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    iconColor: 'text-yellow-600 dark:text-yellow-400'
  },
  info: {
    icon: InfoIcon,
    className: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400'
  }
};

export function AnimatedToast({
  id,
  title,
  description,
  variant = 'default',
  duration = 5000,
  action,
  onClose,
  showProgress = true
}: ToastProps) {
  const [progress, setProgress] = useState(100);
  const config = variantConfig[variant];
  const Icon = config.icon;

  useEffect(() => {
    if (duration && duration > 0) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev <= 0) {
            clearInterval(interval);
            onClose?.(id);
            return 0;
          }
          return prev - (100 / (duration / 100));
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [duration, id, onClose]);

  return (
    <motion.div
      layout
      variants={notificationAnimation}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn(
        "relative overflow-hidden rounded-lg border p-4 shadow-lg",
        "min-w-[350px] max-w-md",
        config.className
      )}
    >
      <div className="flex gap-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        >
          <Icon className={cn("h-5 w-5", config.iconColor)} />
        </motion.div>

        <div className="flex-1">
          <motion.h4
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-sm font-semibold"
          >
            {title}
          </motion.h4>
          {description && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-1 text-sm text-muted-foreground"
            >
              {description}
            </motion.p>
          )}
          {action && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={action.onClick}
              className="mt-2 text-sm font-medium text-primary hover:underline"
            >
              {action.label}
            </motion.button>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onClose?.(id)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </motion.button>
      </div>

      {showProgress && duration && duration > 0 && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-primary/20"
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: "linear" }}
        />
      )}
    </motion.div>
  );
}

// Toast container component
interface ToastContainerProps {
  toasts: ToastProps[];
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  onClose: (id: string) => void;
}

export function ToastContainer({ 
  toasts, 
  position = 'bottom-right',
  onClose 
}: ToastContainerProps) {
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <div
      className={cn(
        "fixed z-50",
        positionClasses[position],
        "pointer-events-none"
      )}
    >
      <AnimatePresence mode="sync">
        <motion.div className="space-y-2 pointer-events-auto">
          {toasts.map((toast) => (
            <AnimatedToast
              key={toast.id}
              {...toast}
              onClose={onClose}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Success notification with confetti effect
export function SuccessNotification({ 
  title, 
  onClose 
}: { 
  title: string; 
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0, rotate: 180 }}
      transition={{ type: "spring", stiffness: 200 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0]
          }}
          transition={{
            duration: 0.5,
            ease: "easeInOut"
          }}
          className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
        >
          <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
        </motion.div>
        <h3 className="text-xl font-semibold text-center mb-2">{title}</h3>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Continue
        </motion.button>
      </motion.div>
    </motion.div>
  );
}