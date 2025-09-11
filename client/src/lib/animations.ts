// Framer Motion animation configurations
import { Variants } from 'framer-motion';

// Page transition animations
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: { 
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3
    }
  }
};

// Card animations
export const cardAnimation: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  hover: {
    scale: 1.02,
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.12)",
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1
    }
  }
};

// List animations with stagger
export const listAnimation: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

export const listItemAnimation: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

// Fade animations
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.3
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
};

// Slide animations
export const slideUp: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

export const slideInFromRight: Variants = {
  initial: { opacity: 0, x: 50 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

// Modal/Dialog animations
export const modalAnimation: Variants = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      type: "spring",
      damping: 30,
      stiffness: 300
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9, 
    y: 20,
    transition: {
      duration: 0.2
    }
  }
};

// Backdrop animation
export const backdropAnimation: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.2
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.15
    }
  }
};

// Button animations
export const buttonAnimation: Variants = {
  initial: { scale: 1 },
  hover: { 
    scale: 1.05,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  },
  tap: { 
    scale: 0.95,
    transition: {
      duration: 0.1
    }
  }
};

// Notification animations
export const notificationAnimation: Variants = {
  initial: { opacity: 0, y: -50, scale: 0.3 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 500
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.5, 
    y: -20,
    transition: {
      duration: 0.2
    }
  }
};

// Pulse animation for badges
export const pulseAnimation = {
  scale: [1, 1.05, 1],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

// Shimmer effect for loading
export const shimmerAnimation = {
  backgroundPosition: ["200% 0", "-200% 0"],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "linear"
  }
};

// Skeleton loading animation
export const skeletonAnimation: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 0.7, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Progress bar animation
export const progressAnimation: Variants = {
  initial: { width: 0 },
  animate: (custom: number) => ({
    width: `${custom}%`,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1]
    }
  })
};

// Accordion animations
export const accordionAnimation: Variants = {
  closed: { 
    opacity: 0, 
    height: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  open: { 
    opacity: 1, 
    height: "auto",
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

// Floating animation for illustrations
export const floatingAnimation = {
  y: [0, -10, 0],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

// Check animation for success states
export const checkAnimation: Variants = {
  initial: { pathLength: 0, opacity: 0 },
  animate: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.5, ease: "easeInOut" },
      opacity: { duration: 0.1 }
    }
  }
};

// Rotation animation for loading spinners
export const rotateAnimation = {
  rotate: 360,
  transition: {
    duration: 1,
    repeat: Infinity,
    ease: "linear"
  }
};

// Tab switching animation
export const tabAnimation: Variants = {
  initial: { opacity: 0, x: 10 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: { 
    opacity: 0, 
    x: -10,
    transition: {
      duration: 0.15
    }
  }
};

// Tooltip animation
export const tooltipAnimation: Variants = {
  initial: { opacity: 0, y: 5, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: { 
    opacity: 0, 
    y: 5, 
    scale: 0.95,
    transition: {
      duration: 0.1
    }
  }
};

// Gesture animations
export const swipeAnimation: Variants = {
  initial: { x: 0 },
  swipeLeft: { 
    x: -100,
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  swipeRight: { 
    x: 100,
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

// Reduced motion variants for accessibility
export const reducedMotion = (variants: Variants): Variants => {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Return variants with instant transitions
    const reduced: Variants = {};
    for (const key in variants) {
      if (typeof variants[key] === 'object' && 'transition' in variants[key]) {
        reduced[key] = {
          ...variants[key],
          transition: { duration: 0 }
        };
      } else {
        reduced[key] = variants[key];
      }
    }
    return reduced;
  }
  return variants;
};

// Animation helper functions
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

export const spring = {
  type: "spring",
  damping: 30,
  stiffness: 300
};

export const smoothTransition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1]
};