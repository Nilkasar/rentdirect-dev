import { Router } from 'express';
import { reportController } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All report routes require authentication
router.use(authenticate);

router.post('/', reportController.createReport.bind(reportController));
router.get('/my', reportController.getMyReports.bind(reportController));

export default router;
