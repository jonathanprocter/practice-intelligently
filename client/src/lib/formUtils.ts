import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { showErrorToast, showSuccessToast, formatValidationErrors } from "./errorUtils";

// Common validation schemas
export const commonValidations = {
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  
  phone: z.string()
    .min(1, "Phone number is required")
    .regex(/^[\d\s\-\+\(\)]+$/, "Please enter a valid phone number"),
  
  phoneOptional: z.string()
    .optional()
    .refine((val) => !val || /^[\d\s\-\+\(\)]+$/.test(val), {
      message: "Please enter a valid phone number"
    }),
  
  name: z.string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  
  password: z.string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  
  date: z.string()
    .min(1, "Date is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Please enter a valid date"
    }),
  
  dateOptional: z.string()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Please enter a valid date"
    }),
  
  url: z.string()
    .url("Please enter a valid URL")
    .optional(),
  
  positiveNumber: z.number()
    .positive("Value must be positive")
    .finite("Value must be a valid number"),
  
  percentage: z.number()
    .min(0, "Percentage must be at least 0")
    .max(100, "Percentage cannot exceed 100"),
};

// Form field error display component props
export interface FormFieldError {
  field: string;
  message?: string;
}

// Enhanced form submission handler
export async function handleFormSubmit<T>(
  data: T,
  submitFn: (data: T) => Promise<any>,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    onSuccess?: (result: any) => void;
    onError?: (error: any) => void;
    showSuccessToast?: boolean;
    showErrorToast?: boolean;
  }
): Promise<{ success: boolean; data?: any; error?: any }> {
  const {
    successMessage = "Operation completed successfully",
    errorMessage = "An error occurred. Please try again.",
    onSuccess,
    onError,
    showSuccessToast: shouldShowSuccess = true,
    showErrorToast: shouldShowError = true,
  } = options || {};

  try {
    const result = await submitFn(data);
    
    if (shouldShowSuccess) {
      showSuccessToast(successMessage);
    }
    
    if (onSuccess) {
      onSuccess(result);
    }
    
    return { success: true, data: result };
  } catch (error: any) {
    const message = error?.message || errorMessage;
    
    if (shouldShowError) {
      showErrorToast({
        type: error?.type || 'UNKNOWN',
        message,
        timestamp: new Date()
      });
    }
    
    if (onError) {
      onError(error);
    }
    
    return { success: false, error };
  }
}

// Validate form data with Zod schema
export function validateFormData<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: boolean; data?: T; errors?: Record<string, string[]> } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const field = err.path.join('.');
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(err.message);
      });
      return { success: false, errors };
    }
    return { success: false, errors: { general: ['Validation failed'] } };
  }
}

// Format form errors for display
export function formatFormErrors(errors: Record<string, string[]>): string {
  return formatValidationErrors(errors);
}

// Check if a field has errors
export function hasFieldError(
  fieldName: string,
  errors?: Record<string, string[]>
): boolean {
  return !!(errors && errors[fieldName] && errors[fieldName].length > 0);
}

// Get field error message
export function getFieldError(
  fieldName: string,
  errors?: Record<string, string[]>
): string | undefined {
  if (!errors || !errors[fieldName]) return undefined;
  return errors[fieldName][0];
}

// Debounce function for form inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return function (...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// Auto-save form data to localStorage
export function useFormAutoSave(
  formKey: string,
  data: any,
  options?: {
    debounceMs?: number;
    excludeFields?: string[];
  }
) {
  const { debounceMs = 1000, excludeFields = [] } = options || {};
  
  const saveToStorage = debounce((formData: any) => {
    try {
      // Remove excluded fields
      const dataToSave = { ...formData };
      excludeFields.forEach(field => {
        delete dataToSave[field];
      });
      
      localStorage.setItem(`form_autosave_${formKey}`, JSON.stringify({
        data: dataToSave,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to auto-save form data:', error);
    }
  }, debounceMs);
  
  // Save data when it changes
  saveToStorage(data);
  
  // Load saved data
  const loadSavedData = (): any | null => {
    try {
      const saved = localStorage.getItem(`form_autosave_${formKey}`);
      if (saved) {
        const { data, timestamp } = JSON.parse(saved);
        // Check if data is not too old (24 hours)
        const savedDate = new Date(timestamp);
        const now = new Date();
        const hoursDiff = (now.getTime() - savedDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          return data;
        }
      }
    } catch (error) {
      console.error('Failed to load auto-saved form data:', error);
    }
    return null;
  };
  
  // Clear saved data
  const clearSavedData = () => {
    try {
      localStorage.removeItem(`form_autosave_${formKey}`);
    } catch (error) {
      console.error('Failed to clear auto-saved form data:', error);
    }
  };
  
  return {
    loadSavedData,
    clearSavedData
  };
}

// Form submission state hook
export function useFormSubmitState() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  const startSubmit = () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
  };
  
  const endSubmit = (success: boolean, error?: string) => {
    setIsSubmitting(false);
    setSubmitSuccess(success);
    if (error) {
      setSubmitError(error);
    }
  };
  
  const resetState = () => {
    setIsSubmitting(false);
    setSubmitError(null);
    setSubmitSuccess(false);
  };
  
  return {
    isSubmitting,
    submitError,
    submitSuccess,
    startSubmit,
    endSubmit,
    resetState
  };
}

// Form field change tracker
export function useFormChanges<T extends Record<string, any>>(
  initialData: T
): {
  hasChanges: boolean;
  changedFields: Set<string>;
  trackChange: (field: keyof T, value: any) => void;
  resetChanges: () => void;
} {
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  
  const trackChange = (field: keyof T, value: any) => {
    if (initialData[field] !== value) {
      setChangedFields(prev => new Set(prev).add(field as string));
    } else {
      setChangedFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(field as string);
        return newSet;
      });
    }
  };
  
  const resetChanges = () => {
    setChangedFields(new Set());
  };
  
  return {
    hasChanges: changedFields.size > 0,
    changedFields,
    trackChange,
    resetChanges
  };
}

// Import for useState
import { useState } from 'react';