import { Router } from 'express';
import authRoutes from './auth.routes';
import propertyRoutes from './property.routes';
import chatRoutes from './chat.routes';
import dealRoutes from './deal.routes';
import reportRoutes from './report.routes';
import adminRoutes from './admin.routes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
router.use('/auth', authRoutes);
router.use('/properties', propertyRoutes);
router.use('/conversations', chatRoutes);
router.use('/deals', dealRoutes);
router.use('/reports', reportRoutes);
router.use('/admin', adminRoutes);

export default router;
