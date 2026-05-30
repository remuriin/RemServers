require("dotenv").config();
const { Client } = require("pg");

const config = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

async function testConnectionAndSchema() {
  const client = new Client(config);
  try {
    console.log("--- Starting Database Health Check ---");
    console.log(`Connecting to: ${config.host}:${config.port}...`);

    await client.connect();
    console.log("✅ SUCCESS: Connected to PostgreSQL!");

    // 1. Check Server Version
    const versionResult = await client.query("SELECT version() as version");
    console.log(
      "📍 Server Version:",
      versionResult.rows[0].version.split("\n")[0],
    );

    // 2. Check Schema Health (Verifying your tables exist)
    const schemaResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'mc'
      AND table_name IN ('Users', 'RegistrationRequests', 'AuditLogs')
    `);

    console.log(
      `📍 Schema Status: Found ${schemaResult.rows.length} core tables in mc schema.`,
    );

    if (schemaResult.rows.length < 3) {
      console.warn(
        "⚠️ WARNING: Some core tables are missing. Check your init-db.js output.",
      );
    } else {
      console.log("✅ SCHEMA VERIFIED: All critical tables are online.");
    }

    console.log("--- Health Check Complete ---");
  } catch (err) {
    console.error("❌ CRITICAL ERROR:");
    console.error("Message:", err.message);

    if (err.message.includes("password authentication failed")) {
      console.error("Tip: Check your DB_USER and DB_PASS in the .env file.");
    } else if (err.message.includes("ECONNREFUSED")) {
      console.error(
        "Tip: Is PostgreSQL running? Check the host and port in your .env file.",
      );
    }
  } finally {
    await client.end();
  }
}

testConnectionAndSchema();
