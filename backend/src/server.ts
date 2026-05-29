import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from './utils/passport';
import authRoutes from './routes/authRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import adminRoutes from './routes/adminRoutes';
import userRoutes from './routes/userRoutes';
import { connectDB } from './db/connection';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors({
  origin: true, // Allow all origins (for dev — phone testing needs this)
  credentials: true,
}));
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Global request logger — see every incoming request in terminal
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url} — from: ${req.headers.origin || req.ip}`);
  next();
});
// Session middleware (required for Passport OAuth handshake)
app.use(session({
  secret: process.env.JWT_SECRET || 'fallback_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 60000 }, // short-lived — only used during OAuth flow
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Hello from Rem Servers API!' });
});

app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);
app.use('/users', userRoutes);

async function startServer() {
  try {
    await connectDB();
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(
        `Rem Servers backend running on http://0.0.0.0:${PORT}`,
      );
    });
  } catch (err) {
    console.error('❌ Failed to start server:', (err as Error).message);
    process.exit(1);
  }
}

startServer();
