import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { hash } from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Clearing database...");

  // Delete in correct order (foreign keys)
  await prisma.destinationOutcome.deleteMany();
  console.log("Cleared outcomes");

  await prisma.homeworkAssignment.deleteMany();
  console.log("Cleared homework");

  await prisma.giftCardPayment.deleteMany();
  console.log("Cleared payments");

  await prisma.shift.deleteMany();
  console.log("Cleared shifts");

  await prisma.participant.deleteMany();
  console.log("Cleared participants");

  // Keep users but reset to just admin
  await prisma.user.deleteMany();
  console.log("Cleared users");

  // Create fresh admin user
  const adminPassword = await hash("admin123", 10);
  await prisma.user.create({
    data: {
      email: "admin@sdrescue.org",
      name: "Admin",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("Created admin user");

  console.log("\n✅ Database cleared!");
  console.log("\nLogin: admin@sdrescue.org / admin123");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
