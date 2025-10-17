import { defineConfig } from "drizzle-kit";
import { env } from "./src/lib/env/server";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: env.DATABASE_URL.replace("file:", ""),
  },
});
