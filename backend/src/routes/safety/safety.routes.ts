import { Router } from 'express';
import { SafetyController } from '../../controllers/safety/safety.controller';
import { authMiddleware } from '../../middlewares/auth/auth.middleware';
import { validateBody } from '../../middlewares/validation/validation.middleware';
import { validateReport, validateBlock } from '../../validators/safety/safety.validator';

const router = Router();

// Report user / content
router.post('/report', authMiddleware, validateBody(validateReport), SafetyController.reportUser);

// Block user
router.post('/block', authMiddleware, validateBody(validateBlock), SafetyController.blockUser);

// Unblock user
router.post('/unblock', authMiddleware, validateBody(validateBlock), SafetyController.unblockUser);

// List blocked users
router.get('/blocked', authMiddleware, SafetyController.getBlockedUsers);

export default router;
