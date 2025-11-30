import { Response, NextFunction } from 'express';
import { chatService } from '../services/chat.service';
import { AuthRequest } from '../types';
import { asyncAuthHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated, sanitizeData } from '../utils/response';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  ErrorCodes,
} from '../utils/errors';
import { isValidUUID, parsePaginationParams } from '../utils/validators';

export class ChatController {
  /**
   * POST /conversations
   * Start a new conversation or get existing one
   */
  startConversation = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const { propertyId } = req.body;

    if (!propertyId) {
      throw new BadRequestError('Property ID is required');
    }

    if (!isValidUUID(propertyId)) {
      throw new BadRequestError('Invalid property ID format');
    }

    try {
      const conversation = await chatService.getOrCreateConversation(
        req.user.userId,
        propertyId
      );

      sendSuccess(res, { data: sanitizeData(conversation) });
    } catch (error: any) {
      if (error.message.includes('cannot start')) {
        throw new ForbiddenError(error.message);
      }
      throw error;
    }
  });

  /**
   * GET /conversations
   * Get all conversations for current user
   */
  getConversations = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const conversations = await chatService.getUserConversations(
      req.user.userId,
      req.user.role
    );

    sendSuccess(res, { data: sanitizeData(conversations) });
  });

  /**
   * GET /conversations/:id
   * Get conversation by ID
   */
  getConversation = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const { id } = req.params;

    if (!isValidUUID(id)) {
      throw new BadRequestError('Invalid conversation ID format');
    }

    try {
      const conversation = await chatService.getConversationById(id, req.user.userId);
      sendSuccess(res, { data: sanitizeData(conversation) });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('access')) {
        throw new NotFoundError('Conversation not found or access denied', ErrorCodes.CONVERSATION_NOT_FOUND);
      }
      throw error;
    }
  });

  /**
   * GET /conversations/:id/messages
   * Get messages for a conversation
   */
  getMessages = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const { id } = req.params;

    if (!isValidUUID(id)) {
      throw new BadRequestError('Invalid conversation ID format');
    }

    const { page, limit } = parsePaginationParams(req.query);

    try {
      const messages = await chatService.getMessages(
        id,
        req.user.userId,
        page,
        Math.min(limit, 100) // Cap at 100 messages per request
      );

      sendSuccess(res, { data: sanitizeData(messages) });
    } catch (error: any) {
      if (error.message.includes('access')) {
        throw new ForbiddenError('You do not have access to this conversation', ErrorCodes.CONVERSATION_ACCESS_DENIED);
      }
      throw error;
    }
  });

  /**
   * POST /conversations/:id/messages
   * Send a message
   */
  sendMessage = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const { id } = req.params;
    const { content } = req.body;

    if (!isValidUUID(id)) {
      throw new BadRequestError('Invalid conversation ID format');
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new BadRequestError('Message content is required');
    }

    // Limit message length
    const trimmedContent = content.trim().slice(0, 2000);

    try {
      const message = await chatService.sendMessage(id, req.user.userId, trimmedContent);
      sendCreated(res, sanitizeData(message));
    } catch (error: any) {
      if (error.message.includes('access')) {
        throw new ForbiddenError('You do not have access to this conversation', ErrorCodes.CONVERSATION_ACCESS_DENIED);
      }
      throw error;
    }
  });

  /**
   * POST /conversations/:id/read
   * Mark messages as read
   */
  markAsRead = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const { id } = req.params;

    if (!isValidUUID(id)) {
      throw new BadRequestError('Invalid conversation ID format');
    }

    await chatService.markMessagesAsRead(id, req.user.userId);
    sendSuccess(res, { message: 'Messages marked as read' });
  });

  /**
   * POST /conversations/:id/reveal-phone
   * Reveal phone number (owner only)
   */
  revealPhone = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    if (req.user.role !== 'OWNER') {
      throw new ForbiddenError('Only owners can reveal phone number');
    }

    const { id } = req.params;

    if (!isValidUUID(id)) {
      throw new BadRequestError('Invalid conversation ID format');
    }

    try {
      await chatService.revealPhone(id, req.user.userId);
      sendSuccess(res, { message: 'Phone number revealed' });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('access')) {
        throw new ForbiddenError('Conversation not found or access denied', ErrorCodes.CONVERSATION_ACCESS_DENIED);
      }
      throw error;
    }
  });

  /**
   * POST /conversations/:id/flag
   * Flag a conversation for review
   */
  flagConversation = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!isValidUUID(id)) {
      throw new BadRequestError('Invalid conversation ID format');
    }

    const flagReason = (typeof reason === 'string' && reason.trim())
      ? reason.trim().slice(0, 500)
      : 'No reason provided';

    await chatService.flagConversation(id, req.user.userId, flagReason);
    sendSuccess(res, { message: 'Conversation flagged for review' });
  });

  /**
   * GET /conversations/unread-count
   * Get unread message count
   */
  getUnreadCount = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const count = await chatService.getUnreadCount(req.user.userId, req.user.role);
    sendSuccess(res, { data: { unreadCount: count } });
  });
}

export const chatController = new ChatController();
