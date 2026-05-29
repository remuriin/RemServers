import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
  connectionTimeout: 60000, // 60s — allows Azure SQL serverless to wake up
  requestTimeout: 30000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function connectDB(retries = 3): Promise<sql.ConnectionPool> {
  // If pool exists but is no longer connected, reset it
  if (pool && !pool.connected) {
    console.log('⚠️ Pool disconnected, reconnecting...');
    try { await pool.close(); } catch { /* ignore close errors */ }
    pool = null;
  }

  if (pool) return pool;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Connecting to database (attempt ${attempt}/${retries})...`);
      pool = await sql.connect(config);
      console.log('✅ Connected to Azure SQL database');

      // Listen for pool errors to auto-reconnect
      pool.on('error', (err) => {
        console.error('⚠️ Pool error, will reconnect on next request:', err.message);
        pool = null;
      });

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

export function getPool(): sql.ConnectionPool {
  if (!pool || !pool.connected) {
    throw new Error('Database not initialized or connection lost. Call connectDB() first.');
  }
  return pool;
}

// Get pool with automatic reconnection — use this in models
export async function getPoolSafe(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) return pool;
  return connectDB();
}
