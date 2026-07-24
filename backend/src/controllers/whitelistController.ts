import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  createWhitelistRequest,
  cancelWhitelistRequest,
  getPendingRequestsByServer,
  getUserWhitelistStatus,
  getPendingCountsByServers,
  approveRequest,
  denyRequest,
} from '../models/whitelistModel';
import { getMyServers } from '../models/serverModel';

// POST /api/whitelist/request — submit a whitelist request
export const submitRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) { res.status(401).json({ error: 'Not authenticated.' }); return; }

    const { server_id, mc_username } = req.body;
    if (!server_id || !mc_username?.trim()) {
      res.status(400).json({ error: 'Server ID and MC username are required.' });
      return;
    }

    // Validate MC username (1-16 chars, alphanumeric + underscore)
    const trimmed = mc_username.trim();
    if (!/^[a-zA-Z0-9_]{1,16}$/.test(trimmed)) {
      res.status(400).json({ error: 'Invalid Minecraft username. Only letters, numbers, and underscores (max 16 chars).' });
      return;
    }

    const result = await createWhitelistRequest(server_id, userId, trimmed);
    res.json({ message: 'Whitelist request submitted.', request_id: result.request_id });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('already')) {
      res.status(409).json({ error: msg });
    } else {
      console.error('[Whitelist] submitRequest error:', msg);
      res.status(500).json({ error: 'Failed to submit request.' });
    }
  }
};

// DELETE /api/whitelist/:requestId — cancel a pending request
export const cancelRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) { res.status(401).json({ error: 'Not authenticated.' }); return; }

    const requestId = Number(req.params.requestId);
    if (isNaN(requestId)) { res.status(400).json({ error: 'Invalid request ID.' }); return; }

    await cancelWhitelistRequest(requestId, userId);
    res.json({ message: 'Request cancelled.' });
  } catch (err) {
    console.error('[Whitelist] cancelRequest error:', (err as Error).message);
    res.status(400).json({ error: (err as Error).message });
  }
};

// GET /api/whitelist/status — get user's whitelist status across all servers
export const getStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) { res.status(401).json({ error: 'Not authenticated.' }); return; }

    const statusMap = await getUserWhitelistStatus(userId);
    res.json({ status: statusMap });
  } catch (err) {
    console.error('[Whitelist] getStatus error:', (err as Error).message);
    res.status(500).json({ error: 'Failed to fetch whitelist status.' });
  }
};

// GET /api/whitelist/server/:serverId/pending — get pending requests for a server
export const getServerPending = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) { res.status(401).json({ error: 'Not authenticated.' }); return; }

    const serverId = Number(req.params.serverId);
    if (isNaN(serverId)) { res.status(400).json({ error: 'Invalid server ID.' }); return; }

    // Verify user owns this server (or is admin)
    const role = req.user?.role;
    if (role !== 'admin') {
      const owned = await getMyServers(userId);
      if (!owned.some((s) => s.server_id === serverId)) {
        res.status(403).json({ error: 'You do not own this server.' });
        return;
      }
    }

    const requests = await getPendingRequestsByServer(serverId);
    res.json({ requests });
  } catch (err) {
    console.error('[Whitelist] getServerPending error:', (err as Error).message);
    res.status(500).json({ error: 'Failed to fetch pending requests.' });
  }
};

// GET /api/whitelist/counts — get pending counts for all owned servers
export const getCounts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) { res.status(401).json({ error: 'Not authenticated.' }); return; }

    const role = req.user?.role;
    let serverIds: number[];

    if (role === 'admin') {
      // Admin sees all servers — get all server_ids from DB
      const { getPoolSafe } = await import('../db/connection');
      const pool = await getPoolSafe();
      const result = await pool.query('SELECT server_id FROM "Servers"');
      serverIds = result.rows.map((r: { server_id: number }) => r.server_id);
    } else {
      const owned = await getMyServers(userId);
      serverIds = owned.map((s) => s.server_id);
    }

    const counts = await getPendingCountsByServers(serverIds);
    res.json({ counts });
  } catch (err) {
    console.error('[Whitelist] getCounts error:', (err as Error).message);
    res.status(500).json({ error: 'Failed to fetch counts.' });
  }
};

// POST /api/whitelist/:requestId/approve — approve a request
export const approve = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) { res.status(401).json({ error: 'Not authenticated.' }); return; }

    const requestId = Number(req.params.requestId);
    if (isNaN(requestId)) { res.status(400).json({ error: 'Invalid request ID.' }); return; }

    const result = await approveRequest(requestId, userId);
    res.json({
      message: result.command_sent
        ? `"${result.mc_username}" has been whitelisted on ${result.server_name}.`
        : `"${result.mc_username}" approved but server is offline — whitelist command will need to be sent when server is running.`,
      command_sent: result.command_sent,
    });
  } catch (err) {
    console.error('[Whitelist] approve error:', (err as Error).message);
    res.status(400).json({ error: (err as Error).message });
  }
};

// POST /api/whitelist/:requestId/deny — deny a request
export const deny = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) { res.status(401).json({ error: 'Not authenticated.' }); return; }

    const requestId = Number(req.params.requestId);
    if (isNaN(requestId)) { res.status(400).json({ error: 'Invalid request ID.' }); return; }

    await denyRequest(requestId, userId);
    res.json({ message: 'Request denied.' });
  } catch (err) {
    console.error('[Whitelist] deny error:', (err as Error).message);
    res.status(400).json({ error: (err as Error).message });
  }
};
