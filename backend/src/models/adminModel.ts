import { getPoolSafe } from '../db/connection';

// Get all pending registration requests (including email_verified and google_id)
export const getPendingRequests = async () => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    "SELECT request_id, username, email, status, requested_at, email_verified, google_id FROM mc.\"RegistrationRequests\" WHERE status = 'pending' ORDER BY requested_at DESC"
  );

  return result.rows;
};

// Get a single registration request by ID
export const getRequestById = async (id: number) => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    'SELECT * FROM mc."RegistrationRequests" WHERE request_id = $1',
    [id]
  );

  return result.rows[0];
};

// Approve a registration request
export const approveRequest = async (id: number) => {
  const pool = await getPoolSafe();

  const request = await getRequestById(id);
  if (!request) {
    throw new Error('Registration request not found');
  }

  if (request.status !== 'pending') {
    throw new Error('Request has already been processed');
  }

  // Update RegistrationRequests status to 'approved'
  await pool.query(
    "UPDATE mc.\"RegistrationRequests\" SET status = 'approved', reviewed_at = NOW() WHERE request_id = $1",
    [id]
  );

  // Insert into mc.Users (include google_id if present)
  if (request.google_id) {
    await pool.query(
      'INSERT INTO mc."Users" (username, email, password_hash, role, status, google_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [request.username, request.email, request.password_hash || '', 'user', 'active', request.google_id]
    );
  } else {
    await pool.query(
      'INSERT INTO mc."Users" (username, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5)',
      [request.username, request.email, request.password_hash, 'user', 'active']
    );
  }

  return request;
};

// Deny a registration request
export const denyRequest = async (id: number) => {
  const pool = await getPoolSafe();

  const request = await getRequestById(id);
  if (!request) {
    throw new Error('Registration request not found');
  }

  if (request.status !== 'pending') {
    throw new Error('Request has already been processed');
  }

  await pool.query(
    "UPDATE mc.\"RegistrationRequests\" SET status = 'denied', reviewed_at = NOW() WHERE request_id = $1",
    [id]
  );

  return request;
};