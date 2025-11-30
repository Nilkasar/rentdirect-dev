import { Router } from 'express';
import { propertyController } from '../controllers/property.controller';
import { authenticate, authorize, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createPropertyValidators,
  updatePropertyValidators,
  propertyQueryValidators,
} from '../validators/property.validators';

const router = Router();

// Public routes
router.get('/', validate(propertyQueryValidators), propertyController.getProperties.bind(propertyController));
router.get('/bookmarks', authenticate, propertyController.getBookmarkedProperties.bind(propertyController));
router.get('/owner/me', authenticate, authorize('OWNER'), propertyController.getMyProperties.bind(propertyController));
router.get('/owner/stats', authenticate, authorize('OWNER'), propertyController.getOwnerStats.bind(propertyController));
router.get('/:id', propertyController.getPropertyById.bind(propertyController));

// Protected routes (owner)
router.post('/', authenticate, authorize('OWNER'), validate(createPropertyValidators), propertyController.createProperty.bind(propertyController));
router.put('/:id', authenticate, authorize('OWNER'), validate(updatePropertyValidators), propertyController.updateProperty.bind(propertyController));
router.patch('/:id/status', authenticate, authorize('OWNER', 'SUPER_ADMIN'), propertyController.updatePropertyStatus.bind(propertyController));
router.delete('/:id', authenticate, authorize('OWNER', 'SUPER_ADMIN'), propertyController.deleteProperty.bind(propertyController));

// Bookmark routes
router.post('/:id/bookmark', authenticate, propertyController.bookmarkProperty.bind(propertyController));
router.delete('/:id/bookmark', authenticate, propertyController.removeBookmark.bind(propertyController));

export default router;
