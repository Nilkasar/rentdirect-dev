import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { config } from '../config';
import { RegisterDto, LoginDto, JwtPayload } from '../types';
import { UserRole, UserStatus } from '@prisma/client';
import { emailService } from './email.service';
import { otpService } from './otp.service';

export class AuthService {
  /**
   * Register a new user (tenant or owner)
   */
  async register(data: RegisterDto) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Only allow OWNER or TENANT registration through public endpoint
    if (!['OWNER', 'TENANT'].includes(data.role)) {
      throw new Error('Invalid role');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role as UserRole,
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Generate JWT
    const token = this.generateToken(user);

    // Send welcome email (async, don't wait)
    emailService.sendWelcomeEmail(
      user.email,
      user.firstName,
      user.role,
      user.id
    ).catch(err => console.error('Failed to send welcome email:', err));

    return { user, token };
  }

  /**
   * Login user with email and password
   */
  async login(data: LoginDto) {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is suspended
    if (user.status === UserStatus.SUSPENDED) {
      throw new Error('Your account has been suspended. Please contact support.');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT
    const token = this.generateToken(user);

    // Return user without password
    const { password, twoFactorSecret, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profileImage: true,
        role: true,
        status: true,
        kycVerified: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: Partial<{
    firstName: string;
    lastName: string;
    phone: string;
    profileImage: string;
    aadhaarNumber: string;
    panNumber: string;
  }>) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        profileImage: true,
        role: true,
        status: true,
        kycVerified: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Request password reset OTP
   */
  async requestPasswordReset(email: string) {
    return otpService.sendPasswordResetOTP(email);
  }

  /**
   * Verify OTP for password reset
   */
  async verifyPasswordResetOTP(email: string, otp: string) {
    return otpService.verifyOTP(email, otp, 'PASSWORD_RESET' as any);
  }

  /**
   * Reset password with OTP
   */
  async resetPassword(email: string, otp: string, newPassword: string) {
    return otpService.resetPassword(email, otp, newPassword);
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: { id: string; email: string; role: UserRole }): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // expiresIn accepts string like '7d', '24h', etc.
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as SignOptions);
  }
}

export const authService = new AuthService();
