import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Augment Express.User so Passport + our JWT user shape are compatible
declare global {
  namespace Express {
    interface User {
      user_id?: number;
      username?: string;
      role?: string;
      google_id?: string;
      email?: string;
      name?: string;
    }
  }
}

// Extend Express Request for auth middleware
export interface AuthRequest extends Request {}

// Middleware: verify JWT token from Authorization header
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    res.status(401).json({ error: 'Access denied. No token provided.' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const decoded = jwt.verify(token, secret) as {
      user_id: number;
      username: string;
      role: string;
    };

    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

// Middleware: require admin role (must be used after authenticateToken)
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    return;
  }

  next();
};
