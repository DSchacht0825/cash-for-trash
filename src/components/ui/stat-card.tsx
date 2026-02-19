"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Users,
  Clock,
  ShoppingBag,
  CreditCard,
  BookOpen,
  Home,
} from "lucide-react";

type IconName = "users" | "clock" | "shopping-bag" | "credit-card" | "book-open" | "home";

const iconMap = {
  users: Users,
  clock: Clock,
  "shopping-bag": ShoppingBag,
  "credit-card": CreditCard,
  "book-open": BookOpen,
  home: Home,
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: IconName;
  href: string;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  href,
  description,
  trend,
  className,
}: StatCardProps) {
  const Icon = iconMap[icon];

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition-all hover:shadow-md hover:border-[var(--primary)]/50",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-[var(--secondary)]" />}
            <p className="text-sm font-medium text-[var(--muted-foreground)]">
              {title}
            </p>
          </div>
          <p className="mt-2 text-3xl font-bold text-[var(--primary)]">
            {value}
          </p>
          {description && (
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {description}
            </p>
          )}
          {trend && (
            <p
              className={cn(
                "mt-1 text-sm",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}% from last week
            </p>
          )}
        </div>
        <div className="text-[var(--muted-foreground)] text-sm">
          View &rarr;
        </div>
      </div>
    </Link>
  );
}
