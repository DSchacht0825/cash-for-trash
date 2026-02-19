export const dynamic = 'force-dynamic';

import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
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
import { BookOpen, Plus, CheckCircle2, XCircle, Clock } from "lucide-react";
import { HomeworkToggle } from "./homework-toggle";

async function getHomework(filter?: string) {
  const where: {
    isCompleted?: boolean;
    dueDate?: { lt: Date };
  } = {};

  if (filter === "overdue") {
    where.isCompleted = false;
    where.dueDate = { lt: new Date() };
  } else if (filter === "pending") {
    where.isCompleted = false;
  } else if (filter === "completed") {
    where.isCompleted = true;
  }

  const [homework, stats] = await Promise.all([
    prisma.homeworkAssignment.findMany({
      where,
      orderBy: [{ isCompleted: "asc" }, { dueDate: "asc" }, { assignedDate: "desc" }],
      include: {
        participant: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    }),
    prisma.homeworkAssignment.groupBy({
      by: ["isCompleted"],
      _count: true,
    }),
  ]);

  const overdue = await prisma.homeworkAssignment.count({
    where: {
      isCompleted: false,
      dueDate: { lt: new Date() },
    },
  });

  return {
    homework,
    stats: {
      total: stats.reduce((sum, s) => sum + s._count, 0),
      completed: stats.find((s) => s.isCompleted)?._count || 0,
      pending: stats.find((s) => !s.isCompleted)?._count || 0,
      overdue,
    },
  };
}

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function HomeworkPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { homework, stats } = await getHomework(params.filter);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)]">
            Homework Tracking
          </h1>
          <p className="text-[var(--muted-foreground)]">
            Manage participant homework assignments
          </p>
        </div>
        <Button asChild>
          <Link href="/homework/new">
            <Plus className="h-4 w-4 mr-2" />
            Assign Homework
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link href="/homework">
          <Card className={!params.filter ? "border-[var(--primary)]" : ""}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-[var(--muted-foreground)]">Total</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/homework?filter=pending">
          <Card className={params.filter === "pending" ? "border-[var(--primary)]" : ""}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-sm text-[var(--muted-foreground)]">Pending</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/homework?filter=overdue">
          <Card className={params.filter === "overdue" ? "border-red-500" : stats.overdue > 0 ? "border-red-300" : ""}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <p className="text-sm text-[var(--muted-foreground)]">Overdue</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/homework?filter=completed">
          <Card className={params.filter === "completed" ? "border-green-500" : ""}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <p className="text-sm text-[var(--muted-foreground)]">Completed</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Homework Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {params.filter === "overdue"
              ? "Overdue Assignments"
              : params.filter === "pending"
              ? "Pending Assignments"
              : params.filter === "completed"
              ? "Completed Assignments"
              : "All Assignments"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {homework.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">
              <p>No homework assignments found.</p>
              <Button asChild className="mt-4">
                <Link href="/homework/new">Assign Homework</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {homework.map((hw) => {
                  const isOverdue =
                    !hw.isCompleted &&
                    hw.dueDate &&
                    new Date(hw.dueDate) < new Date();

                  return (
                    <TableRow key={hw.id}>
                      <TableCell>
                        <HomeworkToggle
                          id={hw.id}
                          isCompleted={hw.isCompleted}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className={hw.isCompleted ? "line-through text-[var(--muted-foreground)]" : ""}>
                          {hw.title}
                        </span>
                        {hw.description && (
                          <p className="text-xs text-[var(--muted-foreground)] mt-1">
                            {hw.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/participants/${hw.participant.id}`}
                          className="hover:underline"
                        >
                          {hw.participant.firstName} {hw.participant.lastName}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(hw.assignedDate)}</TableCell>
                      <TableCell>
                        {hw.dueDate ? formatDate(hw.dueDate) : "-"}
                      </TableCell>
                      <TableCell>
                        {hw.isCompleted ? (
                          <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        ) : isOverdue ? (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Overdue
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
