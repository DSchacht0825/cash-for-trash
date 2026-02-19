import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get("participantId");
    const filter = searchParams.get("filter");

    const where: {
      participantId?: string;
      isCompleted?: boolean;
      dueDate?: { lt: Date };
    } = {};

    if (participantId) {
      where.participantId = participantId;
    }

    if (filter === "overdue") {
      where.isCompleted = false;
      where.dueDate = { lt: new Date() };
    } else if (filter === "pending") {
      where.isCompleted = false;
    } else if (filter === "completed") {
      where.isCompleted = true;
    }

    const homework = await prisma.homeworkAssignment.findMany({
      where,
      orderBy: [{ isCompleted: "asc" }, { dueDate: "asc" }, { assignedDate: "desc" }],
      include: {
        participant: {
          select: { id: true, firstName: true, lastName: true },
        },
        assignedBy: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(homework);
  } catch (error) {
    console.error("Error fetching homework:", error);
    return NextResponse.json(
      { error: "Failed to fetch homework" },
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
    const { participantId, title, description, dueDate, notes } = body;

    if (!participantId || !title) {
      return NextResponse.json(
        { error: "Participant and title are required" },
        { status: 400 }
      );
    }

    const homework = await prisma.homeworkAssignment.create({
      data: {
        participantId,
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        assignedById: session.user.id,
      },
      include: {
        participant: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(homework, { status: 201 });
  } catch (error) {
    console.error("Error creating homework:", error);
    return NextResponse.json(
      { error: "Failed to create homework" },
      { status: 500 }
    );
  }
}
