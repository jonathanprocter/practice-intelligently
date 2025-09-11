import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { fadeIn } from "@/lib/animations";

interface AnimatedFormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  hint?: string;
  showValidation?: boolean;
  validateOnBlur?: boolean;
  validator?: (value: string) => string | null;
  autoSave?: boolean;
  onAutoSave?: (value: string) => void;
  showPasswordToggle?: boolean;
}

export function AnimatedFormField({
  label,
  error,
  success,
  hint,
  showValidation = true,
  validateOnBlur = true,
  validator,
  autoSave = false,
  onAutoSave,
  className,
  type = "text",
  showPasswordToggle = false,
  ...props
}: AnimatedFormFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [localError, setLocalError] = useState(error);
  const [isValid, setIsValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const actualType = type === "password" && showPassword ? "text" : type;

  useEffect(() => {
    setLocalError(error);
  }, [error]);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    
    if (validateOnBlur && validator) {
      const validationError = validator(e.target.value);
      setLocalError(validationError || undefined);
      setIsValid(!validationError && e.target.value.length > 0);
    }
    
    props.onBlur?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.onChange?.(e);
    
    // Real-time validation
    if (validator && e.target.value) {
      const validationError = validator(e.target.value);
      setLocalError(validationError || undefined);
      setIsValid(!validationError);
    }
    
    // Auto-save logic
    if (autoSave && onAutoSave) {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      
      setAutoSaveTimer(
        setTimeout(() => {
          setIsSaving(true);
          onAutoSave(e.target.value);
          setTimeout(() => setIsSaving(false), 1000);
        }, 1500)
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {label && (
        <motion.label
          className={cn(
            "block text-sm font-medium mb-1 transition-colors",
            isFocused && "text-primary",
            localError && "text-destructive"
          )}
          animate={{
            scale: isFocused ? 1.02 : 1,
          }}
        >
          {label}
        </motion.label>
      )}
      
      <div className="relative">
        <motion.input
          type={actualType}
          className={cn(
            "w-full px-3 py-2 border rounded-md transition-all",
            "focus:outline-none focus:ring-2 focus:ring-offset-1",
            isFocused && !localError && "border-primary focus:ring-primary",
            localError && "border-destructive focus:ring-destructive",
            isValid && "border-green-500 focus:ring-green-500",
            className
          )}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          animate={{
            x: localError ? [0, -2, 2, -2, 0] : 0,
          }}
          transition={{
            duration: 0.3,
          }}
          {...props}
        />
        
        {/* Validation Icons */}
        <AnimatePresence>
          {showValidation && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {isSaving && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="text-blue-500"
                >
                  <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </motion.div>
              )}
              
              {!isSaving && isValid && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                >
                  <Check className="h-4 w-4 text-green-500" />
                </motion.div>
              )}
              
              {!isSaving && localError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                >
                  <X className="h-4 w-4 text-destructive" />
                </motion.div>
              )}
              
              {type === "password" && showPasswordToggle && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </motion.button>
              )}
            </div>
          )}
        </AnimatePresence>
        
        {/* Progress bar for focus */}
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-primary"
          initial={{ width: 0 }}
          animate={{ width: isFocused ? "100%" : 0 }}
          transition={{ duration: 0.3 }}
        />
      </div>
      
      {/* Error/Hint Messages */}
      <AnimatePresence mode="wait">
        {localError && (
          <motion.div
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            className="mt-1 text-sm text-destructive flex items-center gap-1"
          >
            <AlertCircle className="h-3 w-3" />
            {localError}
          </motion.div>
        )}
        
        {!localError && hint && (
          <motion.div
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            className="mt-1 text-sm text-muted-foreground"
          >
            {hint}
          </motion.div>
        )}
        
        {isSaving && (
          <motion.div
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            className="mt-1 text-sm text-blue-500"
          >
            Saving...
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Multi-step form progress indicator
export function FormProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const progress = (currentStep / totalSteps) * 100;
  
  return (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-muted-foreground">
          {Math.round(progress)}% Complete
        </span>
      </div>
      
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        />
        
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
      
      {/* Step indicators */}
      <div className="flex justify-between mt-4">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <motion.div
            key={index}
            className={cn(
              "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium",
              index < currentStep
                ? "bg-primary border-primary text-primary-foreground"
                : index === currentStep
                ? "border-primary text-primary"
                : "border-muted text-muted-foreground"
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            {index < currentStep ? (
              <Check className="h-4 w-4" />
            ) : (
              index + 1
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Animated submit button
export function AnimatedSubmitButton({
  children,
  isLoading = false,
  isSuccess = false,
  loadingText = "Processing...",
  successText = "Success!",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  isSuccess?: boolean;
  loadingText?: string;
  successText?: string;
}) {
  return (
    <motion.button
      className={cn(
        "relative px-4 py-2 rounded-md font-medium transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        !isSuccess && "bg-primary text-primary-foreground hover:bg-primary/90",
        isSuccess && "bg-green-500 text-white",
        className
      )}
      whileHover={!isLoading && !isSuccess ? { scale: 1.02 } : {}}
      whileTap={!isLoading && !isSuccess ? { scale: 0.98 } : {}}
      disabled={isLoading || isSuccess}
      {...props}
    >
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2"
          >
            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {loadingText}
          </motion.div>
        )}
        
        {isSuccess && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-2"
          >
            <Check className="h-4 w-4" />
            {successText}
          </motion.div>
        )}
        
        {!isLoading && !isSuccess && (
          <motion.div
            key="default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}