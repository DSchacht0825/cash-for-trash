import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  host: "aws-0-us-west-2.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  user: "postgres.gxyfnlqtrdylczjasxst",
  password: process.env.DB_PASSWORD || "Sandiegorescuemission",
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
