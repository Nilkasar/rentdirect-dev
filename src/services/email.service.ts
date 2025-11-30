import nodemailer from 'nodemailer';
import { config } from '../config';
import prisma from '../lib/prisma';

// Use string constants for EmailType and EmailStatus until Prisma is regenerated
const EMAIL_TYPE = {
  PASSWORD_RESET_OTP: 'PASSWORD_RESET_OTP',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  WELCOME: 'WELCOME',
  NEW_INQUIRY: 'NEW_INQUIRY',
  NEW_MESSAGE: 'NEW_MESSAGE',
  DEAL_CREATED: 'DEAL_CREATED',
  DEAL_COMPLETED: 'DEAL_COMPLETED',
} as const;

const EMAIL_STATUS = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const;

type EmailType = (typeof EMAIL_TYPE)[keyof typeof EMAIL_TYPE];
type EmailStatus = (typeof EMAIL_STATUS)[keyof typeof EMAIL_STATUS];

// Email templates
const emailTemplates = {
  PASSWORD_RESET_OTP: (data: { name: string; otp: string; expiryMinutes: number }) => ({
    subject: 'Reset Your Password - RentDirect',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🏠 RentDirect</h1>
                    <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">No Brokers. Direct Connections.</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hi <strong>${data.name}</strong>,
                    </p>
                    <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      You requested to reset your password. Use the OTP below to complete the process:
                    </p>

                    <!-- OTP Box -->
                    <div style="background: linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 100%); border: 2px dashed #3b82f6; border-radius: 12px; padding: 30px; text-align: center; margin: 0 0 30px;">
                      <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your OTP Code</p>
                      <div style="font-size: 40px; font-weight: 700; letter-spacing: 8px; color: #3b82f6; font-family: 'Courier New', monospace;">
                        ${data.otp}
                      </div>
                    </div>

                    <p style="margin: 0 0 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                      ⏱️ This OTP will expire in <strong>${data.expiryMinutes} minutes</strong>.
                    </p>

                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin: 0 0 20px;">
                      <p style="margin: 0; color: #92400e; font-size: 14px;">
                        ⚠️ If you didn't request this password reset, please ignore this email or contact support if you have concerns.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px 40px; border-radius: 0 0 16px 16px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                      Need help? <a href="mailto:support@rentdirect.com" style="color: #3b82f6; text-decoration: none;">Contact Support</a>
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      © ${new Date().getFullYear()} RentDirect. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }),

  PASSWORD_CHANGED: (data: { name: string }) => ({
    subject: 'Password Changed Successfully - RentDirect',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🏠 RentDirect</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px; text-align: center;">
                    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                      <span style="font-size: 40px;">✓</span>
                    </div>
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Password Changed Successfully!</h2>
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hi <strong>${data.name}</strong>, your password has been successfully changed.
                    </p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                      If you didn't make this change, please contact support immediately.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px 40px; border-radius: 0 0 16px 16px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} RentDirect. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }),

  WELCOME: (data: { name: string; role: string }) => ({
    subject: 'Welcome to RentDirect! 🏠',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 50px 40px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">🏠 Welcome to RentDirect!</h1>
                    <p style="margin: 15px 0 0; color: rgba(255,255,255,0.9); font-size: 18px;">Your journey to hassle-free renting starts here</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Hi ${data.name}! 👋</h2>
                    <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Thank you for joining RentDirect as a <strong>${data.role}</strong>! We're thrilled to have you on board.
                    </p>

                    <div style="background: linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 100%); border-radius: 12px; padding: 25px; margin: 0 0 25px;">
                      <h3 style="margin: 0 0 15px; color: #1f2937; font-size: 18px;">What's next?</h3>
                      ${data.role === 'OWNER' ? `
                        <ul style="margin: 0; padding: 0 0 0 20px; color: #4b5563; line-height: 1.8;">
                          <li>📝 List your property with detailed information</li>
                          <li>📸 Add high-quality photos to attract tenants</li>
                          <li>💬 Connect directly with interested tenants</li>
                          <li>🤝 Close deals with zero brokerage</li>
                        </ul>
                      ` : `
                        <ul style="margin: 0; padding: 0 0 0 20px; color: #4b5563; line-height: 1.8;">
                          <li>🔍 Browse thousands of verified properties</li>
                          <li>💬 Chat directly with property owners</li>
                          <li>📍 Filter by location, budget, and amenities</li>
                          <li>🏠 Find your perfect home with no broker fees</li>
                        </ul>
                      `}
                    </div>

                    <a href="${config.frontendUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 10px; font-weight: 600; font-size: 16px;">
                      ${data.role === 'OWNER' ? 'List Your Property' : 'Start Browsing'}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px 40px; border-radius: 0 0 16px 16px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                      Questions? <a href="mailto:support@rentdirect.com" style="color: #3b82f6; text-decoration: none;">Contact Support</a>
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} RentDirect. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }),

  NEW_INQUIRY: (data: { ownerName: string; tenantName: string; propertyTitle: string; propertyUrl: string }) => ({
    subject: `New Inquiry for "${data.propertyTitle}" - RentDirect`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🏠 RentDirect</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <div style="background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%); border-radius: 12px; padding: 20px; margin: 0 0 25px; text-align: center;">
                      <span style="font-size: 40px;">💬</span>
                      <h2 style="margin: 10px 0 0; color: #1f2937; font-size: 22px;">New Inquiry Received!</h2>
                    </div>

                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hi <strong>${data.ownerName}</strong>,
                    </p>
                    <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      <strong>${data.tenantName}</strong> is interested in your property: <strong>"${data.propertyTitle}"</strong>
                    </p>

                    <a href="${data.propertyUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 10px; font-weight: 600; font-size: 16px;">
                      View & Respond
                    </a>

                    <p style="margin: 25px 0 0; color: #6b7280; font-size: 14px;">
                      💡 Tip: Quick responses increase your chances of closing deals!
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px 40px; border-radius: 0 0 16px 16px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} RentDirect. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }),

  NEW_MESSAGE: (data: { recipientName: string; senderName: string; propertyTitle: string; messagePreview: string; conversationUrl: string }) => ({
    subject: `New message from ${data.senderName} - RentDirect`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px 40px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">🏠 RentDirect</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hi <strong>${data.recipientName}</strong>,
                    </p>
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      You have a new message from <strong>${data.senderName}</strong> regarding <strong>"${data.propertyTitle}"</strong>:
                    </p>

                    <div style="background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 0 0 25px;">
                      <p style="margin: 0; color: #374151; font-size: 15px; font-style: italic;">
                        "${data.messagePreview.length > 150 ? data.messagePreview.substring(0, 150) + '...' : data.messagePreview}"
                      </p>
                    </div>

                    <a href="${data.conversationUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 10px; font-weight: 600; font-size: 16px;">
                      Reply Now
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 20px 40px; border-radius: 0 0 16px 16px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} RentDirect. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }),

  DEAL_CREATED: (data: { recipientName: string; propertyTitle: string; agreedRent: number; otherPartyName: string; role: 'owner' | 'tenant' }) => ({
    subject: `Deal Initiated for "${data.propertyTitle}" - RentDirect`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 40px 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🏠 RentDirect</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; margin: 0 0 25px; text-align: center;">
                      <span style="font-size: 40px;">🤝</span>
                      <h2 style="margin: 10px 0 0; color: #92400e; font-size: 22px;">Deal Initiated!</h2>
                    </div>

                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hi <strong>${data.recipientName}</strong>,
                    </p>
                    <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      A deal has been initiated for <strong>"${data.propertyTitle}"</strong> with <strong>${data.otherPartyName}</strong>.
                    </p>

                    <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 20px; margin: 0 0 25px;">
                      <p style="margin: 0 0 10px; color: #166534; font-size: 14px; font-weight: 600;">Deal Details:</p>
                      <p style="margin: 0; color: #15803d; font-size: 24px; font-weight: 700;">₹${data.agreedRent.toLocaleString('en-IN')}/month</p>
                    </div>

                    <p style="margin: 0 0 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                      ${data.role === 'owner'
                        ? 'Please confirm the deal from your dashboard to proceed.'
                        : 'The owner will review and confirm the deal. You will be notified once confirmed.'}
                    </p>

                    <a href="${config.frontendUrl}/${data.role === 'owner' ? 'owner' : 'tenant'}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 10px; font-weight: 600; font-size: 16px;">
                      View Deal
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px 40px; border-radius: 0 0 16px 16px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} RentDirect. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }),

  DEAL_COMPLETED: (data: { recipientName: string; propertyTitle: string; agreedRent: number; role: 'owner' | 'tenant' }) => ({
    subject: `🎉 Deal Completed for "${data.propertyTitle}" - RentDirect`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 50px 40px; border-radius: 16px 16px 0 0; text-align: center;">
                    <span style="font-size: 60px;">🎉</span>
                    <h1 style="margin: 20px 0 0; color: #ffffff; font-size: 28px; font-weight: 700;">Congratulations!</h1>
                    <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Your deal has been completed successfully</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Hi <strong>${data.recipientName}</strong>,
                    </p>
                    <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      The deal for <strong>"${data.propertyTitle}"</strong> has been successfully completed!
                    </p>

                    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 25px; margin: 0 0 25px; text-align: center;">
                      <p style="margin: 0 0 5px; color: #166534; font-size: 14px;">Final Rent Amount</p>
                      <p style="margin: 0; color: #15803d; font-size: 32px; font-weight: 700;">₹${data.agreedRent.toLocaleString('en-IN')}/month</p>
                    </div>

                    <p style="margin: 0 0 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                      ${data.role === 'owner'
                        ? 'Thank you for choosing RentDirect to find your tenant. We hope you have a great rental experience!'
                        : 'Thank you for choosing RentDirect to find your new home. We hope you enjoy your new place!'}
                    </p>

                    <p style="margin: 0; color: #3b82f6; font-size: 14px; font-weight: 600;">
                      ✨ You saved money by avoiding broker fees with RentDirect!
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px 40px; border-radius: 0 0 16px 16px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">© ${new Date().getFullYear()} RentDirect. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  }),
};

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
      auth: {
        user: config.email.smtp.user,
        pass: config.email.smtp.pass,
      },
    });
  }

  /**
   * Send email and log it
   */
  async sendEmail(
    to: string,
    type: EmailType,
    templateData: any,
    userId?: string
  ): Promise<boolean> {
    // Get template
    const templateFn = emailTemplates[type as keyof typeof emailTemplates];
    if (!templateFn) {
      console.error(`Email template not found for type: ${type}`);
      return false;
    }

    const { subject, html } = templateFn(templateData);

    // Create email log entry (use 'as any' until Prisma is regenerated)
    const emailLog = await (prisma as any).emailLog.create({
      data: {
        to,
        subject,
        type,
        userId,
        status: EMAIL_STATUS.PENDING,
      },
    });

    try {
      // Check if email is configured
      if (!config.email.smtp.user || !config.email.smtp.pass) {
        console.log(`[DEV MODE] Email would be sent to: ${to}`);
        console.log(`Subject: ${subject}`);

        // In development, mark as sent even without actual sending
        if (config.nodeEnv === 'development') {
          await (prisma as any).emailLog.update({
            where: { id: emailLog.id },
            data: { status: EMAIL_STATUS.SENT, sentAt: new Date() },
          });
          return true;
        }

        await (prisma as any).emailLog.update({
          where: { id: emailLog.id },
          data: { status: EMAIL_STATUS.FAILED, error: 'SMTP not configured' },
        });
        return false;
      }

      // Send email
      await this.transporter.sendMail({
        from: config.email.from,
        to,
        subject,
        html,
      });

      // Update log as sent
      await (prisma as any).emailLog.update({
        where: { id: emailLog.id },
        data: { status: EMAIL_STATUS.SENT, sentAt: new Date() },
      });

      console.log(`Email sent successfully to: ${to}`);
      return true;
    } catch (error: any) {
      console.error(`Failed to send email to ${to}:`, error.message);

      // Update log as failed
      await (prisma as any).emailLog.update({
        where: { id: emailLog.id },
        data: { status: EMAIL_STATUS.FAILED, error: error.message },
      });

      return false;
    }
  }

  /**
   * Send password reset OTP
   */
  async sendPasswordResetOTP(email: string, name: string, otp: string): Promise<boolean> {
    return this.sendEmail(email, EMAIL_TYPE.PASSWORD_RESET_OTP, {
      name,
      otp,
      expiryMinutes: config.otp.expiryMinutes,
    });
  }

  /**
   * Send password changed confirmation
   */
  async sendPasswordChangedEmail(email: string, name: string, userId: string): Promise<boolean> {
    return this.sendEmail(email, EMAIL_TYPE.PASSWORD_CHANGED, { name }, userId);
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, name: string, role: string, userId: string): Promise<boolean> {
    return this.sendEmail(email, EMAIL_TYPE.WELCOME, { name, role }, userId);
  }

  /**
   * Send new inquiry notification to owner
   */
  async sendNewInquiryEmail(
    ownerEmail: string,
    ownerName: string,
    tenantName: string,
    propertyTitle: string,
    propertyId: string,
    ownerId: string
  ): Promise<boolean> {
    return this.sendEmail(
      ownerEmail,
      EMAIL_TYPE.NEW_INQUIRY,
      {
        ownerName,
        tenantName,
        propertyTitle,
        propertyUrl: `${config.frontendUrl}/properties/${propertyId}`,
      },
      ownerId
    );
  }

  /**
   * Send new message notification
   */
  async sendNewMessageEmail(
    recipientEmail: string,
    recipientName: string,
    senderName: string,
    propertyTitle: string,
    messagePreview: string,
    conversationId: string,
    recipientId: string
  ): Promise<boolean> {
    return this.sendEmail(
      recipientEmail,
      EMAIL_TYPE.NEW_MESSAGE,
      {
        recipientName,
        senderName,
        propertyTitle,
        messagePreview,
        conversationUrl: `${config.frontendUrl}/messages/${conversationId}`,
      },
      recipientId
    );
  }

  /**
   * Send deal created notification
   */
  async sendDealCreatedEmail(
    recipientEmail: string,
    recipientName: string,
    propertyTitle: string,
    agreedRent: number,
    otherPartyName: string,
    role: 'owner' | 'tenant',
    recipientId: string
  ): Promise<boolean> {
    return this.sendEmail(
      recipientEmail,
      EMAIL_TYPE.DEAL_CREATED,
      {
        recipientName,
        propertyTitle,
        agreedRent,
        otherPartyName,
        role,
      },
      recipientId
    );
  }

  /**
   * Send deal completed notification
   */
  async sendDealCompletedEmail(
    recipientEmail: string,
    recipientName: string,
    propertyTitle: string,
    agreedRent: number,
    role: 'owner' | 'tenant',
    recipientId: string
  ): Promise<boolean> {
    return this.sendEmail(
      recipientEmail,
      EMAIL_TYPE.DEAL_COMPLETED,
      {
        recipientName,
        propertyTitle,
        agreedRent,
        role,
      },
      recipientId
    );
  }
}

export const emailService = new EmailService();
