import { DEFAULT_THERAPIST_ID } from '../../shared/constants';

/**
 * Get the default therapist ID for the single-user system
 * @returns The default therapist ID
 */
export function getTherapistId(): string {
  return DEFAULT_THERAPIST_ID;
}

/**
 * Resolve therapist ID from request or return default
 * This is for compatibility with existing code that expects a therapist ID
 * @param req Express request object (optional)
 * @returns The therapist ID
 */
export function resolveTherapistId(req?: any): string {
  // Always return the default for single-user system
  return DEFAULT_THERAPIST_ID;
}