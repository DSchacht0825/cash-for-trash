import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get("participantId");

    const where: { participantId?: string } = {};

    if (participantId) {
      where.participantId = participantId;
    }

    const outcomes = await prisma.destinationOutcome.findMany({
      where,
      orderBy: { recordedAt: "desc" },
      include: {
        participant: {
          select: { id: true, firstName: true, lastName: true },
        },
        recordedBy: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(outcomes);
  } catch (error) {
    console.error("Error fetching outcomes:", error);
    return NextResponse.json(
      { error: "Failed to fetch outcomes" },
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
    const {
      participantId,
      housingStatus,
      otherHousingDetails,
      employmentStatus,
      benefits,
      documentsObtained,
      notes,
    } = body;

    if (!participantId) {
      return NextResponse.json(
        { error: "Participant ID is required" },
        { status: 400 }
      );
    }

    // Validate OTHER housing requires details
    if (housingStatus === "OTHER" && !otherHousingDetails) {
      return NextResponse.json(
        { error: "Please specify details for 'Other' housing status" },
        { status: 400 }
      );
    }

    const outcome = await prisma.destinationOutcome.create({
      data: {
        participantId,
        housingStatus: housingStatus || "STREET",
        otherHousingDetails: housingStatus === "OTHER" ? otherHousingDetails : null,
        employmentStatus: employmentStatus || "NONE",
        benefits: Array.isArray(benefits) ? benefits.join(",") : (benefits || ""),
        documentsObtained: Array.isArray(documentsObtained)
          ? documentsObtained.join(",")
          : (documentsObtained || ""),
        notes: notes || null,
        recordedById: session.user.id,
      },
      include: {
        participant: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(outcome, { status: 201 });
  } catch (error) {
    console.error("Error creating outcome:", error);
    return NextResponse.json(
      { error: "Failed to create outcome" },
      { status: 500 }
    );
  }
}
