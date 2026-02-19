import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatTime } from "@/lib/utils";
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
import { Clock, Plus, ShoppingBag } from "lucide-react";
import { ClockOutButton } from "./clock-out-button";

async function getShifts() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [activeShifts, recentShifts] = await Promise.all([
    prisma.shift.findMany({
      where: { clockOut: null },
      orderBy: { clockIn: "desc" },
      include: {
        participant: {
          select: { id: true, firstName: true, lastName: true, preferredName: true },
        },
      },
    }),
    prisma.shift.findMany({
      where: {
        clockOut: { not: null },
      },
      orderBy: { clockOut: "desc" },
      take: 20,
      include: {
        participant: {
          select: { id: true, firstName: true, lastName: true, preferredName: true },
        },
      },
    }),
  ]);

  return { activeShifts, recentShifts };
}

export default async function ShiftsPage() {
  const { activeShifts, recentShifts } = await getShifts();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)]">Shifts</h1>
          <p className="text-[var(--muted-foreground)]">
            Manage worker shifts and bag collection
          </p>
        </div>
        <Button asChild>
          <Link href="/shifts/clock-in">
            <Clock className="h-4 w-4 mr-2" />
            Clock In Worker
          </Link>
        </Button>
      </div>

      {/* Active Shifts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Currently Clocked In ({activeShifts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeShifts.length === 0 ? (
            <p className="text-[var(--muted-foreground)]">
              No workers currently clocked in
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Bags</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeShifts.map((shift) => {
                  const duration = Math.floor(
                    (Date.now() - new Date(shift.clockIn).getTime()) / 1000 / 60
                  );
                  const hours = Math.floor(duration / 60);
                  const minutes = duration % 60;

                  return (
                    <TableRow key={shift.id}>
                      <TableCell>
                        <Link
                          href={`/participants/${shift.participant.id}`}
                          className="font-medium hover:underline"
                        >
                          {shift.participant.firstName}{" "}
                          {shift.participant.lastName}
                        </Link>
                        {shift.participant.preferredName && (
                          <span className="text-sm text-[var(--muted-foreground)] ml-1">
                            ({shift.participant.preferredName})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{formatTime(shift.clockIn)}</TableCell>
                      <TableCell>
                        {hours > 0 ? `${hours}h ` : ""}
                        {minutes}m
                      </TableCell>
                      <TableCell>{shift.location || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{shift.bagsCollected}</Badge>
                      </TableCell>
                      <TableCell>
                        <ClockOutButton
                          shiftId={shift.id}
                          currentBags={shift.bagsCollected}
                          participantName={`${shift.participant.firstName} ${shift.participant.lastName}`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Completed Shifts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Completed Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          {recentShifts.length === 0 ? (
            <p className="text-[var(--muted-foreground)]">
              No completed shifts yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Bags</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentShifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>
                      <Link
                        href={`/participants/${shift.participant.id}`}
                        className="font-medium hover:underline"
                      >
                        {shift.participant.firstName}{" "}
                        {shift.participant.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(shift.clockIn)}</TableCell>
                    <TableCell>{formatTime(shift.clockIn)}</TableCell>
                    <TableCell>
                      {shift.clockOut ? formatTime(shift.clockOut) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ShoppingBag className="h-4 w-4 text-[var(--muted-foreground)]" />
                        {shift.bagsCollected}
                      </div>
                    </TableCell>
                    <TableCell>{shift.location || "-"}</TableCell>
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
