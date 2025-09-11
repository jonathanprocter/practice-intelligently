import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

// Hook to detect if user prefers reduced motion
export function useMotionPreference() {
  const shouldReduceMotion = useReducedMotion();
  
  return {
    shouldReduceMotion,
    motionProps: shouldReduceMotion 
      ? {} 
      : {
          initial: "initial",
          animate: "animate",
          exit: "exit"
        }
  };
}

// Hook to detect mobile device
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// Hook for touch interactions
export function useTouchInteractions() {
  const [isTouching, setIsTouching] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsTouching(true);
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };

  const handleTouchEnd = () => {
    setIsTouching(false);
    
    if (!touchStart || !touchEnd) return;
    
    const xDiff = touchStart.x - touchEnd.x;
    const yDiff = touchStart.y - touchEnd.y;
    
    // Detect swipe direction
    if (Math.abs(xDiff) > Math.abs(yDiff)) {
      if (xDiff > 50) {
        return 'left';
      } else if (xDiff < -50) {
        return 'right';
      }
    } else {
      if (yDiff > 50) {
        return 'up';
      } else if (yDiff < -50) {
        return 'down';
      }
    }
    
    return null;
  };

  return {
    isTouching,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
}

// Accessible Motion Component
export function AccessibleMotion({
  children,
  className,
  ...motionProps
}: {
  children: React.ReactNode;
  className?: string;
} & React.ComponentProps<typeof motion.div>) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} {...motionProps}>
      {children}
    </motion.div>
  );
}

// Focus Trap Component for Modals/Dialogs
export function FocusTrap({
  children,
  active = true
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return <>{children}</>;
}

// Skip to Main Content Link
export function SkipToMain() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
    >
      Skip to main content
    </a>
  );
}

// Screen Reader Only Text
export function SROnly({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

// Haptic Feedback Hook (for mobile)
export function useHapticFeedback() {
  const vibrate = (pattern: number | number[] = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  return {
    light: () => vibrate(10),
    medium: () => vibrate(20),
    heavy: () => vibrate(30),
    success: () => vibrate([10, 20, 10]),
    warning: () => vibrate([20, 10, 20]),
    error: () => vibrate([30, 10, 30, 10, 30])
  };
}

// Responsive Container with breakpoints
export function ResponsiveContainer({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "w-full px-4 sm:px-6 lg:px-8",
      "mx-auto max-w-7xl",
      className
    )}>
      {children}
    </div>
  );
}

// Touch-friendly Button
export function TouchButton({
  children,
  className,
  size = 'default',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: 'sm' | 'default' | 'lg';
}) {
  const haptic = useHapticFeedback();
  const isMobile = useIsMobile();

  const sizeClasses = {
    sm: 'min-h-[36px] px-3 text-sm',
    default: 'min-h-[44px] px-4',
    lg: 'min-h-[52px] px-6 text-lg'
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={(e) => {
        if (isMobile) haptic.light();
        props.onClick?.(e);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium",
        "transition-colors focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "touch-manipulation", // Improves touch responsiveness
        sizeClasses[size],
        isMobile && "active:bg-accent", // Touch feedback
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// Swipeable Card
export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  className
}: {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}) {
  const [dragX, setDragX] = useState(0);

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: -100, right: 100 }}
      dragElastic={0.2}
      onDrag={(_, info) => setDragX(info.offset.x)}
      onDragEnd={(_, info) => {
        if (info.offset.x < -50 && onSwipeLeft) {
          onSwipeLeft();
        } else if (info.offset.x > 50 && onSwipeRight) {
          onSwipeRight();
        }
        setDragX(0);
      }}
      animate={{ x: 0 }}
      style={{ x: dragX }}
      className={cn("cursor-grab active:cursor-grabbing", className)}
    >
      {children}
    </motion.div>
  );
}

// Responsive Grid
export function ResponsiveGrid({
  children,
  cols = {
    sm: 1,
    md: 2,
    lg: 3,
    xl: 4
  },
  gap = 4,
  className
}: {
  children: React.ReactNode;
  cols?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid",
        `gap-${gap}`,
        cols.sm && `grid-cols-${cols.sm}`,
        cols.md && `md:grid-cols-${cols.md}`,
        cols.lg && `lg:grid-cols-${cols.lg}`,
        cols.xl && `xl:grid-cols-${cols.xl}`,
        className
      )}
    >
      {children}
    </div>
  );
}