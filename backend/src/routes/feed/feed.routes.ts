import { Router } from 'express';
import { FeedController } from '../../controllers/feed/feed.controller';
import { authMiddleware } from '../../middlewares/auth/auth.middleware';
import { rateLimitMiddleware, feedQueryRateLimiter } from '../../middlewares/rateLimit/rateLimit.middleware';
import { validateBody } from '../../middlewares/validation/validation.middleware';
import { validatePostMessage } from '../../validators/feed/feed.validator';

const router = Router();

// Get 10 KM nearby feed (Rate limited to 30 / min per user)
router.get('/', authMiddleware, feedQueryRateLimiter, FeedController.getFeed);

// Post to 10 KM nearby feed
router.post(
  '/',
  authMiddleware,
  rateLimitMiddleware,
  validateBody(validatePostMessage),
  FeedController.postMessage
);

export default router;
