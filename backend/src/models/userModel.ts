import { getPoolSafe } from '../db/connection';

// Get public user list: only approved/active users from mc.Users
export const getPublicUsers = async () => {
  const pool = await getPoolSafe();

  const result = await pool.request()
    .query('SELECT username FROM mc.Users');

  return result.recordset;
};
