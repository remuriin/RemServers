import { Router, Request, Response, NextFunction } from 'express';
import passport from '../utils/passport';
import jwt from 'jsonwebtoken';
import * as authController from '../controllers/authController';
import { findUserByGoogleId, findUserByEmail, findRegistrationByGoogleId, findRegistrationByEmail } from '../models/authModel';

const router = Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/complete-google-profile', authController.completeGoogleProfile);
router.post('/resend-verification', authController.resendVerification);
router.get('/check-verification', authController.checkVerification);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Google OAuth — initiate (wrapped for Express 5 compatibility)
router.get('/google', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// Google OAuth — callback
router.get('/google/callback', (req: Request, res: Response, next: NextFunction) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://portal.remservers.me';

  passport.authenticate('google', { session: false }, async (err: any, user: any) => {
    if (err || !user) {
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }

    try {
      const googleUser = user as { google_id: string; email: string; name: string };

      if (!googleUser.google_id) {
        return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
      }

      const secret = process.env.JWT_SECRET || 'fallback_secret';

      // ── Step 1: Check mc.Users for approved/active user by google_id ──
      const existingUser = await findUserByGoogleId(googleUser.google_id);

      if (existingUser) {
        // Returning approved Google user — generate full JWT
        const token = jwt.sign(
          {
            user_id: existingUser.user_id || existingUser.id,
            username: existingUser.username,
            role: existingUser.role || 'user',
            status: 'active',
            google_id: existingUser.google_id,
          },
          secret,
          { expiresIn: '24h' }
        );

        if (existingUser.role === 'admin') {
          return res.redirect(`${frontendUrl}/admin?token=${token}`);
        } else {
          return res.redirect(`${frontendUrl}/portal?token=${token}`);
        }
      }

      // ── Step 1b: Check mc.Users by email (fallback for approved users) ──
      const existingUserByEmail = await findUserByEmail(googleUser.email);

      if (existingUserByEmail) {
        const token = jwt.sign(
          {
            user_id: existingUserByEmail.user_id || existingUserByEmail.id,
            username: existingUserByEmail.username,
            role: existingUserByEmail.role || 'user',
            status: 'active',
            google_id: googleUser.google_id,
          },
          secret,
          { expiresIn: '24h' }
        );

        if (existingUserByEmail.role === 'admin') {
          return res.redirect(`${frontendUrl}/admin?token=${token}`);
        } else {
          return res.redirect(`${frontendUrl}/portal?token=${token}`);
        }
      }

      // ── Step 2: Check mc.RegistrationRequests by google_id ──
      let existingRequest = await findRegistrationByGoogleId(googleUser.google_id);

      // ── Step 2b: Fallback — check mc.RegistrationRequests by email ──
      if (!existingRequest) {
        existingRequest = await findRegistrationByEmail(googleUser.email);
      }

      if (existingRequest) {
        if (existingRequest.status === 'denied') {
          return res.redirect(`${frontendUrl}/login?error=denied`);
        }

        if (existingRequest.status === 'pending') {
          // If the registration was created manually (google_id IS NULL),
          // block Google OAuth login — the user must log in with their password
          if (!existingRequest.google_id) {
            console.log(`[Google OAuth] Blocked: email '${googleUser.email}' already has a manual registration (pending). Redirecting with email_exists error.`);
            return res.redirect(`${frontendUrl}/login?error=email_exists`);
          }

          // Pending Google user (google_id IS NOT NULL) — generate LIMITED JWT with status: 'pending'
          // so they can access the portal with restricted view (same as pending regular users)
          const token = jwt.sign(
            {
              user_id: existingRequest.request_id || existingRequest.id,
              username: existingRequest.username,
              role: 'user',
              status: 'pending',
              google_id: googleUser.google_id,
            },
            secret,
            { expiresIn: '24h' }
          );

          return res.redirect(`${frontendUrl}/portal?token=${token}`);
        }

        // Status is 'approved' — user should be in mc.Users but wasn't found above.
        // This is an edge case; redirect to login rather than complete-profile.
        if (existingRequest.status === 'approved') {
          return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
        }
      }

      // ── Step 3: Truly new Google user — no record anywhere → complete profile ──
      const params = new URLSearchParams({
        email: googleUser.email,
        google_id: googleUser.google_id,
        name: googleUser.name,
      });
      return res.redirect(`${frontendUrl}/complete-profile?${params.toString()}`);
    } catch (error) {
      console.error('Google OAuth callback error:', (error as Error).message);
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  })(req, res, next);
});

export default router;