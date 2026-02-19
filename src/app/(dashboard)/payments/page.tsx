export const dynamic = 'force-dynamic';

import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatCurrency, getStartOfWeek, getEndOfWeek } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, AlertTriangle } from "lucide-react";

const LIFETIME_CAP = 2000;

async function getPayments() {
  const weekStart = getStartOfWeek();
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = getEndOfWeek();
  weekEnd.setHours(23, 59, 59, 999);

  const [payments, weeklyStats, participantsAtCap] = await Promise.all([
    prisma.giftCardPayment.findMany({
      orderBy: { issuedAt: "desc" },
      take: 50,
      include: {
        participant: {
          select: { id: true, firstName: true, lastName: true },
        },
        issuedBy: {
          select: { name: true },
        },
      },
    }),
    prisma.giftCardPayment.aggregate({
      where: {
        issuedAt: { gte: weekStart, lte: weekEnd },
      },
      _sum: { amount: true },
      _count: true,
    }),
    // Get participants who have reached the cap
    prisma.participant.findMany({
      where: { isActive: true },
      include: {
        payments: {
          select: { amount: true },
        },
      },
    }).then((participants) =>
      participants.filter(
        (p) => p.payments.reduce((sum, pay) => sum + pay.amount, 0) >= LIFETIME_CAP
      )
    ),
  ]);

  return {
    payments,
    weeklyTotal: weeklyStats._sum.amount || 0,
    weeklyCount: weeklyStats._count || 0,
    participantsAtCap,
  };
}

export default async function PaymentsPage() {
  const { payments, weeklyTotal, weeklyCount, participantsAtCap } = await getPayments();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)]">Payments</h1>
          <p className="text-[var(--muted-foreground)]">
            $80 prepaid Visa cards - Weekly limit, $2,000 lifetime cap
          </p>
        </div>
        <Button asChild>
          <Link href="/payments/new">
            <Plus className="h-4 w-4 mr-2" />
            Issue Payment
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(weeklyTotal)}</div>
            <p className="text-xs text-[var(--muted-foreground)]">
              {weeklyCount} payments issued
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              Payment Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$80</div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Fixed per payment
            </p>
          </CardContent>
        </Card>

        <Card className={participantsAtCap.length > 0 ? "border-amber-500" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)] flex items-center gap-2">
              {participantsAtCap.length > 0 && (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              At Lifetime Cap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{participantsAtCap.length}</div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Participants reached $2,000
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cap Alert */}
      {participantsAtCap.length > 0 && (
        <Card className="border-amber-500 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Participants at Lifetime Cap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {participantsAtCap.map((p) => (
                <Link key={p.id} href={`/participants/${p.id}`}>
                  <Badge variant="warning" className="cursor-pointer">
                    {p.firstName} {p.lastName}
                  </Badge>
                </Link>
              ))}
            </div>
            <p className="text-sm text-amber-700 mt-2">
              These participants have received $2,000 and cannot receive additional payments.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">
              <p>No payments issued yet.</p>
              <Button asChild className="mt-4">
                <Link href="/payments/new">Issue First Payment</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Issued By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDateTime(payment.issuedAt)}</TableCell>
                    <TableCell>
                      <Link
                        href={`/participants/${payment.participant.id}`}
                        className="font-medium hover:underline"
                      >
                        {payment.participant.firstName}{" "}
                        {payment.participant.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>{payment.issuedBy?.name || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {payment.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
