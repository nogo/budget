import { PrismaBunSQLite } from "@synapsenwerkstatt/prisma-bun-sqlite-adapter";
import path from "node:path";
import type { PrismaConfig } from "prisma";

export default {
  experimental: {
    adapter: true
  },
  schema: path.join("prisma"),
  migrations: {
    seed: `bun --bun prisma/seed.ts`
  },
  async adapter() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    return new PrismaBunSQLite({ url });
  },
} satisfies PrismaConfig;

