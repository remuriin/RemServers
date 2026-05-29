import { getPoolSafe } from '../db/connection';

// Get all pending registration requests (including email_verified and google_id)
export const getPendingRequests = async () => {
  const pool = await getPoolSafe();
  const result = await pool.request()
    .query("SELECT request_id, username, email, status, requested_at, email_verified, google_id FROM mc.RegistrationRequests WHERE status = 'pending' ORDER BY requested_at DESC");

  return result.recordset;
};

// Get a single registration request by ID
export const getRequestById = async (id: number) => {
  const pool = await getPoolSafe();
  const result = await pool.request()
    .input('id', id)
    .query('SELECT * FROM mc.RegistrationRequests WHERE request_id = @id');

  return result.recordset[0];
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
  await pool.request()
    .input('id', id)
    .query("UPDATE mc.RegistrationRequests SET status = 'approved', reviewed_at = GETDATE() WHERE request_id = @id");

  // Insert into mc.Users (include google_id if present)
  if (request.google_id) {
    await pool.request()
      .input('username', request.username)
      .input('email', request.email)
      .input('password_hash', request.password_hash || '')
      .input('role', 'user')
      .input('status', 'active')
      .input('google_id', request.google_id)
      .query('INSERT INTO mc.Users (username, email, password_hash, role, status, google_id) VALUES (@username, @email, @password_hash, @role, @status, @google_id)');
  } else {
    await pool.request()
      .input('username', request.username)
      .input('email', request.email)
      .input('password_hash', request.password_hash)
      .input('role', 'user')
      .input('status', 'active')
      .query('INSERT INTO mc.Users (username, email, password_hash, role, status) VALUES (@username, @email, @password_hash, @role, @status)');
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

  await pool.request()
    .input('id', id)
    .query("UPDATE mc.RegistrationRequests SET status = 'denied', reviewed_at = GETDATE() WHERE request_id = @id");

  return request;
};