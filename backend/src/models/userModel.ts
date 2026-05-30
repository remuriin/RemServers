import { getPoolSafe } from '../db/connection';

// Get public user list: only approved/active users from mc.Users
export const getPublicUsers = async () => {
  const pool = await getPoolSafe();

  const result = await pool.query('SELECT username FROM "Users"');

  return result.rows;
};
