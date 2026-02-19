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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  isActive: boolean;
}

interface PaymentStatus {
  allowed: boolean;
  reason?: string;
  lifetimeTotal: number;
  paymentsCount: number;
  paymentsRemaining: number;
  paidThisWeek: boolean;
  reachedLifetimeCap: boolean;
  maxPayments: number;
  paymentAmount: number;
  lifetimeCap: number;
  progressPercentage: number;
}

function NewPaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedParticipant = searchParams.get("participantId");

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState(
    preselectedParticipant || ""
  );
  const [notes, setNotes] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fetch participants
  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const response = await fetch("/api/participants");
        if (response.ok) {
          const data = await response.json();
          setParticipants(data.filter((p: Participant) => p.isActive));
        }
      } catch (err) {
        console.error("Error fetching participants:", err);
      }
    };

    fetchParticipants();
  }, []);

  // Check payment status when participant is selected
  useEffect(() => {
    const checkStatus = async () => {
      if (!selectedParticipant) {
        setPaymentStatus(null);
        return;
      }

      setIsCheckingStatus(true);
      try {
        const response = await fetch(
          `/api/payments/check?participantId=${selectedParticipant}`
        );
        if (response.ok) {
          const status = await response.json();
          setPaymentStatus(status);
        }
      } catch (err) {
        console.error("Error checking payment status:", err);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkStatus();
  }, [selectedParticipant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: selectedParticipant,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to issue payment");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/payments");
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedParticipantName = participants.find(
    (p) => p.id === selectedParticipant
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/payments">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)]">
            Issue Payment
          </h1>
          <p className="text-[var(--muted-foreground)]">
            Issue $80 prepaid Visa card to participant
          </p>
        </div>
      </div>

      {success && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Payment Issued Successfully!</AlertTitle>
          <AlertDescription>
            $80 Visa card has been issued to{" "}
            {selectedParticipantName
              ? `${selectedParticipantName.firstName} ${selectedParticipantName.lastName}`
              : "participant"}
            . Redirecting...
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              New Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  disabled={success}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a participant" />
                  </SelectTrigger>
                  <SelectContent>
                    {participants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                        {p.preferredName && ` (${p.preferredName})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Amount</Label>
                <Input value="$80.00" disabled className="font-bold" />
                <p className="text-xs text-[var(--muted-foreground)]">
                  Fixed amount per payment
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes about this payment..."
                  rows={3}
                  disabled={isLoading || success}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={
                    isLoading ||
                    !selectedParticipant ||
                    !paymentStatus?.allowed ||
                    success
                  }
                >
                  {isLoading ? "Processing..." : "Issue $80 Payment"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading || success}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Payment Status */}
        <div className="space-y-4">
          {isCheckingStatus && (
            <Card>
              <CardContent className="py-8 text-center text-[var(--muted-foreground)]">
                Checking payment eligibility...
              </CardContent>
            </Card>
          )}

          {paymentStatus && !isCheckingStatus && (
            <>
              {/* Eligibility Alert */}
              {paymentStatus.reachedLifetimeCap ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Cannot Issue Payment</AlertTitle>
                  <AlertDescription>
                    This participant has reached the ${paymentStatus.lifetimeCap.toLocaleString()} lifetime limit
                    and cannot receive any more payments.
                  </AlertDescription>
                </Alert>
              ) : paymentStatus.paidThisWeek ? (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Cannot Issue Payment This Week</AlertTitle>
                  <AlertDescription>
                    This participant has already received a payment this week.
                    Next payment available on Sunday.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="success">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Eligible for Payment</AlertTitle>
                  <AlertDescription>
                    This participant can receive an $80 payment.
                  </AlertDescription>
                </Alert>
              )}

              {/* Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payment Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Lifetime Total</span>
                      <span className="font-medium">
                        ${paymentStatus.lifetimeTotal.toLocaleString()} / $
                        {paymentStatus.lifetimeCap.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          paymentStatus.reachedLifetimeCap
                            ? "bg-red-500"
                            : paymentStatus.progressPercentage >= 80
                            ? "bg-amber-500"
                            : "bg-[var(--success)]"
                        }`}
                        style={{
                          width: `${paymentStatus.progressPercentage}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[var(--muted-foreground)]">
                        Payments Received
                      </p>
                      <p className="font-medium text-lg">
                        {paymentStatus.paymentsCount} /{" "}
                        {paymentStatus.maxPayments}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--muted-foreground)]">
                        Payments Remaining
                      </p>
                      <p className="font-medium text-lg">
                        {paymentStatus.paymentsRemaining}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--muted-foreground)]">
                        Paid this week:
                      </span>
                      {paymentStatus.paidThisWeek ? (
                        <span className="text-sm font-medium text-amber-600">
                          Yes
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-green-600">
                          No
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!selectedParticipant && !isCheckingStatus && (
            <Card>
              <CardContent className="py-8 text-center text-[var(--muted-foreground)]">
                Select a participant to check payment eligibility
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewPaymentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewPaymentForm />
    </Suspense>
  );
}
