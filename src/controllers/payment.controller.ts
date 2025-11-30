import { Response, NextFunction, Request } from 'express';
import { paymentService, CreatePaymentOrderDto } from '../services/payment.service';
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
import { isValidUUID } from '../utils/validators';
import { logger } from '../utils/logger';

export class PaymentController {
  /**
   * POST /payments/create-order
   * Create a Razorpay order for a deal
   */
  createOrder = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const { dealId, amount, description, phone } = req.body;

    if (!dealId || !isValidUUID(dealId)) {
      throw new BadRequestError('Invalid deal ID');
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new BadRequestError('Invalid amount');
    }

    if (!phone || typeof phone !== 'string') {
      throw new BadRequestError('Phone number is required');
    }

    try {
      const paymentData: CreatePaymentOrderDto = {
        dealId,
        amount,
        description: description || 'Platform success fee for rental agreement',
        payerId: req.user.userId,
        email: req.user.email,
        phone,
        userName: req.user.email,
      };

      const order = await paymentService.createPaymentOrder(paymentData);

      sendSuccess(res, {
        data: sanitizeData(order),
        message: 'Payment order created successfully',
      });
    } catch (error: any) {
      if (error.message.includes('Deal not found')) {
        throw new NotFoundError('Deal not found', ErrorCodes.DEAL_NOT_FOUND);
      }
      if (error.message.includes('Payment already completed')) {
        throw new BadRequestError('Payment already completed for this deal');
      }
      if (error.message.includes('must be completed')) {
        throw new BadRequestError('Deal must be completed before processing payment');
      }
      throw new BadRequestError(error.message);
    }
  });

  /**
   * POST /payments/verify
   * Verify payment signature and complete payment
   */
  verifyPayment = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, dealId } = req.body;

    if (!razorpayOrderId || typeof razorpayOrderId !== 'string') {
      throw new BadRequestError('Invalid order ID');
    }

    if (!razorpayPaymentId || typeof razorpayPaymentId !== 'string') {
      throw new BadRequestError('Invalid payment ID');
    }

    if (!razorpaySignature || typeof razorpaySignature !== 'string') {
      throw new BadRequestError('Invalid signature');
    }

    if (!dealId || !isValidUUID(dealId)) {
      throw new BadRequestError('Invalid deal ID');
    }

    try {
      const payment = await paymentService.verifyPayment({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        dealId,
      });

      sendSuccess(res, {
        data: sanitizeData(payment),
        message: 'Payment verified and completed successfully',
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        throw new NotFoundError('Payment not found');
      }
      if (error.message.includes('Invalid payment signature')) {
        throw new BadRequestError('Payment verification failed: Invalid signature');
      }
      if (error.message.includes('mismatch')) {
        throw new BadRequestError('Order ID mismatch');
      }
      throw new BadRequestError(error.message);
    }
  });

  /**
   * GET /payments/:dealId
   * Get payment details for a deal
   */
  getPaymentDetails = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const { dealId } = req.params;

    if (!isValidUUID(dealId)) {
      throw new BadRequestError('Invalid deal ID');
    }

    try {
      const payment = await paymentService.getPaymentDetails(dealId);

      if (!payment) {
        throw new NotFoundError('Payment not found');
      }

      sendSuccess(res, {
        data: sanitizeData(payment),
        message: 'Payment details retrieved successfully',
      });
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new BadRequestError(error.message);
    }
  });

  /**
   * POST /payments/:dealId/refund
   * Refund a payment
   */
  refundPayment = asyncAuthHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Only admins can process refunds');
    }

    const { dealId } = req.params;
    const { reason } = req.body;

    if (!isValidUUID(dealId)) {
      throw new BadRequestError('Invalid deal ID');
    }

    try {
      const refund = await paymentService.refundPayment(dealId, reason);

      sendSuccess(res, {
        data: sanitizeData(refund),
        message: 'Refund initiated successfully',
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        throw new NotFoundError('Payment not found');
      }
      if (error.message.includes('only refund completed')) {
        throw new BadRequestError('Can only refund completed payments');
      }
      throw new BadRequestError(error.message);
    }
  });

  /**
   * POST /payments/webhook
   * Handle Razorpay webhook events
   */
  handleWebhook = async (req: any, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['x-razorpay-signature'];

      if (!signature) {
        throw new BadRequestError('Missing webhook signature');
      }

      await paymentService.handleWebhook(req.body, signature);

      // Return 200 OK to acknowledge webhook receipt
      sendSuccess(res, {
        message: 'Webhook processed successfully',
      });
    } catch (error: any) {
      // Log error but still return 200 to prevent Razorpay retries
      logger.error('Webhook processing error:', error);
      sendSuccess(res, {
        message: 'Webhook received',
      });
    }
  };
}

export const paymentController = new PaymentController();
