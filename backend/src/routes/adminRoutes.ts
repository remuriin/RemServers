import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';
import * as adminController from '../controllers/adminController';

const router = Router();

// All admin routes require authentication + admin role
router.get('/requests', authenticateToken, requireAdmin, adminController.getRequests);
router.post('/approve/:id', authenticateToken, requireAdmin, adminController.approve);
router.post('/deny/:id', authenticateToken, requireAdmin, adminController.deny);

export default router;
