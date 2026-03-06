import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL or DIRECT_URL environment variable is not set");
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    const lowerEmail = user.email.toLowerCase().trim();
    if (lowerEmail !== user.email) {
      await prisma.user.update({
        where: { id: user.id },
        data: { email: lowerEmail }
      });
      console.log("Updated:", user.email, "->", lowerEmail);
    }
  }
  console.log("Done normalizing emails");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
