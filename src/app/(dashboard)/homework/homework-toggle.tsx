"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";

interface HomeworkToggleProps {
  id: string;
  isCompleted: boolean;
}

export function HomeworkToggle({ id, isCompleted }: HomeworkToggleProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/homework/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !isCompleted }),
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Error toggling homework:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="p-1 rounded hover:bg-[var(--muted)] transition-colors disabled:opacity-50"
    >
      {isCompleted ? (
        <CheckCircle2 className="h-5 w-5 text-green-600" />
      ) : (
        <Circle className="h-5 w-5 text-[var(--muted-foreground)]" />
      )}
    </button>
  );
}
