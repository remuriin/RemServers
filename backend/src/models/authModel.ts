import { getPoolSafe } from '../db/connection';

// Find a user in mc.Users by username or email
export const findUserByUsername = async (usernameOrEmail: string) => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    'SELECT * FROM "Users" WHERE username = $1 OR email = $1',
    [usernameOrEmail]
  );

  return result.rows[0];
}

// Find a registration request in mc.RegistrationRequests by username or email
export const findRegistrationByUsername = async (usernameOrEmail: string) => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    'SELECT * FROM "RegistrationRequests" WHERE username = $1 OR email = $1',
    [usernameOrEmail]
  );

  return result.rows[0];
}

// Insert a new registration request with status = 'pending'
export const createRegistrationRequest = async (
  username: string,
  email: string,
  password_hash: string,
  verification_token: string,
  verification_token_expires: Date
) => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    `INSERT INTO "RegistrationRequests" 
      (username, email, password_hash, status, email_verified, verification_token, verification_token_expires) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [username, email, password_hash, 'pending', false, verification_token, verification_token_expires]
  );

  return result;
}

// Insert an approved user into mc.Users with role = 'user' and status = 'active'
export const createApprovedUser = async (
  username: string,
  email: string,
  password_hash: string,
  google_id?: string | null
) => {
  const pool = await getPoolSafe();

  if (google_id) {
    const result = await pool.query(
      'INSERT INTO "Users" (username, email, password_hash, role, status, google_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [username, email, password_hash, 'user', 'active', google_id]
    );
    return result;
  }

  const result = await pool.query(
    'INSERT INTO "Users" (username, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5)',
    [username, email, password_hash, 'user', 'active']
  );

  return result;
}

// Find a registration request by verification token
export const findRegistrationByToken = async (token: string) => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    'SELECT * FROM "RegistrationRequests" WHERE verification_token = $1',
    [token]
  );

  return result.rows[0];
}

// Mark email as verified and clear the token
export const markEmailVerified = async (requestId: number) => {
  const pool = await getPoolSafe();
  await pool.query(
    `UPDATE "RegistrationRequests" 
      SET email_verified = true, verification_token = NULL, verification_token_expires = NULL 
      WHERE request_id = $1`,
    [requestId]
  );
}

// Update verification token and expiry for resend
export const updateVerificationToken = async (
  requestId: number,
  token: string,
  expires: Date
) => {
  const pool = await getPoolSafe();
  await pool.query(
    `UPDATE "RegistrationRequests"
      SET verification_token = $1, verification_token_expires = $2
      WHERE request_id = $3`,
    [token, expires, requestId]
  );
}

// Find a user in mc.Users by google_id
export const findUserByGoogleId = async (googleId: string) => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    'SELECT * FROM "Users" WHERE google_id = $1',
    [googleId]
  );

  return result.rows[0];
}

// Find a user in mc.Users by email
export const findUserByEmail = async (email: string) => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    'SELECT * FROM "Users" WHERE email = $1',
    [email]
  );

  return result.rows[0];
}

// Find a registration request by google_id in mc.RegistrationRequests
export const findRegistrationByGoogleId = async (googleId: string) => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    'SELECT * FROM "RegistrationRequests" WHERE google_id = $1',
    [googleId]
  );

  return result.rows[0];
}

// Find a registration request by email
export const findRegistrationByEmail = async (email: string) => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    'SELECT * FROM "RegistrationRequests" WHERE email = $1',
    [email]
  );

  return result.rows[0];
}

// Create a Google OAuth registration request (email already verified by Google)
// google_id stored directly in mc.RegistrationRequests.google_id column
export const createGoogleRegistrationRequest = async (
  username: string,
  email: string,
  googleId: string
) => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    `INSERT INTO "RegistrationRequests" 
      (username, email, password_hash, status, email_verified, google_id) 
      VALUES ($1, $2, $3, $4, $5, $6)`,
    [username, email, '', 'pending', true, googleId]
  );

  return result;
}

// Save a hashed password reset token and expiry to mc.Users
export const savePasswordResetToken = async (
  userId: number,
  tokenHash: string,
  expires: Date
) => {
  const pool = await getPoolSafe();
  await pool.query(
    `UPDATE "Users" 
      SET password_reset_token = $1, password_reset_expires = $2 
      WHERE user_id = $3`,
    [tokenHash, expires, userId]
  );
}

// Find all users that have a non-null reset token (for bcrypt comparison)
export const findUsersWithResetToken = async () => {
  const pool = await getPoolSafe();
  const result = await pool.query(
    `SELECT * FROM "Users" 
      WHERE password_reset_token IS NOT NULL 
      AND password_reset_expires > NOW()`
  );

  return result.rows;
}

// Update password hash and clear reset token in mc.Users
export const updatePasswordAndClearResetToken = async (
  userId: number,
  newPasswordHash: string
) => {
  const pool = await getPoolSafe();
  await pool.query(
    `UPDATE "Users" 
      SET password_hash = $1, 
          password_reset_token = NULL, 
          password_reset_expires = NULL 
      WHERE user_id = $2`,
    [newPasswordHash, userId]
  );
}