import { env } from "./env";
import { PrismaClient } from "~/generated/prisma/client";
import { PrismaBunSQLiteAdapterFactory } from "./sqlite/bun-sqlite";

const adapter = new PrismaBunSQLiteAdapterFactory({ url: env.DATABASE_URL });

const prisma = new PrismaClient({ adapter });

export default prisma;
