"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ExportData {
  thisMonth: {
    shifts: number;
    bags: number;
    payments: number;
    paymentTotal: number;
    newParticipants: number;
    housed: number;
  };
  lastMonth: {
    shifts: number;
    bags: number;
    payments: number;
    paymentTotal: number;
  };
  topContributors: Array<{
    participantId: string;
    name: string;
    _count: number;
    _sum: { bagsCollected: number | null };
  }>;
  participantsAtCap: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
}

interface ExportButtonProps {
  data: ExportData;
  month: string;
}

export function ExportButton({ data, month }: ExportButtonProps) {
  const handleExport = () => {
    const year = new Date().getFullYear();

    // Create CSV content
    let csv = `Cash for Trash Monthly Report - ${month} ${year}\n\n`;

    // Summary section
    csv += "MONTHLY SUMMARY\n";
    csv += `Metric,This Month,Last Month,Change\n`;
    csv += `Bags Collected,${data.thisMonth.bags},${data.lastMonth.bags},${data.thisMonth.bags - data.lastMonth.bags}\n`;
    csv += `Shifts Completed,${data.thisMonth.shifts},${data.lastMonth.shifts},${data.thisMonth.shifts - data.lastMonth.shifts}\n`;
    csv += `Payments Issued,${data.thisMonth.payments},${data.lastMonth.payments},${data.thisMonth.payments - data.lastMonth.payments}\n`;
    csv += `Total Paid,$${data.thisMonth.paymentTotal},$${data.lastMonth.paymentTotal},$${data.thisMonth.paymentTotal - data.lastMonth.paymentTotal}\n`;
    csv += `New Participants,${data.thisMonth.newParticipants},-,-\n`;
    csv += `Housing Outcomes,${data.thisMonth.housed},-,-\n`;

    csv += `\nTOP CONTRIBUTORS\n`;
    csv += `Rank,Name,Shifts,Bags Collected\n`;
    data.topContributors.forEach((c, i) => {
      csv += `${i + 1},${c.name},${c._count},${c._sum.bagsCollected || 0}\n`;
    });

    if (data.participantsAtCap.length > 0) {
      csv += `\nPARTICIPANTS AT LIFETIME CAP ($2000)\n`;
      csv += `Name\n`;
      data.participantsAtCap.forEach((p) => {
        csv += `${p.firstName} ${p.lastName}\n`;
      });
    }

    // Create and download the file
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash-for-trash-report-${month.toLowerCase()}-${year}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Button onClick={handleExport} variant="outline">
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
}
