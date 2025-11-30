import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthRequest, JwtPayload, ApiResponse } from '../types';
import { UserRole } from '@prisma/client';

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticate = (
  req: AuthRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token.',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authentication error.',
    });
  }
};

/**
 * Middleware factory to check for specific roles
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response<ApiResponse>, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.',
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token, but attaches user if valid token exists
 */
export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
        req.user = decoded;
      } catch (err) {
        // Token invalid, but we continue without user
      }
    }

    next();
  } catch (error) {
    next();
  }
};
