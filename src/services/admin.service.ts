import prisma from '../lib/prisma';
import { UserStatus, PropertyStatus, DealStatus, ReportStatus } from '@prisma/client';

export class AdminService {
  /**
   * Get platform overview stats
   */
  async getOverview() {
    const [
      totalUsers,
      totalOwners,
      totalTenants,
      totalProperties,
      activeProperties,
      rentedProperties,
      totalDeals,
      completedDeals,
      pendingReports,
      revenueData,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'OWNER' } }),
      prisma.user.count({ where: { role: 'TENANT' } }),
      prisma.property.count(),
      prisma.property.count({ where: { status: PropertyStatus.ACTIVE } }),
      prisma.property.count({ where: { status: PropertyStatus.RENTED } }),
      prisma.deal.count(),
      prisma.deal.count({ where: { status: DealStatus.COMPLETED } }),
      prisma.report.count({ where: { status: ReportStatus.PENDING } }),
      prisma.deal.aggregate({
        where: { status: DealStatus.COMPLETED },
        _sum: { successFeeAmount: true },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        owners: totalOwners,
        tenants: totalTenants,
      },
      properties: {
        total: totalProperties,
        active: activeProperties,
        rented: rentedProperties,
      },
      deals: {
        total: totalDeals,
        completed: completedDeals,
      },
      revenue: {
        totalPotential: revenueData._sum.successFeeAmount || 0,
      },
      pendingReports,
    };
  }

  /**
   * Get all users with pagination
   */
  async getUsers(page = 1, limit = 20, role?: string, status?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          kycVerified: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              properties: true,
              dealsAsOwner: true,
              dealsAsTenant: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update user status (suspend/activate)
   */
  async updateUserStatus(userId: string, status: UserStatus) {
    // Prevent modifying super admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === 'SUPER_ADMIN') {
      throw new Error('Cannot modify super admin status');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    return updated;
  }

  /**
   * Get all properties with pagination (admin view)
   */
  async getProperties(page = 1, limit = 20, status?: string, city?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (city) where.city = { contains: city, mode: 'insensitive' };

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              conversations: true,
              deals: true,
            },
          },
        },
      }),
      prisma.property.count({ where }),
    ]);

    return {
      items: properties,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update property status (admin)
   */
  async updatePropertyStatus(propertyId: string, status: PropertyStatus, adminId: string) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new Error('Property not found');
    }

    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: {
        status,
        approvedAt: status === PropertyStatus.ACTIVE ? new Date() : property.approvedAt,
        approvedBy: status === PropertyStatus.ACTIVE ? adminId : property.approvedBy,
      },
    });

    return updated;
  }

  /**
   * Get all deals with pagination
   */
  async getDeals(page = 1, limit = 20, status?: string, city?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (city) where.property = { city: { contains: city, mode: 'insensitive' } };

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              city: true,
              locality: true,
            },
          },
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          tenant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.deal.count({ where }),
    ]);

    return {
      items: deals,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all reports
   */
  async getReports(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          submittedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          reportedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          property: {
            select: {
              id: true,
              title: true,
            },
          },
          conversation: {
            select: {
              id: true,
            },
          },
        },
      }),
      prisma.report.count({ where }),
    ]);

    return {
      items: reports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update report status
   */
  async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    adminId: string,
    adminNotes?: string
  ) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        adminNotes,
        resolvedAt: status !== ReportStatus.PENDING ? new Date() : null,
        resolvedBy: status !== ReportStatus.PENDING ? adminId : null,
      },
    });

    return updated;
  }

  /**
   * Get flagged conversations (for moderation)
   */
  async getFlaggedConversations(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: { isFlagged: true },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          tenant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          property: {
            select: {
              id: true,
              title: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      prisma.conversation.count({ where: { isFlagged: true } }),
    ]);

    return {
      items: conversations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get cities list
   */
  async getCities() {
    const cities = await prisma.city.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return cities;
  }

  /**
   * Add a new city
   */
  async addCity(name: string, state: string) {
    const city = await prisma.city.create({
      data: { name, state },
    });
    return city;
  }

  /**
   * Toggle city status
   */
  async toggleCityStatus(cityId: string) {
    const city = await prisma.city.findUnique({
      where: { id: cityId },
    });

    if (!city) {
      throw new Error('City not found');
    }

    const updated = await prisma.city.update({
      where: { id: cityId },
      data: { isActive: !city.isActive },
    });

    return updated;
  }
}

export const adminService = new AdminService();
