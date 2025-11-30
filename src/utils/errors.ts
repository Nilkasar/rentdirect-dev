/**
 * Custom Error Classes for standardized error handling
 */

// Base application error
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// 400 - Bad Request
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', code: string = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}

// 401 - Unauthorized
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

// 403 - Forbidden
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied', code: string = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

// 404 - Not Found
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code: string = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

// 409 - Conflict
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists', code: string = 'CONFLICT') {
    super(message, 409, code);
  }
}

// 422 - Unprocessable Entity (Validation)
export class ValidationError extends AppError {
  public readonly errors: { field: string; message: string }[];

  constructor(
    message: string = 'Validation failed',
    errors: { field: string; message: string }[] = []
  ) {
    super(message, 422, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

// 429 - Too Many Requests
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', code: string = 'RATE_LIMIT_EXCEEDED') {
    super(message, 429, code);
  }
}

// 500 - Internal Server Error
export class InternalError extends AppError {
  constructor(message: string = 'Internal server error', code: string = 'INTERNAL_ERROR') {
    super(message, 500, code, false);
  }
}

// 503 - Service Unavailable
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service unavailable', code: string = 'SERVICE_UNAVAILABLE') {
    super(message, 503, code);
  }
}

/**
 * Check if error is operational (expected) or programming error
 */
export const isOperationalError = (error: Error): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

/**
 * Error codes for consistent error identification
 */
export const ErrorCodes = {
  // Auth errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_SUSPENDED: 'USER_SUSPENDED',
  EMAIL_EXISTS: 'EMAIL_EXISTS',

  // Property errors
  PROPERTY_NOT_FOUND: 'PROPERTY_NOT_FOUND',
  PROPERTY_ACCESS_DENIED: 'PROPERTY_ACCESS_DENIED',

  // Chat errors
  CONVERSATION_NOT_FOUND: 'CONVERSATION_NOT_FOUND',
  CONVERSATION_ACCESS_DENIED: 'CONVERSATION_ACCESS_DENIED',

  // Deal errors
  DEAL_NOT_FOUND: 'DEAL_NOT_FOUND',
  DEAL_ACCESS_DENIED: 'DEAL_ACCESS_DENIED',
  INVALID_DEAL_STATUS: 'INVALID_DEAL_STATUS',

  // General errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
