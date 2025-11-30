import crypto from 'crypto';
import Razorpay from 'razorpay';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Initialize Razorpay instance
 */
const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

export interface CreatePaymentOrderDto {
  dealId: string;
  amount: number; // Amount in INR (will be converted to paise)
  description: string;
  payerId: string;
  email: string;
  phone: string;
  userName: string;
}

export interface VerifyPaymentDto {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  dealId: string;
}

export interface PaymentWebhookData {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        method: string;
        contact?: string;
        email?: string;
        vpa?: string;
      };
    };
    order?: {
      entity: {
        id: string;
        amount: number;
        amount_paid: number;
        amount_due: number;
        currency: string;
        receipt: string;
        status: string;
      };
    };
  };
}

class PaymentService {
  /**
   * Create a Razorpay order for payment
   */
  async createPaymentOrder(data: CreatePaymentOrderDto) {
    try {
      const { dealId, amount, description, payerId, email, phone, userName } = data;

      // Verify deal exists and belongs to user
      const deal = await prisma.deal.findUnique({
        where: { id: dealId },
        include: { property: true, tenant: true, owner: true },
      });

      if (!deal) {
        throw new Error('Deal not found');
      }

      if (deal.status !== 'COMPLETED') {
        throw new Error('Deal must be completed before processing payment');
      }

      // Check if payment already exists for this deal
      const existingPayment = await prisma.payment.findUnique({
        where: { dealId },
      });

      if (existingPayment && existingPayment.status === 'COMPLETED') {
        throw new Error('Payment already completed for this deal');
      }

      // Create Razorpay order
      const amountInPaise = Math.round(amount * 100);

      const order: any = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `deal_${dealId}_${Date.now()}`,
        payment_capture: true, // Auto-capture payment
        notes: {
          dealId,
          propertyId: deal.propertyId,
          tenantName: deal.tenant.firstName + ' ' + deal.tenant.lastName,
          ownerName: deal.owner.firstName + ' ' + deal.owner.lastName,
        },
        // description is saved in DB but not passed to Razorpay order payload
      });

      // Create or update payment record in database
      const payment = await prisma.payment.upsert({
        where: { dealId },
        create: {
          dealId,
          payerId,
          amount: amountInPaise,
          description,
          razorpayOrderId: order.id,
          notes: JSON.stringify({
            userName,
            email,
            phone,
          }),
        },
        update: {
          razorpayOrderId: order.id,
          status: 'INITIATED',
        },
      });

      // Log the payment initiation
      await prisma.paymentLog.create({
        data: {
          paymentId: payment.id,
          event: 'PAYMENT_INITIATED',
          status: 'SUCCESS',
          razorpayData: JSON.stringify(order),
        },
      });

      logger.info(`Payment order created for deal ${dealId}: ${order.id}`);

      return {
        orderId: order.id,
        amount: amount,
        amountInPaise,
        currency: order.currency,
        customerId: order.customer_id,
        receipt: order.receipt,
      };
    } catch (error: any) {
      logger.error('Error creating payment order:', error);
      throw error;
    }
  }

  /**
   * Verify payment signature and complete payment
   */
  async verifyPayment(data: VerifyPaymentDto) {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature, dealId } = data;

      // Get payment record
      const payment = await prisma.payment.findUnique({
        where: { dealId },
      });

      if (!payment) {
        throw new Error('Payment record not found');
      }

      if (payment.razorpayOrderId !== razorpayOrderId) {
        throw new Error('Order ID mismatch');
      }

      // Verify signature
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(body)
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        logger.warn(`Invalid signature for payment ${razorpayPaymentId}`);

        await prisma.paymentLog.create({
          data: {
            paymentId: payment.id,
            event: 'SIGNATURE_VERIFICATION_FAILED',
            status: 'FAILED',
            errorMessage: 'Signature verification failed',
          },
        });

        throw new Error('Invalid payment signature');
      }

      // Update payment with Razorpay details
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          razorpayPaymentId,
          razorpaySignature,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Update deal payment status
      await prisma.deal.update({
        where: { id: dealId },
        data: {
          paymentStatus: 'PAID',
          paymentId: razorpayPaymentId,
        },
      });

      // Log successful payment
      await prisma.paymentLog.create({
        data: {
          paymentId: payment.id,
          event: 'PAYMENT_COMPLETED',
          status: 'SUCCESS',
          razorpayData: JSON.stringify({
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId,
          }),
        },
      });

      logger.info(`Payment verified and completed: ${razorpayPaymentId}`);

      return updatedPayment;
    } catch (error: any) {
      logger.error('Error verifying payment:', error);
      throw error;
    }
  }

  /**
   * Handle Razorpay webhook events
   */
  async handleWebhook(webhookData: PaymentWebhookData, webhookSignature: string) {
    try {
      // Verify webhook signature
      const webhookSecret = config.razorpay.webhookSecret;
      const body = JSON.stringify(webhookData);

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      if (expectedSignature !== webhookSignature) {
        logger.warn('Invalid webhook signature');
        throw new Error('Invalid webhook signature');
      }

      const { event, payload } = webhookData;

      // Handle different webhook events
      switch (event) {
        case 'payment.authorized':
          await this.handlePaymentAuthorized(payload);
          break;
        case 'payment.completed':
          await this.handlePaymentCompleted(payload);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(payload);
          break;
        case 'refund.completed':
          await this.handleRefundCompleted(payload);
          break;
        default:
          logger.info(`Unhandled webhook event: ${event}`);
      }

      logger.info(`Webhook handled successfully: ${event}`);
    } catch (error: any) {
      logger.error('Error handling webhook:', error);
      throw error;
    }
  }

  /**
   * Handle payment authorized webhook
   */
  private async handlePaymentAuthorized(payload: any) {
    const payment = payload.payment?.entity;
    if (!payment) return;

    const dbPayment = await prisma.payment.findFirst({
      where: { razorpayOrderId: payment.order_id },
    });

    if (!dbPayment) return;

    await prisma.paymentLog.create({
      data: {
        paymentId: dbPayment.id,
        event: 'PAYMENT_AUTHORIZED',
        status: 'SUCCESS',
        razorpayData: JSON.stringify(payment),
      },
    });
  }

  /**
   * Handle payment completed webhook
   */
  private async handlePaymentCompleted(payload: any) {
    const payment = payload.payment?.entity;
    if (!payment) return;

    const dbPayment = await prisma.payment.findFirst({
      where: { razorpayPaymentId: payment.id },
    });

    if (!dbPayment) return;

    // Update payment status
    await prisma.payment.update({
      where: { id: dbPayment.id },
      data: {
        status: 'COMPLETED',
        method: this.mapPaymentMethod(payment.method),
        completedAt: new Date(),
      },
    });

    // Update deal
    await prisma.deal.update({
      where: { id: dbPayment.dealId },
      data: {
        paymentStatus: 'PAID',
        paymentId: payment.id,
      },
    });

    await prisma.paymentLog.create({
      data: {
        paymentId: dbPayment.id,
        event: 'PAYMENT_COMPLETED',
        status: 'SUCCESS',
        razorpayData: JSON.stringify(payment),
      },
    });
  }

  /**
   * Handle payment failed webhook
   */
  private async handlePaymentFailed(payload: any) {
    const payment = payload.payment?.entity;
    if (!payment) return;

    const dbPayment = await prisma.payment.findFirst({
      where: { razorpayOrderId: payment.order_id },
    });

    if (!dbPayment) return;

    // Update payment status
    await prisma.payment.update({
      where: { id: dbPayment.id },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
      },
    });

    await prisma.paymentLog.create({
      data: {
        paymentId: dbPayment.id,
        event: 'PAYMENT_FAILED',
        status: 'FAILED',
        razorpayData: JSON.stringify(payment),
      },
    });
  }

  /**
   * Handle refund completed webhook
   */
  private async handleRefundCompleted(payload: any) {
    const refund = payload.refund?.entity;
    if (!refund) return;

    const dbPayment = await prisma.payment.findFirst({
      where: { razorpayPaymentId: refund.payment_id },
    });

    if (!dbPayment) return;

    // Update payment status
    await prisma.payment.update({
      where: { id: dbPayment.id },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
      },
    });

    await prisma.paymentLog.create({
      data: {
        paymentId: dbPayment.id,
        event: 'REFUND_COMPLETED',
        status: 'SUCCESS',
        razorpayData: JSON.stringify(refund),
      },
    });
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(dealId: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { dealId },
        include: {
          logs: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return payment;
    } catch (error: any) {
      logger.error('Error fetching payment details:', error);
      throw error;
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(dealId: string, reason?: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { dealId },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (!payment.razorpayPaymentId) {
        throw new Error('No Razorpay payment to refund');
      }

      if (payment.status !== 'COMPLETED') {
        throw new Error('Can only refund completed payments');
      }

      // Create refund with Razorpay
      const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
        amount: payment.amount,
        notes: {
          dealId,
          reason: reason || 'Manual refund',
        },
      });

      // Update payment status (will be updated by webhook)
      await prisma.paymentLog.create({
        data: {
          paymentId: payment.id,
          event: 'REFUND_INITIATED',
          status: 'SUCCESS',
          razorpayData: JSON.stringify(refund),
        },
      });

      logger.info(`Refund initiated for payment ${payment.razorpayPaymentId}: ${refund.id}`);

      return refund;
    } catch (error: any) {
      logger.error('Error refunding payment:', error);
      throw error;
    }
  }

  /**
   * Calculate success fee based on rent amount
   */
  calculateSuccessFee(rentAmount: number): number {
    // Fee structure:
    // Up to ₹10,000: ₹500
    // ₹10,001 - ₹25,000: 5%
    // ₹25,001 - ₹50,000: 4%
    // Above ₹50,000: 3%

    if (rentAmount <= 10000) {
      return 500;
    } else if (rentAmount <= 25000) {
      return Math.round(rentAmount * 0.05);
    } else if (rentAmount <= 50000) {
      return Math.round(rentAmount * 0.04);
    } else {
      return Math.round(rentAmount * 0.03);
    }
  }

  /**
   * Map Razorpay payment method to our enum
   */
  private mapPaymentMethod(
    method: string
  ): 'CREDIT_CARD' | 'DEBIT_CARD' | 'NET_BANKING' | 'UPI' | 'WALLET' | 'EMI' {
    const methodMap: Record<string, any> = {
      card: 'CREDIT_CARD',
      debit_card: 'DEBIT_CARD',
      netbanking: 'NET_BANKING',
      upi: 'UPI',
      wallet: 'WALLET',
      emandate: 'EMI',
    };

    return methodMap[method] || method;
  }
}

export const paymentService = new PaymentService();
