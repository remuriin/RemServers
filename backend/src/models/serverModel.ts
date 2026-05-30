// Pterodactyl API model — database-first, enriched with panel data.
// "Servers" and "ServerOwners" tables in PostgreSQL are the source of truth.
// Pterodactyl Application/Client APIs provide live data (name, status, ip, port).

import { getPoolSafe } from '../db/connection';

const PTERO_URL = () => process.env.PTERODACTYL_URL?.replace(/\/+$/, '') || '';
const PTERO_KEY = () => process.env.PTERODACTYL_API_KEY || '';

// ── helpers ────────────────────────────────────────────────────────

const appHeaders = () => ({
  'Authorization': `Bearer ${PTERO_KEY()}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
});

const clientHeaders = () => ({
  'Authorization': `Bearer ${PTERO_KEY()}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
});

/** Thin wrapper — logs + throws on non-2xx */
async function pteroFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Pterodactyl ${res.status}: ${body}`);
  }
  return res.json();
}

// ── types ──────────────────────────────────────────────────────────

export interface ServerRow {
  server_id: number;
  pterodactyl_id: number;
  join_type: 'steam' | 'premium_mc' | 'cracked_mc';
  game: string;
  tags: string | null;
  visible: boolean;
}

export interface EnrichedServer extends ServerRow {
  name: string;
  identifier: string;   // 8-char short id used by Client API
  status: string;
  ip: string;
  port: number;
  node: string;
}

// ── Pterodactyl enrichment ─────────────────────────────────────────

/** Fetch a single server from the Application API by its Pterodactyl ID */
async function fetchPteroServer(pterodactylId: number) {
  try {
    const data = await pteroFetch(
      `${PTERO_URL()}/api/application/servers/${pterodactylId}?include=allocations,node`,
      { headers: appHeaders() },
    );
    const attrs = data.attributes;
    const alloc = attrs.relationships?.allocations?.data?.[0]?.attributes;
    const node = attrs.relationships?.node?.data?.attributes;

    return {
      name: attrs.name as string,
      identifier: attrs.identifier as string,
      ip: (alloc?.ip || alloc?.alias || '0.0.0.0') as string,
      port: (alloc?.port || 0) as number,
      node: (node?.name || 'Unknown') as string,
      status: (attrs.status || 'unknown') as string,
    };
  } catch (err) {
    console.warn(`[ServerModel] Failed to fetch Pterodactyl server ${pterodactylId}:`, (err as Error).message);
    return null;
  }
}

/** Enrich a database row with live Pterodactyl data */
async function enrichRow(row: ServerRow): Promise<EnrichedServer> {
  const ptero = await fetchPteroServer(row.pterodactyl_id);

  return {
    ...row,
    name: ptero?.name || `Server #${row.pterodactyl_id}`,
    identifier: ptero?.identifier || '',
    status: ptero?.status || 'unknown',
    ip: ptero?.ip || '0.0.0.0',
    port: ptero?.port || 0,
    node: ptero?.node || 'Unknown',
  };
}

// ── Database queries ───────────────────────────────────────────────

/** Fetch all visible servers from our DB, enriched with Pterodactyl data */
export const getAllServers = async (): Promise<EnrichedServer[]> => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    'SELECT server_id, pterodactyl_id, join_type, game, tags, visible FROM "Servers" WHERE visible = true'
  );

  const rows: ServerRow[] = result.rows;
  const enriched = await Promise.all(rows.map(enrichRow));
  return enriched;
};

/** Fetch a single server by its DB server_id, enriched with Pterodactyl data */
export const getServerById = async (serverId: number): Promise<EnrichedServer | null> => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    'SELECT server_id, pterodactyl_id, join_type, game, tags, visible FROM "Servers" WHERE server_id = $1',
    [serverId]
  );

  if (result.rows.length === 0) return null;

  const row: ServerRow = result.rows[0];
  return enrichRow(row);
};

/** Fetch servers owned by a specific user_id (via ServerOwners join) */
export const getMyServers = async (userId: number): Promise<EnrichedServer[]> => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    `SELECT s.server_id, s.pterodactyl_id, s.join_type, s.game, s.tags, s.visible
     FROM "Servers" s
     INNER JOIN "ServerOwners" so ON so.server_id = s.server_id
     WHERE so.user_id = $1 AND s.visible = true`,
    [userId]
  );

  const rows: ServerRow[] = result.rows;
  const enriched = await Promise.all(rows.map(enrichRow));
  return enriched;
};

// ── Client API calls ───────────────────────────────────────────────

/** Send a power action (start | stop | restart | kill) via the Client API */
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

/** Get the live resource usage / status from the Client API */
export const getServerResources = async (identifier: string) => {
  const data = await pteroFetch(
    `${PTERO_URL()}/api/client/servers/${identifier}/resources`,
    { headers: clientHeaders() },
  );
  return data.attributes;
};
