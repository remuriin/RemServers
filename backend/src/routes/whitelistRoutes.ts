import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import * as whitelistController from '../controllers/whitelistController';

const router = Router();

// User endpoints
router.post('/request', authenticateToken, whitelistController.submitRequest);
router.delete('/:requestId', authenticateToken, whitelistController.cancelRequest);
router.get('/status', authenticateToken, whitelistController.getStatus);

// Server owner / admin endpoints
router.get('/server/:serverId/pending', authenticateToken, whitelistController.getServerPending);
router.get('/counts', authenticateToken, whitelistController.getCounts);
router.post('/:requestId/approve', authenticateToken, whitelistController.approve);
router.post('/:requestId/deny', authenticateToken, whitelistController.deny);

export default router;
