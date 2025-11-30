import { Response, NextFunction } from 'express';
import { dealService } from '../services/deal.service';
import { AuthRequest } from '../types';
import { asyncAuthHandler } from '../utils/asyncHandler';
import { sendSuccess, sanitizeData } from '../utils/response';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  ErrorCodes,
} from '../utils/errors';
import { isValidUUID, isValidRentAmount } from '../utils/validators';

export class DealController {
  /**
   * POST /deals/:conversationId/owner-confirm
   * Owner confirms a deal
   */
  ownerConfirm = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    if (req.user.role !== 'OWNER') {
      throw new ForbiddenError('Only owners can confirm deals');
    }

    const { conversationId } = req.params;
    const { agreedRent } = req.body;

    if (!isValidUUID(conversationId)) {
      throw new BadRequestError('Invalid conversation ID format');
    }

    if (agreedRent !== undefined) {
      if (typeof agreedRent !== 'number' || !isValidRentAmount(agreedRent)) {
        throw new BadRequestError('Invalid agreed rent amount');
      }
    }

    try {
      const deal = await dealService.ownerConfirmDeal(
        conversationId,
        req.user.userId,
        agreedRent
      );

      sendSuccess(res, {
        data: sanitizeData(deal),
        message: deal?.status === 'COMPLETED'
          ? 'Deal completed! Both parties have confirmed.'
          : 'Deal confirmed. Waiting for tenant confirmation.',
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        throw new NotFoundError('Conversation not found', ErrorCodes.CONVERSATION_NOT_FOUND);
      }
      if (error.message.includes('permission') || error.message.includes('access')) {
        throw new ForbiddenError('You do not have permission to confirm this deal', ErrorCodes.DEAL_ACCESS_DENIED);
      }
      throw new BadRequestError(error.message);
    }
  });

  /**
   * POST /deals/:conversationId/tenant-confirm
   * Tenant confirms a deal
   */
  tenantConfirm = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    if (req.user.role !== 'TENANT') {
      throw new ForbiddenError('Only tenants can confirm deals');
    }

    const { conversationId } = req.params;

    if (!isValidUUID(conversationId)) {
      throw new BadRequestError('Invalid conversation ID format');
    }

    try {
      const deal = await dealService.tenantConfirmDeal(
        conversationId,
        req.user.userId
      );

      sendSuccess(res, {
        data: sanitizeData(deal),
        message: deal?.status === 'COMPLETED'
          ? 'Deal completed! Both parties have confirmed.'
          : 'Deal confirmed. Waiting for owner confirmation.',
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        throw new NotFoundError('Conversation not found', ErrorCodes.CONVERSATION_NOT_FOUND);
      }
      if (error.message.includes('permission') || error.message.includes('access')) {
        throw new ForbiddenError('You do not have permission to confirm this deal', ErrorCodes.DEAL_ACCESS_DENIED);
      }
      throw new BadRequestError(error.message);
    }
  });

  /**
   * GET /deals
   * Get all deals for current user
   */
  getDeals = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const deals = await dealService.getUserDeals(req.user.userId, req.user.role);
    sendSuccess(res, { data: sanitizeData(deals) });
  });

  /**
   * GET /deals/conversation/:conversationId
   * Get deal for a specific conversation
   */
  getDealByConversation = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const { conversationId } = req.params;

    if (!isValidUUID(conversationId)) {
      throw new BadRequestError('Invalid conversation ID format');
    }

    try {
      const deal = await dealService.getDealByConversation(conversationId, req.user.userId);
      sendSuccess(res, { data: deal ? sanitizeData(deal) : null });
    } catch (error: any) {
      if (error.message.includes('access')) {
        throw new ForbiddenError('You do not have access to this deal', ErrorCodes.DEAL_ACCESS_DENIED);
      }
      throw error;
    }
  });

  /**
   * POST /deals/:id/cancel
   * Cancel a pending deal
   */
  cancelDeal = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const { id } = req.params;

    if (!isValidUUID(id)) {
      throw new BadRequestError('Invalid deal ID format');
    }

    try {
      await dealService.cancelDeal(id, req.user.userId);
      sendSuccess(res, { message: 'Deal cancelled' });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        throw new NotFoundError('Deal not found', ErrorCodes.DEAL_NOT_FOUND);
      }
      if (error.message.includes('permission') || error.message.includes('access')) {
        throw new ForbiddenError('You do not have permission to cancel this deal', ErrorCodes.DEAL_ACCESS_DENIED);
      }
      if (error.message.includes('status') || error.message.includes('completed')) {
        throw new BadRequestError('Cannot cancel a completed deal', ErrorCodes.INVALID_DEAL_STATUS);
      }
      throw error;
    }
  });
}

export const dealController = new DealController();
