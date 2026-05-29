import { Request, Response } from 'express';
import { getPublicUsers } from '../models/userModel';

// GET /users/public — returns combined list of usernames (no status)
export const getPublicUserList = async (req: Request, res: Response) => {
  try {
    const users = await getPublicUsers();
    res.json({ users });
  } catch (err) {
    console.error('Public users error:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
};
