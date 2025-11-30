import { UserRole, UserStatus } from '@prisma/client';
import { Request } from 'express';

// Authenticated user payload in JWT
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// Extended Express Request with authenticated user
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: { field: string; message: string }[];
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Property filters
export interface PropertyFilters {
  city?: string;
  locality?: string;
  minRent?: number;
  maxRent?: number;
  propertyType?: string;
  roomConfig?: string;
  furnishing?: string;
  tenantPreference?: string;
}

// Auth DTOs
export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'OWNER' | 'TENANT';
}

export interface LoginDto {
  email: string;
  password: string;
}

// Property DTOs
export interface CreatePropertyDto {
  title: string;
  description: string;
  city: string;
  locality: string;
  address: string;
  pincode?: string;
  propertyType: string;
  roomConfig: string;
  furnishing: string;
  rentAmount: number;
  depositAmount: number;
  maintenanceAmount?: number;
  tenantPreference: string[];
  amenities: string[];
  images: string[];
  squareFeet?: number;
  bathrooms?: number;
  balconies?: number;
  floorNumber?: number;
  totalFloors?: number;
  ageOfProperty?: number;
  facingDirection?: string;
  availableFrom?: Date;
}

// Chat DTOs
export interface CreateMessageDto {
  content: string;
}

export interface StartConversationDto {
  propertyId: string;
  message: string;
}
