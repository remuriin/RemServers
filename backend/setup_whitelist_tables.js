// One-time script to create WhitelistRequests and ActivityLogs tables
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "WhitelistRequests" (
        request_id    SERIAL PRIMARY KEY,
        server_id     INTEGER NOT NULL REFERENCES "Servers"(server_id),
        user_id       INTEGER NOT NULL REFERENCES "Users"(user_id),
        mc_username   VARCHAR(32) NOT NULL,
        status        VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at   TIMESTAMPTZ,
        resolved_by   INTEGER REFERENCES "Users"(user_id),
        UNIQUE(server_id, user_id)
      );
    `);
    console.log('✅ WhitelistRequests table created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "ActivityLogs" (
        log_id        SERIAL PRIMARY KEY,
        user_id       INTEGER NOT NULL REFERENCES "Users"(user_id),
        action        VARCHAR(50) NOT NULL,
        server_id     INTEGER REFERENCES "Servers"(server_id),
        details       TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ ActivityLogs table created');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
