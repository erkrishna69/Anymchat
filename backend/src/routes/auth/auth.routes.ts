import { Router } from 'express';
import { AuthController } from '../../controllers/auth/auth.controller';
import { authMiddleware } from '../../middlewares/auth/auth.middleware';
import { validateBody } from '../../middlewares/validation/validation.middleware';
import {
  generateNameRateLimiter,
  loginRateLimiter,
  signupRateLimiter,
  guestAuthRateLimiter,
} from '../../middlewares/rateLimit/rateLimit.middleware';
import {
  validateAliasUpdate,
  validateSignup,
  validateLogin,
} from '../../validators/auth/auth.validator';

const router = Router();

// 1-Click Guest Anonymous login (Rate limited to 10 / 10 min)
router.post('/anonymous', guestAuthRateLimiter, AuthController.createAnonymousUser);

// Generate unique AI-ready handle for onboarding (Rate limited to 5 / min)
router.get('/generate-name', generateNameRateLimiter, AuthController.generateName);

// Real Account Signup (Email + Password -> Persistent Anonymous Identity, Rate limited to 4 / 15 min)
router.post('/signup', signupRateLimiter, validateBody(validateSignup), AuthController.signup);

// Real Account Login (Rate limited to 5 / 5 min to block brute-force attacks)
router.post('/login', loginRateLimiter, validateBody(validateLogin), AuthController.login);

// Get current user profile
router.get('/profile', authMiddleware, AuthController.getProfile);

// Change alias / nickname
router.put('/alias', authMiddleware, validateBody(validateAliasUpdate), AuthController.updateAlias);

// Delete account with 24-hour email cooldown
router.delete('/account', authMiddleware, AuthController.deleteAccount);

export default router;
