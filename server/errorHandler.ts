import { Request, Response, NextFunction } from 'express';

// Error types enum matching client-side
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  DATABASE = 'DATABASE',
  NOT_FOUND = 'NOT_FOUND',
  UNKNOWN = 'UNKNOWN'
}

// Custom error class with additional metadata
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly type: ErrorType;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    type: ErrorType = ErrorType.UNKNOWN,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Factory functions for common errors
export const ErrorFactory = {
  badRequest: (message: string = 'Bad request', details?: any) =>
    new ApiError(message, 400, ErrorType.VALIDATION, details),

  unauthorized: (message: string = 'Authentication required') =>
    new ApiError(message, 401, ErrorType.AUTHENTICATION),

  forbidden: (message: string = 'Access denied') =>
    new ApiError(message, 403, ErrorType.AUTHENTICATION),

  notFound: (resource: string = 'Resource') =>
    new ApiError(`${resource} not found`, 404, ErrorType.NOT_FOUND),

  conflict: (message: string = 'Resource conflict') =>
    new ApiError(message, 409, ErrorType.CLIENT),

  validationError: (errors: any) =>
    new ApiError('Validation failed', 422, ErrorType.VALIDATION, errors),

  serverError: (message: string = 'Internal server error', details?: any) =>
    new ApiError(message, 500, ErrorType.SERVER, details),

  databaseError: (message: string = 'Database operation failed', details?: any) =>
    new ApiError(message, 500, ErrorType.DATABASE, details),
};

// Async error handler wrapper
export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Global error handler middleware
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // Default error values
  let statusCode = 500;
  let type = ErrorType.UNKNOWN;
  let message = 'An unexpected error occurred';
  let details = undefined;

  // Handle ApiError instances
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    type = err.type;
    message = err.message;
    details = err.details;
  } 
  // Handle Zod validation errors
  else if (err.name === 'ZodError') {
    statusCode = 422;
    type = ErrorType.VALIDATION;
    message = 'Validation failed';
    details = (err as any).errors;
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    type = ErrorType.AUTHENTICATION;
    message = 'Invalid or expired token';
  }
  // Handle MongoDB errors
  else if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    statusCode = 500;
    type = ErrorType.DATABASE;
    message = 'Database operation failed';
    // Don't expose database details in production
    if (process.env.NODE_ENV === 'development') {
      details = err.message;
    }
  }
  // Handle other known errors
  else if (err.message) {
    // Check for specific error patterns
    if (err.message.includes('not found')) {
      statusCode = 404;
      type = ErrorType.NOT_FOUND;
      message = err.message;
    } else if (err.message.includes('unauthorized') || err.message.includes('authentication')) {
      statusCode = 401;
      type = ErrorType.AUTHENTICATION;
      message = err.message;
    } else if (err.message.includes('validation') || err.message.includes('invalid')) {
      statusCode = 422;
      type = ErrorType.VALIDATION;
      message = err.message;
    } else {
      message = err.message;
    }
  }

  // Create standardized error response
  const errorResponse: any = {
    error: true,
    type,
    message,
    timestamp: new Date().toISOString(),
  };

  // Add details if available and not in production (unless it's validation errors)
  if (details && (process.env.NODE_ENV !== 'production' || type === ErrorType.VALIDATION)) {
    errorResponse.details = details;
  }

  // Add request ID if available (for tracking)
  if ((req as any).id) {
    errorResponse.requestId = (req as any).id;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.stack = err.stack.split('\n');
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Not found handler (for undefined routes)
export const notFoundHandler = (req: Request, res: Response) => {
  const error = ErrorFactory.notFound(`Route ${req.originalUrl}`);
  res.status(error.statusCode).json({
    error: true,
    type: error.type,
    message: error.message,
    timestamp: new Date().toISOString(),
  });
};

// Validation middleware factory
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body, params, and query
      const validated = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      // Replace request properties with validated data
      req.body = validated.body || req.body;
      req.params = validated.params || req.params;
      req.query = validated.query || req.query;

      next();
    } catch (error) {
      next(ErrorFactory.validationError(error));
    }
  };
};

// Rate limiting error
export const rateLimitError = () =>
  new ApiError('Too many requests. Please try again later.', 429, ErrorType.CLIENT);

// Service unavailable error
export const serviceUnavailableError = (service: string = 'Service') =>
  new ApiError(`${service} is temporarily unavailable`, 503, ErrorType.SERVER);

// Request timeout error
export const timeoutError = (operation: string = 'Operation') =>
  new ApiError(`${operation} timed out`, 408, ErrorType.SERVER);