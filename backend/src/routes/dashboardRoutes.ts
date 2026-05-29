import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController';

const router = Router();

router.get('/stats', dashboardController.getStats);
router.get('/players', dashboardController.getPlayers);
router.get('/activity', dashboardController.getActivity);


export default router;