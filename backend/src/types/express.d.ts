import 'express';

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
