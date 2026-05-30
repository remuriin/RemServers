import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.RESEND_API_KEY || 're_7LvBpb8H_JuwFwJ642SP1swgRT6RBek32';
const resend = new Resend(apiKey);

console.log(`[Mailer] Resend initialized with API key: ${apiKey.substring(0, 8)}...`);
console.log('[Mailer] ENV CHECK — FROM:', process.env.RESEND_FROM_EMAIL);
console.log('[Mailer] ENV CHECK — ADMIN:', process.env.ADMIN_EMAIL);
console.log('[Mailer] ENV CHECK — FRONTEND:', process.env.FRONTEND_URL);
console.log('[Mailer] ENV CHECK — APP_URL:', process.env.APP_URL);

export const sendVerificationEmail = async (to: string, token: string) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@remservers.me';
  const verificationLink = `${frontendUrl}/verify-email/${token}`;

  console.log(`[Mailer] Attempting to send verification email to: ${to} from: ${fromEmail}`);

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject: 'Verify your email — Rem Servers',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #1C1C1A; border-radius: 12px; color: #EFEDE8;">
        <h1 style="font-size: 22px; margin: 0 0 8px 0; color: #EFEDE8;">Verify your email</h1>
        <p style="font-size: 14px; color: #A8A49D; margin: 0 0 24px 0; line-height: 1.6;">
          Thanks for registering on Rem Servers! Click the button below to verify your email address. This link expires in 24 hours.
        </p>
        <a href="${verificationLink}" style="display: inline-block; padding: 12px 28px; background: #7A72E0; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Verify Email
        </a>
        <p style="font-size: 12px; color: #6E6B65; margin-top: 28px; line-height: 1.5;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('[Mailer] Resend API error:', JSON.stringify(error, null, 2));
    // Pass the actual Resend error message through for better debugging
    const errorMsg = (error as any).message || 'Failed to send verification email';
    throw new Error(errorMsg);
  }

  console.log(`[Mailer] Verification email sent successfully to ${to}, id: ${data?.id}`);
};

export const sendPasswordResetEmail = async (to: string, token: string) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@remservers.me';
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;

  console.log(`[Mailer] Attempting to send password reset email to: ${to} from: ${fromEmail}`);

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject: 'Reset your password — Rem Servers',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #1C1C1A; border-radius: 12px; color: #EFEDE8;">
        <h1 style="font-size: 22px; margin: 0 0 8px 0; color: #EFEDE8;">Reset your password</h1>
        <p style="font-size: 14px; color: #A8A49D; margin: 0 0 24px 0; line-height: 1.6;">
          We received a request to reset the password for your Rem Servers account. Click the button below to set a new password. This link expires in 30 minutes.
        </p>
        <a href="${resetLink}" style="display: inline-block; padding: 12px 28px; background: #7A72E0; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Reset Password
        </a>
        <p style="font-size: 12px; color: #6E6B65; margin-top: 28px; line-height: 1.5;">
          If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('[Mailer] Resend API error:', JSON.stringify(error, null, 2));
    const errorMsg = (error as any).message || 'Failed to send password reset email';
    throw new Error(errorMsg);
  }

  console.log(`[Mailer] Password reset email sent successfully to ${to}, id: ${data?.id}`);
};

// ── Welcome + Pending Approval Email ──────────────────────────
export const sendWelcomeEmail = async (to: string, username: string) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@remservers.me';

  console.log(`[Mailer] === sendWelcomeEmail called === to: ${to}, username: ${username}, from: ${fromEmail}`);

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject: 'Welcome to Rem Servers!',
    text: `Welcome to Rem Servers, ${username}!\n\nRem Servers — servers para sa mga bai na bai.\n\nYour account has been created and is now pending admin approval. You can log in to see your account status, but portal features like the server list and activity logs will be locked until an admin approves your registration.\n\nLog in here: ${frontendUrl}/login\n\nWe don't have a fixed review schedule — approvals happen when they happen. Sit tight!\n\nDiscord ng mga bisaya — soon.\n\nSee you around,\nRem Servers`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #1C1C1A; border-radius: 12px; color: #EFEDE8;">
        <h1 style="font-size: 22px; margin: 0 0 4px 0; color: #EFEDE8;">Welcome to Rem Servers, ${username}!</h1>
        <p style="font-size: 13px; color: #7A72E0; margin: 0 0 20px 0; font-weight: 600;">servers para sa mga bai na bai</p>
        <p style="font-size: 14px; color: #A8A49D; margin: 0 0 16px 0; line-height: 1.6;">
          Your account has been created and is now <strong style="color: #EFEDE8;">pending admin approval</strong>. You can log in to see your account status, but portal features like the server list and activity logs will be locked until an admin approves your registration.
        </p>
        <a href="${frontendUrl}/login" style="display: inline-block; padding: 12px 28px; background: #7A72E0; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 8px 0 20px 0;">
          Log in to Rem Servers
        </a>
        <p style="font-size: 13px; color: #A8A49D; margin: 0 0 8px 0; line-height: 1.5;">
          We don't have a fixed review schedule — approvals happen when they happen. Sit tight!
        </p>
        <p style="font-size: 13px; color: #6E6B65; margin: 16px 0 0 0; line-height: 1.5;">
          Discord ng mga bisaya soon.
        </p>
        <hr style="border: none; border-top: 1px solid #2A2A28; margin: 24px 0 16px 0;" />
        <p style="font-size: 12px; color: #6E6B65; margin: 0; line-height: 1.5;">
          See you around,<br />Rem Servers
        </p>
      </div>
    `,
  });
  console.log(`[Mailer] Resend response for welcome — data:`, JSON.stringify(data), `error:`, JSON.stringify(error));

  if (error) {
    console.error('[Mailer] Failed to send welcome email:', JSON.stringify(error, null, 2));
    throw new Error((error as any).message || 'Failed to send welcome email');
  }

  console.log(`[Mailer] Welcome email sent to ${to}, id: ${data?.id}`);
};

// ── Admin Notification Email ──────────────────────────────────
export const sendAdminNotification = async (
  username: string,
  email: string,
  method: 'google' | 'manual'
) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@remservers.me';
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    console.warn('[Mailer] ADMIN_EMAIL not set in .env — skipping admin notification');
    return;
  }

  const methodLabel = method === 'google' ? 'Google OAuth' : 'Manual (email + password)';
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  console.log(`[Mailer] === sendAdminNotification called === to: ${adminEmail}, user: ${username}, from: ${fromEmail}, method: ${method}`);

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: adminEmail,
    subject: `New Registration Request — ${username}`,
    text: `A new registration request has been submitted.\n\nUsername: ${username}\nEmail: ${email}\nRegistration Method: ${methodLabel}\nSubmitted: ${timestamp}\n\nLog in to your admin account to review and approve or deny this request:\n${frontendUrl}/admin`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #1C1C1A; border-radius: 12px; color: #EFEDE8;">
        <h1 style="font-size: 22px; margin: 0 0 8px 0; color: #EFEDE8;">New Registration Request</h1>
        <p style="font-size: 14px; color: #A8A49D; margin: 0 0 20px 0; line-height: 1.6;">
          A new registration request has been submitted and is awaiting your review.
        </p>
        <div style="background: #242422; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-size: 12px; color: #6E6B65; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600;">Username</td>
              <td style="padding: 6px 0; font-size: 14px; color: #EFEDE8; text-align: right; font-weight: 600;">${username}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 12px; color: #6E6B65; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600;">Email</td>
              <td style="padding: 6px 0; font-size: 14px; color: #A8A49D; text-align: right;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 12px; color: #6E6B65; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600;">Method</td>
              <td style="padding: 6px 0; font-size: 14px; color: #A8A49D; text-align: right;">${methodLabel}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 12px; color: #6E6B65; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600;">Submitted</td>
              <td style="padding: 6px 0; font-size: 14px; color: #A8A49D; text-align: right;">${timestamp}</td>
            </tr>
          </table>
        </div>
        <a href="${frontendUrl}/admin" style="display: inline-block; padding: 12px 28px; background: #7A72E0; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Review in Admin Dashboard
        </a>
        <p style="font-size: 12px; color: #6E6B65; margin-top: 24px; line-height: 1.5;">
          Log in to your admin account to review and approve or deny this request.
        </p>
      </div>
    `,
  });
  console.log(`[Mailer] Resend response for admin notification — data:`, JSON.stringify(data), `error:`, JSON.stringify(error));

  if (error) {
    console.error('[Mailer] Failed to send admin notification:', JSON.stringify(error, null, 2));
    throw new Error((error as any).message || 'Failed to send admin notification');
  }

  console.log(`[Mailer] Admin notification sent to ${adminEmail}, id: ${data?.id}`);
};

// ── Account Approved Email ────────────────────────────────────
export const sendApprovalEmail = async (to: string, username: string) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@remservers.me';

  console.log(`[Mailer] === sendApprovalEmail called === to: ${to}, username: ${username}, from: ${fromEmail}`);

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject: 'Your Rem Servers account has been approved! 🎉',
    text: `Great news, ${username}! Your account has been approved.\n\nYou now have full access to the Rem Servers portal. Here's what you can do:\n- Browse available servers\n- View activity logs\n- And more as we build out new features\n\nLog in here: ${frontendUrl}/login\n\nRem Servers — servers para sa mga bai na bai.\n\nDiscord ng mga bisaya soon.\n\nLet's go,\nRem Servers`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #1C1C1A; border-radius: 12px; color: #EFEDE8;">
        <h1 style="font-size: 22px; margin: 0 0 8px 0; color: #EFEDE8;">You're in, ${username}! 🎉</h1>
        <p style="font-size: 14px; color: #A8A49D; margin: 0 0 16px 0; line-height: 1.6;">
          Great news — your account has been <strong style="color: #2ecc71;">approved</strong>. You now have full access to the Rem Servers portal.
        </p>
        <p style="font-size: 14px; color: #A8A49D; margin: 0 0 20px 0; line-height: 1.6;">
          Here's what you can do:
        </p>
        <ul style="font-size: 14px; color: #A8A49D; margin: 0 0 20px 0; padding-left: 20px; line-height: 1.8;">
          <li>Browse available servers</li>
          <li>View activity logs</li>
          <li>And more as we build out new features</li>
        </ul>
        <a href="${frontendUrl}/login" style="display: inline-block; padding: 12px 28px; background: #7A72E0; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 0 0 20px 0;">
          Log in now
        </a>
        <p style="font-size: 13px; color: #7A72E0; margin: 0 0 8px 0; font-weight: 600;">
          Rem Servers — servers para sa mga bai na bai.
        </p>
        <p style="font-size: 13px; color: #6E6B65; margin: 0 0 0 0; line-height: 1.5;">
          Discord ng mga bisaya soon.
        </p>
        <hr style="border: none; border-top: 1px solid #2A2A28; margin: 24px 0 16px 0;" />
        <p style="font-size: 12px; color: #6E6B65; margin: 0; line-height: 1.5;">
          Let's go,<br />Rem Servers
        </p>
      </div>
    `,
  });
  console.log(`[Mailer] Resend response for approval — data:`, JSON.stringify(data), `error:`, JSON.stringify(error));

  if (error) {
    console.error('[Mailer] Failed to send approval email:', JSON.stringify(error, null, 2));
    throw new Error((error as any).message || 'Failed to send approval email');
  }

  console.log(`[Mailer] Approval email sent to ${to}, id: ${data?.id}`);
};

// ── Account Denied Email ──────────────────────────────────────
export const sendDenialEmail = async (to: string, username: string) => {
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@remservers.me';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@remservers.me';

  console.log(`[Mailer] === sendDenialEmail called === to: ${to}, username: ${username}, from: ${fromEmail}`);

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject: 'Rem Servers — Registration Update',
    text: `Hey ${username},\n\nAfter reviewing your registration request, we're unable to approve your account at this time.\n\nIf you believe this is a mistake or want to follow up, reach out to us at ${adminEmail}.\n\nThanks for your interest,\nRem Servers`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #1C1C1A; border-radius: 12px; color: #EFEDE8;">
        <h1 style="font-size: 22px; margin: 0 0 8px 0; color: #EFEDE8;">Registration Update</h1>
        <p style="font-size: 14px; color: #A8A49D; margin: 0 0 16px 0; line-height: 1.6;">
          Hey ${username},
        </p>
        <p style="font-size: 14px; color: #A8A49D; margin: 0 0 16px 0; line-height: 1.6;">
          After reviewing your registration request, we're unable to approve your account at this time.
        </p>
        <p style="font-size: 14px; color: #A8A49D; margin: 0 0 0 0; line-height: 1.6;">
          If you believe this is a mistake or want to follow up, reach out to us at
          <a href="mailto:${adminEmail}" style="color: #7A72E0; text-decoration: none; font-weight: 600;">${adminEmail}</a>.
        </p>
        <hr style="border: none; border-top: 1px solid #2A2A28; margin: 24px 0 16px 0;" />
        <p style="font-size: 12px; color: #6E6B65; margin: 0; line-height: 1.5;">
          Thanks for your interest,<br />Rem Servers
        </p>
      </div>
    `,
  });
  console.log(`[Mailer] Resend response for denial — data:`, JSON.stringify(data), `error:`, JSON.stringify(error));

  if (error) {
    console.error('[Mailer] Failed to send denial email:', JSON.stringify(error, null, 2));
    throw new Error((error as any).message || 'Failed to send denial email');
  }

  console.log(`[Mailer] Denial email sent to ${to}, id: ${data?.id}`);
};
