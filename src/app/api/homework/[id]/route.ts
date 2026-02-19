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
    const { isCompleted, title, description, dueDate, notes } = body;

    const homework = await prisma.homeworkAssignment.findUnique({
      where: { id },
    });

    if (!homework) {
      return NextResponse.json(
        { error: "Homework not found" },
        { status: 404 }
      );
    }

    const updateData: {
      isCompleted?: boolean;
      completedDate?: Date | null;
      title?: string;
      description?: string | null;
      dueDate?: Date | null;
      notes?: string | null;
    } = {};

    if (typeof isCompleted === "boolean") {
      updateData.isCompleted = isCompleted;
      updateData.completedDate = isCompleted ? new Date() : null;
    }

    if (title !== undefined) {
      updateData.title = title;
    }

    if (description !== undefined) {
      updateData.description = description || null;
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    const updatedHomework = await prisma.homeworkAssignment.update({
      where: { id },
      data: updateData,
      include: {
        participant: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(updatedHomework);
  } catch (error) {
    console.error("Error updating homework:", error);
    return NextResponse.json(
      { error: "Failed to update homework" },
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

    await prisma.homeworkAssignment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting homework:", error);
    return NextResponse.json(
      { error: "Failed to delete homework" },
      { status: 500 }
    );
  }
}
