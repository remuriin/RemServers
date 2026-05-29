require("dotenv").config();
const sql = require("mssql");
const fs = require("fs");
const path = require("path");

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

async function initializeDatabase() {
  try {
    // 1. Path to your schema file (make sure it's named correctly in your folder)
    const schemaPath = path.join(__dirname, "mc_server_registration_schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    console.log("Connecting to Azure...");
    const pool = await sql.connect(config);

    // 2. The Fix: Split the file into separate batches at every "GO" line
    // This regex looks for "GO" on its own line, ignoring case and surrounding whitespace
    const batches = schemaSql.split(/^\s*GO\s*$/im);

    console.log(`Found ${batches.length} batches to execute.`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();

      // Skip empty batches (often happens at the end of the file)
      if (batch.length === 0) continue;

      try {
        console.log(`Executing batch ${i + 1}...`);
        await pool.request().batch(batch);
      } catch (batchErr) {
        console.error(`❌ Error in batch ${i + 1}:`, batchErr.message);
        // Optional: stop execution if a batch fails
        throw batchErr;
      }
    }

    console.log("✅ Database schema initialized successfully!");
    await sql.close();
  } catch (err) {
    console.error("❌ Critical Initialization Error:", err.message);
  }
}

initializeDatabase();
