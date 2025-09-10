// Performance-optimized in-memory caching service with TTL support
import { EventEmitter } from 'events';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
}

class CacheService extends EventEmitter {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    evictions: 0
  };
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxSize: number = 1000; // Maximum cache entries
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default

  constructor() {
    super();
    this.startCleanup();
  }

  // Set cache value with optional TTL
  set<T>(key: string, value: T, ttl?: number): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hits: 0
    });
    
    this.stats.size = this.cache.size;
    this.emit('cache:set', key);
  }

  // Get cached value
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.emit('cache:miss', key);
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size = this.cache.size;
      this.emit('cache:expired', key);
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    this.emit('cache:hit', key);
    return entry.data;
  }

  // Get or set cache value with factory function
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  // Invalidate specific cache entry
  invalidate(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.size = this.cache.size;
      this.emit('cache:invalidated', key);
    }
    return deleted;
  }

  // Invalidate cache entries by pattern
  invalidatePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let invalidated = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    if (invalidated > 0) {
      this.stats.size = this.cache.size;
      this.emit('cache:pattern-invalidated', pattern, invalidated);
    }

    return invalidated;
  }

  // Clear entire cache
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.size = 0;
    this.emit('cache:cleared', size);
  }

  // Get cache statistics
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  // Warm cache with predefined data
  async warmCache(warmupFunctions: Array<{ key: string; factory: () => Promise<any>; ttl?: number }>): Promise<void> {
    const warmupPromises = warmupFunctions.map(async ({ key, factory, ttl }) => {
      try {
        const data = await factory();
        this.set(key, data, ttl);
        this.emit('cache:warmed', key);
      } catch (error) {
        console.error(`Failed to warm cache for key ${key}:`, error);
        this.emit('cache:warm-failed', key, error);
      }
    });

    await Promise.all(warmupPromises);
    this.emit('cache:warmup-complete', warmupFunctions.length);
  }

  // Private methods
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    // Find least recently used entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      this.emit('cache:evicted', oldestKey);
    }
  }

  private startCleanup(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      let cleaned = 0;
      const now = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.stats.size = this.cache.size;
        this.emit('cache:cleanup', cleaned);
      }
    }, 60 * 1000);
  }

  // Cleanup on destroy
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    this.removeAllListeners();
  }
}

// Singleton instance
export const cacheService = new CacheService();

// Cache key generators
export const cacheKeys = {
  dashboardStats: (therapistId: string) => `dashboard:stats:${therapistId}`,
  clientList: (therapistId: string) => `clients:list:${therapistId}`,
  client: (clientId: string) => `client:${clientId}`,
  appointments: (therapistId: string, date?: string) => `appointments:${therapistId}:${date || 'all'}`,
  sessionNotes: (clientId: string) => `session-notes:${clientId}`,
  aiInsights: (clientId: string) => `ai-insights:${clientId}`,
  actionItems: (therapistId: string) => `action-items:${therapistId}`,
  calendarEvents: (therapistId: string) => `calendar:${therapistId}`,
  apiStatus: () => 'api:status',
  userSession: (userId: string) => `user:session:${userId}`,
};

// Cache TTL configurations (in milliseconds)
export const cacheTTL = {
  veryShort: 30 * 1000,        // 30 seconds
  short: 60 * 1000,             // 1 minute
  medium: 5 * 60 * 1000,        // 5 minutes
  long: 15 * 60 * 1000,         // 15 minutes
  veryLong: 60 * 60 * 1000,     // 1 hour
  permanent: 24 * 60 * 60 * 1000 // 24 hours
};

// Performance monitoring
cacheService.on('cache:hit', (key) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Cache HIT] ${key}`);
  }
});

cacheService.on('cache:miss', (key) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Cache MISS] ${key}`);
  }
});

// Log cache statistics every 5 minutes in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = cacheService.getStats();
    console.log('[Cache Stats]', {
      hitRate: `${stats.hitRate}%`,
      hits: stats.hits,
      misses: stats.misses,
      size: stats.size,
      evictions: stats.evictions
    });
  }, 5 * 60 * 1000);
}

export default cacheService;