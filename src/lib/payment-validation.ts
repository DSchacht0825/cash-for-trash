import { prisma } from "./db";
import { getStartOfWeek, getEndOfWeek } from "./utils";

const PAYMENT_AMOUNT = 80;
const LIFETIME_CAP = 2000;
const MAX_PAYMENTS = Math.floor(LIFETIME_CAP / PAYMENT_AMOUNT); // 25 payments

export interface PaymentValidationResult {
  allowed: boolean;
  reason?: string;
  lifetimeTotal: number;
  paymentsCount: number;
  paymentsRemaining: number;
  paidThisWeek: boolean;
  reachedLifetimeCap: boolean;
}

export async function canIssuePayment(
  participantId: string
): Promise<PaymentValidationResult> {
  // Get all payments for this participant
  const payments = await prisma.giftCardPayment.findMany({
    where: { participantId },
    select: { amount: true, issuedAt: true },
  });

  // Calculate lifetime total
  const lifetimeTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const paymentsCount = payments.length;

  // Check lifetime cap
  if (lifetimeTotal >= LIFETIME_CAP) {
    return {
      allowed: false,
      reason: `Participant has reached the $${LIFETIME_CAP.toLocaleString()} lifetime limit. No more payments can be issued.`,
      lifetimeTotal,
      paymentsCount,
      paymentsRemaining: 0,
      paidThisWeek: false,
      reachedLifetimeCap: true,
    };
  }

  // Check if already paid this week (Sunday-Saturday)
  const weekStart = getStartOfWeek();
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = getEndOfWeek();
  weekEnd.setHours(23, 59, 59, 999);

  const paidThisWeek = payments.some((p) => {
    const paymentDate = new Date(p.issuedAt);
    return paymentDate >= weekStart && paymentDate <= weekEnd;
  });

  if (paidThisWeek) {
    return {
      allowed: false,
      reason: "Participant has already received a payment this week. Next payment available next Sunday.",
      lifetimeTotal,
      paymentsCount,
      paymentsRemaining: Math.floor((LIFETIME_CAP - lifetimeTotal) / PAYMENT_AMOUNT),
      paidThisWeek: true,
      reachedLifetimeCap: false,
    };
  }

  // Payment allowed
  return {
    allowed: true,
    lifetimeTotal,
    paymentsCount,
    paymentsRemaining: Math.floor((LIFETIME_CAP - lifetimeTotal) / PAYMENT_AMOUNT),
    paidThisWeek: false,
    reachedLifetimeCap: false,
  };
}

export async function getPaymentStatus(participantId: string) {
  const validation = await canIssuePayment(participantId);

  return {
    ...validation,
    maxPayments: MAX_PAYMENTS,
    paymentAmount: PAYMENT_AMOUNT,
    lifetimeCap: LIFETIME_CAP,
    progressPercentage: Math.round((validation.lifetimeTotal / LIFETIME_CAP) * 100),
  };
}

export async function issuePayment(
  participantId: string,
  issuedById: string,
  shiftId?: string,
  notes?: string
) {
  // Validate first
  const validation = await canIssuePayment(participantId);

  if (!validation.allowed) {
    throw new Error(validation.reason);
  }

  // Create the payment
  const payment = await prisma.giftCardPayment.create({
    data: {
      participantId,
      amount: PAYMENT_AMOUNT,
      issuedById,
      shiftId,
      notes,
    },
    include: {
      participant: true,
      issuedBy: true,
    },
  });

  return payment;
}
