// Pterodactyl API model — database-first, enriched with panel data.
// "Servers" and "ServerOwners" tables in PostgreSQL are the source of truth.
// Pterodactyl Application API provides bulk server data (name, ip, port).
// Pterodactyl Client API provides live status per server.

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
  return res.json();
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
}

export interface EnrichedServer extends ServerRow {
  name: string;
  identifier: string;
  status: string;
  ip: string;
  port: number;
  node: string;
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

      let ip = (alloc?.ip || alloc?.alias || '0.0.0.0') as string;
      if (ip === INTERNAL_IP) ip = PUBLIC_IP;

      // Key by identifier string, not numeric id
      map.set(attrs.identifier as string, {
        name: attrs.name as string,
        identifier: attrs.identifier as string,
        ip,
        port: (alloc?.port || 0) as number,
        node: attrs.node?.toString() || 'Unknown',
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
  };
}

// ── Live status enrichment ─────────────────────────────────────────

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

// ── Database queries ───────────────────────────────────────────────

export const getAllServers = async (): Promise<EnrichedServer[]> => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    'SELECT server_id, pterodactyl_id, join_type, game, tags, visible FROM "Servers" WHERE visible = true'
  );

  const rows: ServerRow[] = result.rows;
  const lookup = await fetchPteroLookup();
  const enriched = rows.map((row) => enrichRow(row, lookup));
  return enrichWithLiveStatus(enriched);
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
  const [withStatus] = await enrichWithLiveStatus([enriched]);
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
  return enrichWithLiveStatus(enriched);
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