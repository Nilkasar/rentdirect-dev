import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { paymentController } from '../controllers/payment.controller';

const router = Router();

/**
 * Create a payment order
 * POST /payments/create-order
 * Auth: Required
 */
router.post(
  '/create-order',
  authenticate,
  paymentController.createOrder
);

/**
 * Verify payment and complete transaction
 * POST /payments/verify
 * Auth: Required
 */
router.post(
  '/verify',
  authenticate,
  paymentController.verifyPayment
);

/**
 * Get payment details for a deal
 * GET /payments/:dealId
 * Auth: Required
 */
router.get(
  '/:dealId',
  authenticate,
  paymentController.getPaymentDetails
);

/**
 * Refund a payment (Admin only)
 * POST /payments/:dealId/refund
 * Auth: Required (Admin only)
 */
router.post(
  '/:dealId/refund',
  authenticate,
  paymentController.refundPayment
);

/**
 * Razorpay webhook handler (no auth required)
 * POST /payments/webhook
 */
router.post(
  '/webhook',
  paymentController.handleWebhook
);

export default router;
