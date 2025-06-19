import { env } from "./env";
import { PrismaClient } from "~/generated/prisma/client";
import { PrismaBunSQLite } from "./sqlite";

const adapter = new PrismaBunSQLite({ url: env.DATABASE_URL });

const prisma = new PrismaClient({ adapter });

export default prisma;
