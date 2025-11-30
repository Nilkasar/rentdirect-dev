import prisma from '../lib/prisma';
import { config } from '../config';
import { emailService } from './email.service';
import bcrypt from 'bcryptjs';

// OTP Type constants (matches Prisma enum after generation)
const OTP_TYPE = {
  PASSWORD_RESET: 'PASSWORD_RESET',
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
} as const;

type OTPTypeValue = typeof OTP_TYPE[keyof typeof OTP_TYPE];

class OTPService {
  /**
   * Generate a random 6-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Create and send password reset OTP
   */
  async sendPasswordResetOTP(email: string): Promise<{ success: boolean; message: string }> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists for security
      return {
        success: true,
        message: 'If this email exists, you will receive an OTP shortly.',
      };
    }

    // Invalidate any existing OTPs for this user
    await prisma.oTP.updateMany({
      where: {
        userId: user.id,
        type: OTP_TYPE.PASSWORD_RESET as any,
        usedAt: null,
      },
      data: {
        usedAt: new Date(), // Mark as used to invalidate
      },
    });

    // Generate new OTP
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

    // Store OTP in database
    await prisma.oTP.create({
      data: {
        userId: user.id,
        code: otp,
        type: OTP_TYPE.PASSWORD_RESET as any,
        expiresAt,
      },
    });

    // Send OTP via email
    const sent = await emailService.sendPasswordResetOTP(
      user.email,
      user.firstName,
      otp
    );

    if (!sent && config.nodeEnv !== 'development') {
      return {
        success: false,
        message: 'Failed to send OTP. Please try again.',
      };
    }

    // In development, also log the OTP for easy testing
    if (config.nodeEnv === 'development') {
      console.log(`[DEV] OTP for ${email}: ${otp}`);
    }

    return {
      success: true,
      message: 'If this email exists, you will receive an OTP shortly.',
    };
  }

  /**
   * Verify OTP
   */
  async verifyOTP(
    email: string,
    code: string,
    type: OTPTypeValue
  ): Promise<{ success: boolean; message: string; userId?: string }> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return {
        success: false,
        message: 'Invalid email or OTP.',
      };
    }

    // Find valid OTP
    const otp = await prisma.oTP.findFirst({
      where: {
        userId: user.id,
        code,
        type: type as any,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!otp) {
      return {
        success: false,
        message: 'Invalid or expired OTP. Please request a new one.',
      };
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    return {
      success: true,
      message: 'OTP verified successfully.',
      userId: user.id,
    };
  }

  /**
   * Reset password with verified OTP
   */
  async resetPassword(
    email: string,
    otp: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    // Verify OTP first
    const verification = await this.verifyOTP(email, otp, OTP_TYPE.PASSWORD_RESET);

    if (!verification.success || !verification.userId) {
      return {
        success: false,
        message: verification.message,
      };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    const user = await prisma.user.update({
      where: { id: verification.userId },
      data: { password: hashedPassword },
    });

    // Send password changed confirmation email
    await emailService.sendPasswordChangedEmail(user.email, user.firstName, user.id);

    return {
      success: true,
      message: 'Password reset successfully.',
    };
  }

  /**
   * Cleanup expired OTPs (can be run as a cron job)
   */
  async cleanupExpiredOTPs(): Promise<number> {
    const result = await prisma.oTP.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { usedAt: { not: null } },
        ],
      },
    });

    return result.count;
  }
}

export const otpService = new OTPService();
