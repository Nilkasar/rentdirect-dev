import { Response } from 'express';
import { reportService } from '../services/report.service';
import { AuthRequest, ApiResponse } from '../types';
import { ReportType } from '@prisma/client';

export class ReportController {
  /**
   * POST /reports
   * Create a new report
   */
  async createReport(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
      }

      const { type, description, reportedUserId, propertyId, conversationId } = req.body;

      if (!type || !description) {
        return res.status(400).json({
          success: false,
          error: 'Type and description are required',
        });
      }

      if (!Object.values(ReportType).includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid report type',
        });
      }

      const report = await reportService.createReport(
        req.user.userId,
        type,
        description,
        { reportedUserId, propertyId, conversationId }
      );

      res.status(201).json({
        success: true,
        message: 'Report submitted successfully',
        data: report,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create report',
      });
    }
  }

  /**
   * GET /reports/my
   * Get current user's submitted reports
   */
  async getMyReports(req: AuthRequest, res: Response<ApiResponse>) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
      }

      const reports = await reportService.getUserReports(req.user.userId);

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
}

export const reportController = new ReportController();
