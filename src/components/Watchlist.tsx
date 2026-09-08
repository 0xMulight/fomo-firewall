"use client";

import { useCallback, useEffect, useState } from "react";
import type { WatchlistEntry } from "@/types/market";
import { Card, CardHeader } from "@/components/ui/card";
import { RiskBadge } from "@/components/ui/badge";
import { useI18n } from "@/components/I18nProvider";
import { formatPct, formatPrice, cn } from "@/lib/utils";

export function Watchlist({
  onSelect,
}: {
  onSelect: (symbol: string) => void;
}) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);

  const refresh = useCallback(() => {
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((data) => setEntries(data.entries ?? []))
      .catch(() => setEntries([]));
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader>{t.watchlist}</CardHeader>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {entries.map((e) => (
          <button
            key={e.symbol}
            onClick={() => onSelect(e.symbol)}
            className="block w-full border-b border-terminal-border/60 px-3 py-2.5 text-left transition-colors hover:bg-terminal-bg"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">
                {e.symbol}
                {e.source === "mock" && (
                  <span className="ml-1 rounded border border-terminal-amber/40 px-1 text-[8px] text-terminal-amber">
                    DEMO
                  </span>
                )}
              </span>
              <RiskBadge level={e.level} />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-terminal-text">${formatPrice(e.price)}</span>
              <span
                className={cn(
                  e.change15m >= 0 ? "text-terminal-green" : "text-terminal-red",
                )}
              >
                15m {formatPct(e.change15m)}
              </span>
              <span
                className={cn(
                  e.change1h >= 0 ? "text-terminal-green" : "text-terminal-red",
                )}
              >
                1h {formatPct(e.change1h)}
              </span>
            </div>
          </button>
        ))}
        {entries.length === 0 && (
          <p className="px-3 py-4 text-[11px] text-terminal-muted">
            {t.loadingMarket}
          </p>
        )}
      </div>
      <p className="border-t border-terminal-border px-3 py-2 text-[10px] text-terminal-muted">
        {t.watchlistHint}
      </p>
    </Card>
  );
}
