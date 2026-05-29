import { Router } from 'express';
import * as userController from '../controllers/userController';

const router = Router();

// Public endpoint — no authentication required
router.get('/public', userController.getPublicUserList);

export default router;
