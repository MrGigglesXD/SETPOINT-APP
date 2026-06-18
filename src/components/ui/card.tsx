import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-card border border-border2 rounded-2xl p-3.5", className)}
      {...props}
    />
  );
}

type PillVariant = "blue" | "red" | "gray" | "yellow" | "green";

const pillClasses: Record<PillVariant, string> = {
  blue: "bg-setpoint-blue-dim text-setpoint-blue-text",
  red: "bg-setpoint-red-dim text-setpoint-red-text",
  gray: "bg-card3 text-muted",
  yellow: "bg-setpoint-yellow/15 text-setpoint-yellow",
  green: "bg-setpoint-green/15 text-setpoint-green",
};

export function Pill({
  variant = "gray",
  className,
  children,
}: {
  variant?: PillVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap",
        pillClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-9 w-9 rounded-full bg-card3 flex items-center justify-center text-xs font-extrabold flex-shrink-0",
        className
      )}
    >
      {initials}
    </div>
  );
}
