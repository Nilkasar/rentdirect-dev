import prisma from '../lib/prisma';
import { CreatePropertyDto, PropertyFilters, PaginationParams } from '../types';
import { PropertyStatus, Prisma } from '@prisma/client';

export class PropertyService {
  /**
   * Create a new property listing
   */
  async createProperty(ownerId: string, data: CreatePropertyDto) {
    const property = await prisma.property.create({
      data: {
        ownerId,
        title: data.title,
        description: data.description,
        city: data.city,
        locality: data.locality,
        address: data.address,
        pincode: data.pincode,
        propertyType: data.propertyType as any,
        roomConfig: data.roomConfig as any,
        furnishing: data.furnishing as any,
        rentAmount: data.rentAmount,
        depositAmount: data.depositAmount,
        maintenanceAmount: data.maintenanceAmount,
        tenantPreference: data.tenantPreference as any[],
        amenities: data.amenities,
        images: data.images,
        squareFeet: data.squareFeet,
        bathrooms: data.bathrooms,
        balconies: data.balconies,
        floorNumber: data.floorNumber,
        totalFloors: data.totalFloors,
        ageOfProperty: data.ageOfProperty,
        facingDirection: data.facingDirection,
        availableFrom: data.availableFrom,
        status: PropertyStatus.DRAFT,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return property;
  }

  /**
   * Get properties with filters and pagination (public)
   */
  async getProperties(
    filters: PropertyFilters,
    pagination: PaginationParams,
    includeOwnerDetails = false
  ) {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.PropertyWhereInput = {
      status: PropertyStatus.ACTIVE, // Only show active listings publicly
    };

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters.locality) {
      where.locality = { contains: filters.locality, mode: 'insensitive' };
    }

    if (filters.minRent || filters.maxRent) {
      where.rentAmount = {};
      if (filters.minRent) where.rentAmount.gte = filters.minRent;
      if (filters.maxRent) where.rentAmount.lte = filters.maxRent;
    }

    if (filters.propertyType) {
      where.propertyType = filters.propertyType as any;
    }

    if (filters.roomConfig) {
      where.roomConfig = filters.roomConfig as any;
    }

    if (filters.furnishing) {
      where.furnishing = filters.furnishing as any;
    }

    if (filters.tenantPreference) {
      where.tenantPreference = { has: filters.tenantPreference as any };
    }

    // Get total count
    const total = await prisma.property.count({ where });

    // Get properties
    const properties = await prisma.property.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        owner: includeOwnerDetails
          ? {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            }
          : false,
      },
    });

    return {
      items: properties,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single property by ID
   */
  async getPropertyById(propertyId: string, incrementView = false) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            createdAt: true,
          },
        },
      },
    });

    if (!property) {
      throw new Error('Property not found');
    }

    // Increment view count if requested
    if (incrementView && property.status === PropertyStatus.ACTIVE) {
      await prisma.property.update({
        where: { id: propertyId },
        data: { viewCount: { increment: 1 } },
      });
    }

    return property;
  }

  /**
   * Get properties by owner
   */
  async getPropertiesByOwner(ownerId: string) {
    const properties = await prisma.property.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            conversations: true,
            deals: true,
          },
        },
      },
    });

    return properties;
  }

  /**
   * Update property
   */
  async updateProperty(propertyId: string, ownerId: string, data: Partial<CreatePropertyDto>) {
    // Verify ownership
    const property = await prisma.property.findFirst({
      where: { id: propertyId, ownerId },
    });

    if (!property) {
      throw new Error('Property not found or you do not have permission to edit');
    }

    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: {
        ...data,
        propertyType: data.propertyType as any,
        roomConfig: data.roomConfig as any,
        furnishing: data.furnishing as any,
        tenantPreference: data.tenantPreference as any[],
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Update property status
   */
  async updatePropertyStatus(
    propertyId: string,
    userId: string,
    userRole: string,
    status: PropertyStatus
  ) {
    // Check permission
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new Error('Property not found');
    }

    // Owner can change their own property, admin can change any
    if (userRole !== 'SUPER_ADMIN' && property.ownerId !== userId) {
      throw new Error('You do not have permission to update this property');
    }

    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: { status },
    });

    return updated;
  }

  /**
   * Delete property (soft delete by setting to SUSPENDED, or hard delete)
   */
  async deleteProperty(propertyId: string, userId: string, userRole: string) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new Error('Property not found');
    }

    // Owner can delete their own property, admin can delete any
    if (userRole !== 'SUPER_ADMIN' && property.ownerId !== userId) {
      throw new Error('You do not have permission to delete this property');
    }

    // Soft delete by setting status to SUSPENDED
    await prisma.property.update({
      where: { id: propertyId },
      data: { status: PropertyStatus.SUSPENDED },
    });

    return { message: 'Property deleted successfully' };
  }

  /**
   * Bookmark a property (for tenants)
   */
  async bookmarkProperty(userId: string, propertyId: string) {
    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new Error('Property not found');
    }

    // Create bookmark (upsert to handle duplicates)
    const bookmark = await prisma.bookmark.upsert({
      where: {
        userId_propertyId: { userId, propertyId },
      },
      update: {},
      create: { userId, propertyId },
    });

    return bookmark;
  }

  /**
   * Remove bookmark
   */
  async removeBookmark(userId: string, propertyId: string) {
    await prisma.bookmark.deleteMany({
      where: { userId, propertyId },
    });

    return { message: 'Bookmark removed' };
  }

  /**
   * Get user's bookmarked properties
   */
  async getBookmarkedProperties(userId: string) {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      include: {
        property: {
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookmarks.map((b) => b.property);
  }

  /**
   * Get owner dashboard stats
   */
  async getOwnerStats(ownerId: string) {
    const properties = await prisma.property.findMany({
      where: { ownerId },
      select: {
        id: true,
        status: true,
        viewCount: true,
        _count: {
          select: {
            conversations: true,
            deals: { where: { status: 'COMPLETED' } },
          },
        },
      },
    });

    const stats = {
      totalProperties: properties.length,
      activeProperties: properties.filter((p) => p.status === 'ACTIVE').length,
      rentedProperties: properties.filter((p) => p.status === 'RENTED').length,
      draftProperties: properties.filter((p) => p.status === 'DRAFT').length,
      totalViews: properties.reduce((sum, p) => sum + p.viewCount, 0),
      totalChats: properties.reduce((sum, p) => sum + p._count.conversations, 0),
      totalDeals: properties.reduce((sum, p) => sum + p._count.deals, 0),
    };

    return stats;
  }
}

export const propertyService = new PropertyService();
