import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import {
  AppError,
  ValidationError,
  NotFoundError,
  BadRequestError,
  isOperationalError,
} from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Central error handling middleware
 * Converts all errors to standardized API responses
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error
  logger.error(`Error in ${req.method} ${req.path}`, err);

  // Handle known operational errors
  if (err instanceof AppError) {
    const response: Record<string, any> = {
      success: false,
      error: {
        message: err.message,
        code: err.code,
      },
    };

    // Include validation errors if present
    if (err instanceof ValidationError && err.errors.length > 0) {
      response.error.details = err.errors;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(err, res);
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Invalid data format',
        code: 'VALIDATION_ERROR',
      },
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token',
        code: 'TOKEN_INVALID',
      },
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: {
        message: 'Token has expired',
        code: 'TOKEN_EXPIRED',
      },
    });
    return;
  }

  // Handle syntax errors (invalid JSON body)
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Invalid JSON in request body',
        code: 'INVALID_JSON',
      },
    });
    return;
  }

  // Handle unknown errors (don't leak internal details in production)
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(500).json({
    success: false,
    error: {
      message: isProduction ? 'An unexpected error occurred' : err.message,
      code: 'INTERNAL_ERROR',
      ...(isProduction ? {} : { stack: err.stack }),
    },
  });
};

/**
 * Handle Prisma-specific errors
 */
const handlePrismaError = (
  err: Prisma.PrismaClientKnownRequestError,
  res: Response
): void => {
  switch (err.code) {
    // Unique constraint violation
    case 'P2002': {
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      res.status(409).json({
        success: false,
        error: {
          message: `A record with this ${target} already exists`,
          code: 'DUPLICATE_ENTRY',
        },
      });
      break;
    }

    // Record not found
    case 'P2025': {
      res.status(404).json({
        success: false,
        error: {
          message: 'Record not found',
          code: 'NOT_FOUND',
        },
      });
      break;
    }

    // Foreign key constraint failed
    case 'P2003': {
      res.status(400).json({
        success: false,
        error: {
          message: 'Related record not found',
          code: 'FOREIGN_KEY_ERROR',
        },
      });
      break;
    }

    // Invalid ID format
    case 'P2023': {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid ID format',
          code: 'INVALID_ID',
        },
      });
      break;
    }

    // Default Prisma error
    default: {
      logger.error('Unhandled Prisma error', err);
      res.status(500).json({
        success: false,
        error: {
          message: 'Database error occurred',
          code: 'DATABASE_ERROR',
        },
      });
    }
  }
};

/**
 * 404 Not Found handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      message: `Cannot ${req.method} ${req.path}`,
      code: 'ENDPOINT_NOT_FOUND',
    },
  });
};

/**
 * Unhandled rejection handler
 */
export const setupUnhandledRejectionHandler = (): void => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection', reason);
    // In production, you might want to gracefully shut down
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', error);
    // In production, gracefully shut down after logging
    process.exit(1);
  });
};
