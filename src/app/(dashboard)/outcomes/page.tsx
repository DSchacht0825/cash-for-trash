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
import { Home, Plus, Briefcase, FileText, Gift } from "lucide-react";

const HOUSING_LABELS: Record<string, string> = {
  STREET: "Street/Unsheltered",
  SHELTER: "Shelter",
  TRANSITIONAL: "Transitional Housing",
  SRO: "SRO (Single Room Occupancy)",
  SOBER_LIVING: "Sober Living",
  ILF: "ILF (Independent Living Facility)",
  PERMANENT: "Permanent Housing",
  OTHER: "Other",
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  NONE: "None",
  TRAINING: "Training/Education",
  PART_TIME: "Part-Time",
  FULL_TIME: "Full-Time",
};

const HOUSING_COLORS: Record<string, string> = {
  STREET: "destructive",
  SHELTER: "warning",
  TRANSITIONAL: "secondary",
  SRO: "secondary",
  SOBER_LIVING: "secondary",
  ILF: "secondary",
  PERMANENT: "success",
  OTHER: "outline",
};

async function getOutcomes() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [outcomes, monthlyHoused] = await Promise.all([
    prisma.destinationOutcome.findMany({
      orderBy: { recordedAt: "desc" },
      take: 50,
      include: {
        participant: {
          select: { id: true, firstName: true, lastName: true },
        },
        recordedBy: {
          select: { name: true },
        },
      },
    }),
    prisma.destinationOutcome.count({
      where: {
        recordedAt: { gte: monthStart },
        housingStatus: {
          in: ["PERMANENT", "SRO", "SOBER_LIVING", "ILF", "TRANSITIONAL"],
        },
      },
    }),
  ]);

  // Get housing status breakdown
  const housingBreakdown = await prisma.destinationOutcome.groupBy({
    by: ["housingStatus"],
    _count: true,
    orderBy: { _count: { housingStatus: "desc" } },
  });

  return { outcomes, monthlyHoused, housingBreakdown };
}

export default async function OutcomesPage() {
  const { outcomes, monthlyHoused, housingBreakdown } = await getOutcomes();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)]">
            Destination Outcomes
          </h1>
          <p className="text-[var(--muted-foreground)]">
            Track housing, employment, benefits, and documents
          </p>
        </div>
        <Button asChild>
          <Link href="/outcomes/new">
            <Plus className="h-4 w-4 mr-2" />
            Record Outcome
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              Housed This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{monthlyHoused}</div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Moved to housing (non-street/shelter)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              Housing Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {housingBreakdown.slice(0, 4).map((item) => (
                <Badge
                  key={item.housingStatus}
                  variant={HOUSING_COLORS[item.housingStatus] as "destructive" | "warning" | "secondary" | "success" | "outline" | "default"}
                >
                  {HOUSING_LABELS[item.housingStatus]}: {item._count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outcomes.length}</div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Outcome records
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Outcomes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Outcome Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {outcomes.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">
              <p>No outcomes recorded yet.</p>
              <Button asChild className="mt-4">
                <Link href="/outcomes/new">Record First Outcome</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Housing</TableHead>
                  <TableHead>Employment</TableHead>
                  <TableHead>Benefits</TableHead>
                  <TableHead>Documents</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outcomes.map((outcome) => {
                  const benefits = outcome.benefits
                    ? outcome.benefits.split(",").filter(Boolean)
                    : [];
                  const documents = outcome.documentsObtained
                    ? outcome.documentsObtained.split(",").filter(Boolean)
                    : [];

                  return (
                    <TableRow key={outcome.id}>
                      <TableCell>{formatDate(outcome.recordedAt)}</TableCell>
                      <TableCell>
                        <Link
                          href={`/participants/${outcome.participant.id}`}
                          className="font-medium hover:underline"
                        >
                          {outcome.participant.firstName}{" "}
                          {outcome.participant.lastName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={HOUSING_COLORS[outcome.housingStatus] as "destructive" | "warning" | "secondary" | "success" | "outline" | "default"}
                        >
                          <Home className="h-3 w-3 mr-1" />
                          {HOUSING_LABELS[outcome.housingStatus]}
                        </Badge>
                        {outcome.housingStatus === "OTHER" &&
                          outcome.otherHousingDetails && (
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">
                              {outcome.otherHousingDetails}
                            </p>
                          )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <Briefcase className="h-3 w-3 mr-1" />
                          {EMPLOYMENT_LABELS[outcome.employmentStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {benefits.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {benefits.map((b) => (
                              <Badge key={b} variant="secondary" className="text-xs">
                                <Gift className="h-2 w-2 mr-1" />
                                {b.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {documents.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {documents.map((d) => (
                              <Badge key={d} variant="outline" className="text-xs">
                                <FileText className="h-2 w-2 mr-1" />
                                {d.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">-</span>
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
