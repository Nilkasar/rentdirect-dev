import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ApiResponse } from '../types';

/**
 * Middleware to run validations and return errors if any
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map(error => ({
      field: (error as any).path || (error as any).param || 'unknown',
      message: error.msg,
    }));

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: formattedErrors,
    });
  };
};
