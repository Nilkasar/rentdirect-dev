import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AuthRequest, RegisterDto, LoginDto } from '../types';
import { asyncHandler, asyncAuthHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated, formatUserResponse } from '../utils/response';
import { UnauthorizedError, BadRequestError, ConflictError, ErrorCodes } from '../utils/errors';

export class AuthController {
  /**
   * POST /auth/register
   * Register a new user
   */
  register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data: RegisterDto = req.body;

    try {
      const result = await authService.register(data);
      sendCreated(res, {
        user: formatUserResponse(result.user),
        token: result.token,
      }, 'Registration successful');
    } catch (error: any) {
      if (error.message.includes('already exists') || error.message.includes('Email')) {
        throw new ConflictError('An account with this email already exists', ErrorCodes.EMAIL_EXISTS);
      }
      throw new BadRequestError(error.message);
    }
  });

  /**
   * POST /auth/login
   * Login user
   */
  login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data: LoginDto = req.body;

    try {
      const result = await authService.login(data);
      sendSuccess(res, {
        data: {
          user: formatUserResponse(result.user),
          token: result.token,
        },
        message: 'Login successful',
      });
    } catch (error: any) {
      if (error.message.includes('Invalid') || error.message.includes('credentials')) {
        throw new UnauthorizedError('Invalid email or password', ErrorCodes.INVALID_CREDENTIALS);
      }
      if (error.message.includes('suspended')) {
        throw new UnauthorizedError('Your account has been suspended', ErrorCodes.USER_SUSPENDED);
      }
      throw new UnauthorizedError(error.message);
    }
  });

  /**
   * GET /auth/me
   * Get current user profile
   */
  getProfile = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const user = await authService.getProfile(req.user.userId);
    sendSuccess(res, {
      data: formatUserResponse(user),
    });
  });

  /**
   * PUT /auth/profile
   * Update current user profile
   */
  updateProfile = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    // Only allow specific fields to be updated
    const allowedFields = ['firstName', 'lastName', 'phone', 'profileImage'];
    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const user = await authService.updateProfile(req.user.userId, updateData);
    sendSuccess(res, {
      data: formatUserResponse(user),
      message: 'Profile updated successfully',
    });
  });

  /**
   * POST /auth/forgot-password
   * Request password reset OTP
   */
  forgotPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    if (!email) {
      throw new BadRequestError('Email is required');
    }

    const result = await authService.requestPasswordReset(email);
    sendSuccess(res, {
      data: null,
      message: result.message,
    });
  });

  /**
   * POST /auth/verify-otp
   * Verify password reset OTP
   */
  verifyOTP = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new BadRequestError('Email and OTP are required');
    }

    const result = await authService.verifyPasswordResetOTP(email, otp);

    if (!result.success) {
      throw new BadRequestError(result.message);
    }

    sendSuccess(res, {
      data: { verified: true },
      message: result.message,
    });
  });

  /**
   * POST /auth/reset-password
   * Reset password with OTP
   */
  resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      throw new BadRequestError('Email, OTP, and new password are required');
    }

    // Password validation
    if (newPassword.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters long');
    }

    const result = await authService.resetPassword(email, otp, newPassword);

    if (!result.success) {
      throw new BadRequestError(result.message);
    }

    sendSuccess(res, {
      data: null,
      message: result.message,
    });
  });
}

export const authController = new AuthController();
