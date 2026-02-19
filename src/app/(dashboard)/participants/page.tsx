export const dynamic = 'force-dynamic';

import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate, formatCurrency } from "@/lib/utils";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, AlertTriangle } from "lucide-react";

const LIFETIME_CAP = 2000;

async function getParticipants() {
  const participants = await prisma.participant.findMany({
    orderBy: { lastName: "asc" },
    include: {
      _count: {
        select: { shifts: true, payments: true },
      },
      payments: {
        select: { amount: true },
      },
    },
  });

  return participants.map((p) => ({
    ...p,
    totalEarnings: p.payments.reduce((sum, payment) => sum + payment.amount, 0),
    paymentsCount: p._count.payments,
    shiftsCount: p._count.shifts,
    reachedCap: p.payments.reduce((sum, payment) => sum + payment.amount, 0) >= LIFETIME_CAP,
  }));
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default async function ParticipantsPage() {
  const participants = await getParticipants();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)]">
            Participants
          </h1>
          <p className="text-[var(--muted-foreground)]">
            {participants.length} total participants
          </p>
        </div>
        <Button asChild>
          <Link href="/participants/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Participant
          </Link>
        </Button>
      </div>

      {/* Participants Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Participants</CardTitle>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">
              <p>No participants yet.</p>
              <Button asChild className="mt-4">
                <Link href="/participants/new">Add First Participant</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Shifts</TableHead>
                  <TableHead>Total Earned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {participant.photoUrl && (
                            <AvatarImage src={participant.photoUrl} />
                          )}
                          <AvatarFallback className="bg-[var(--primary)] text-white text-xs">
                            {getInitials(
                              participant.firstName,
                              participant.lastName
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {participant.firstName} {participant.lastName}
                          </p>
                          {participant.preferredName && (
                            <p className="text-sm text-[var(--muted-foreground)]">
                              &quot;{participant.preferredName}&quot;
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[var(--muted-foreground)]">
                      {formatDate(participant.enrollmentDate)}
                    </TableCell>
                    <TableCell>{participant.shiftsCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {formatCurrency(participant.totalEarnings)}
                        {participant.reachedCap && (
                          <span title="Reached $2,000 cap">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className={`h-1.5 rounded-full ${
                            participant.reachedCap
                              ? "bg-amber-500"
                              : "bg-[var(--success)]"
                          }`}
                          style={{
                            width: `${Math.min(
                              (participant.totalEarnings / LIFETIME_CAP) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {participant.reachedCap ? (
                        <Badge variant="warning">Cap Reached</Badge>
                      ) : participant.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/participants/${participant.id}`}>
                          View
                        </Link>
                      </Button>
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
