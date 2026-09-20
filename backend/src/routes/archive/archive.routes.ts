import { Router } from 'express';
import { ArchiveController } from '../../controllers/archive/archive.controller';
import { adminAuthMiddleware } from '../../middlewares/auth/adminAuth.middleware';

const router = Router();

// Strict Admin-Only Endpoints
router.use(adminAuthMiddleware);

router.get('/status', ArchiveController.getStatus);
router.post('/trigger', ArchiveController.triggerArchive);

export const archiveRoutes = router;

