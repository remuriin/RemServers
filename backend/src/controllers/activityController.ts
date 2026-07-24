import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { getActivityByUser } from '../models/activityModel';

// GET /api/activity — get activity logs for the logged-in user
export const getActivity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) { res.status(401).json({ error: 'Not authenticated.' }); return; }

    const logs = await getActivityByUser(userId);
    res.json({ logs });
  } catch (err) {
    console.error('[Activity] getActivity error:', (err as Error).message);
    res.status(500).json({ error: 'Failed to fetch activity logs.' });
  }
};
