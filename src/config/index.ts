import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL || 'admin@rentalplatform.com',
    password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456',
  },

  // Email configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    from: process.env.EMAIL_FROM || 'RentDirect <noreply@rentdirect.com>',
  },

  // OTP configuration
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
    length: 6,
  },

  // Razorpay Payment Gateway Configuration
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },

  // Success fee slabs (in INR)
  successFeeSlabs: [
    { maxRent: 10000, fee: 299 },
    { maxRent: 25000, fee: 499 },
    { maxRent: Infinity, fee: 999 },
  ],
};

export const calculateSuccessFee = (rentAmount: number): number => {
  for (const slab of config.successFeeSlabs) {
    if (rentAmount < slab.maxRent) {
      return slab.fee;
    }
  }
  return config.successFeeSlabs[config.successFeeSlabs.length - 1].fee;
};
