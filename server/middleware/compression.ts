// API compression and response optimization middleware
import compression from 'compression';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Configure compression with optimal settings
export const compressionMiddleware = compression({
  // Only compress responses larger than 1KB
  threshold: 1024,
  // Compression level (1-9, 6 is balanced)
  level: 6,
  // Filter function to determine if response should be compressed
  filter: (req: Request, res: Response) => {
    // Don't compress if client doesn't accept encoding
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Use compression filter default
    return compression.filter(req, res);
  }
});

// ETag generation for conditional requests
export const etagMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  res.json = function(body: any) {
    // Generate ETag from response body
    const etag = crypto
      .createHash('md5')
      .update(JSON.stringify(body))
      .digest('hex');
    
    res.setHeader('ETag', `"${etag}"`);
    
    // Check if client has matching ETag
    const clientETag = req.headers['if-none-match'];
    if (clientETag === `"${etag}"`) {
      res.status(304).end();
      return res;
    }
    
    return originalJson.call(this, body);
  };
  
  next();
};

// Cache control headers middleware
export const cacheControlMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip caching for auth endpoints
  if (req.path.includes('/auth') || req.path.includes('/login')) {
    res.setHeader('Cache-Control', 'no-store');
    return next();
  }
  
  // Dashboard and stats - short cache
  if (req.path.includes('/dashboard') || req.path.includes('/stats')) {
    res.setHeader('Cache-Control', 'private, max-age=30, must-revalidate');
    return next();
  }
  
  // Client lists and appointments - medium cache
  if (req.path.includes('/clients') || req.path.includes('/appointments')) {
    res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=30');
    return next();
  }
  
  // Documents and static data - longer cache
  if (req.path.includes('/documents') || req.path.includes('/assessments')) {
    res.setHeader('Cache-Control', 'private, max-age=300, stale-while-revalidate=60');
    return next();
  }
  
  // Default - no cache
  res.setHeader('Cache-Control', 'no-cache');
  next();
};

// Response size optimization middleware
export const optimizeResponseMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  res.json = function(body: any) {
    // Add performance timing header
    const requestStart = (req as any).requestStart || Date.now();
    const duration = Date.now() - requestStart;
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    // Optimize large arrays
    if (Array.isArray(body) && body.length > 100) {
      // Check if pagination is requested
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      
      // Apply pagination if not already applied
      if (!res.getHeader('X-Pagination-Applied')) {
        const paginatedBody = {
          data: body.slice(offset, offset + limit),
          pagination: {
            page,
            limit,
            total: body.length,
            totalPages: Math.ceil(body.length / limit)
          }
        };
        
        res.setHeader('X-Pagination-Applied', 'true');
        return originalJson.call(this, paginatedBody);
      }
    }
    
    // Remove null/undefined fields to reduce payload size
    if (typeof body === 'object' && body !== null) {
      body = removeNullFields(body);
    }
    
    return originalJson.call(this, body);
  };
  
  // Track request start time
  (req as any).requestStart = Date.now();
  next();
};

// Helper function to remove null/undefined fields
function removeNullFields(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeNullFields);
  }
  
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc: any, key) => {
      if (obj[key] !== null && obj[key] !== undefined) {
        acc[key] = removeNullFields(obj[key]);
      }
      return acc;
    }, {});
  }
  
  return obj;
}

// Performance monitoring middleware
export const performanceMonitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  const method = req.method;
  
  // Monitor response
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log slow requests (> 2 seconds)
    if (duration > 2000) {
      console.warn(`[SLOW REQUEST] ${method} ${path} took ${duration}ms`);
    }
    
    // Log very slow requests (> 5 seconds)
    if (duration > 5000) {
      console.error(`[VERY SLOW REQUEST] ${method} ${path} took ${duration}ms`);
    }
  });
  
  next();
};

// Export all middleware as a single array for easy application
export const performanceMiddleware = [
  performanceMonitoringMiddleware,
  compressionMiddleware,
  etagMiddleware,
  cacheControlMiddleware,
  optimizeResponseMiddleware
];