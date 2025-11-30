import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All admin routes require authentication and SUPER_ADMIN role
router.use(authenticate);
router.use(authorize('SUPER_ADMIN'));

// Overview
router.get('/overview', adminController.getOverview.bind(adminController));

// Users management
router.get('/users', adminController.getUsers.bind(adminController));
router.patch('/users/:id/status', adminController.updateUserStatus.bind(adminController));

// Properties management
router.get('/properties', adminController.getProperties.bind(adminController));
router.patch('/properties/:id/status', adminController.updatePropertyStatus.bind(adminController));

// Deals
router.get('/deals', adminController.getDeals.bind(adminController));

// Reports
router.get('/reports', adminController.getReports.bind(adminController));
router.patch('/reports/:id/status', adminController.updateReportStatus.bind(adminController));

// Moderation
router.get('/flagged-conversations', adminController.getFlaggedConversations.bind(adminController));

// Cities
router.get('/cities', adminController.getCities.bind(adminController));
router.post('/cities', adminController.addCity.bind(adminController));
router.patch('/cities/:id/toggle', adminController.toggleCityStatus.bind(adminController));

export default router;
