import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 60000, // 60s — allows cold-start databases to wake up
});

// Listen for pool errors to log them (pg will handle reconnection automatically)
pool.on('error', (err) => {
  console.error('⚠️ Unexpected pool error:', err.message);
});

export async function connectDB(retries = 3): Promise<Pool> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Connecting to database (attempt ${attempt}/${retries})...`);
      const client = await pool.connect();
      client.release();
      console.log('✅ Connected to PostgreSQL database');
      return pool;
    } catch (err) {
      console.error(`❌ Attempt ${attempt} failed:`, (err as Error).message);
      if (attempt === retries) throw err;
      console.log('⏳ Retrying in 5 seconds...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  throw new Error('Database connection failed after all retries');
}

export function getPool(): Pool {
  return pool;
}

// Get pool — use this in models
export async function getPoolSafe(): Promise<Pool> {
  return pool;
}
