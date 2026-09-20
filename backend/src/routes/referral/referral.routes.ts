import { Router } from 'express';
import { ReferralController } from '../../controllers/referral/referral.controller';
import { authMiddleware } from '../../middlewares/auth/auth.middleware';

const router = Router();

// Get current user's referral code + invite URL (auth required)
router.get('/me', authMiddleware, ReferralController.getMyReferral);

// Validate a referral code — public (used by /invite/[code] page)
router.get('/:code', ReferralController.validateCode);

// Record link-opened event — public, rate-limited by IP
router.post('/:code/open', ReferralController.recordOpen);

export default router;
