import { Router } from 'express';
import { PresenceController } from '../../controllers/presence/presence.controller';
import { authMiddleware } from '../../middlewares/auth/auth.middleware';

const router = Router();

// Get active online users within 10 km
router.get('/nearby', authMiddleware, PresenceController.getNearbyUsers);

export default router;
