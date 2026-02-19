import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Parse connection from environment or use individual params
  const pool = new pg.Pool({
    host: "aws-0-us-west-2.pooler.supabase.com",
    port: 6543,
    database: "postgres",
    user: "postgres.gxyfnlqtrdylczjasxst",
    password: process.env.DB_PASSWORD || "Sandiegorescuemission",
    ssl: { rejectUnauthorized: false },
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
