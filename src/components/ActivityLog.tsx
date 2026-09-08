"use client";

import type { ActivityEntry } from "@/types/trading";
import { Card, CardHeader } from "@/components/ui/card";
import { useI18n } from "@/components/I18nProvider";
import { formatTime, cn } from "@/lib/utils";

export function ActivityLog({ entries }: { entries: ActivityEntry[] }) {
  const { t } = useI18n();
  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader>{t.activityLog}</CardHeader>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {entries.length === 0 && (
          <p className="px-3 py-4 text-[11px] text-terminal-muted">
            {t.activityEmpty}
          </p>
        )}
        {entries.map((e, i) => (
          <div
            key={`${e.timestamp}-${i}`}
            className="border-b border-terminal-border/50 px-3 py-2 text-[10px]"
          >
            <div className="flex items-center justify-between text-terminal-muted">
              <span>{formatTime(e.timestamp)}</span>
              <span className="font-semibold text-terminal-text">{e.symbol}</span>
            </div>
            <div className="mt-0.5 truncate text-terminal-muted" title={e.prompt}>
              “{e.prompt}”
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {e.dataSource && (
                <span className="text-terminal-muted">
                  {e.dataSource === "mcp"
                    ? t.viaMcp
                    : e.dataSource === "rest"
                      ? t.viaRest
                      : t.demoData}
                </span>
              )}
              {e.fomoScore !== null && <span>{t.score} {e.fomoScore}</span>}
              {e.verdict && (
                <span
                  className={cn(
                    "font-semibold",
                    e.verdict === "TRADE"
                      ? "text-terminal-green"
                      : e.verdict === "WAIT"
                        ? "text-terminal-amber"
                        : "text-terminal-red",
                  )}
                >
                  {e.verdict}
                </span>
              )}
              {e.tradePlan && <span>{e.tradePlan}</span>}
              {e.userDecision !== "NONE" && (
                <span
                  className={cn(
                    "font-semibold",
                    e.userDecision === "APPROVED"
                      ? "text-terminal-green"
                      : "text-terminal-muted",
                  )}
                >
                  {e.userDecision === "APPROVED" ? t.approved : t.cancelled}
                </span>
              )}
              {e.executionResult && <span>{e.executionResult}</span>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
