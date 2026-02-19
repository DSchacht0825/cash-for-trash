import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hash } from "bcryptjs";
import path from "path";

// Resolve database path relative to project root
const dbPath = path.resolve(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");
  console.log("Database path:", dbPath);

  // Create admin user
  const adminPassword = await hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@sdrescue.org" },
    update: {},
    create: {
      email: "admin@sdrescue.org",
      name: "Admin User",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("Created admin user:", admin.email);

  // Create staff user
  const staffPassword = await hash("staff123", 10);
  const staff = await prisma.user.upsert({
    where: { email: "staff@sdrescue.org" },
    update: {},
    create: {
      email: "staff@sdrescue.org",
      name: "Staff Member",
      passwordHash: staffPassword,
      role: "STAFF",
    },
  });
  console.log("Created staff user:", staff.email);

  // Create sample participants
  const participantData = [
    { firstName: "John", lastName: "Doe", preferredName: "Johnny", phone: "(619) 555-0101" },
    { firstName: "Maria", lastName: "Santos", preferredName: null, phone: "(619) 555-0102" },
    { firstName: "Robert", lastName: "Thompson", preferredName: "Rob", phone: null },
    { firstName: "Sarah", lastName: "Williams", preferredName: null, phone: "(619) 555-0104" },
    { firstName: "Michael", lastName: "Johnson", preferredName: "Mike", phone: "(619) 555-0105" },
    { firstName: "Angela", lastName: "Davis", preferredName: "Angie", phone: null },
    { firstName: "James", lastName: "Brown", preferredName: null, phone: "(619) 555-0107" },
    { firstName: "Patricia", lastName: "Miller", preferredName: "Pat", phone: "(619) 555-0108" },
  ];

  const participants = [];
  for (const p of participantData) {
    const participant = await prisma.participant.create({
      data: {
        ...p,
        createdById: admin.id,
        enrollmentDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      },
    });
    participants.push(participant);
    console.log("Created participant:", participant.firstName, participant.lastName);
  }

  // Create shifts for participants
  for (const participant of participants) {
    const numShifts = Math.floor(Math.random() * 8) + 2;
    for (let i = 0; i < numShifts; i++) {
      const clockIn = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const clockOut = new Date(clockIn.getTime() + (2 + Math.random() * 4) * 60 * 60 * 1000);

      await prisma.shift.create({
        data: {
          participantId: participant.id,
          clockIn,
          clockOut,
          bagsCollected: Math.floor(Math.random() * 15) + 3,
          location: ["Downtown", "Beach", "Park", "City Center", "East Village"][Math.floor(Math.random() * 5)],
          createdById: staff.id,
        },
      });
    }
    console.log(`Created ${numShifts} shifts for ${participant.firstName}`);
  }

  // Create an active shift
  await prisma.shift.create({
    data: {
      participantId: participants[0].id,
      clockIn: new Date(),
      clockOut: null,
      bagsCollected: 0,
      location: "Downtown",
      createdById: staff.id,
    },
  });
  console.log("Created active shift for", participants[0].firstName);

  // Participant 0: At cap ($2000 = 25 payments)
  for (let i = 0; i < 25; i++) {
    await prisma.giftCardPayment.create({
      data: {
        participantId: participants[0].id,
        amount: 80,
        issuedAt: new Date(Date.now() - (25 - i) * 7 * 24 * 60 * 60 * 1000),
        issuedById: staff.id,
        notes: i === 24 ? "Final payment - cap reached" : undefined,
      },
    });
  }
  console.log("Created 25 payments for", participants[0].firstName, "(at cap)");

  // Participant 1: Near cap ($1840 = 23 payments)
  for (let i = 0; i < 23; i++) {
    await prisma.giftCardPayment.create({
      data: {
        participantId: participants[1].id,
        amount: 80,
        issuedAt: new Date(Date.now() - (23 - i) * 7 * 24 * 60 * 60 * 1000),
        issuedById: staff.id,
      },
    });
  }
  console.log("Created 23 payments for", participants[1].firstName, "(near cap)");

  // Other participants: Random payments
  for (let i = 2; i < participants.length; i++) {
    const numPayments = Math.floor(Math.random() * 10) + 1;
    for (let j = 0; j < numPayments; j++) {
      await prisma.giftCardPayment.create({
        data: {
          participantId: participants[i].id,
          amount: 80,
          issuedAt: new Date(Date.now() - j * 7 * 24 * 60 * 60 * 1000),
          issuedById: staff.id,
        },
      });
    }
    console.log(`Created ${numPayments} payments for ${participants[i].firstName}`);
  }

  // Create homework assignments
  const homeworkTitles = [
    "Get California ID",
    "Apply for SNAP benefits",
    "Complete job application",
    "Attend financial literacy workshop",
    "Get birth certificate copy",
    "Open bank account",
    "Apply for Medi-Cal",
    "Complete housing application",
  ];

  for (const participant of participants.slice(0, 5)) {
    const numHomework = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numHomework; i++) {
      const assignedDate = new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000);
      const dueDate = new Date(assignedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const isCompleted = Math.random() > 0.5;

      await prisma.homeworkAssignment.create({
        data: {
          participantId: participant.id,
          title: homeworkTitles[Math.floor(Math.random() * homeworkTitles.length)],
          assignedDate,
          dueDate,
          isCompleted,
          completedDate: isCompleted ? new Date() : null,
          assignedById: staff.id,
        },
      });
    }
    console.log(`Created homework for ${participant.firstName}`);
  }

  // Create destination outcomes
  const housingStatuses = ["STREET", "SHELTER", "TRANSITIONAL", "SRO", "SOBER_LIVING", "PERMANENT"] as const;
  const employmentStatuses = ["NONE", "TRAINING", "PART_TIME", "FULL_TIME"] as const;

  for (const participant of participants) {
    await prisma.destinationOutcome.create({
      data: {
        participantId: participant.id,
        housingStatus: housingStatuses[Math.floor(Math.random() * housingStatuses.length)],
        employmentStatus: employmentStatuses[Math.floor(Math.random() * employmentStatuses.length)],
        benefits: ["SNAP", "MEDI_CAL"].slice(0, Math.floor(Math.random() * 3)).join(","),
        documentsObtained: ["ID", "SSN_CARD", "BIRTH_CERT"].slice(0, Math.floor(Math.random() * 4)).join(","),
        recordedById: staff.id,
      },
    });
    console.log(`Created outcome for ${participant.firstName}`);
  }

  // Success story
  await prisma.destinationOutcome.create({
    data: {
      participantId: participants[3].id,
      housingStatus: "PERMANENT",
      employmentStatus: "FULL_TIME",
      benefits: "SNAP,MEDI_CAL",
      documentsObtained: "ID,SSN_CARD,BIRTH_CERT,BANK_ACCOUNT",
      notes: "Successfully transitioned to permanent housing and full-time employment!",
      recordedById: admin.id,
    },
  });
  console.log("Created success story outcome");

  console.log("\n✅ Database seeded successfully!");
  console.log("\nLogin credentials:");
  console.log("Admin: admin@sdrescue.org / admin123");
  console.log("Staff: staff@sdrescue.org / staff123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
