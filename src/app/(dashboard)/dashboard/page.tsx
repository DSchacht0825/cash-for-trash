import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { getStartOfWeek, getEndOfWeek, formatDateTime } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock,
  CreditCard,
  Plus,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

async function getDashboardStats() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const weekStart = getStartOfWeek();
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = getEndOfWeek();
  weekEnd.setHours(23, 59, 59, 999);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Run all queries in parallel
  const [
    activeParticipants,
    clockedInNow,
    bagsToday,
    paymentsThisWeek,
    overdueHomework,
    housedThisMonth,
    recentActivity,
  ] = await Promise.all([
    // Active participants
    prisma.participant.count({
      where: { isActive: true },
    }),

    // Currently clocked in (no clockOut)
    prisma.shift.count({
      where: { clockOut: null },
    }),

    // Bags collected today
    prisma.shift.aggregate({
      where: {
        clockIn: { gte: today, lt: tomorrow },
      },
      _sum: { bagsCollected: true },
    }),

    // Payments this week
    prisma.giftCardPayment.aggregate({
      where: {
        issuedAt: { gte: weekStart, lte: weekEnd },
      },
      _sum: { amount: true },
      _count: true,
    }),

    // Overdue homework (past due date, not completed)
    prisma.homeworkAssignment.count({
      where: {
        dueDate: { lt: now },
        isCompleted: false,
      },
    }),

    // Housed this month (moved to permanent, SRO, sober living, ILF, or transitional)
    prisma.destinationOutcome.count({
      where: {
        recordedAt: { gte: monthStart, lte: monthEnd },
        housingStatus: {
          in: ["PERMANENT", "SRO", "SOBER_LIVING", "ILF", "TRANSITIONAL"],
        },
      },
    }),

    // Recent activity (last 10 events)
    getRecentActivity(),
  ]);

  return {
    activeParticipants,
    clockedInNow,
    bagsToday: bagsToday._sum.bagsCollected || 0,
    paidThisWeek: paymentsThisWeek._sum.amount || 0,
    paymentsCountThisWeek: paymentsThisWeek._count || 0,
    overdueHomework,
    housedThisMonth,
    recentActivity,
  };
}

async function getRecentActivity() {
  // Get recent shifts, payments, and participants
  const [recentShifts, recentPayments, recentParticipants] = await Promise.all([
    prisma.shift.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: {
        participant: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.giftCardPayment.findMany({
      take: 5,
      orderBy: { issuedAt: "desc" },
      include: {
        participant: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.participant.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { firstName: true, lastName: true, createdAt: true },
    }),
  ]);

  // Combine and sort by date
  const activities: Array<{
    type: "shift_in" | "shift_out" | "payment" | "enrolled";
    description: string;
    timestamp: Date;
  }> = [];

  recentShifts.forEach((shift) => {
    const name = `${shift.participant.firstName} ${shift.participant.lastName.charAt(0)}.`;
    if (shift.clockOut) {
      activities.push({
        type: "shift_out",
        description: `${name} clocked out - ${shift.bagsCollected} bags collected`,
        timestamp: shift.clockOut,
      });
    } else {
      activities.push({
        type: "shift_in",
        description: `${name} clocked in`,
        timestamp: shift.clockIn,
      });
    }
  });

  recentPayments.forEach((payment) => {
    const name = `${payment.participant.firstName} ${payment.participant.lastName.charAt(0)}.`;
    activities.push({
      type: "payment",
      description: `${name} received $${payment.amount} Visa card`,
      timestamp: payment.issuedAt,
    });
  });

  recentParticipants.forEach((participant) => {
    activities.push({
      type: "enrolled",
      description: `New participant enrolled: ${participant.firstName} ${participant.lastName.charAt(0)}.`,
      timestamp: participant.createdAt,
    });
  });

  // Sort by timestamp descending and take top 10
  return activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case "shift_in":
      return <Clock className="h-4 w-4 text-green-500" />;
    case "shift_out":
      return <Clock className="h-4 w-4 text-blue-500" />;
    case "payment":
      return <CreditCard className="h-4 w-4 text-[var(--secondary)]" />;
    case "enrolled":
      return <UserPlus className="h-4 w-4 text-[var(--primary)]" />;
    default:
      return null;
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--primary)]">Dashboard</h1>
        <p className="text-[var(--muted-foreground)]">
          Program overview and quick actions
        </p>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Active Participants"
          value={stats.activeParticipants}
          icon="users"
          href="/participants"
        />
        <StatCard
          title="Clocked In Now"
          value={stats.clockedInNow}
          icon="clock"
          href="/shifts"
        />
        <StatCard
          title="Bags Today"
          value={stats.bagsToday}
          icon="shopping-bag"
          href="/reports"
        />
        <StatCard
          title="Paid This Week"
          value={`$${stats.paidThisWeek.toLocaleString()}`}
          icon="credit-card"
          href="/payments"
          description={`${stats.paymentsCountThisWeek} payments issued`}
        />
        <StatCard
          title="Homework Overdue"
          value={stats.overdueHomework}
          icon="book-open"
          href="/homework?filter=overdue"
        />
        <StatCard
          title="Housed This Month"
          value={stats.housedThisMonth}
          icon="home"
          href="/outcomes"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/shifts/clock-in">
                <Clock className="h-4 w-4 mr-2" />
                Clock In Worker
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/payments/new">
                <CreditCard className="h-4 w-4 mr-2" />
                Issue Payment
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/participants/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Participant
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading activity...</div>}>
            <div className="space-y-3">
              {stats.recentActivity.length === 0 ? (
                <p className="text-[var(--muted-foreground)] text-sm">
                  No recent activity
                </p>
              ) : (
                stats.recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <ActivityIcon type={activity.type} />
                      <span className="text-sm">{activity.description}</span>
                    </div>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {formatDateTime(activity.timestamp)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
