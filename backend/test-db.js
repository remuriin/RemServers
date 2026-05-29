require("dotenv").config();
const sql = require("mssql");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

async function testConnectionAndSchema() {
  try {
    console.log("--- Starting Database Health Check ---");
    console.log(`Connecting to: ${config.server}...`);

    let pool = await sql.connect(config);
    console.log("✅ SUCCESS: Connected to Azure SQL!");

    // 1. Check Server Version
    const versionResult = await pool
      .request()
      .query("SELECT @@VERSION as version");
    console.log(
      "📍 Server Version:",
      versionResult.recordset[0].version.split("\n")[0],
    );

    // 2. Check Schema Health (Verifying your tables exist)
    // Update this list when you define your Rem Servers tables
    const tablesToVerify =
      "('Users', 'StorageQuotas', 'Folders', 'Files', 'AuditLogs')";
    const schemaResult = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME IN ${tablesToVerify}
        `);

    console.log(
      `📍 Schema Status: Found ${schemaResult.recordset.length} core tables.`,
    );

    if (schemaResult.recordset.length < 5) {
      console.warn(
        "⚠️ WARNING: Some core tables are missing. Check your init-db.js output.",
      );
    } else {
      console.log("✅ SCHEMA VERIFIED: All critical tables are online.");
    }

    // 3. Check Storage Quota data
    const quotaCheck = await pool
      .request()
      .query("SELECT COUNT(*) as count FROM StorageQuotas");
    console.log(
      `📍 Data Status: ${quotaCheck.recordset[0].count} users currently have storage quotas.`,
    );

    await sql.close();
    console.log("--- Health Check Complete ---");
  } catch (err) {
    console.error("❌ CRITICAL ERROR:");
    console.error("Message:", err.message);

    if (err.message.includes("login failed")) {
      console.error("Tip: Check your DB_USER and DB_PASS in the .env file.");
    } else if (err.message.includes("IP address")) {
      console.error(
        "Tip: Your IP has changed. Update the Azure Firewall range.",
      );
    }
  }
}

testConnectionAndSchema();
