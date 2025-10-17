import { Database } from 'bun:sqlite';
import { drizzle } from "drizzle-orm/bun-sqlite";
import { env } from "./env/server";
import * as schema from "~/db/schema";

// Remove 'file:' prefix from DATABASE_URL if present
const dbPath = env.DATABASE_URL.replace("file:", "");

const sqlite = new Database(dbPath);
export const db = drizzle({ 
  client: sqlite, 
  schema: schema
});

export default db;
