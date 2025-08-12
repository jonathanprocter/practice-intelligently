// utils/dashboard.utils.ts

// Optimistic update helper for React Query
import { QueryClient } from '@tanstack/react-query';

export function createOptimisticUpdate<T>(
  queryClient: QueryClient,
  queryKey: any[],
  updater: (old: T) => T
) {
  return {
    onMutate: async (variables: any) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<T>(queryKey);

      // Optimistically update
      queryClient.setQueryData<T>(queryKey, (old) => {
        if (!old) return old;
        return updater(old);
      });

      // Return context with snapshot
      return { previousData };
    },
    onError: (err: any, variables: any, context: any) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey });
    }
  };
}

// Performance monitoring
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number[]> = new Map();

  mark(name: string) {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark?: string) {
    const start = this.marks.get(startMark);
    const end = endMark ? this.marks.get(endMark) : performance.now();

    if (start && end) {
      const duration = end - start;

      if (!this.measures.has(name)) {
        this.measures.set(name, []);
      }

      this.measures.get(name)!.push(duration);

      // Log slow operations
      if (duration > 1000) {
        console.warn(`Slow operation: ${name} took ${duration.toFixed(2)}ms`);
      }

      return duration;
    }

    return 0;
  }

  getAverageTime(name: string): number {
    const measures = this.measures.get(name);
    if (!measures || measures.length === 0) return 0;

    const sum = measures.reduce((a, b) => a + b, 0);
    return sum / measures.length;
  }

  getMetrics() {
    const metrics: Record<string, any> = {};

    this.measures.forEach((values, name) => {
      metrics[name] = {
        count: values.length,
        average: this.getAverageTime(name),
        min: Math.min(...values),
        max: Math.max(...values),
        last: values[values.length - 1]
      };
    });

    return metrics;
  }

  reset() {
    this.marks.clear();
    this.measures.clear();
  }
}

// Local storage with expiry
export class StorageWithExpiry {
  private prefix: string;

  constructor(prefix = 'app') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  set(key: string, value: any, ttlMinutes?: number) {
    const item = {
      value,
      timestamp: Date.now(),
      ttl: ttlMinutes ? ttlMinutes * 60 * 1000 : null
    };

    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(item));
    } catch (e) {
      // Handle quota exceeded
      this.cleanup();
      try {
        localStorage.setItem(this.getKey(key), JSON.stringify(item));
      } catch {
        console.error('localStorage quota exceeded');
      }
    }
  }

  get<T>(key: string): T | null {
    const itemStr = localStorage.getItem(this.getKey(key));

    if (!itemStr) return null;

    try {
      const item = JSON.parse(itemStr);

      // Check if expired
      if (item.ttl && Date.now() - item.timestamp > item.ttl) {
        localStorage.removeItem(this.getKey(key));
        return null;
      }

      return item.value;
    } catch {
      return null;
    }
  }

  remove(key: string) {
    localStorage.removeItem(this.getKey(key));
  }

  cleanup() {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(this.prefix)) continue;

      try {
        const item = JSON.parse(localStorage.getItem(key) || '{}');
        if (item.ttl && now - item.timestamp > item.ttl) {
          keysToRemove.push(key);
        }
      } catch {
        keysToRemove.push(key!);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}

// Notification manager
export class NotificationManager {
  private permission: NotificationPermission = 'default';
  private queue: Array<{ title: string; options?: NotificationOptions }> = [];

  async init() {
    if ('Notification' in window) {
      this.permission = Notification.permission;

      if (this.permission === 'default') {
        this.permission = await Notification.requestPermission();
      }

      // Process queued notifications
      if (this.permission === 'granted') {
        this.processQueue();
      }
    }
  }

  show(title: string, options?: NotificationOptions) {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return;
    }

    if (this.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options?.data?.url) {
          window.location.href = options.data.url;
        }
      };

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } else if (this.permission === 'default') {
      // Queue notification
      this.queue.push({ title, options });
      this.init(); // Try to get permission
    }
  }

  private processQueue() {
    while (this.queue.length > 0) {
      const { title, options } = this.queue.shift()!;
      this.show(title, options);
    }
  }
}

// Debounced search hook
import { useState, useEffect, useCallback } from 'react';

export function useDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T>,
  delay = 300
) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      try {
        const data = await searchFn(query);
        setResults(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsSearching(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay, searchFn]);

  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setResults(null);
    setError(null);
  }, []);

  return {
    query,
    results,
    isSearching,
    error,
    search,
    clear
  };
}

// Animation variants for Framer Motion
export const animations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  },
  slideIn: {
    initial: { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 20, opacity: 0 },
    transition: { duration: 0.3 }
  },
  slideUp: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
    transition: { duration: 0.3 }
  },
  scaleIn: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
    transition: { duration: 0.2 }
  },
  stagger: {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }
};

// Connection status hook
import { useEffect, useState } from 'react';

export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'fast' | 'unknown'>('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection speed
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;

      const updateConnectionSpeed = () => {
        if (connection.effectiveType === '4g') {
          setConnectionSpeed('fast');
        } else if (connection.effectiveType === '3g' || connection.effectiveType === '2g') {
          setConnectionSpeed('slow');
        } else {
          setConnectionSpeed('unknown');
        }
      };

      updateConnectionSpeed();
      connection.addEventListener('change', updateConnectionSpeed);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', updateConnectionSpeed);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, connectionSpeed };
}

// Prefetch helper
export class PrefetchManager {
  private prefetched = new Set<string>();
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  async prefetchOnHover(
    element: HTMLElement,
    queryKey: any[],
    queryFn: () => Promise<any>,
    staleTime = 5 * 60 * 1000
  ) {
    const key = JSON.stringify(queryKey);

    if (this.prefetched.has(key)) return;

    const handleMouseEnter = () => {
      if (!this.prefetched.has(key)) {
        this.prefetched.add(key);
        this.queryClient.prefetchQuery({
          queryKey,
          queryFn,
          staleTime
        });
      }
    };

    element.addEventListener('mouseenter', handleMouseEnter, { once: true });

    // Also prefetch on focus for keyboard users
    element.addEventListener('focus', handleMouseEnter, { once: true });
  }

  prefetchRoutes(routes: string[]) {
    routes.forEach(route => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = route;
      document.head.appendChild(link);
    });
  }
}

// Activity tracker
export class ActivityTracker {
  private lastActivity = Date.now();
  private idleTimer: NodeJS.Timeout | null = null;
  private idleCallback: (() => void) | null = null;
  private activeCallback: (() => void) | null = null;
  private idleThreshold: number;

  constructor(idleThreshold = 5 * 60 * 1000) { // 5 minutes default
    this.idleThreshold = idleThreshold;
    this.setupListeners();
  }

  private setupListeners() {
    const updateActivity = () => {
      const wasIdle = this.isIdle();
      this.lastActivity = Date.now();

      if (wasIdle && this.activeCallback) {
        this.activeCallback();
      }

      this.resetIdleTimer();
    };

    // Listen for user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Start idle timer
    this.resetIdleTimer();
  }

  private resetIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      if (this.idleCallback) {
        this.idleCallback();
      }
    }, this.idleThreshold);
  }

  isIdle(): boolean {
    return Date.now() - this.lastActivity > this.idleThreshold;
  }

  onIdle(callback: () => void) {
    this.idleCallback = callback;
  }

  onActive(callback: () => void) {
    this.activeCallback = callback;
  }

  getLastActivity(): Date {
    return new Date(this.lastActivity);
  }

  destroy() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
  }
}

// Export all utilities
export const dashboardUtils = {
  createOptimisticUpdate,
  PerformanceMonitor,
  StorageWithExpiry,
  NotificationManager,
  useDebouncedSearch,
  animations,
  useConnectionStatus,
  PrefetchManager,
  ActivityTracker
};