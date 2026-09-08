import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "danger" | "ghost";
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-terminal-green/90 text-black hover:bg-terminal-green disabled:opacity-40",
    danger:
      "bg-terminal-red/90 text-white hover:bg-terminal-red disabled:opacity-40",
    ghost:
      "border border-terminal-border bg-transparent text-terminal-text hover:bg-terminal-panel disabled:opacity-40",
  };
  return (
    <button
      className={cn(
        "rounded px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
