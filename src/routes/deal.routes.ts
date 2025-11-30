import { Router } from 'express';
import { dealController } from '../controllers/deal.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All deal routes require authentication
router.use(authenticate);

// Get user's deals
router.get('/', dealController.getDeals.bind(dealController));

// Get deal by conversation
router.get('/conversation/:conversationId', dealController.getDealByConversation.bind(dealController));

// Confirm deals
router.post('/:conversationId/owner-confirm', authorize('OWNER'), dealController.ownerConfirm.bind(dealController));
router.post('/:conversationId/tenant-confirm', authorize('TENANT'), dealController.tenantConfirm.bind(dealController));

// Cancel deal
router.post('/:id/cancel', dealController.cancelDeal.bind(dealController));

export default router;
