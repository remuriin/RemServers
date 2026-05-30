require("dotenv").config();
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const config = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

async function initializeDatabase() {
  const client = new Client(config);
  try {
    // 1. Path to your schema file (make sure it's named correctly in your folder)
    const schemaPath = path.join(__dirname, "mc_server_registration_schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    console.log("Connecting to PostgreSQL...");
    await client.connect();

    // 2. Execute the entire schema file as a single statement
    // PostgreSQL does not use GO batch separators
    console.log("Executing schema...");
    await client.query(schemaSql);

    console.log("✅ Database schema initialized successfully!");
  } catch (err) {
    console.error("❌ Critical Initialization Error:", err.message);
  } finally {
    await client.end();
  }
}

initializeDatabase();
