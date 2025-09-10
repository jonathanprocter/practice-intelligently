import { bidirectionalCalendarSync } from './calendar-bidirectional-sync';

/**
 * Retry wrapper for calendar sync operations
 * Implements exponential backoff and automatic retry for failed operations
 */
export class CalendarSyncRetry {
  private static readonly MAX_RETRIES = 3;
  private static readonly INITIAL_DELAY = 1000; // 1 second

  /**
   * Retry a sync operation with exponential backoff
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = CalendarSyncRetry.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = CalendarSyncRetry.INITIAL_DELAY;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting ${operationName} (attempt ${attempt}/${maxRetries})`);
        const result = await operation();
        console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
        return result;
      } catch (error: any) {
        lastError = error;
        console.error(`❌ ${operationName} failed on attempt ${attempt}:`, error.message);

        // Check if error is retryable
        if (!CalendarSyncRetry.isRetryableError(error)) {
          console.error(`Error is not retryable, giving up`);
          throw error;
        }

        if (attempt < maxRetries) {
          console.log(`Waiting ${delay}ms before retry...`);
          await CalendarSyncRetry.delay(delay);
          delay *= 2; // Exponential backoff
        }
      }
    }

    throw new Error(`${operationName} failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Check if an error is retryable
   */
  private static isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true;
    }

    // HTTP status codes that are retryable
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    if (error.response && retryableStatusCodes.includes(error.response.status)) {
      return true;
    }

    // Google API specific errors
    if (error.code === 403 && error.message?.includes('Rate Limit')) {
      return true;
    }

    if (error.code === 503) {
      return true; // Service unavailable
    }

    return false;
  }

  /**
   * Delay helper
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create Google Calendar event with retry
   */
  static async createEventWithRetry(appointment: any): Promise<string | null> {
    return CalendarSyncRetry.withRetry(
      () => bidirectionalCalendarSync.createGoogleEvent(appointment),
      `Create Google Calendar event for appointment ${appointment.id}`
    );
  }

  /**
   * Update Google Calendar event with retry
   */
  static async updateEventWithRetry(appointment: any): Promise<boolean> {
    return CalendarSyncRetry.withRetry(
      () => bidirectionalCalendarSync.updateGoogleEvent(appointment),
      `Update Google Calendar event for appointment ${appointment.id}`
    );
  }

  /**
   * Delete Google Calendar event with retry
   */
  static async deleteEventWithRetry(appointment: any): Promise<boolean> {
    return CalendarSyncRetry.withRetry(
      () => bidirectionalCalendarSync.deleteGoogleEvent(appointment),
      `Delete Google Calendar event for appointment ${appointment.id}`
    );
  }

  /**
   * Sync from Google Calendar with retry
   */
  static async syncFromGoogleWithRetry(
    therapistId: string,
    timeMin?: Date,
    timeMax?: Date
  ): Promise<any> {
    return CalendarSyncRetry.withRetry(
      () => bidirectionalCalendarSync.syncFromGoogle(therapistId, timeMin, timeMax),
      `Sync from Google Calendar for therapist ${therapistId}`
    );
  }

  /**
   * Setup webhook with retry
   */
  static async setupWebhookWithRetry(therapistId: string, webhookUrl: string): Promise<boolean> {
    return CalendarSyncRetry.withRetry(
      () => bidirectionalCalendarSync.setupWebhook(therapistId, webhookUrl),
      `Setup webhook for therapist ${therapistId}`
    );
  }
}

/**
 * Sync Queue Manager
 * Manages a queue of sync operations to prevent overwhelming the API
 */
export class SyncQueueManager {
  private static queue: Array<() => Promise<any>> = [];
  private static processing = false;
  private static readonly DELAY_BETWEEN_OPERATIONS = 500; // 500ms

  /**
   * Add an operation to the sync queue
   */
  static async addToQueue(operation: () => Promise<any>): Promise<any> {
    return new Promise((resolve, reject) => {
      SyncQueueManager.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!SyncQueueManager.processing) {
        SyncQueueManager.processQueue();
      }
    });
  }

  /**
   * Process the sync queue
   */
  private static async processQueue() {
    if (SyncQueueManager.processing || SyncQueueManager.queue.length === 0) {
      return;
    }

    SyncQueueManager.processing = true;

    while (SyncQueueManager.queue.length > 0) {
      const operation = SyncQueueManager.queue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error('Queue operation failed:', error);
        }
        
        // Delay between operations to avoid rate limiting
        if (SyncQueueManager.queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, SyncQueueManager.DELAY_BETWEEN_OPERATIONS));
        }
      }
    }

    SyncQueueManager.processing = false;
  }

  /**
   * Get queue status
   */
  static getQueueStatus(): { queueLength: number; processing: boolean } {
    return {
      queueLength: SyncQueueManager.queue.length,
      processing: SyncQueueManager.processing
    };
  }

  /**
   * Clear the queue
   */
  static clearQueue() {
    SyncQueueManager.queue = [];
  }
}

/**
 * Sync History Logger
 * Tracks sync operations for debugging and audit purposes
 */
export class SyncHistoryLogger {
  private static history: Array<{
    timestamp: Date;
    operation: string;
    therapistId: string;
    success: boolean;
    details?: any;
    error?: string;
  }> = [];

  private static readonly MAX_HISTORY_SIZE = 1000;

  /**
   * Log a sync operation
   */
  static log(
    operation: string,
    therapistId: string,
    success: boolean,
    details?: any,
    error?: string
  ) {
    const entry = {
      timestamp: new Date(),
      operation,
      therapistId,
      success,
      details,
      error
    };

    SyncHistoryLogger.history.unshift(entry);

    // Trim history if it gets too large
    if (SyncHistoryLogger.history.length > SyncHistoryLogger.MAX_HISTORY_SIZE) {
      SyncHistoryLogger.history = SyncHistoryLogger.history.slice(0, SyncHistoryLogger.MAX_HISTORY_SIZE);
    }

    // Also log to console for immediate visibility
    if (success) {
      console.log(`📝 Sync Log: ${operation} for ${therapistId} - SUCCESS`, details);
    } else {
      console.error(`📝 Sync Log: ${operation} for ${therapistId} - FAILED`, error);
    }
  }

  /**
   * Get sync history
   */
  static getHistory(therapistId?: string, limit: number = 100): Array<any> {
    let filtered = SyncHistoryLogger.history;
    
    if (therapistId) {
      filtered = filtered.filter(entry => entry.therapistId === therapistId);
    }

    return filtered.slice(0, limit);
  }

  /**
   * Get success rate
   */
  static getSuccessRate(therapistId?: string, hours: number = 24): number {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    let filtered = SyncHistoryLogger.history.filter(
      entry => entry.timestamp >= since
    );
    
    if (therapistId) {
      filtered = filtered.filter(entry => entry.therapistId === therapistId);
    }

    if (filtered.length === 0) return 100;

    const successful = filtered.filter(entry => entry.success).length;
    return Math.round((successful / filtered.length) * 100);
  }

  /**
   * Clear history
   */
  static clearHistory() {
    SyncHistoryLogger.history = [];
  }
}

export { CalendarSyncRetry as default };