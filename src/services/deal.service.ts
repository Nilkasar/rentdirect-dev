import prisma from '../lib/prisma';
import { calculateSuccessFee } from '../config';
import { DealStatus, PropertyStatus } from '@prisma/client';
import { emailService } from './email.service';

export class DealService {
  /**
   * Initialize or get existing deal for a conversation
   */
  async getOrCreateDeal(conversationId: string, userId: string, agreedRent: number) {
    // Verify user is part of conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ ownerId: userId }, { tenantId: userId }],
      },
      include: {
        property: true,
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Check if deal already exists
    let deal = await prisma.deal.findUnique({
      where: { conversationId },
    });

    if (!deal) {
      // Create new deal
      deal = await prisma.deal.create({
        data: {
          conversationId,
          propertyId: conversation.propertyId,
          ownerId: conversation.ownerId,
          tenantId: conversation.tenantId,
          agreedRent: agreedRent || conversation.property.rentAmount,
          status: DealStatus.PENDING_BOTH,
        },
      });
    }

    return deal;
  }

  /**
   * Owner confirms the deal
   */
  async ownerConfirmDeal(conversationId: string, ownerId: string, agreedRent?: number) {
    // Verify this is the owner
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        ownerId,
      },
      include: {
        property: true,
        deal: true,
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or you are not the owner');
    }

    const rentAmount = agreedRent || conversation.property.rentAmount;
    const isNewDeal = !conversation.deal;

    // Create or update deal
    let deal = conversation.deal;

    if (!deal) {
      deal = await prisma.deal.create({
        data: {
          conversationId,
          propertyId: conversation.propertyId,
          ownerId: conversation.ownerId,
          tenantId: conversation.tenantId,
          agreedRent: rentAmount,
          ownerConfirmed: true,
          ownerConfirmedAt: new Date(),
          status: DealStatus.PENDING_TENANT,
        },
      });
    } else {
      deal = await prisma.deal.update({
        where: { id: deal.id },
        data: {
          ownerConfirmed: true,
          ownerConfirmedAt: new Date(),
          agreedRent: rentAmount,
          status: deal.tenantConfirmed ? DealStatus.COMPLETED : DealStatus.PENDING_TENANT,
        },
      });
    }

    // Send deal created email to tenant (async, don't wait)
    if (isNewDeal && conversation.tenant && conversation.owner) {
      emailService.sendDealCreatedEmail(
        conversation.tenant.email,
        conversation.tenant.firstName,
        conversation.property.title,
        rentAmount,
        `${conversation.owner.firstName} ${conversation.owner.lastName}`,
        'tenant',
        conversation.tenant.id
      ).catch(err => console.error('Failed to send deal created email to tenant:', err));
    }

    // If both confirmed, complete the deal
    if (deal.ownerConfirmed && deal.tenantConfirmed) {
      await this.completeDeal(deal.id);
    }

    return this.getDealWithDetails(deal.id);
  }

  /**
   * Tenant confirms the deal
   */
  async tenantConfirmDeal(conversationId: string, tenantId: string) {
    // Verify this is the tenant
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
      include: {
        property: true,
        deal: true,
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or you are not the tenant');
    }

    const isNewDeal = !conversation.deal;
    let deal = conversation.deal;

    if (!deal) {
      // Create deal with tenant confirmation
      deal = await prisma.deal.create({
        data: {
          conversationId,
          propertyId: conversation.propertyId,
          ownerId: conversation.ownerId,
          tenantId: conversation.tenantId,
          agreedRent: conversation.property.rentAmount,
          tenantConfirmed: true,
          tenantConfirmedAt: new Date(),
          status: DealStatus.PENDING_OWNER,
        },
      });
    } else {
      deal = await prisma.deal.update({
        where: { id: deal.id },
        data: {
          tenantConfirmed: true,
          tenantConfirmedAt: new Date(),
          status: deal.ownerConfirmed ? DealStatus.COMPLETED : DealStatus.PENDING_OWNER,
        },
      });
    }

    // Send deal created email to owner (async, don't wait)
    if (isNewDeal && conversation.owner && conversation.tenant) {
      emailService.sendDealCreatedEmail(
        conversation.owner.email,
        conversation.owner.firstName,
        conversation.property.title,
        conversation.property.rentAmount,
        `${conversation.tenant.firstName} ${conversation.tenant.lastName}`,
        'owner',
        conversation.owner.id
      ).catch(err => console.error('Failed to send deal created email to owner:', err));
    }

    // If both confirmed, complete the deal
    if (deal.ownerConfirmed && deal.tenantConfirmed) {
      await this.completeDeal(deal.id);
    }

    return this.getDealWithDetails(deal.id);
  }

  /**
   * Complete the deal and calculate success fee
   */
  private async completeDeal(dealId: string) {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        property: true,
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!deal) {
      throw new Error('Deal not found');
    }

    const successFee = calculateSuccessFee(deal.agreedRent);

    // Update deal with completion data
    await prisma.deal.update({
      where: { id: dealId },
      data: {
        status: DealStatus.COMPLETED,
        completedAt: new Date(),
        successFeeAmount: successFee,
      },
    });

    // Mark property as rented
    await prisma.property.update({
      where: { id: deal.propertyId },
      data: { status: PropertyStatus.RENTED },
    });

    // Send deal completed emails to both parties (async, don't wait)
    if (deal.owner) {
      emailService.sendDealCompletedEmail(
        deal.owner.email,
        deal.owner.firstName,
        deal.property.title,
        deal.agreedRent,
        'owner',
        deal.owner.id
      ).catch(err => console.error('Failed to send deal completed email to owner:', err));
    }

    if (deal.tenant) {
      emailService.sendDealCompletedEmail(
        deal.tenant.email,
        deal.tenant.firstName,
        deal.property.title,
        deal.agreedRent,
        'tenant',
        deal.tenant.id
      ).catch(err => console.error('Failed to send deal completed email to tenant:', err));
    }

    return deal;
  }

  /**
   * Get deal with full details
   */
  async getDealWithDetails(dealId: string) {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            locality: true,
            rentAmount: true,
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
    });

    return deal;
  }

  /**
   * Get deals for a user (owner or tenant)
   */
  async getUserDeals(userId: string, role: string) {
    const whereClause = role === 'OWNER' ? { ownerId: userId } : { tenantId: userId };

    const deals = await prisma.deal.findMany({
      where: whereClause,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            locality: true,
            images: true,
          },
        },
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return deals;
  }

  /**
   * Get deal by conversation ID
   */
  async getDealByConversation(conversationId: string, userId: string) {
    const deal = await prisma.deal.findFirst({
      where: {
        conversationId,
        OR: [{ ownerId: userId }, { tenantId: userId }],
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            rentAmount: true,
          },
        },
      },
    });

    return deal;
  }

  /**
   * Cancel a deal (before completion)
   */
  async cancelDeal(dealId: string, userId: string) {
    const deal = await prisma.deal.findFirst({
      where: {
        id: dealId,
        OR: [{ ownerId: userId }, { tenantId: userId }],
        status: { not: DealStatus.COMPLETED },
      },
    });

    if (!deal) {
      throw new Error('Deal not found or cannot be cancelled');
    }

    await prisma.deal.update({
      where: { id: dealId },
      data: { status: DealStatus.CANCELLED },
    });

    return { message: 'Deal cancelled' };
  }
}

export const dealService = new DealService();
