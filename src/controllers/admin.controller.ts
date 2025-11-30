import { Response } from 'express';
import { adminService } from '../services/admin.service';
import { AuthRequest, ApiResponse } from '../types';
import { UserStatus, PropertyStatus, ReportStatus } from '@prisma/client';

export class AdminController {
  /**
   * GET /admin/overview
   * Get platform overview statistics
   */
  async getOverview(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const overview = await adminService.getOverview();

      res.json({
        success: true,
        data: overview,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to fetch overview',
      });
    }
  }

  /**
   * GET /admin/users
   * Get all users with pagination
   */
  async getUsers(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const { page = '1', limit = '20', role, status } = req.query;

      const users = await adminService.getUsers(
        parseInt(page as string, 10),
        parseInt(limit as string, 10),
        role as string,
        status as string
      );

      res.json({
        success: true,
        data: users,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to fetch users',
      });
    }
  }

  /**
   * PATCH /admin/users/:id/status
   * Update user status
   */
  async updateUserStatus(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!Object.values(UserStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
        });
      }

      const user = await adminService.updateUserStatus(id, status);

      res.json({
        success: true,
        message: `User ${status === UserStatus.SUSPENDED ? 'suspended' : 'activated'}`,
        data: user,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update user status',
      });
    }
  }

  /**
   * GET /admin/properties
   * Get all properties with pagination
   */
  async getProperties(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const { page = '1', limit = '20', status, city } = req.query;

      const properties = await adminService.getProperties(
        parseInt(page as string, 10),
        parseInt(limit as string, 10),
        status as string,
        city as string
      );

      res.json({
        success: true,
        data: properties,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to fetch properties',
      });
    }
  }

  /**
   * PATCH /admin/properties/:id/status
   * Update property status
   */
  async updatePropertyStatus(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
      }

      const { id } = req.params;
      const { status } = req.body;

      if (!Object.values(PropertyStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
        });
      }

      const property = await adminService.updatePropertyStatus(
        id,
        status,
        req.user.userId
      );

      res.json({
        success: true,
        message: 'Property status updated',
        data: property,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update property status',
      });
    }
  }

  /**
   * GET /admin/deals
   * Get all deals with pagination
   */
  async getDeals(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const { page = '1', limit = '20', status, city } = req.query;

      const deals = await adminService.getDeals(
        parseInt(page as string, 10),
        parseInt(limit as string, 10),
        status as string,
        city as string
      );

      res.json({
        success: true,
        data: deals,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to fetch deals',
      });
    }
  }

  /**
   * GET /admin/reports
   * Get all reports
   */
  async getReports(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const { page = '1', limit = '20', status } = req.query;

      const reports = await adminService.getReports(
        parseInt(page as string, 10),
        parseInt(limit as string, 10),
        status as string
      );

      res.json({
        success: true,
        data: reports,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to fetch reports',
      });
    }
  }

  /**
   * PATCH /admin/reports/:id/status
   * Update report status
   */
  async updateReportStatus(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
      }

      const { id } = req.params;
      const { status, adminNotes } = req.body;

      if (!Object.values(ReportStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
        });
      }

      const report = await adminService.updateReportStatus(
        id,
        status,
        req.user.userId,
        adminNotes
      );

      res.json({
        success: true,
        message: 'Report status updated',
        data: report,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update report status',
      });
    }
  }

  /**
   * GET /admin/flagged-conversations
   * Get flagged conversations for moderation
   */
  async getFlaggedConversations(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const { page = '1', limit = '20' } = req.query;

      const conversations = await adminService.getFlaggedConversations(
        parseInt(page as string, 10),
        parseInt(limit as string, 10)
      );

      res.json({
        success: true,
        data: conversations,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to fetch flagged conversations',
      });
    }
  }

  /**
   * GET /admin/cities
   * Get cities list
   */
  async getCities(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const cities = await adminService.getCities();

      res.json({
        success: true,
        data: cities,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to fetch cities',
      });
    }
  }

  /**
   * POST /admin/cities
   * Add a new city
   */
  async addCity(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const { name, state } = req.body;

      if (!name || !state) {
        return res.status(400).json({
          success: false,
          error: 'City name and state are required',
        });
      }

      const city = await adminService.addCity(name, state);

      res.status(201).json({
        success: true,
        message: 'City added',
        data: city,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to add city',
      });
    }
  }

  /**
   * PATCH /admin/cities/:id/toggle
   * Toggle city active status
   */
  async toggleCityStatus(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const city = await adminService.toggleCityStatus(id);

      res.json({
        success: true,
        message: `City ${city.isActive ? 'activated' : 'deactivated'}`,
        data: city,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to toggle city status',
      });
    }
  }
}

export const adminController = new AdminController();
