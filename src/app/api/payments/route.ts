import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canIssuePayment, issuePayment } from "@/lib/payment-validation";

const PAYMENT_AMOUNT = 80;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const participantId = searchParams.get("participantId");

    const where: { participantId?: string } = {};

    if (participantId) {
      where.participantId = participantId;
    }

    const payments = await prisma.giftCardPayment.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      include: {
        participant: {
          select: { firstName: true, lastName: true },
        },
        issuedBy: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
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
    const { participantId, shiftId, notes } = body;

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

    // Validate payment eligibility
    const validation = await canIssuePayment(participantId);

    if (!validation.allowed) {
      return NextResponse.json(
        {
          error: validation.reason,
          validation: {
            lifetimeTotal: validation.lifetimeTotal,
            paymentsRemaining: validation.paymentsRemaining,
            paidThisWeek: validation.paidThisWeek,
            reachedLifetimeCap: validation.reachedLifetimeCap,
          },
        },
        { status: 400 }
      );
    }

    // Issue the payment
    const payment = await issuePayment(
      participantId,
      session.user.id,
      shiftId || undefined,
      notes || undefined
    );

    return NextResponse.json(
      {
        payment,
        message: `$${PAYMENT_AMOUNT} payment issued successfully`,
        remainingPayments: validation.paymentsRemaining - 1,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create payment" },
      { status: 500 }
    );
  }
}
