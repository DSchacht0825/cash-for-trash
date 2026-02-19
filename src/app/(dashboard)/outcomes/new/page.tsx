"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, AlertCircle, Home } from "lucide-react";

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
}

const HOUSING_OPTIONS = [
  { value: "STREET", label: "Street/Unsheltered" },
  { value: "SHELTER", label: "Shelter" },
  { value: "TRANSITIONAL", label: "Transitional Housing" },
  { value: "SRO", label: "SRO (Single Room Occupancy)" },
  { value: "SOBER_LIVING", label: "Sober Living" },
  { value: "ILF", label: "ILF (Independent Living Facility)" },
  { value: "PERMANENT", label: "Permanent Housing" },
  { value: "OTHER", label: "Other (specify below)" },
];

const EMPLOYMENT_OPTIONS = [
  { value: "NONE", label: "None" },
  { value: "TRAINING", label: "Training/Education" },
  { value: "PART_TIME", label: "Part-Time Employment" },
  { value: "FULL_TIME", label: "Full-Time Employment" },
];

const BENEFITS_OPTIONS = [
  { value: "SNAP", label: "SNAP (Food Stamps)" },
  { value: "MEDI_CAL", label: "Medi-Cal" },
  { value: "SSI", label: "SSI" },
  { value: "SSDI", label: "SSDI" },
  { value: "GENERAL_RELIEF", label: "General Relief" },
  { value: "VETERANS_BENEFITS", label: "Veterans Benefits" },
  { value: "UNEMPLOYMENT", label: "Unemployment" },
];

const DOCUMENTS_OPTIONS = [
  { value: "ID", label: "State ID/Driver License" },
  { value: "BIRTH_CERT", label: "Birth Certificate" },
  { value: "SSN_CARD", label: "Social Security Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "BANK_ACCOUNT", label: "Bank Account" },
  { value: "PHONE", label: "Phone Number" },
];

function NewOutcomeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedParticipant = searchParams.get("participantId");

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState(
    preselectedParticipant || ""
  );
  const [housingStatus, setHousingStatus] = useState("STREET");
  const [otherHousingDetails, setOtherHousingDetails] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("NONE");
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const response = await fetch("/api/participants");
        if (response.ok) {
          const data = await response.json();
          setParticipants(data.filter((p: Participant & { isActive: boolean }) => p.isActive));
        }
      } catch (err) {
        console.error("Error fetching participants:", err);
      }
    };

    fetchParticipants();
  }, []);

  const toggleBenefit = (value: string) => {
    setSelectedBenefits((prev) =>
      prev.includes(value)
        ? prev.filter((b) => b !== value)
        : [...prev, value]
    );
  };

  const toggleDocument = (value: string) => {
    setSelectedDocuments((prev) =>
      prev.includes(value)
        ? prev.filter((d) => d !== value)
        : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validate OTHER housing
    if (housingStatus === "OTHER" && !otherHousingDetails.trim()) {
      setError("Please specify details for 'Other' housing status");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/outcomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: selectedParticipant,
          housingStatus,
          otherHousingDetails: housingStatus === "OTHER" ? otherHousingDetails : undefined,
          employmentStatus,
          benefits: selectedBenefits,
          documentsObtained: selectedDocuments,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to record outcome");
      }

      router.push("/outcomes");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/outcomes">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)]">
            Record Outcome
          </h1>
          <p className="text-[var(--muted-foreground)]">
            Track housing, employment, benefits, and documents
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Destination Outcome
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="participant">Participant *</Label>
              <Select
                value={selectedParticipant}
                onValueChange={setSelectedParticipant}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a participant" />
                </SelectTrigger>
                <SelectContent>
                  {participants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Housing Status */}
            <div className="space-y-2">
              <Label htmlFor="housing">Housing Status *</Label>
              <Select
                value={housingStatus}
                onValueChange={setHousingStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select housing status" />
                </SelectTrigger>
                <SelectContent>
                  {HOUSING_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Other Housing Details */}
            {housingStatus === "OTHER" && (
              <div className="space-y-2">
                <Label htmlFor="otherHousing">
                  Other Housing Details *
                </Label>
                <Input
                  id="otherHousing"
                  value={otherHousingDetails}
                  onChange={(e) => setOtherHousingDetails(e.target.value)}
                  placeholder="Please describe the housing situation..."
                  required={housingStatus === "OTHER"}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Employment Status */}
            <div className="space-y-2">
              <Label htmlFor="employment">Employment Status</Label>
              <Select
                value={employmentStatus}
                onValueChange={setEmploymentStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employment status" />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <Label>Benefits Received</Label>
              <div className="grid grid-cols-2 gap-2">
                {BENEFITS_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-[var(--muted)]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBenefits.includes(option.value)}
                      onChange={() => toggleBenefit(option.value)}
                      className="rounded"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-2">
              <Label>Documents Obtained</Label>
              <div className="grid grid-cols-2 gap-2">
                {DOCUMENTS_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-[var(--muted)]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocuments.includes(option.value)}
                      onChange={() => toggleDocument(option.value)}
                      className="rounded"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this outcome record..."
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isLoading || !selectedParticipant}
              >
                {isLoading ? "Saving..." : "Record Outcome"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewOutcomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewOutcomeForm />
    </Suspense>
  );
}
