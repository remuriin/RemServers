import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import * as activityController from '../controllers/activityController';

const router = Router();

router.get('/', authenticateToken, activityController.getActivity);

export default router;
