import { getPoolSafe } from '../db/connection';

// Get total registered user count
export const getTotalUsers = async () => {
  const pool = await getPoolSafe();
  const result = await pool.request().query(''); // TODO: add query when data is ready

  return result.recordset[0];
};

// Get total server count
export const getTotalServers = async () => {
  const pool = await getPoolSafe();
  const result = await pool.request().query(''); // TODO: add query when data is ready

  return result.recordset[0];
};

// Get list of recent players
export const getRecentPlayers = async () => {
  const pool = await getPoolSafe();
  const result = await pool.request().query(''); // TODO: add query when data is ready

  return result.recordset;
};

// Get server status/activity
export const getServerActivity = async () => {
  const pool = await getPoolSafe();
  const result = await pool.request().query(''); // TODO: add query when data is ready

  return result.recordset;
};
