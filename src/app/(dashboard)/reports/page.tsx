export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/db";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Users,
  ShoppingBag,
  CreditCard,
  Home,
  TrendingUp,
} from "lucide-react";
import { ExportButton } from "./export-button";

async function getReportData() {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // Monthly data
  const [
    thisMonthShifts,
    lastMonthShifts,
    thisMonthPayments,
    lastMonthPayments,
    thisMonthParticipants,
    thisMonthHoused,
    topContributors,
    participantsAtCap,
  ] = await Promise.all([
    // This month shifts and bags
    prisma.shift.aggregate({
      where: { clockIn: { gte: currentMonth } },
      _count: true,
      _sum: { bagsCollected: true },
    }),

    // Last month shifts and bags
    prisma.shift.aggregate({
      where: { clockIn: { gte: lastMonth, lte: lastMonthEnd } },
      _count: true,
      _sum: { bagsCollected: true },
    }),

    // This month payments
    prisma.giftCardPayment.aggregate({
      where: { issuedAt: { gte: currentMonth } },
      _sum: { amount: true },
      _count: true,
    }),

    // Last month payments
    prisma.giftCardPayment.aggregate({
      where: { issuedAt: { gte: lastMonth, lte: lastMonthEnd } },
      _sum: { amount: true },
      _count: true,
    }),

    // New participants this month
    prisma.participant.count({
      where: { enrollmentDate: { gte: currentMonth } },
    }),

    // Housed this month
    prisma.destinationOutcome.count({
      where: {
        recordedAt: { gte: currentMonth },
        housingStatus: {
          in: ["PERMANENT", "SRO", "SOBER_LIVING", "ILF", "TRANSITIONAL"],
        },
      },
    }),

    // Top contributors this month
    prisma.shift.groupBy({
      by: ["participantId"],
      where: { clockIn: { gte: currentMonth } },
      _sum: { bagsCollected: true },
      _count: true,
      orderBy: { _sum: { bagsCollected: "desc" } },
      take: 10,
    }),

    // Participants at lifetime cap
    prisma.participant.findMany({
      where: { isActive: true },
      include: {
        payments: { select: { amount: true } },
      },
    }).then((participants) =>
      participants.filter(
        (p) => p.payments.reduce((sum, pay) => sum + pay.amount, 0) >= 2000
      )
    ),
  ]);

  // Get participant names for top contributors
  const participantIds = topContributors.map((c) => c.participantId);
  const participantNames = await prisma.participant.findMany({
    where: { id: { in: participantIds } },
    select: { id: true, firstName: true, lastName: true },
  });

  const topContributorsWithNames = topContributors.map((c) => {
    const participant = participantNames.find((p) => p.id === c.participantId);
    return {
      ...c,
      name: participant
        ? `${participant.firstName} ${participant.lastName}`
        : "Unknown",
    };
  });

  return {
    thisMonth: {
      shifts: thisMonthShifts._count || 0,
      bags: thisMonthShifts._sum.bagsCollected || 0,
      payments: thisMonthPayments._count || 0,
      paymentTotal: thisMonthPayments._sum.amount || 0,
      newParticipants: thisMonthParticipants,
      housed: thisMonthHoused,
    },
    lastMonth: {
      shifts: lastMonthShifts._count || 0,
      bags: lastMonthShifts._sum.bagsCollected || 0,
      payments: lastMonthPayments._count || 0,
      paymentTotal: lastMonthPayments._sum.amount || 0,
    },
    topContributors: topContributorsWithNames,
    participantsAtCap,
  };
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export default async function ReportsPage() {
  const data = await getReportData();

  const monthName = new Date().toLocaleString("default", { month: "long" });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)]">
            Monthly Reports
          </h1>
          <p className="text-[var(--muted-foreground)]">
            {monthName} {new Date().getFullYear()} Summary
          </p>
        </div>
        <ExportButton data={data} month={monthName} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)] flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Bags Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.thisMonth.bags}</div>
            <div className="flex items-center gap-1 text-sm mt-1">
              <TrendingUp
                className={`h-4 w-4 ${
                  calculateChange(data.thisMonth.bags, data.lastMonth.bags) >= 0
                    ? "text-green-600"
                    : "text-red-600 rotate-180"
                }`}
              />
              <span
                className={
                  calculateChange(data.thisMonth.bags, data.lastMonth.bags) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {calculateChange(data.thisMonth.bags, data.lastMonth.bags)}% vs
                last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)] flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(data.thisMonth.paymentTotal)}
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {data.thisMonth.payments} payments issued
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)] flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Shifts Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.thisMonth.shifts}</div>
            <div className="flex items-center gap-1 text-sm mt-1">
              <TrendingUp
                className={`h-4 w-4 ${
                  calculateChange(data.thisMonth.shifts, data.lastMonth.shifts) >= 0
                    ? "text-green-600"
                    : "text-red-600 rotate-180"
                }`}
              />
              <span
                className={
                  calculateChange(data.thisMonth.shifts, data.lastMonth.shifts) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {calculateChange(data.thisMonth.shifts, data.lastMonth.shifts)}%
                vs last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)] flex items-center gap-2">
              <Users className="h-4 w-4" />
              New Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.thisMonth.newParticipants}
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Enrolled this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)] flex items-center gap-2">
              <Home className="h-4 w-4" />
              Housing Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {data.thisMonth.housed}
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Moved to housing
            </p>
          </CardContent>
        </Card>

        <Card className={data.participantsAtCap.length > 0 ? "border-amber-500" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              At Lifetime Cap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {data.participantsAtCap.length}
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Reached $2,000 limit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Contributors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Contributors - {monthName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.topContributors.length === 0 ? (
            <p className="text-[var(--muted-foreground)]">
              No shift data this month
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Shifts</TableHead>
                  <TableHead>Bags Collected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topContributors.map((contributor, index) => (
                  <TableRow key={contributor.participantId}>
                    <TableCell>
                      {index === 0 ? (
                        <Badge variant="secondary">1st</Badge>
                      ) : index === 1 ? (
                        <Badge variant="outline">2nd</Badge>
                      ) : index === 2 ? (
                        <Badge variant="outline">3rd</Badge>
                      ) : (
                        `${index + 1}th`
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {contributor.name}
                    </TableCell>
                    <TableCell>{contributor._count}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-[var(--muted-foreground)]" />
                        {contributor._sum.bagsCollected}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Participants at Cap */}
      {data.participantsAtCap.length > 0 && (
        <Card className="border-amber-500">
          <CardHeader>
            <CardTitle className="text-amber-700">
              Participants at $2,000 Lifetime Cap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.participantsAtCap.map((p) => (
                <Badge key={p.id} variant="warning">
                  {p.firstName} {p.lastName}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mt-3">
              These participants have completed the program and cannot receive
              additional payments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
