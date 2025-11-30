/**
 * Common validation utilities
 */

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Indian format)
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

/**
 * Validate password strength
 */
export const isStrongPassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
};

/**
 * Validate Indian pincode
 */
export const isValidPincode = (pincode: string): boolean => {
  const pincodeRegex = /^[1-9][0-9]{5}$/;
  return pincodeRegex.test(pincode);
};

/**
 * Validate UUID
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Sanitize string input (remove potential XSS)
 */
export const sanitizeString = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Sanitize object recursively
 */
export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeString(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
};

/**
 * Validate and parse pagination params
 */
export const parsePaginationParams = (
  query: any
): { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const sortBy = query.sortBy as string | undefined;
  const sortOrder = (query.sortOrder === 'asc' || query.sortOrder === 'desc')
    ? query.sortOrder
    : 'desc';

  return { page, limit, sortBy, sortOrder };
};

/**
 * Validate rent amount (reasonable range for Indian market)
 */
export const isValidRentAmount = (amount: number): boolean => {
  return amount >= 1000 && amount <= 10000000; // 1K to 1 Cr
};

/**
 * Validate deposit amount
 */
export const isValidDepositAmount = (deposit: number, rent: number): boolean => {
  return deposit >= 0 && deposit <= rent * 12; // Max 12 months rent
};

/**
 * Validate payment amount (in INR)
 */
export const isValidPaymentAmount = (amount: number): boolean => {
  // Minimum ₹1 (1 paise in our system), Maximum ₹10,00,000 (10 lakhs)
  return amount >= 1 && amount <= 10000000;
};

/**
 * Validate Razorpay Order ID format
 */
export const isValidRazorpayOrderId = (orderId: string): boolean => {
  // Razorpay order IDs start with 'order_' followed by alphanumeric characters
  const orderIdRegex = /^order_[A-Za-z0-9]{1,}$/;
  return orderIdRegex.test(orderId);
};

/**
 * Validate Razorpay Payment ID format
 */
export const isValidRazorpayPaymentId = (paymentId: string): boolean => {
  // Razorpay payment IDs start with 'pay_' followed by alphanumeric characters
  const paymentIdRegex = /^pay_[A-Za-z0-9]{1,}$/;
  return paymentIdRegex.test(paymentId);
};

/**
 * Validate Razorpay Signature format
 */
export const isValidRazorpaySignature = (signature: string): boolean => {
  // Razorpay signatures are 64 character hex strings (SHA256 hash)
  const signatureRegex = /^[a-f0-9]{64}$/;
  return signatureRegex.test(signature);
};

