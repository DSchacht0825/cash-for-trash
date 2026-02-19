import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { getPaymentStatus } from "@/lib/payment-validation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  CreditCard,
  BookOpen,
  Home,
  Phone,
  Mail,
  Calendar,
  Edit,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getParticipant(id: string) {
  const participant = await prisma.participant.findUnique({
    where: { id },
    include: {
      shifts: {
        orderBy: { clockIn: "desc" },
        take: 10,
      },
      payments: {
        orderBy: { issuedAt: "desc" },
        take: 10,
      },
      homework: {
        orderBy: { assignedDate: "desc" },
        take: 10,
      },
      outcomes: {
        orderBy: { recordedAt: "desc" },
        take: 5,
      },
    },
  });

  return participant;
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default async function ParticipantDetailPage({ params }: PageProps) {
  const { id } = await params;
  const participant = await getParticipant(id);

  if (!participant) {
    notFound();
  }

  const paymentStatus = await getPaymentStatus(id);
  const totalBags = participant.shifts.reduce(
    (sum, s) => sum + s.bagsCollected,
    0
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/participants">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {participant.photoUrl && (
                <AvatarImage src={participant.photoUrl} />
              )}
              <AvatarFallback className="bg-[var(--primary)] text-white">
                {getInitials(participant.firstName, participant.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-[var(--primary)]">
                {participant.firstName} {participant.lastName}
                {participant.preferredName && (
                  <span className="text-lg font-normal text-[var(--muted-foreground)] ml-2">
                    &quot;{participant.preferredName}&quot;
                  </span>
                )}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {participant.isActive ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
                {paymentStatus.reachedLifetimeCap && (
                  <Badge variant="warning">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Cap Reached
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/participants/${id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      {/* Payment Cap Warning */}
      {paymentStatus.reachedLifetimeCap && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Payment Cap Reached</AlertTitle>
          <AlertDescription>
            This participant has received {formatCurrency(paymentStatus.lifetimeTotal)}
            and reached the ${paymentStatus.lifetimeCap.toLocaleString()} lifetime limit.
            No more payments can be issued.
          </AlertDescription>
        </Alert>
      )}

      {paymentStatus.paidThisWeek && !paymentStatus.reachedLifetimeCap && (
        <Alert variant="warning">
          <Clock className="h-4 w-4" />
          <AlertTitle>Already Paid This Week</AlertTitle>
          <AlertDescription>
            This participant has already received a payment this week.
            Next payment available on Sunday.
          </AlertDescription>
        </Alert>
      )}

      {/* Info Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {participant.phone ? (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-[var(--muted-foreground)]" />
                <span>{participant.phone}</span>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">No phone</p>
            )}
            {participant.email ? (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-[var(--muted-foreground)]" />
                <span>{participant.email}</span>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">No email</p>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-[var(--muted-foreground)]" />
              <span>Enrolled {formatDate(participant.enrollmentDate)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--primary)]">
              {formatCurrency(paymentStatus.lifetimeTotal)}
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              {paymentStatus.paymentsCount} of {paymentStatus.maxPayments} payments
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  paymentStatus.reachedLifetimeCap
                    ? "bg-amber-500"
                    : "bg-[var(--success)]"
                }`}
                style={{ width: `${paymentStatus.progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {paymentStatus.paymentsRemaining} payments remaining
            </p>
          </CardContent>
        </Card>

        {/* Work Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Work Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-[var(--primary)]">
                  {participant.shifts.length}
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Total Shifts
                </p>
              </div>
              <div>
                <div className="text-2xl font-bold text-[var(--primary)]">
                  {totalBags}
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Bags Collected
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="sm">
              <Link href={`/shifts/clock-in?participantId=${id}`}>
                <Clock className="h-4 w-4 mr-2" />
                Clock In
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="secondary"
              disabled={!paymentStatus.allowed}
            >
              <Link href={`/payments/new?participantId=${id}`}>
                <CreditCard className="h-4 w-4 mr-2" />
                Issue Payment
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/homework/new?participantId=${id}`}>
                <BookOpen className="h-4 w-4 mr-2" />
                Assign Homework
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/outcomes/new?participantId=${id}`}>
                <Home className="h-4 w-4 mr-2" />
                Record Outcome
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Shifts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Shifts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {participant.shifts.length === 0 ? (
            <p className="text-[var(--muted-foreground)]">No shifts yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Bags</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participant.shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>{formatDate(shift.clockIn)}</TableCell>
                    <TableCell>{formatDateTime(shift.clockIn)}</TableCell>
                    <TableCell>
                      {shift.clockOut ? formatDateTime(shift.clockOut) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>{shift.bagsCollected}</TableCell>
                    <TableCell>{shift.location || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Recent Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {participant.payments.length === 0 ? (
            <p className="text-[var(--muted-foreground)]">No payments yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participant.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDateTime(payment.issuedAt)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>{payment.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Homework */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Homework Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {participant.homework.length === 0 ? (
            <p className="text-[var(--muted-foreground)]">No homework assigned</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participant.homework.map((hw) => (
                  <TableRow key={hw.id}>
                    <TableCell className="font-medium">{hw.title}</TableCell>
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
                      ) : hw.dueDate && new Date(hw.dueDate) < new Date() ? (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Overdue
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {participant.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{participant.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
