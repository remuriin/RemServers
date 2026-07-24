// Pterodactyl API model — database-first, enriched with panel data.
// "Servers" and "ServerOwners" tables in PostgreSQL are the source of truth.
// Pterodactyl Application API provides bulk server data (name, ip, port).
// Pterodactyl Client API provides live status per server.

import { Pool } from 'pg';
import { getPoolSafe } from '../db/connection';

const PTERO_URL = () => process.env.PTERODACTYL_URL?.replace(/\/+$/, '') || '';
const PTERO_KEY = () => process.env.PTERODACTYL_API_KEY || '';
const PTERO_CLIENT_KEY = () => process.env.PTERODACTYL_CLIENT_KEY || PTERO_KEY();

// Internal → public IP replacement
const INTERNAL_IP = '10.0.0.135';
const PUBLIC_IP = '140.245.60.8';

// ── helpers ────────────────────────────────────────────────────────

const appHeaders = () => ({
  'Authorization': `Bearer ${PTERO_KEY()}`,
  'Content-Type': 'application/json',
  'Accept': 'application/vnd.pterodactyl.v1+json',
});

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
  // 204 No Content (e.g. power actions) — no body to parse
  if (res.status === 204) return {};
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// ── types ──────────────────────────────────────────────────────────

export interface ServerRow {
  server_id: number;
  pterodactyl_id: string;
  join_type: 'steam' | 'premium_mc' | 'cracked_mc';
  game: string;
  tags: string[];
  visible: boolean;
}

export interface PteroData {
  name: string;
  identifier: string;
  ip: string;
  port: number;
  node: string;
  description: string;
  mc_version: string;
  forge_version: string;
  ptero_user_id: number;
}

export interface EnrichedServer extends ServerRow {
  name: string;
  identifier: string;
  status: string;
  ip: string;
  port: number;
  node: string;
  description: string;
  mc_version: string;
  forge_version: string;
  owner_username: string;
}

// ── Pterodactyl bulk fetch + lookup map ────────────────────────────

/**
 * Fetch ALL servers from Pterodactyl Application API and return
 * a Map keyed by identifier string (e.g. "9a59914f")
 */
async function fetchPteroLookup(): Promise<Map<string, PteroData>> {
  const map = new Map<string, PteroData>();
  let page = 1;
  let lastPage = 1;

  do {
    const data = await pteroFetch(
      `${PTERO_URL()}/api/application/servers?include=allocations&page=${page}`,
      { headers: appHeaders() },
    );

    const items: any[] = data.data || [];
    for (const item of items) {
      const attrs = item.attributes;
      const alloc = attrs.relationships?.allocations?.data?.[0]?.attributes;
      const env = attrs.container?.environment || {};

      let ip = (alloc?.ip || alloc?.alias || '0.0.0.0') as string;
      if (ip === INTERNAL_IP) ip = PUBLIC_IP;

      // Key by identifier string, not numeric id
      map.set(attrs.identifier as string, {
        name: attrs.name as string,
        identifier: attrs.identifier as string,
        ip,
        port: (alloc?.port || 0) as number,
        node: attrs.node?.toString() || 'Unknown',
        description: (attrs.description || '') as string,
        mc_version: (env.MC_VERSION || '') as string,
        forge_version: (env.FORGE_VERSION || '') as string,
        ptero_user_id: (attrs.user || 0) as number,
      });
    }

    lastPage = data.meta?.pagination?.total_pages ?? 1;
    page++;
  } while (page <= lastPage);

  return map;
}

/** Enrich a single DB row using the pre-fetched lookup map */
function enrichRow(row: ServerRow, lookup: Map<string, PteroData>): EnrichedServer {
  const ptero = lookup.get(row.pterodactyl_id);

  return {
    ...row,
    name: ptero?.name || `Server #${row.pterodactyl_id}`,
    identifier: ptero?.identifier || '',
    status: 'unknown',
    ip: ptero?.ip || '0.0.0.0',
    port: ptero?.port || 0,
    node: ptero?.node || 'Unknown',
    description: ptero?.description || '',
    mc_version: ptero?.mc_version || '',
    forge_version: ptero?.forge_version || '',
    owner_username: '',
  };
}

// ── Live status enrichment ─────────────────────────────────────────

// ── Owner username enrichment ─────────────────────────────────────


/**
 * Look up owner usernames from ServerOwners → Users for each server.
 * Falls back to empty string if no owner is found.
 */
async function enrichWithOwnerUsernames(pool: Pool, servers: EnrichedServer[]): Promise<EnrichedServer[]> {
  if (servers.length === 0) return servers;

  const serverIds = servers.map((s) => s.server_id);
  const result = await pool.query(
    `SELECT so.server_id, u.username
     FROM "ServerOwners" so
     INNER JOIN "Users" u ON u.user_id = so.user_id
     WHERE so.server_id = ANY($1)`,
    [serverIds]
  );

  const ownerMap = new Map<number, string>();
  for (const row of result.rows) {
    ownerMap.set(row.server_id, row.username);
  }

  return servers.map((server) => ({
    ...server,
    owner_username: ownerMap.get(server.server_id) || '',
  }));
}

/**
 * Fetch live status for a list of enriched servers.
 * Falls back gracefully if Client API is unreachable.
 */
async function enrichWithLiveStatus(servers: EnrichedServer[]): Promise<EnrichedServer[]> {
  return Promise.all(
    servers.map(async (server) => {
      if (!server.identifier) return server;
      try {
        const data = await pteroFetch(
          `${PTERO_URL()}/api/client/servers/${server.identifier}/resources`,
          { headers: clientHeaders() },
        );
        return { ...server, status: data.attributes?.current_state || 'unknown' };
      } catch {
        return server;
      }
    }),
  );
}

// ── Auto-sync: map Pterodactyl panel owner → app Users ────────────

/**
 * Look up the Pterodactyl user by panel user ID, get their email,
 * match it to the app's Users table, and insert into ServerOwners.
 */
async function syncServerOwner(pool: Pool, serverId: number, pteroUserId: number): Promise<void> {
  try {
    // Fetch the Pterodactyl user's details from Application API
    const pteroUser = await pteroFetch(
      `${PTERO_URL()}/api/application/users/${pteroUserId}`,
      { headers: appHeaders() },
    );
    const email = pteroUser.attributes?.email as string | undefined;
    if (!email) {
      console.log(`[Sync] Pterodactyl user ${pteroUserId} has no email — skipping owner mapping`);
      return;
    }

    // Match email to app Users table
    const userResult = await pool.query(
      'SELECT user_id FROM "Users" WHERE email = $1',
      [email]
    );
    if (userResult.rows.length === 0) {
      console.log(`[Sync] No app user found for email ${email} — skipping owner mapping`);
      return;
    }

    const appUserId: number = userResult.rows[0].user_id;

    // Insert into ServerOwners (skip if already exists)
    await pool.query(
      `INSERT INTO "ServerOwners" (server_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [serverId, appUserId]
    );
    console.log(`[Sync] Mapped server_id=${serverId} → user_id=${appUserId} (${email})`);
  } catch (err) {
    console.error(`[Sync] Failed to map owner for server_id=${serverId}:`, (err as Error).message);
  }
}

// ── Database queries ───────────────────────────────────────────────

export const getAllServers = async (): Promise<EnrichedServer[]> => {
  const pool = await getPoolSafe();

  // 1. Pterodactyl panel is the source of truth for "what servers exist"
  const pteroMap = await fetchPteroLookup();

  // 2. Fetch existing DB entries
  const dbResult = await pool.query(
    'SELECT server_id, pterodactyl_id, join_type, game, tags, visible FROM "Servers"'
  );
  const dbOverrides = new Map<string, ServerRow>();
  for (const row of dbResult.rows) {
    dbOverrides.set(row.pterodactyl_id, row);
  }

  // 3. Auto-sync: insert any panel servers missing from DB
  for (const [identifier, ptero] of pteroMap) {
    if (!dbOverrides.has(identifier)) {
      try {
        // Insert into Servers table
        const insertResult = await pool.query(
          `INSERT INTO "Servers" (pterodactyl_id, join_type, game, tags, visible)
           VALUES ($1, $2, $3, $4::text[], $5)
           RETURNING server_id`,
          [identifier, 'cracked_mc', 'Minecraft', '{}', true]
        );
        const newServerId: number = insertResult.rows[0].server_id;
        console.log(`[Sync] Inserted new server: ${ptero.name} (${identifier}) → server_id=${newServerId}`);

        // Map owner: look up Pterodactyl user email → match to app Users
        if (ptero.ptero_user_id) {
          await syncServerOwner(pool, newServerId, ptero.ptero_user_id);
        }

        // Add to overrides map so the enrichment step below picks it up
        dbOverrides.set(identifier, {
          server_id: newServerId,
          pterodactyl_id: identifier,
          join_type: 'cracked_mc',
          game: 'Minecraft',
          tags: [],
          visible: true,
        });
      } catch (err) {
        console.error(`[Sync] Failed to auto-insert server ${identifier}:`, (err as Error).message);
      }
    }
  }

  // 4. Build enriched list from panel data, merging DB overrides
  const enriched: EnrichedServer[] = [];
  for (const [identifier, ptero] of pteroMap) {
    const db = dbOverrides.get(identifier);

    // If a DB entry exists with visible=false, hide this server
    if (db && !db.visible) continue;

    enriched.push({
      server_id: db?.server_id ?? 0,
      pterodactyl_id: identifier,
      join_type: db?.join_type ?? 'cracked_mc',
      game: db?.game ?? 'Minecraft',
      tags: db?.tags ?? [],
      visible: db?.visible ?? true,
      name: ptero.name,
      identifier: ptero.identifier,
      status: 'unknown',
      ip: ptero.ip,
      port: ptero.port,
      node: ptero.node,
      description: ptero.description,
      mc_version: ptero.mc_version,
      forge_version: ptero.forge_version,
      owner_username: '',
    });
  }

  // 5. Enrich with owner usernames and live status
  const withOwners = await enrichWithOwnerUsernames(pool, enriched);
  return enrichWithLiveStatus(withOwners);
};

export const getServerById = async (serverId: number): Promise<EnrichedServer | null> => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    'SELECT server_id, pterodactyl_id, join_type, game, tags, visible FROM "Servers" WHERE server_id = $1',
    [serverId]
  );

  if (result.rows.length === 0) return null;

  const row: ServerRow = result.rows[0];
  const lookup = await fetchPteroLookup();
  const enriched = enrichRow(row, lookup);
  const [withOwner] = await enrichWithOwnerUsernames(pool, [enriched]);
  const [withStatus] = await enrichWithLiveStatus([withOwner]);
  return withStatus;
};

export const getMyServers = async (userId: number): Promise<EnrichedServer[]> => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    `SELECT s.server_id, s.pterodactyl_id, s.join_type, s.game, s.tags, s.visible
     FROM "Servers" s
     INNER JOIN "ServerOwners" so ON so.server_id = s.server_id
     WHERE so.user_id = $1`,
    [userId]
  );

  const rows: ServerRow[] = result.rows;
  const lookup = await fetchPteroLookup();
  const enriched = rows.map((row) => enrichRow(row, lookup));
  const withOwners = await enrichWithOwnerUsernames(pool, enriched);
  return enrichWithLiveStatus(withOwners);
};

// ── Client API calls ───────────────────────────────────────────────

export const sendPowerAction = async (
  identifier: string,
  signal: 'start' | 'stop' | 'restart' | 'kill',
): Promise<void> => {
  await pteroFetch(
    `${PTERO_URL()}/api/client/servers/${identifier}/power`,
    {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({ signal }),
    },
  );
};

export const getServerResources = async (identifier: string) => {
  const data = await pteroFetch(
    `${PTERO_URL()}/api/client/servers/${identifier}/resources`,
    { headers: clientHeaders() },
  );
  return data.attributes;
};