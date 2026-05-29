import { getPoolSafe } from '../db/connection';

// Find a user in mc.Users by username or email
export const findUserByUsername = async (usernameOrEmail: string) => {
  const pool = await getPoolSafe();
  const result = await pool.request()
    .input('usernameOrEmail', usernameOrEmail)
    .query('SELECT * FROM mc.Users WHERE username = @usernameOrEmail OR email = @usernameOrEmail');

  return result.recordset[0];
}

// Find a registration request in mc.RegistrationRequests by username or email
export const findRegistrationByUsername = async (usernameOrEmail: string) => {
  const pool = await getPoolSafe();
  const result = await pool.request()
    .input('usernameOrEmail', usernameOrEmail)
    .query('SELECT * FROM mc.RegistrationRequests WHERE username = @usernameOrEmail OR email = @usernameOrEmail');

  return result.recordset[0];
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
  const result = await pool.request()
    .input('username', username)
    .input('email', email)
    .input('password_hash', password_hash)
    .input('status', 'pending')
    .input('email_verified', 0)
    .input('verification_token', verification_token)
    .input('verification_token_expires', verification_token_expires)
    .query(`INSERT INTO mc.RegistrationRequests 
      (username, email, password_hash, status, email_verified, verification_token, verification_token_expires) 
      VALUES (@username, @email, @password_hash, @status, @email_verified, @verification_token, @verification_token_expires)`);

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
    const result = await pool.request()
      .input('username', username)
      .input('email', email)
      .input('password_hash', password_hash)
      .input('role', 'user')
      .input('status', 'active')
      .input('google_id', google_id)
      .query('INSERT INTO mc.Users (username, email, password_hash, role, status, google_id) VALUES (@username, @email, @password_hash, @role, @status, @google_id)');
    return result;
  }

  const result = await pool.request()
    .input('username', username)
    .input('email', email)
    .input('password_hash', password_hash)
    .input('role', 'user')
    .input('status', 'active')
    .query('INSERT INTO mc.Users (username, email, password_hash, role, status) VALUES (@username, @email, @password_hash, @role, @status)');

  return result;
}

// Find a registration request by verification token
export const findRegistrationByToken = async (token: string) => {
  const pool = await getPoolSafe();
  const result = await pool.request()
    .input('token', token)
    .query('SELECT * FROM mc.RegistrationRequests WHERE verification_token = @token');

  return result.recordset[0];
}

// Mark email as verified and clear the token
export const markEmailVerified = async (requestId: number) => {
  const pool = await getPoolSafe();
  await pool.request()
    .input('id', requestId)
    .query(`UPDATE mc.RegistrationRequests 
      SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL 
      WHERE request_id = @id`);
}

// Update verification token and expiry for resend
export const updateVerificationToken = async (
  requestId: number,
  token: string,
  expires: Date
) => {
  const pool = await getPoolSafe();
  await pool.request()
    .input('id', requestId)
    .input('token', token)
    .input('expires', expires)
    .query(`UPDATE mc.RegistrationRequests
      SET verification_token = @token, verification_token_expires = @expires
      WHERE request_id = @id`);
}

// Find a user in mc.Users by google_id
export const findUserByGoogleId = async (googleId: string) => {
  const pool = await getPoolSafe();
  const result = await pool.request()
    .input('googleId', googleId)
    .query('SELECT * FROM mc.Users WHERE google_id = @googleId');

  return result.recordset[0];
}

// Find a user in mc.Users by email
export const findUserByEmail = async (email: string) => {
  const pool = await getPoolSafe();
  const result = await pool.request()
    .input('email', email)
    .query('SELECT * FROM mc.Users WHERE email = @email');

  return result.recordset[0];
}

// Find a registration request by google_id in mc.RegistrationRequests
export const findRegistrationByGoogleId = async (googleId: string) => {
  const pool = await getPoolSafe();
  const result = await pool.request()
    .input('googleId', googleId)
    .query('SELECT * FROM mc.RegistrationRequests WHERE google_id = @googleId');

  return result.recordset[0];
}

// Find a registration request by email
export const findRegistrationByEmail = async (email: string) => {
  const pool = await getPoolSafe();
  const result = await pool.request()
    .input('email', email)
    .query('SELECT * FROM mc.RegistrationRequests WHERE email = @email');

  return result.recordset[0];
}

// Create a Google OAuth registration request (email already verified by Google)
// google_id stored directly in mc.RegistrationRequests.google_id column
export const createGoogleRegistrationRequest = async (
  username: string,
  email: string,
  googleId: string
) => {
  const pool = await getPoolSafe();
  const result = await pool.request()
    .input('username', username)
    .input('email', email)
    .input('password_hash', '')
    .input('status', 'pending')
    .input('email_verified', 1)
    .input('google_id', googleId)
    .query(`INSERT INTO mc.RegistrationRequests 
      (username, email, password_hash, status, email_verified, google_id) 
      VALUES (@username, @email, @password_hash, @status, @email_verified, @google_id)`);

  return result;
}

// Save a hashed password reset token and expiry to mc.Users
export const savePasswordResetToken = async (
  userId: number,
  tokenHash: string,
  expires: Date
) => {
  const pool = await getPoolSafe();
  await pool.request()
    .input('userId', userId)
    .input('tokenHash', tokenHash)
    .input('expires', expires)
    .query(`UPDATE mc.Users 
      SET password_reset_token = @tokenHash, password_reset_expires = @expires 
      WHERE user_id = @userId`);
}

// Find all users that have a non-null reset token (for bcrypt comparison)
export const findUsersWithResetToken = async () => {
  const pool = await getPoolSafe();
  const result = await pool.request()
    .query(`SELECT * FROM mc.Users 
      WHERE password_reset_token IS NOT NULL 
      AND password_reset_expires > GETDATE()`);

  return result.recordset;
}

// Update password hash and clear reset token in mc.Users
export const updatePasswordAndClearResetToken = async (
  userId: number,
  newPasswordHash: string
) => {
  const pool = await getPoolSafe();
  await pool.request()
    .input('userId', userId)
    .input('newPasswordHash', newPasswordHash)
    .query(`UPDATE mc.Users 
      SET password_hash = @newPasswordHash, 
          password_reset_token = NULL, 
          password_reset_expires = NULL 
      WHERE user_id = @userId`);
}