import { Request, Response, NextFunction } from 'express';
import { propertyService } from '../services/property.service';
import { AuthRequest, PropertyFilters } from '../types';
import { PropertyStatus } from '@prisma/client';
import { asyncHandler, asyncAuthHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated, sendPaginated, formatPropertyResponse, sanitizeData } from '../utils/response';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  ErrorCodes,
} from '../utils/errors';
import { parsePaginationParams, isValidUUID } from '../utils/validators';

export class PropertyController {
  /**
   * POST /properties
   * Create a new property (owner only)
   */
  createProperty = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    if (req.user.role !== 'OWNER') {
      throw new ForbiddenError('Only owners can create properties');
    }

    const property = await propertyService.createProperty(req.user.userId, req.body);
    sendCreated(res, formatPropertyResponse(property), 'Property created successfully');
  });

  /**
   * GET /properties
   * Get all properties with filters (public)
   */
  getProperties = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { page, limit, sortBy, sortOrder } = parsePaginationParams(req.query);

    const {
      city,
      locality,
      minRent,
      maxRent,
      propertyType,
      roomConfig,
      furnishing,
      tenantPreference,
    } = req.query;

    const filters: PropertyFilters = {
      city: city as string,
      locality: locality as string,
      minRent: minRent ? parseInt(minRent as string, 10) : undefined,
      maxRent: maxRent ? parseInt(maxRent as string, 10) : undefined,
      propertyType: propertyType as string,
      roomConfig: roomConfig as string,
      furnishing: furnishing as string,
      tenantPreference: tenantPreference as string,
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof PropertyFilters] === undefined) {
        delete filters[key as keyof PropertyFilters];
      }
    });

    const result = await propertyService.getProperties(
      filters,
      { page, limit, sortBy, sortOrder },
      true
    );

    sendPaginated(res, {
      items: result.items.map(formatPropertyResponse),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  });

  /**
   * GET /properties/:id
   * Get single property by ID
   */
  getPropertyById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      throw new BadRequestError('Invalid property ID format');
    }

    try {
      const property = await propertyService.getPropertyById(id, true);
      sendSuccess(res, { data: formatPropertyResponse(property) });
    } catch (error: any) {
      throw new NotFoundError('Property not found', ErrorCodes.PROPERTY_NOT_FOUND);
    }
  });

  /**
   * GET /properties/owner/me
   * Get current owner's properties
   */
  getMyProperties = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const properties = await propertyService.getPropertiesByOwner(req.user.userId);
    sendSuccess(res, { data: properties.map(formatPropertyResponse) });
  });

  /**
   * PUT /properties/:id
   * Update property
   */
  updateProperty = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const { id } = req.params;

    if (!isValidUUID(id)) {
      throw new BadRequestError('Invalid property ID format');
    }

    try {
      const property = await propertyService.updateProperty(id, req.user.userId, req.body);
      sendSuccess(res, {
        data: formatPropertyResponse(property),
        message: 'Property updated successfully',
      });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('permission')) {
        throw new ForbiddenError('Property not found or you do not have permission', ErrorCodes.PROPERTY_ACCESS_DENIED);
      }
      throw error;
    }
  });

  /**
   * PATCH /properties/:id/status
   * Update property status
   */
  updatePropertyStatus = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!isValidUUID(id)) {
      throw new BadRequestError('Invalid property ID format');
    }

    if (!Object.values(PropertyStatus).includes(status)) {
      throw new BadRequestError(`Invalid status. Must be one of: ${Object.values(PropertyStatus).join(', ')}`);
    }

    try {
      const property = await propertyService.updatePropertyStatus(
        id,
        req.user.userId,
        req.user.role,
        status
      );

      sendSuccess(res, {
        data: sanitizeData(property),
        message: 'Property status updated',
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        throw new NotFoundError('Property not found', ErrorCodes.PROPERTY_NOT_FOUND);
      }
      if (error.message.includes('permission')) {
        throw new ForbiddenError('You do not have permission to update this property', ErrorCodes.PROPERTY_ACCESS_DENIED);
      }
      throw error;
    }
  });

  /**
   * DELETE /properties/:id
   * Delete property
   */
  deleteProperty = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const { id } = req.params;

    if (!isValidUUID(id)) {
      throw new BadRequestError('Invalid property ID format');
    }

    try {
      await propertyService.deleteProperty(id, req.user.userId, req.user.role);
      sendSuccess(res, { message: 'Property deleted successfully' });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        throw new NotFoundError('Property not found', ErrorCodes.PROPERTY_NOT_FOUND);
      }
      if (error.message.includes('permission')) {
        throw new ForbiddenError('You do not have permission to delete this property', ErrorCodes.PROPERTY_ACCESS_DENIED);
      }
      throw error;
    }
  });

  /**
   * POST /properties/:id/bookmark
   * Bookmark a property
   */
  bookmarkProperty = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const { id } = req.params;

    if (!isValidUUID(id)) {
      throw new BadRequestError('Invalid property ID format');
    }

    try {
      await propertyService.bookmarkProperty(req.user.userId, id);
      sendSuccess(res, { message: 'Property bookmarked' });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        throw new NotFoundError('Property not found', ErrorCodes.PROPERTY_NOT_FOUND);
      }
      throw error;
    }
  });

  /**
   * DELETE /properties/:id/bookmark
   * Remove bookmark
   */
  removeBookmark = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const { id } = req.params;

    if (!isValidUUID(id)) {
      throw new BadRequestError('Invalid property ID format');
    }

    await propertyService.removeBookmark(req.user.userId, id);
    sendSuccess(res, { message: 'Bookmark removed' });
  });

  /**
   * GET /properties/bookmarks
   * Get user's bookmarked properties
   */
  getBookmarkedProperties = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const properties = await propertyService.getBookmarkedProperties(req.user.userId);
    sendSuccess(res, { data: properties.map(formatPropertyResponse) });
  });

  /**
   * GET /properties/owner/stats
   * Get owner dashboard stats
   */
  getOwnerStats = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const stats = await propertyService.getOwnerStats(req.user.userId);
    sendSuccess(res, { data: stats });
  });
}

export const propertyController = new PropertyController();
