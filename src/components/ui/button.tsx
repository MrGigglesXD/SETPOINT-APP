import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "yellow" | "blue" | "red" | "ghost" | "danger";
type Size = "default" | "sm" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  yellow: "bg-setpoint-yellow text-[#1a1a00] active:opacity-80",
  blue: "bg-setpoint-blue text-white active:opacity-80",
  red: "bg-setpoint-red text-white active:opacity-80",
  ghost: "bg-card2 border border-border text-white active:opacity-80",
  danger:
    "bg-setpoint-red-dim border border-setpoint-red/40 text-setpoint-red-text active:opacity-80",
};

const sizeClasses: Record<Size, string> = {
  default: "min-h-[48px] px-4 text-sm",
  sm: "min-h-[40px] px-3 text-xs",
  icon: "h-11 w-11 p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "ghost", size = "default", fullWidth, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
