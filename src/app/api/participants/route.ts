import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const participants = await prisma.participant.findMany({
      orderBy: { lastName: "asc" },
      include: {
        _count: {
          select: { shifts: true, payments: true },
        },
      },
    });

    return NextResponse.json(participants);
  } catch (error) {
    console.error("Error fetching participants:", error);
    return NextResponse.json(
      { error: "Failed to fetch participants" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, preferredName, phone, email, notes } = body;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    const participant = await prisma.participant.create({
      data: {
        firstName,
        lastName,
        preferredName: preferredName || null,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    console.error("Error creating participant:", error);
    return NextResponse.json(
      { error: "Failed to create participant" },
      { status: 500 }
    );
  }
}
