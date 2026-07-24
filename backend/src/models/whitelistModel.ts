import { getPoolSafe } from '../db/connection';
import { logActivity } from './activityModel';

// ── helpers ────────────────────────────────────────────────────────

const PTERO_URL = () => process.env.PTERODACTYL_URL?.replace(/\/+$/, '') || '';
const PTERO_CLIENT_KEY = () => process.env.PTERODACTYL_CLIENT_KEY || process.env.PTERODACTYL_API_KEY || '';

const clientHeaders = () => ({
  'Authorization': `Bearer ${PTERO_CLIENT_KEY()}`,
  'Content-Type': 'application/json',
  'Accept': 'application/vnd.pterodactyl.v1+json',
});

async function pteroFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Pterodactyl ${res.status}: ${body}`);
  }
  if (res.status === 204) return {};
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// ── Whitelist request CRUD ─────────────────────────────────────────

/**
 * Create a whitelist request. One per user per server.
 */
export const createWhitelistRequest = async (
  serverId: number,
  userId: number,
  mcUsername: string,
): Promise<{ request_id: number }> => {
  const pool = await getPoolSafe();

  // Check if user already has an approved request for this server
  const existing = await pool.query(
    `SELECT request_id, status FROM "WhitelistRequests"
     WHERE server_id = $1 AND user_id = $2`,
    [serverId, userId],
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    if (row.status === 'approved') {
      throw new Error('You are already whitelisted on this server.');
    }
    if (row.status === 'pending') {
      throw new Error('You already have a pending request for this server.');
    }
    // If denied, allow re-request by updating the existing row
    await pool.query(
      `UPDATE "WhitelistRequests"
       SET mc_username = $1, status = 'pending', resolved_at = NULL, resolved_by = NULL, created_at = NOW()
       WHERE request_id = $2`,
      [mcUsername, row.request_id],
    );
    await logActivity(userId, 'whitelist_request', serverId, `Re-requested whitelist as "${mcUsername}"`);
    return { request_id: row.request_id };
  }

  const result = await pool.query(
    `INSERT INTO "WhitelistRequests" (server_id, user_id, mc_username)
     VALUES ($1, $2, $3)
     RETURNING request_id`,
    [serverId, userId, mcUsername],
  );

  await logActivity(userId, 'whitelist_request', serverId, `Requested whitelist as "${mcUsername}"`);
  return { request_id: result.rows[0].request_id };
};

/**
 * Cancel a pending request — allows user to re-submit with a different username.
 */
export const cancelWhitelistRequest = async (
  requestId: number,
  userId: number,
): Promise<void> => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    `DELETE FROM "WhitelistRequests"
     WHERE request_id = $1 AND user_id = $2 AND status = 'pending'
     RETURNING server_id`,
    [requestId, userId],
  );

  if (result.rows.length === 0) {
    throw new Error('Request not found or cannot be cancelled.');
  }

  await logActivity(userId, 'whitelist_cancelled', result.rows[0].server_id, 'Cancelled whitelist request');
};

/**
 * Get pending requests for a specific server (for server owners).
 */
export const getPendingRequestsByServer = async (serverId: number) => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    `SELECT wr.request_id, wr.mc_username, wr.status, wr.created_at,
            u.username AS requester_username, u.user_id
     FROM "WhitelistRequests" wr
     INNER JOIN "Users" u ON u.user_id = wr.user_id
     WHERE wr.server_id = $1 AND wr.status = 'pending'
     ORDER BY wr.created_at ASC`,
    [serverId],
  );
  return result.rows;
};

/**
 * Get whitelist status for a user across all servers.
 * Used by the Servers tab to show register/pending/whitelisted state.
 */
export const getUserWhitelistStatus = async (userId: number) => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    `SELECT request_id, server_id, mc_username, status
     FROM "WhitelistRequests"
     WHERE user_id = $1`,
    [userId],
  );

  // Return a map of server_id → { request_id, mc_username, status }
  const statusMap: Record<number, { request_id: number; mc_username: string; status: string }> = {};
  for (const row of result.rows) {
    statusMap[row.server_id] = {
      request_id: row.request_id,
      mc_username: row.mc_username,
      status: row.status,
    };
  }
  return statusMap;
};

/**
 * Get pending request counts for multiple servers (for badge indicators).
 */
export const getPendingCountsByServers = async (serverIds: number[]) => {
  if (serverIds.length === 0) return {};

  const pool = await getPoolSafe();
  const result = await pool.query(
    `SELECT server_id, COUNT(*)::int AS count
     FROM "WhitelistRequests"
     WHERE server_id = ANY($1) AND status = 'pending'
     GROUP BY server_id`,
    [serverIds],
  );

  const counts: Record<number, number> = {};
  for (const row of result.rows) {
    counts[row.server_id] = row.count;
  }
  return counts;
};

/**
 * Approve a whitelist request.
 * Sends `whitelist add <username>` to the Pterodactyl server.
 */
export const approveRequest = async (
  requestId: number,
  resolvedByUserId: number,
): Promise<{ mc_username: string; server_name: string; command_sent: boolean }> => {
  const pool = await getPoolSafe();

  // Fetch the request + server identifier
  const reqResult = await pool.query(
    `SELECT wr.request_id, wr.server_id, wr.user_id, wr.mc_username,
            s.pterodactyl_id
     FROM "WhitelistRequests" wr
     INNER JOIN "Servers" s ON s.server_id = wr.server_id
     WHERE wr.request_id = $1 AND wr.status = 'pending'`,
    [requestId],
  );

  if (reqResult.rows.length === 0) {
    throw new Error('Request not found or already resolved.');
  }

  const req = reqResult.rows[0];

  // Mark as approved in DB
  await pool.query(
    `UPDATE "WhitelistRequests"
     SET status = 'approved', resolved_at = NOW(), resolved_by = $1
     WHERE request_id = $2`,
    [resolvedByUserId, requestId],
  );

  // Attempt to send whitelist command to Pterodactyl
  let commandSent = false;
  try {
    await pteroFetch(
      `${PTERO_URL()}/api/client/servers/${req.pterodactyl_id}/command`,
      {
        method: 'POST',
        headers: clientHeaders(),
        body: JSON.stringify({ command: `whitelist add ${req.mc_username}` }),
      },
    );
    commandSent = true;
    console.log(`[Whitelist] Sent: whitelist add ${req.mc_username} → ${req.pterodactyl_id}`);
  } catch (err) {
    console.error(`[Whitelist] Failed to send command:`, (err as Error).message);
  }

  // Log activity for the requesting user
  await logActivity(
    req.user_id,
    commandSent ? 'whitelist_approved' : 'whitelist_approved_offline',
    req.server_id,
    commandSent
      ? `Whitelist approved — "${req.mc_username}" added to server`
      : `Whitelist approved — server offline, "${req.mc_username}" will be added when server starts`,
  );

  // Log activity for the server owner
  await logActivity(
    resolvedByUserId,
    'whitelist_approve_action',
    req.server_id,
    `Approved whitelist for "${req.mc_username}"${commandSent ? '' : ' (server offline)'}`,
  );

  // Get server name for response
  const serverName = await getServerName(req.pterodactyl_id);

  return { mc_username: req.mc_username, server_name: serverName, command_sent: commandSent };
};

/**
 * Deny a whitelist request.
 */
export const denyRequest = async (
  requestId: number,
  resolvedByUserId: number,
): Promise<void> => {
  const pool = await getPoolSafe();

  const reqResult = await pool.query(
    `SELECT wr.request_id, wr.server_id, wr.user_id, wr.mc_username
     FROM "WhitelistRequests" wr
     WHERE wr.request_id = $1 AND wr.status = 'pending'`,
    [requestId],
  );

  if (reqResult.rows.length === 0) {
    throw new Error('Request not found or already resolved.');
  }

  const req = reqResult.rows[0];

  await pool.query(
    `UPDATE "WhitelistRequests"
     SET status = 'denied', resolved_at = NOW(), resolved_by = $1
     WHERE request_id = $2`,
    [resolvedByUserId, requestId],
  );

  // Log for requesting user
  await logActivity(req.user_id, 'whitelist_denied', req.server_id, `Whitelist denied for "${req.mc_username}"`);

  // Log for server owner
  await logActivity(resolvedByUserId, 'whitelist_deny_action', req.server_id, `Denied whitelist for "${req.mc_username}"`);
};

/**
 * Helper: get a server name from its Pterodactyl identifier.
 */
async function getServerName(identifier: string): Promise<string> {
  try {
    const { getAllServers } = await import('./serverModel');
    const servers = await getAllServers();
    const server = servers.find((s) => s.pterodactyl_id === identifier);
    return server?.name || identifier;
  } catch {
    return identifier;
  }
}
