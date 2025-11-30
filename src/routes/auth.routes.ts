import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  registerValidators,
  loginValidators,
  updateProfileValidators,
} from '../validators/auth.validators';

const router = Router();

// Public routes
router.post('/register', validate(registerValidators), authController.register.bind(authController));
router.post('/login', validate(loginValidators), authController.login.bind(authController));

// Password reset routes (public)
router.post('/forgot-password', authController.forgotPassword.bind(authController));
router.post('/verify-otp', authController.verifyOTP.bind(authController));
router.post('/reset-password', authController.resetPassword.bind(authController));

// Protected routes
router.get('/me', authenticate, authController.getProfile.bind(authController));
router.put('/profile', authenticate, validate(updateProfileValidators), authController.updateProfile.bind(authController));

export default router;
