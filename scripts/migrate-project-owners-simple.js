#!/usr/bin/env node

// Simple migration script using environment variables
import { Client } from "pg";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function runMigration() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
  });

  try {
    await client.connect();
    console.log("🔗 Connected to database");

    // Check for projects without creator membership
    const checkQuery = `
      SELECT 
          p.id as project_id,
          p.name as project_name,
          p.user_id as creator_id,
          pm.id as member_id
      FROM project p
      LEFT JOIN project_member pm ON p.id = pm.project_id AND p.user_id = pm.user_id
      WHERE pm.id IS NULL;
    `;

    const checkResult = await client.query(checkQuery);
    console.log(
      `📊 Found ${checkResult.rows.length} projects without creator membership:`,
    );

    if (checkResult.rows.length === 0) {
      console.log(
        "✅ No migration needed - all projects already have creator membership",
      );
      return;
    }

    // Display projects that need migration
    checkResult.rows.forEach((row, index) => {
      console.log(
        `  ${index + 1}. ${row.project_name} (ID: ${row.project_id})`,
      );
    });

    // Run the migration
    const migrationQuery = `
      INSERT INTO project_member (project_id, user_id, role, joined_at, created_at)
      SELECT 
          p.id,
          p.user_id,
          'owner',
          NOW(),
          NOW()
      FROM project p
      LEFT JOIN project_member pm ON p.id = pm.project_id AND p.user_id = pm.user_id
      WHERE pm.id IS NULL;
    `;

    const migrationResult = await client.query(migrationQuery);
    console.log(
      `✅ Migration completed! Added ${migrationResult.rowCount} owner memberships`,
    );

    // Verify the migration
    const verifyResult = await client.query(checkQuery);
    if (verifyResult.rows.length === 0) {
      console.log(
        "🎉 Verification successful - all projects now have creator membership",
      );
    } else {
      console.log(
        `⚠️  Warning: ${verifyResult.rows.length} projects still missing creator membership`,
      );
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await client.end();
    console.log("🔌 Database connection closed");
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log("🎉 Migration script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Migration script failed:", error);
    process.exit(1);
  });
