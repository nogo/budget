#!/usr/bin/env bun
/**
 * This script creates Drizzle's migration tracking table and marks
 * the initial migration as applied (since schema already exists from Prisma)
 */

import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { createHash } from "crypto";

const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./data/budget.sqlite";
const db = new Database(dbPath);

console.log(`📂 Using database: ${dbPath}`);

// Create Drizzle's migration tracking table (Drizzle format)
db.exec(`
  CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL,
    created_at INTEGER
  )
`);

console.log("✅ Created __drizzle_migrations table");

// Read the migration file and compute its hash
const migrationSQL = readFileSync("./drizzle/0000_init.sql", "utf-8");
const hash = createHash("sha256").update(migrationSQL).digest("hex");

console.log(`📝 Migration hash: ${hash.substring(0, 16)}...`);

// Check if migration is already marked
const existing = db.query("SELECT * FROM __drizzle_migrations WHERE hash = ?").get(hash);

if (existing) {
  console.log("⚠️  Migration already marked as applied");
} else {
  // Mark the initial migration as applied
  const stmt = db.prepare("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)");
  stmt.run(hash, Date.now());

  console.log("✅ Marked migration 0000_init.sql as applied");
}

// Verify
const migrations = db.query("SELECT * FROM __drizzle_migrations").all();
console.log(`\n📊 Current migrations (${migrations.length}):`);
console.table(migrations);

// Clean up old Prisma migrations table (optional - uncomment if you want to remove it)
// db.exec("DROP TABLE IF EXISTS _prisma_migrations");
// console.log("\n🗑️  Removed Prisma migrations table");

db.close();
console.log("\n✅ Done! Your database is now ready for Drizzle.");
console.log("\n💡 You can now run: bun run db:generate");
