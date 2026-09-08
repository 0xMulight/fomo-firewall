import { cn } from "@/lib/utils";

const toneClasses: Record<string, string> = {
  LOW: "border-terminal-green/40 bg-terminal-green/10 text-terminal-green",
  MEDIUM: "border-terminal-amber/40 bg-terminal-amber/10 text-terminal-amber",
  HIGH: "border-terminal-orange/40 bg-terminal-orange/10 text-terminal-orange",
  EXTREME: "border-terminal-red/40 bg-terminal-red/10 text-terminal-red",
  neutral: "border-terminal-border bg-terminal-panel text-terminal-muted",
};

export function RiskBadge({
  level,
  className,
}: {
  level: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider",
        toneClasses[level] ?? toneClasses.neutral,
        className,
      )}
    >
      {level}
    </span>
  );
}
