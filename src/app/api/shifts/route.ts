import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";
    const participantId = searchParams.get("participantId");

    const where: {
      clockOut?: null;
      participantId?: string;
    } = {};

    if (activeOnly) {
      where.clockOut = null;
    }

    if (participantId) {
      where.participantId = participantId;
    }

    const shifts = await prisma.shift.findMany({
      where,
      orderBy: { clockIn: "desc" },
      include: {
        participant: {
          select: { firstName: true, lastName: true, preferredName: true },
        },
      },
    });

    return NextResponse.json(shifts);
  } catch (error) {
    console.error("Error fetching shifts:", error);
    return NextResponse.json(
      { error: "Failed to fetch shifts" },
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
    const { participantId, location, notes } = body;

    if (!participantId) {
      return NextResponse.json(
        { error: "Participant ID is required" },
        { status: 400 }
      );
    }

    // Check if participant exists
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Check if participant is already clocked in
    const activeShift = await prisma.shift.findFirst({
      where: {
        participantId,
        clockOut: null,
      },
    });

    if (activeShift) {
      return NextResponse.json(
        { error: "Participant is already clocked in" },
        { status: 400 }
      );
    }

    const shift = await prisma.shift.create({
      data: {
        participantId,
        location: location || null,
        notes: notes || null,
        createdById: session.user.id,
      },
      include: {
        participant: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error("Error creating shift:", error);
    return NextResponse.json(
      { error: "Failed to create shift" },
      { status: 500 }
    );
  }
}
