import { Response } from 'express';

/**
 * Standardized API Response Helper
 * Ensures consistent response format and prevents data leakage
 */

interface SuccessResponseOptions<T> {
  data?: T;
  message?: string;
  statusCode?: number;
}

interface ErrorResponseOptions {
  message: string;
  code?: string;
  statusCode?: number;
  errors?: { field: string; message: string }[];
}

interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Send a successful response
 */
export const sendSuccess = <T>(
  res: Response,
  options: SuccessResponseOptions<T> = {}
): Response => {
  const { data, message, statusCode = 200 } = options;

  const response: Record<string, any> = {
    success: true,
  };

  if (message) {
    response.message = message;
  }

  if (data !== undefined) {
    response.data = sanitizeData(data);
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a created response (201)
 */
export const sendCreated = <T>(
  res: Response,
  data?: T,
  message: string = 'Created successfully'
): Response => {
  return sendSuccess(res, { data, message, statusCode: 201 });
};

/**
 * Send a paginated response
 */
export const sendPaginated = <T>(
  res: Response,
  data: PaginatedData<T>,
  message?: string
): Response => {
  return res.status(200).json({
    success: true,
    message,
    data: {
      items: sanitizeData(data.items),
      pagination: {
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: data.totalPages,
        hasMore: data.page < data.totalPages,
      },
    },
  });
};

/**
 * Send an error response
 */
export const sendError = (
  res: Response,
  options: ErrorResponseOptions
): Response => {
  const { message, code, statusCode = 500, errors } = options;

  const response: Record<string, any> = {
    success: false,
    error: {
      message,
      ...(code && { code }),
      ...(errors && errors.length > 0 && { details: errors }),
    },
  };

  return res.status(statusCode).json(response);
};

/**
 * Send a no content response (204)
 */
export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Fields to always exclude from responses (sensitive data)
 */
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'refreshToken',
  'resetToken',
  'resetTokenExpiry',
  'verificationToken',
  '__v',
  '_prisma',
];

/**
 * Fields that contain internal metadata
 */
const METADATA_FIELDS = [
  'createdAt',
  'updatedAt',
];

/**
 * Recursively sanitize data to remove sensitive fields
 */
export const sanitizeData = <T>(data: T, options: { keepTimestamps?: boolean } = {}): T => {
  const { keepTimestamps = true } = options;

  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, options)) as T;
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive fields
      if (SENSITIVE_FIELDS.includes(key)) {
        continue;
      }

      // Optionally skip metadata fields
      if (!keepTimestamps && METADATA_FIELDS.includes(key)) {
        continue;
      }

      // Skip internal Prisma fields
      if (key.startsWith('_') && key !== '_count') {
        continue;
      }

      // Recursively sanitize nested objects
      sanitized[key] = sanitizeData(value, options);
    }

    return sanitized as T;
  }

  return data;
};

/**
 * Extract only specified fields from an object
 */
export const pickFields = <T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): Partial<T> => {
  const result: Partial<T> = {};
  for (const field of fields) {
    if (field in obj) {
      result[field] = obj[field];
    }
  }
  return result;
};

/**
 * Omit specified fields from an object
 */
export const omitFields = <T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): Partial<T> => {
  const result = { ...obj };
  for (const field of fields) {
    delete result[field];
  }
  return result;
};

/**
 * Format user data for safe response (public profile)
 */
export const formatUserResponse = (user: any) => {
  if (!user) return null;

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    profileImage: user.profileImage,
    status: user.status,
    createdAt: user.createdAt,
  };
};

/**
 * Format property data for safe response
 */
export const formatPropertyResponse = (property: any) => {
  if (!property) return null;

  return {
    id: property.id,
    title: property.title,
    description: property.description,
    city: property.city,
    locality: property.locality,
    address: property.address,
    pincode: property.pincode,
    propertyType: property.propertyType,
    roomConfig: property.roomConfig,
    furnishing: property.furnishing,
    rentAmount: property.rentAmount,
    depositAmount: property.depositAmount,
    maintenanceAmount: property.maintenanceAmount,
    tenantPreference: property.tenantPreference,
    amenities: property.amenities,
    images: property.images,
    squareFeet: property.squareFeet,
    bathrooms: property.bathrooms,
    balconies: property.balconies,
    floorNumber: property.floorNumber,
    totalFloors: property.totalFloors,
    ageOfProperty: property.ageOfProperty,
    facingDirection: property.facingDirection,
    availableFrom: property.availableFrom,
    status: property.status,
    viewCount: property.viewCount,
    createdAt: property.createdAt,
    owner: property.owner ? formatUserResponse(property.owner) : undefined,
    _count: property._count,
  };
};
