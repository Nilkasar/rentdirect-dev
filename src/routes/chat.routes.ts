import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All chat routes require authentication
router.use(authenticate);

// Conversation routes
router.post('/', chatController.startConversation.bind(chatController));
router.get('/', chatController.getConversations.bind(chatController));
router.get('/unread-count', chatController.getUnreadCount.bind(chatController));
router.get('/:id', chatController.getConversation.bind(chatController));

// Message routes
router.get('/:id/messages', chatController.getMessages.bind(chatController));
router.post('/:id/messages', chatController.sendMessage.bind(chatController));
router.post('/:id/read', chatController.markAsRead.bind(chatController));

// Special actions
router.post('/:id/reveal-phone', chatController.revealPhone.bind(chatController));
router.post('/:id/flag', chatController.flagConversation.bind(chatController));

export default router;
