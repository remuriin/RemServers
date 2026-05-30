import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  getAllServers,
  getServerById,
  getMyServers,
  sendPowerAction,
  getServerResources,
} from '../models/serverModel';

// GET /api/servers — fetch all visible servers (public)
export const listServers = async (req: AuthRequest, res: Response) => {
  try {
    const servers = await getAllServers();

    // Enrich each server with live status from the Client API
    const enriched = await Promise.all(
      servers.map(async (s) => {
        if (!s.identifier) return s;
        try {
          const resources = await getServerResources(s.identifier);
          return { ...s, status: resources.current_state || s.status };
        } catch {
          return s; // fallback — panel may be unreachable for this server
        }
      }),
    );

    res.json({ servers: enriched });
  } catch (err) {
    console.error('[Servers] listServers error:', (err as Error).message);
    res.status(500).json({ error: 'Failed to fetch servers.' });
  }
};

// GET /api/servers/mine — fetch servers owned by the logged-in user (auth required)
export const myServers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      res.status(400).json({ error: 'User ID not found in token.' });
      return;
    }

    const servers = await getMyServers(userId);

    // Enrich with live status
    const enriched = await Promise.all(
      servers.map(async (s) => {
        if (!s.identifier) return s;
        try {
          const resources = await getServerResources(s.identifier);
          return { ...s, status: resources.current_state || s.status };
        } catch {
          return s;
        }
      }),
    );

    res.json({ servers: enriched });
  } catch (err) {
    console.error('[Servers] myServers error:', (err as Error).message);
    res.status(500).json({ error: 'Failed to fetch your servers.' });
  }
};

// GET /api/servers/:id/details — single server details (public)
export const serverDetails = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid server ID.' });
      return;
    }

    const server = await getServerById(id);
    if (!server) {
      res.status(404).json({ error: 'Server not found.' });
      return;
    }

    // Enrich with live status
    if (server.identifier) {
      try {
        const resources = await getServerResources(server.identifier);
        server.status = resources.current_state || server.status;
      } catch {
        // keep original status
      }
    }

    res.json({ server });
  } catch (err) {
    console.error('[Servers] serverDetails error:', (err as Error).message);
    res.status(500).json({ error: 'Failed to fetch server details.' });
  }
};

// POST /api/servers/:id/power — send power action (auth + server_owner/admin)
export const powerAction = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid server ID.' });
      return;
    }

    const { signal } = req.body;
    const validSignals = ['start', 'stop', 'restart', 'kill'];
    if (!signal || !validSignals.includes(signal)) {
      res.status(400).json({ error: `Invalid signal. Must be one of: ${validSignals.join(', ')}` });
      return;
    }

    // Fetch the server to get its identifier
    const server = await getServerById(id);
    if (!server) {
      res.status(404).json({ error: 'Server not found.' });
      return;
    }

    // Authorization: must be admin or server_owner role
    const userRole = req.user?.role;
    const userId = req.user?.user_id;

    if (userRole !== 'admin' && userRole !== 'server_owner') {
      // Also allow if the user actually owns this server in our DB
      if (userId) {
        const owned = await getMyServers(userId);
        const isOwner = owned.some((s) => s.server_id === server.server_id);
        if (!isOwner) {
          res.status(403).json({ error: 'You do not have permission to control this server.' });
          return;
        }
      } else {
        res.status(403).json({ error: 'You do not have permission to control this server.' });
        return;
      }
    }

    if (!server.identifier) {
      res.status(500).json({ error: 'Server has no Pterodactyl identifier — cannot send power action.' });
      return;
    }

    await sendPowerAction(server.identifier, signal);
    res.json({ message: `Power signal '${signal}' sent to server '${server.name}'.` });
  } catch (err) {
    console.error('[Servers] powerAction error:', (err as Error).message);
    res.status(500).json({ error: 'Failed to send power action.' });
  }
};
