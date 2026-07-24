import { getPoolSafe } from '../db/connection';

/**
 * Insert an activity log entry.
 */
export const logActivity = async (
  userId: number,
  action: string,
  serverId: number | null,
  details: string,
): Promise<void> => {
  const pool = await getPoolSafe();
  await pool.query(
    `INSERT INTO "ActivityLogs" (user_id, action, server_id, details)
     VALUES ($1, $2, $3, $4)`,
    [userId, action, serverId, details],
  );
};

/**
 * Get activity logs for a specific user, most recent first.
 */
export const getActivityByUser = async (userId: number) => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    `SELECT al.log_id, al.action, al.details, al.created_at,
            s.pterodactyl_id, al.server_id
     FROM "ActivityLogs" al
     LEFT JOIN "Servers" s ON s.server_id = al.server_id
     WHERE al.user_id = $1
     ORDER BY al.created_at DESC
     LIMIT 50`,
    [userId],
  );
  return result.rows;
};
