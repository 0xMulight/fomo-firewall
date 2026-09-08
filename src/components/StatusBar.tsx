"use client";

import { useEffect, useState } from "react";
import { Languages, ShieldCheck } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";

interface StatusResponse {
  mode: "mock" | "live";
  dryRun: boolean;
  maxTradeUsdt: number;
  dataSource: "mcp" | "rest" | "mock";
  binance: {
    mcpUrl: string;
    mcpConnected: boolean;
    authenticated: boolean;
    restReachable: boolean;
  };
}

export function StatusBar() {
  const { t, toggleLocale } = useI18n();
  const [status, setStatus] = useState<StatusResponse | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/status")
        .then((r) => r.json())
        .then(setStatus)
        .catch(() => setStatus(null));
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, []);

  const source = status?.dataSource ?? "mock";
  const dryRun = status?.dryRun ?? true;

  const sourceBadge =
    source === "mcp" ? (
      <span className="rounded border border-terminal-green/50 bg-terminal-green/10 px-2 py-0.5 text-terminal-green">
        ● {t.sourceMcp}
      </span>
    ) : source === "rest" ? (
      <span className="rounded border border-terminal-green/50 bg-terminal-green/10 px-2 py-0.5 text-terminal-green">
        ● {t.sourceRest}
      </span>
    ) : (
      <span className="rounded border border-terminal-amber/50 bg-terminal-amber/10 px-2 py-0.5 text-terminal-amber">
        ● {t.demo}
      </span>
    );

  return (
    <header className="flex h-12 items-center justify-between border-b border-terminal-border bg-terminal-panel px-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-terminal-green" />
        <span className="text-sm font-bold tracking-wide">FOMO Firewall</span>
        <span className="hidden text-[10px] text-terminal-muted xl:inline">
          {t.tagline}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider">
        {sourceBadge}
        {dryRun && (
          <span className="rounded border border-terminal-amber/50 bg-terminal-amber/10 px-2 py-0.5 text-terminal-amber">
            {t.dryRun}
          </span>
        )}
        <span className="hidden rounded border border-terminal-border px-2 py-0.5 text-terminal-muted sm:inline">
          {t.maxPerTrade(status?.maxTradeUsdt ?? 50)}
        </span>
        {status && status.mode === "live" && (
          <span
            className={
              status.binance.mcpConnected
                ? "hidden rounded border border-terminal-green/50 px-2 py-0.5 text-terminal-green lg:inline"
                : "hidden rounded border border-terminal-red/40 px-2 py-0.5 text-terminal-red lg:inline"
            }
          >
            {status.binance.mcpConnected
              ? t.agentOsConnected
              : t.agentOsDisconnected}
          </span>
        )}
        <button
          onClick={toggleLocale}
          className="flex items-center gap-1 rounded border border-terminal-border px-2 py-0.5 text-terminal-text transition-colors hover:bg-terminal-bg"
          aria-label="Switch language"
        >
          <Languages className="h-3 w-3" />
          {t.langSwitch}
        </button>
      </div>
    </header>
  );
}
