import { env } from "./env";
import { PrismaClient } from "~/generated/prisma/client";
import { PrismaBetterSQLite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSQLite3({
  url: env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export default prisma;
