import { Router } from 'express';
import { LocationController } from '../../controllers/location/location.controller';
import { authMiddleware } from '../../middlewares/auth/auth.middleware';
import { locationRestRateLimiter } from '../../middlewares/rateLimit/rateLimit.middleware';
import { validateBody } from '../../middlewares/validation/validation.middleware';
import { validateCoordinates } from '../../validators/location/location.validator';

const router = Router();

// Update coordinates and get nearby counts (Rate limited to 12 updates / min per user)
router.post(
  '/update',
  authMiddleware,
  locationRestRateLimiter,
  validateBody(validateCoordinates),
  LocationController.updateLocation
);

export default router;
