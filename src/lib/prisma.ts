import { env } from "./env/server";
import { PrismaClient } from "~/generated/prisma/client";
import { PrismaBunSQLite } from "@synapsenwerkstatt/prisma-bun-sqlite-adapter";

const adapter = new PrismaBunSQLite({ url: env.DATABASE_URL });

const prisma = new PrismaClient({ adapter });

export default prisma;
