import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { bagsCollected, clockOut, notes, location } = body;

    const shift = await prisma.shift.findUnique({
      where: { id },
    });

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    const updateData: {
      bagsCollected?: number;
      clockOut?: Date;
      notes?: string;
      location?: string;
    } = {};

    if (typeof bagsCollected === "number") {
      updateData.bagsCollected = bagsCollected;
    }

    if (clockOut) {
      updateData.clockOut = new Date();
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (location !== undefined) {
      updateData.location = location;
    }

    const updatedShift = await prisma.shift.update({
      where: { id },
      data: updateData,
      include: {
        participant: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(updatedShift);
  } catch (error) {
    console.error("Error updating shift:", error);
    return NextResponse.json(
      { error: "Failed to update shift" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.shift.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shift:", error);
    return NextResponse.json(
      { error: "Failed to delete shift" },
      { status: 500 }
    );
  }
}
