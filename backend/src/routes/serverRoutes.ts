import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import * as serverController from '../controllers/serverController';

const router = Router();

// Public routes (no auth required)
router.get('/', serverController.listServers);

// Authenticated routes — /mine MUST be above /:id to avoid param collision
router.get('/mine', authenticateToken, serverController.myServers);

// Parameterized routes
router.get('/:id/details', serverController.serverDetails);
router.post('/:id/power', authenticateToken, serverController.powerAction);

export default router;
