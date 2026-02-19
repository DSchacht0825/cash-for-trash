"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LogOut } from "lucide-react";

interface ClockOutButtonProps {
  shiftId: string;
  currentBags: number;
  participantName: string;
}

export function ClockOutButton({
  shiftId,
  currentBags,
  participantName,
}: ClockOutButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bagsCollected, setBagsCollected] = useState(currentBags.toString());
  const [isLoading, setIsLoading] = useState(false);

  const handleClockOut = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/shifts/${shiftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clockOut: true,
          bagsCollected: parseInt(bagsCollected) || 0,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to clock out");
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error clocking out:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <LogOut className="h-4 w-4 mr-1" />
          Clock Out
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clock Out - {participantName}</DialogTitle>
          <DialogDescription>
            Enter the number of bags collected before clocking out.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="bags">Bags Collected</Label>
            <Input
              id="bags"
              type="number"
              min="0"
              value={bagsCollected}
              onChange={(e) => setBagsCollected(e.target.value)}
              placeholder="Enter number of bags"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleClockOut} disabled={isLoading}>
            {isLoading ? "Clocking Out..." : "Clock Out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
