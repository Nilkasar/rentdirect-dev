import prisma from '../lib/prisma';
import { MessageStatus } from '@prisma/client';
import { emailService } from './email.service';

export class ChatService {
  /**
   * Start a new conversation or get existing one
   */
  async getOrCreateConversation(tenantId: string, propertyId: string) {
    // Get property to find owner
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, ownerId: true, title: true },
    });

    if (!property) {
      throw new Error('Property not found');
    }

    // Can't message your own property
    if (property.ownerId === tenantId) {
      throw new Error('You cannot message yourself');
    }

    // Find existing conversation or create new
    let conversation = await prisma.conversation.findUnique({
      where: {
        ownerId_tenantId_propertyId: {
          ownerId: property.ownerId,
          tenantId,
          propertyId,
        },
      },
      include: {
        property: {
          select: { id: true, title: true, images: true },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true, profileImage: true },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true, profileImage: true },
        },
      },
    });

    if (!conversation) {
      // Get tenant info for email
      const tenant = await prisma.user.findUnique({
        where: { id: tenantId },
        select: { firstName: true, lastName: true },
      });

      // Get owner info for email
      const owner = await prisma.user.findUnique({
        where: { id: property.ownerId },
        select: { firstName: true, lastName: true, email: true },
      });

      conversation = await prisma.conversation.create({
        data: {
          ownerId: property.ownerId,
          tenantId,
          propertyId,
        },
        include: {
          property: {
            select: { id: true, title: true, images: true },
          },
          owner: {
            select: { id: true, firstName: true, lastName: true, profileImage: true },
          },
          tenant: {
            select: { id: true, firstName: true, lastName: true, profileImage: true },
          },
        },
      });

      // Send new inquiry email to owner (async, don't wait)
      if (owner && tenant) {
        emailService.sendNewInquiryEmail(
          owner.email,
          owner.firstName,
          `${tenant.firstName} ${tenant.lastName}`,
          property.title,
          propertyId,
          property.ownerId
        ).catch(err => console.error('Failed to send inquiry email:', err));
      }
    }

    return conversation;
  }

  /**
   * Get conversation by ID with permission check
   */
  async getConversationById(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ ownerId: userId }, { tenantId: userId }],
      },
      include: {
        property: {
          select: { id: true, title: true, images: true, rentAmount: true },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true, profileImage: true, phone: true },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true, profileImage: true },
        },
        deal: {
          select: {
            id: true,
            status: true,
            ownerConfirmed: true,
            tenantConfirmed: true,
            agreedRent: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Hide phone if not revealed
    if (!conversation.phoneRevealed && conversation.owner.phone) {
      conversation.owner.phone = null;
    }

    return conversation;
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string, role: string) {
    const whereClause = role === 'OWNER' ? { ownerId: userId } : { tenantId: userId };

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      include: {
        property: {
          select: { id: true, title: true, images: true },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true, profileImage: true },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true, profileImage: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        deal: {
          select: { status: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return conversations;
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(conversationId: string, senderId: string, content: string) {
    // Verify user is part of conversation and get full details for email
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ ownerId: senderId }, { tenantId: senderId }],
      },
      include: {
        property: {
          select: { title: true },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        status: MessageStatus.SENT,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, profileImage: true },
        },
      },
    });

    // Update conversation last message time
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Send email notification to the recipient (async, don't wait)
    const isOwnerSender = senderId === conversation.ownerId;
    const recipient = isOwnerSender ? conversation.tenant : conversation.owner;
    const sender = isOwnerSender ? conversation.owner : conversation.tenant;

    if (recipient && sender) {
      emailService.sendNewMessageEmail(
        recipient.email,
        recipient.firstName,
        `${sender.firstName} ${sender.lastName}`,
        conversation.property.title,
        content,
        conversationId,
        recipient.id
      ).catch(err => console.error('Failed to send message notification email:', err));
    }

    return message;
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    // Verify user is part of conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ ownerId: userId }, { tenantId: userId }],
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, profileImage: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    return {
      items: messages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId: string, userId: string) {
    // Only mark messages from the OTHER user as read
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ ownerId: userId }, { tenantId: userId }],
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Update all unread messages from the other party
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        status: { not: MessageStatus.READ },
      },
      data: {
        status: MessageStatus.READ,
        readAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Reveal phone number (owner action)
   */
  async revealPhone(conversationId: string, ownerId: string) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        ownerId,
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or you are not the owner');
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { phoneRevealed: true },
    });

    return { success: true };
  }

  /**
   * Flag a conversation
   */
  async flagConversation(conversationId: string, userId: string, reason: string) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ ownerId: userId }, { tenantId: userId }],
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { isFlagged: true, flagReason: reason },
    });

    return { success: true };
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(userId: string, role: string) {
    const whereClause = role === 'OWNER'
      ? { conversation: { ownerId: userId } }
      : { conversation: { tenantId: userId } };

    const count = await prisma.message.count({
      where: {
        ...whereClause,
        senderId: { not: userId },
        status: { not: MessageStatus.READ },
      },
    });

    return count;
  }
}

export const chatService = new ChatService();
