import prisma from '../lib/prisma';
import { ReportType, ReportStatus } from '@prisma/client';

export class ReportService {
  /**
   * Create a new report
   */
  async createReport(
    submittedById: string,
    type: ReportType,
    description: string,
    options: {
      reportedUserId?: string;
      propertyId?: string;
      conversationId?: string;
    }
  ) {
    // Validate that at least one target is specified
    if (!options.reportedUserId && !options.propertyId && !options.conversationId) {
      throw new Error('Report must target a user, property, or conversation');
    }

    const report = await prisma.report.create({
      data: {
        submittedById,
        type,
        description,
        reportedUserId: options.reportedUserId,
        propertyId: options.propertyId,
        conversationId: options.conversationId,
        status: ReportStatus.PENDING,
      },
      include: {
        submittedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // If reporting a conversation, also flag it
    if (options.conversationId) {
      await prisma.conversation.update({
        where: { id: options.conversationId },
        data: { isFlagged: true, flagReason: description },
      });
    }

    return report;
  }

  /**
   * Get reports submitted by a user
   */
  async getUserReports(userId: string) {
    const reports = await prisma.report.findMany({
      where: { submittedById: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        property: {
          select: { id: true, title: true },
        },
        reportedUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return reports;
  }
}

export const reportService = new ReportService();
