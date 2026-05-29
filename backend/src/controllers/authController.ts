import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  findUserByUsername,
  findRegistrationByUsername,
  createRegistrationRequest,
  findRegistrationByToken,
  markEmailVerified,
  updateVerificationToken,
  findUserByGoogleId,
  findUserByEmail,
  findRegistrationByEmail,
  findRegistrationByGoogleId,
  createGoogleRegistrationRequest,
  savePasswordResetToken,
  findUsersWithResetToken,
  updatePasswordAndClearResetToken,
} from '../models/authModel';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, sendAdminNotification } from '../utils/mailer';

export const login = async (req: Request, res: Response) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    res.status(400).json({ error: 'Username/email and password are required' });
    return;
  }

  try {
    // Step 1: Check mc.Users first (approved/active users)
    const user = await findUserByUsername(usernameOrEmail);
    console.log(`[Login] Checking mc.Users for '${usernameOrEmail}':`, user ? `Found (role: ${user.role})` : 'Not found');

    if (user) {
      // Google-only user trying to log in with password
      if (user.google_id && (!user.password_hash || user.password_hash === '')) {
        res.status(400).json({ error: 'This account uses Google sign-in. Please use "Continue with Google".' });
        return;
      }

      const storedPassword = user.password_hash || user.password;

      let isMatch = false;

      if (storedPassword && storedPassword.startsWith('$2')) {
        isMatch = await bcrypt.compare(password, storedPassword);
      } else {
        isMatch = password === storedPassword;
        if (isMatch) {
          console.warn('Plain text password match — hash this password!');
        }
      }

      if (!isMatch) {
        console.log(`[Login] Password mismatch for user '${usernameOrEmail}' in mc.Users`);
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Generate JWT token for active user
      const secret = process.env.JWT_SECRET || 'fallback_secret';
      const token = jwt.sign(
        {
          user_id: user.user_id || user.id,
          username: user.username,
          role: user.role || 'user',
          status: 'active',
          ...(user.google_id ? { google_id: user.google_id } : {}),
        },
        secret,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: user.username,
        email: user.email,
        role: user.role || 'user',
        status: 'active',
      });
      return;
    }

    // Step 2: Check mc.RegistrationRequests
    const registration = await findRegistrationByUsername(usernameOrEmail);
    console.log(`[Login] Checking mc.RegistrationRequests for '${usernameOrEmail}':`, registration ? `Found (status: ${registration.status})` : 'Not found');

    if (registration) {
      // Denied users cannot log in
      if (registration.status === 'denied') {
        res.status(403).json({ error: 'Your registration has been denied' });
        return;
      }

      // Pending users CAN log in with restricted access
      if (registration.status === 'pending') {
        // Google-only pending user trying to log in with password
        if (registration.google_id && (!registration.password_hash || registration.password_hash === '')) {
          res.status(400).json({ error: 'This account uses Google sign-in. Please use "Continue with Google".' });
          return;
        }

        // Block login if email not verified (Google users skip this — their email_verified is always 1)
        if (!registration.google_id && !registration.email_verified) {
          res.status(403).json({ error: 'Please verify your email before logging in. Check your inbox.' });
          return;
        }

        const storedPassword = registration.password_hash || registration.password;

        let isMatch = false;

        if (storedPassword && storedPassword.startsWith('$2')) {
          isMatch = await bcrypt.compare(password, storedPassword);
        } else {
          isMatch = password === storedPassword;
          if (isMatch) {
            console.warn('Plain text password match — hash this password!');
          }
        }

        if (!isMatch) {
          console.log(`[Login] Password mismatch for user '${usernameOrEmail}' in mc.RegistrationRequests`);
          res.status(401).json({ error: 'Invalid credentials' });
          return;
        }

        // Generate JWT token for pending user
        const secret = process.env.JWT_SECRET || 'fallback_secret';
        const token = jwt.sign(
          {
            user_id: registration.request_id || registration.id,
            username: registration.username,
            role: 'user',
            status: 'pending',
          },
          secret,
          { expiresIn: '24h' }
        );

        res.json({
          message: 'Login successful',
          token,
          user: registration.username,
          email: registration.email,
          role: 'user',
          status: 'pending',
        });
        return;
      }
    }

    // Step 3: Not found anywhere
    console.log(`[Login] User '${usernameOrEmail}' not found in any table`);
    res.status(401).json({ error: 'Invalid credentials' });
  } catch (err) {
    console.error('Login error:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const register = async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res
      .status(400)
      .json({ error: 'Username, email, and password are required' });
    return;
  }

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: 'Invalid email format' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  try {
    // Check if username/email already exists in mc.Users
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }

    // Check if username/email already exists in mc.RegistrationRequests
    const existingRequest = await findRegistrationByUsername(username);
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        res.status(409).json({ error: 'A registration request for this username is already pending' });
      } else if (existingRequest.status === 'denied') {
        res.status(409).json({ error: 'This username has been denied. Please contact an admin.' });
      } else {
        res.status(409).json({ error: 'Username already taken' });
      }
      return;
    }

    // Also check by email
    const existingEmailUser = await findUserByUsername(email);
    if (existingEmailUser) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    const existingEmailRequest = await findRegistrationByUsername(email);
    if (existingEmailRequest) {
      res.status(409).json({ error: 'A registration request with this email already exists' });
      return;
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Hash password and insert into mc.RegistrationRequests with status = 'pending'
    const hashedPassword = await bcrypt.hash(password, 10);
    await createRegistrationRequest(username, email, hashedPassword, verificationToken, tokenExpiresAt);

    // Send verification email — registration fails if email cannot be sent
    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (emailErr) {
      console.error('Failed to send verification email:', (emailErr as Error).message);
      res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
      return;
    }

    res
      .status(201)
      .json({
        message: 'Registration submitted! Please check your email to verify your account.',
        user: username,
      });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /auth/verify-email/:token — verify email via token link
export const verifyEmail = async (req: Request, res: Response) => {
  const token = req.params.token as string;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    const request = await findRegistrationByToken(token);

    if (!request) {
      res.redirect(`${frontendUrl}/login?error=invalid_token`);
      return;
    }

    // Check if token is expired
    if (request.verification_token_expires && new Date(request.verification_token_expires) < new Date()) {
      res.redirect(`${frontendUrl}/login?error=token_expired`);
      return;
    }

    // Mark email as verified
    await markEmailVerified(request.request_id);
    console.log(`[Verify] Email verified for user '${request.username}'`);

    // Send welcome email + admin notification (non-blocking — failures don't affect verification)
    try {
      console.log(`[Verify] About to send welcome email to: ${request.email}, username: ${request.username}`);
      await sendWelcomeEmail(request.email, request.username);
      console.log(`[Verify] Welcome email call completed for: ${request.email}`);
    } catch (emailErr) {
      console.warn(`[Verify] Failed to send welcome email to '${request.email}':`, (emailErr as Error).message);
    }
    try {
      console.log(`[Verify] About to send admin notification for: ${request.username}`);
      await sendAdminNotification(request.username, request.email, 'manual');
      console.log(`[Verify] Admin notification call completed for: ${request.username}`);
    } catch (emailErr) {
      console.warn(`[Verify] Failed to send admin notification for '${request.username}':`, (emailErr as Error).message);
    }

    res.redirect(`${frontendUrl}/login?verified=true`);
  } catch (err) {
    console.error('Verify email error:', (err as Error).message);
    res.redirect(`${frontendUrl}/login?error=verification_failed`);
  }
};

// POST /auth/complete-google-profile — complete Google OAuth registration
export const completeGoogleProfile = async (req: Request, res: Response) => {
  const { username, email, google_id } = req.body;

  if (!username || !email || !google_id) {
    res.status(400).json({ error: 'Username, email, and Google ID are required' });
    return;
  }

  try {
    // ── Check 1: Does this google_id already exist in mc.Users (approved user)? ──
    const existingUserByGoogleId = await findUserByGoogleId(google_id);
    if (existingUserByGoogleId) {
      res.status(409).json({ error: 'An account already exists with this Google account. Please log in.' });
      return;
    }

    // ── Check 2: Does this email already exist in mc.Users (approved user)? ──
    const existingUserByEmail = await findUserByEmail(email);
    if (existingUserByEmail) {
      res.status(409).json({ error: 'An account already exists with this email. Please log in.' });
      return;
    }

    // ── Check 3: Does this google_id already exist in mc.RegistrationRequests? ──
    const existingRequestByGoogleId = await findRegistrationByGoogleId(google_id);
    if (existingRequestByGoogleId) {
      if (existingRequestByGoogleId.status === 'pending') {
        res.status(409).json({ error: 'An account with this Google account is already pending approval.' });
      } else if (existingRequestByGoogleId.status === 'denied') {
        res.status(409).json({ error: 'Your registration has been denied. Please contact the admin.' });
      } else {
        res.status(409).json({ error: 'An account with this Google account already exists.' });
      }
      return;
    }

    // ── Check 4: Does this email already exist in mc.RegistrationRequests? ──
    const existingRequestByEmail = await findRegistrationByEmail(email);
    if (existingRequestByEmail) {
      if (existingRequestByEmail.status === 'pending') {
        res.status(409).json({ error: 'An account with this email is already pending approval.' });
      } else if (existingRequestByEmail.status === 'denied') {
        res.status(409).json({ error: 'Your registration has been denied. Please contact the admin.' });
      } else {
        res.status(409).json({ error: 'An account with this email already exists.' });
      }
      return;
    }

    // ── Check 5: Does this username already exist in either table? ──
    const existingUserByUsername = await findUserByUsername(username);
    if (existingUserByUsername) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }

    const existingRequestByUsername = await findRegistrationByUsername(username);
    if (existingRequestByUsername) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }

    // ── All clear — create registration request with google_id stored directly ──
    await createGoogleRegistrationRequest(username, email, google_id);

    // Send welcome email + admin notification (non-blocking — failures don't affect registration)
    try {
      console.log(`[GoogleProfile] About to send welcome email to: ${email}, username: ${username}`);
      await sendWelcomeEmail(email, username);
      console.log(`[GoogleProfile] Welcome email call completed for: ${email}`);
    } catch (emailErr) {
      console.warn(`[GoogleProfile] Failed to send welcome email to '${email}':`, (emailErr as Error).message);
    }
    try {
      console.log(`[GoogleProfile] About to send admin notification for: ${username}`);
      await sendAdminNotification(username, email, 'google');
      console.log(`[GoogleProfile] Admin notification call completed for: ${username}`);
    } catch (emailErr) {
      console.warn(`[GoogleProfile] Failed to send admin notification for '${username}':`, (emailErr as Error).message);
    }

    res.status(201).json({
      message: 'Registration submitted! Your account is pending admin approval.',
      user: username,
    });
  } catch (err) {
    console.error('Complete Google profile error:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /auth/resend-verification — resend email verification link
export const resendVerification = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  try {
    const registration = await findRegistrationByEmail(email);

    if (!registration) {
      res.status(404).json({ error: 'No registration found with this email' });
      return;
    }

    if (registration.email_verified) {
      res.status(400).json({ error: 'Email already verified. You can now log in.' });
      return;
    }

    // Rate limit: only allow resend if at least 60 seconds passed since last send
    // Token expires 24h after send, so if expiry > 23h59m from now, it was sent < 60s ago
    if (registration.verification_token_expires) {
      const expiresAt = new Date(registration.verification_token_expires).getTime();
      const twentyThreeHours59Min = Date.now() + (23 * 60 * 60 * 1000) + (59 * 60 * 1000);
      if (expiresAt > twentyThreeHours59Min) {
        res.status(429).json({ error: 'Please wait at least 60 seconds before requesting another verification email.' });
        return;
      }
    }

    // Generate new token and expiry
    const newToken = crypto.randomUUID();
    const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await updateVerificationToken(registration.request_id, newToken, newExpires);

    try {
      await sendVerificationEmail(email, newToken);
    } catch (emailErr) {
      console.error('Failed to resend verification email:', (emailErr as Error).message);
      res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
      return;
    }

    res.json({ message: 'Verification email sent! Please check your inbox.' });
  } catch (err) {
    console.error('Resend verification error:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /auth/check-verification?email=xxx — poll to check if email has been verified
export const checkVerification = async (req: Request, res: Response) => {
  const email = req.query.email as string;

  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  try {
    const registration = await findRegistrationByEmail(email);

    if (!registration) {
      res.json({ verified: false });
      return;
    }

    res.json({ verified: !!registration.email_verified });
  } catch (err) {
    console.error('Check verification error:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /auth/forgot-password — request a password reset link
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  try {
    // Always return the same message to prevent email enumeration
    const genericMessage = "If that email is registered, you'll receive a reset link shortly.";

    const user = await findUserByEmail(email);

    if (!user) {
      // Don't reveal that the email doesn't exist
      console.log(`[ForgotPassword] Email '${email}' not found in mc.Users — returning generic message`);
      res.json({ message: genericMessage });
      return;
    }

    // Google-only users can't reset password (they don't have one)
    if (user.google_id && (!user.password_hash || user.password_hash === '')) {
      console.log(`[ForgotPassword] Email '${email}' is a Google-only account — returning googleAccount response`);
      res.json({
        googleAccount: true,
        message: 'This account uses Google Sign-In. Please use Continue with Google to log in instead.',
      });
      return;
    }

    // Generate a raw token and hash it for storage
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await savePasswordResetToken(user.user_id || user.id, tokenHash, expires);

    // Send the raw token in the email link (not the hash)
    try {
      await sendPasswordResetEmail(email, rawToken);
    } catch (emailErr) {
      console.error('[ForgotPassword] Failed to send reset email:', (emailErr as Error).message);
      // Still return generic message to prevent email enumeration
      res.json({ message: genericMessage });
      return;
    }

    console.log(`[ForgotPassword] Reset email sent to '${email}'`);
    res.json({ message: genericMessage });
  } catch (err) {
    console.error('Forgot password error:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /auth/reset-password — reset password using token
export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token || !newPassword || !confirmPassword) {
    res.status(400).json({ error: 'Token, new password, and confirm password are required' });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  try {
    // Find all users with valid (non-expired) reset tokens
    const usersWithTokens = await findUsersWithResetToken();

    if (!usersWithTokens || usersWithTokens.length === 0) {
      res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
      return;
    }

    // Compare raw token against each hashed token
    let matchedUser: any = null;
    for (const user of usersWithTokens) {
      const isMatch = await bcrypt.compare(token, user.password_reset_token);
      if (isMatch) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
      return;
    }

    // Check expiry
    if (new Date(matchedUser.password_reset_expires) < new Date()) {
      res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
      return;
    }

    // Hash new password and update
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await updatePasswordAndClearResetToken(matchedUser.user_id || matchedUser.id, newPasswordHash);

    console.log(`[ResetPassword] Password reset successfully for user '${matchedUser.username}'`);
    res.json({ message: 'Password successfully reset. Please log in.' });
  } catch (err) {
    console.error('Reset password error:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
};
