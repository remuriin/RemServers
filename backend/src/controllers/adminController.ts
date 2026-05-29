import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { getPendingRequests, approveRequest, denyRequest } from '../models/adminModel';
import { sendApprovalEmail, sendDenialEmail } from '../utils/mailer';

// GET /admin/requests — returns all pending registration requests
export const getRequests = async (req: AuthRequest, res: Response) => {
  try {
    const requests = await getPendingRequests();
    res.json({ requests });
  } catch (err) {
    console.error('Admin getRequests error:', (err as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /admin/approve/:id — approves a registration request
export const approve = async (req: AuthRequest, res: Response) => {
  console.log('\n🟢🟢🟢 [Admin] APPROVE HANDLER ENTERED 🟢🟢🟢');
  const { id } = req.params;
  console.log(`[Admin] Approve called with id: ${id}`);

  if (!id || isNaN(Number(id))) {
    res.status(400).json({ error: 'Valid request ID is required' });
    return;
  }

  try {
    const request = await approveRequest(Number(id));

    // Send approval email (non-blocking — failure doesn't affect approval)
    try {
      console.log(`[Admin] About to send approval email to: ${request.email}, username: ${request.username}`);
      await sendApprovalEmail(request.email, request.username);
      console.log(`[Admin] Approval email call completed for: ${request.email}`);
    } catch (emailErr) {
      console.warn(`[Admin] Failed to send approval email to '${request.email}':`, (emailErr as Error).message);
    }

    res.json({
      message: `Registration request for '${request.username}' has been approved.`,
      username: request.username,
    });
  } catch (err) {
    const message = (err as Error).message;
    if (message === 'Registration request not found') {
      res.status(404).json({ error: message });
    } else if (message === 'Request has already been processed') {
      res.status(409).json({ error: message });
    } else {
      console.error('Admin approve error:', message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

// POST /admin/deny/:id — denies a registration request
export const deny = async (req: AuthRequest, res: Response) => {
  console.log('\n🔴🔴🔴 [Admin] DENY HANDLER ENTERED 🔴🔴🔴');
  const { id } = req.params;
  console.log(`[Admin] Deny called with id: ${id}`);

  if (!id || isNaN(Number(id))) {
    res.status(400).json({ error: 'Valid request ID is required' });
    return;
  }

  try {
    const request = await denyRequest(Number(id));

    // Send denial email (non-blocking — failure doesn't affect denial)
    try {
      console.log(`[Admin] About to send denial email to: ${request.email}, username: ${request.username}`);
      await sendDenialEmail(request.email, request.username);
      console.log(`[Admin] Denial email call completed for: ${request.email}`);
    } catch (emailErr) {
      console.warn(`[Admin] Failed to send denial email to '${request.email}':`, (emailErr as Error).message);
    }

    res.json({
      message: `Registration request for '${request.username}' has been denied.`,
      username: request.username,
    });
  } catch (err) {
    const message = (err as Error).message;
    if (message === 'Registration request not found') {
      res.status(404).json({ error: message });
    } else if (message === 'Request has already been processed') {
      res.status(409).json({ error: message });
    } else {
      console.error('Admin deny error:', message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};
