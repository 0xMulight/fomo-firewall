import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-terminal-border bg-terminal-panel",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-b border-terminal-border px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-terminal-muted",
        className,
      )}
      {...props}
    />
  );
}
