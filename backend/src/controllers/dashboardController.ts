import { Request, Response } from 'express';
import {
  getTotalUsers,
  getTotalServers,
  getRecentPlayers,
  getServerActivity,
} from '../models/dashboardModel';

// GET /dashboard/stats — returns overview stats
export const getStats = async (req: Request, res: Response) => {
  try {
    // Placeholder response until DB queries are ready
    res.json({
      totalUsers: 0,
      totalServers: 0,
      onlinePlayers: 0,
      uptime: '0h 0m',
    });

    // TODO: uncomment when queries are ready
    // const users = await getTotalUsers();
    // const servers = await getTotalServers();
    // res.json({ totalUsers: users?.count || 0, totalServers: servers?.count || 0 });
  } catch (err) {
    console.error('Dashboard stats error:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /dashboard/players — returns recent player list
export const getPlayers = async (req: Request, res: Response) => {
  try {
    // Placeholder response until DB queries are ready
    res.json({ players: [] });

    // TODO: uncomment when queries are ready
    // const players = await getRecentPlayers();
    // res.json({ players });
  } catch (err) {
    console.error('Dashboard players error:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /dashboard/activity — returns server activity
export const getActivity = async (req: Request, res: Response) => {
  try {
    // Placeholder response until DB queries are ready
    res.json({ activity: [] });

    // TODO: uncomment when queries are ready
    // const activity = await getServerActivity();
    // res.json({ activity });
  } catch (err) {
    console.error('Dashboard activity error:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
};
