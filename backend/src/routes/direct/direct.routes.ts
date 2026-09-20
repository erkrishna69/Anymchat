import { Router } from 'express';
import { DirectController } from '../../controllers/direct/direct.controller';
import { authMiddleware } from '../../middlewares/auth/auth.middleware';
import { rateLimitMiddleware } from '../../middlewares/rateLimit/rateLimit.middleware';
import { validateBody } from '../../middlewares/validation/validation.middleware';
import { validateDirectMessage } from '../../validators/direct/direct.validator';

const router = Router();

// Get conversation with another anonymous user
router.get('/:otherUserId', authMiddleware, DirectController.getChatHistory);

// Send 1-on-1 direct message
router.post(
  '/',
  authMiddleware,
  rateLimitMiddleware,
  validateBody(validateDirectMessage),
  DirectController.sendMessage
);

export default router;
