// Optimized storage layer with caching and query batching
import { storage } from './storage';
import { cacheService, cacheKeys, cacheTTL } from './cache-service';
import type { 
  Client, Appointment, SessionNote, ActionItem, 
  AiInsight, User, TreatmentPlan, Document 
} from '@shared/schema';

class OptimizedStorage {
  private batchQueue = new Map<string, any[]>();
  private batchTimeout: NodeJS.Timeout | null = null;
  
  // User methods with caching
  async getUser(id: string): Promise<User | undefined> {
    const cacheKey = `user:${id}`;
    return cacheService.getOrSet(
      cacheKey,
      () => storage.getUser(id),
      cacheTTL.long
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const cacheKey = `user:username:${username}`;
    return cacheService.getOrSet(
      cacheKey,
      () => storage.getUserByUsername(username),
      cacheTTL.long
    );
  }

  // Client methods with optimized caching
  async getClients(therapistId: string): Promise<Client[]> {
    const cacheKey = cacheKeys.clientList(therapistId);
    return cacheService.getOrSet(
      cacheKey,
      () => storage.getClients(therapistId),
      cacheTTL.medium
    );
  }

  async getClient(id: string): Promise<Client | undefined> {
    const cacheKey = cacheKeys.client(id);
    return cacheService.getOrSet(
      cacheKey,
      () => storage.getClient(id),
      cacheTTL.medium
    );
  }

  async createClient(client: any): Promise<Client> {
    const result = await storage.createClient(client);
    
    // Invalidate related caches
    if (client.therapistId) {
      cacheService.invalidate(cacheKeys.clientList(client.therapistId));
      cacheService.invalidate(cacheKeys.dashboardStats(client.therapistId));
    }
    
    return result;
  }

  async updateClient(id: string, client: Partial<Client>): Promise<Client> {
    const result = await storage.updateClient(id, client);
    
    // Invalidate caches
    cacheService.invalidate(cacheKeys.client(id));
    if (result.therapistId) {
      cacheService.invalidate(cacheKeys.clientList(result.therapistId));
    }
    
    return result;
  }

  // Appointment methods with batch loading
  async getAppointments(therapistId: string, date?: Date): Promise<Appointment[]> {
    const dateKey = date ? date.toISOString().split('T')[0] : 'all';
    const cacheKey = cacheKeys.appointments(therapistId, dateKey);
    
    return cacheService.getOrSet(
      cacheKey,
      () => storage.getAppointments(therapistId, date),
      cacheTTL.short
    );
  }

  async getTodaysAppointments(therapistId: string): Promise<Appointment[]> {
    const cacheKey = `appointments:today:${therapistId}`;
    return cacheService.getOrSet(
      cacheKey,
      () => storage.getTodaysAppointments(therapistId),
      cacheTTL.veryShort
    );
  }

  async getUpcomingAppointments(therapistId: string, days: number = 7): Promise<Appointment[]> {
    const cacheKey = `appointments:upcoming:${therapistId}:${days}`;
    return cacheService.getOrSet(
      cacheKey,
      () => storage.getUpcomingAppointments(therapistId, days),
      cacheTTL.short
    );
  }

  // Session notes with optimized loading
  async getSessionNotes(clientId: string): Promise<SessionNote[]> {
    const cacheKey = cacheKeys.sessionNotes(clientId);
    return cacheService.getOrSet(
      cacheKey,
      () => storage.getSessionNotes(clientId),
      cacheTTL.medium
    );
  }

  async createSessionNote(note: any): Promise<SessionNote> {
    const result = await storage.createSessionNote(note);
    
    // Invalidate related caches
    if (note.clientId) {
      cacheService.invalidate(cacheKeys.sessionNotes(note.clientId));
    }
    if (note.therapistId) {
      cacheService.invalidate(cacheKeys.dashboardStats(note.therapistId));
    }
    
    return result;
  }

  // Action items with caching
  async getActionItems(therapistId: string): Promise<ActionItem[]> {
    const cacheKey = cacheKeys.actionItems(therapistId);
    return cacheService.getOrSet(
      cacheKey,
      () => storage.getActionItems(therapistId),
      cacheTTL.short
    );
  }

  async getUrgentActionItems(therapistId: string): Promise<ActionItem[]> {
    const cacheKey = `action-items:urgent:${therapistId}`;
    return cacheService.getOrSet(
      cacheKey,
      () => storage.getUrgentActionItems(therapistId),
      cacheTTL.short
    );
  }

  // AI Insights with smart caching
  async getAiInsights(therapistId: string, clientId?: string): Promise<AiInsight[]> {
    const cacheKey = clientId 
      ? cacheKeys.aiInsights(clientId)
      : `ai-insights:therapist:${therapistId}`;
    
    return cacheService.getOrSet(
      cacheKey,
      () => storage.getAiInsights(therapistId, clientId),
      cacheTTL.medium
    );
  }

  // Dashboard stats with aggressive caching
  async getDashboardStats(therapistId: string): Promise<any> {
    const cacheKey = cacheKeys.dashboardStats(therapistId);
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        // Batch load all required data
        const [
          todaysAppointments,
          clients,
          actionItems,
          recentInsights
        ] = await Promise.all([
          this.getTodaysAppointments(therapistId),
          this.getClients(therapistId),
          this.getUrgentActionItems(therapistId),
          this.getAiInsights(therapistId)
        ]);

        const activeClients = clients.filter(c => c.status === 'active').length;
        const completedToday = todaysAppointments.filter(a => a.status === 'completed').length;
        const totalToday = todaysAppointments.length;
        const completionRate = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

        return {
          todaysSessions: totalToday,
          activeClients,
          urgentActionItems: actionItems.length,
          completionRate: Math.round(completionRate),
          recentInsights: recentInsights.slice(0, 5)
        };
      },
      cacheTTL.short
    );
  }

  // Batch operations for efficient data loading
  async batchLoadClientData(clientIds: string[]): Promise<Map<string, Client>> {
    const results = new Map<string, Client>();
    const uncachedIds: string[] = [];

    // Check cache first
    for (const id of clientIds) {
      const cached = cacheService.get<Client>(cacheKeys.client(id));
      if (cached) {
        results.set(id, cached);
      } else {
        uncachedIds.push(id);
      }
    }

    // Load uncached clients in batch
    if (uncachedIds.length > 0) {
      const clients = await Promise.all(
        uncachedIds.map(id => storage.getClient(id))
      );
      
      clients.forEach((client, index) => {
        if (client) {
          const id = uncachedIds[index];
          cacheService.set(cacheKeys.client(id), client, cacheTTL.medium);
          results.set(id, client);
        }
      });
    }

    return results;
  }

  // Preload and warm cache for predictable queries
  async warmCache(therapistId: string): Promise<void> {
    const warmupTasks = [
      { 
        key: cacheKeys.dashboardStats(therapistId), 
        factory: () => this.getDashboardStats(therapistId),
        ttl: cacheTTL.short
      },
      { 
        key: cacheKeys.clientList(therapistId), 
        factory: () => storage.getClients(therapistId),
        ttl: cacheTTL.medium
      },
      { 
        key: `appointments:today:${therapistId}`, 
        factory: () => storage.getTodaysAppointments(therapistId),
        ttl: cacheTTL.veryShort
      },
      { 
        key: cacheKeys.actionItems(therapistId), 
        factory: () => storage.getActionItems(therapistId),
        ttl: cacheTTL.short
      }
    ];

    await cacheService.warmCache(warmupTasks);
  }

  // Clear cache for specific entity types
  invalidateClientCache(clientId: string): void {
    cacheService.invalidatePattern(`client.*${clientId}`);
    cacheService.invalidatePattern(`session-notes:${clientId}`);
    cacheService.invalidatePattern(`ai-insights:${clientId}`);
  }

  invalidateTherapistCache(therapistId: string): void {
    cacheService.invalidatePattern(`.*${therapistId}.*`);
  }

  // Get cache statistics
  getCacheStats() {
    return cacheService.getStats();
  }

  // Proxy remaining methods to original storage
  // This ensures all methods are available while we gradually optimize them
  private createProxy() {
    const handler = {
      get: (target: any, prop: string) => {
        // If we have an optimized version, use it
        if (prop in this && typeof (this as any)[prop] === 'function') {
          return (this as any)[prop].bind(this);
        }
        
        // Otherwise, proxy to original storage
        if (prop in storage && typeof (storage as any)[prop] === 'function') {
          return (storage as any)[prop].bind(storage);
        }
        
        return undefined;
      }
    };
    
    return new Proxy(this, handler);
  }
}

// Export optimized storage instance
export const optimizedStorage = new OptimizedStorage();

// Export as default for drop-in replacement
export default optimizedStorage;