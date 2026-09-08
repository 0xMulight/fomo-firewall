"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { useI18n } from "@/components/I18nProvider";
import { cn } from "@/lib/utils";

interface BinanceStatus {
  connected: boolean;
  provider: "BINANCE_MCP" | "BINANCE_REST" | "MOCK";
  mode: "LIVE" | "DEMO";
  dataSource: "mcp" | "rest" | "mock";
  capabilities: {
    ticker: boolean;
    klines: boolean;
    orderBook: boolean;
    account: boolean;
    trading: boolean;
  };
}

function Cap({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn("flex items-center gap-1", ok ? "text-terminal-text" : "text-terminal-muted")}>
      <span className={ok ? "text-terminal-green" : "text-terminal-muted"}>
        {ok ? "✓" : "○"}
      </span>
      {label}
    </span>
  );
}

/**
 * Small, honest Binance Agent OS status card. Every value comes from a real
 * server-side health check (MCP connect + tools/list) — nothing hardcoded.
 */
export function AgentOsPanel() {
  const { t } = useI18n();
  const [status, setStatus] = useState<BinanceStatus | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/binance/status")
        .then((r) => r.json())
        .then(setStatus)
        .catch(() => setStatus(null));
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, []);

  const connected = status?.connected ?? false;
  const sourceLabel =
    status?.dataSource === "mcp"
      ? t.viaMcp
      : status?.dataSource === "rest"
        ? t.viaRest
        : t.demoData;

  return (
    <Card>
      <CardHeader>{t.agentOsTitle}</CardHeader>
      <div className="space-y-2 px-3 py-2.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-terminal-muted">{t.mcpServer}</span>
          <span
            className={cn(
              "font-bold",
              connected ? "text-terminal-green" : "text-terminal-red",
            )}
          >
            {connected ? t.connected : t.disconnected}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-terminal-muted">{t.dataSourceLabel}</span>
          <span className="font-semibold">{sourceLabel}</span>
        </div>
        <div>
          <div className="mb-1 text-terminal-muted">{t.capabilities}</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            <Cap ok={status?.capabilities.ticker ?? false} label={t.capTicker} />
            <Cap ok={status?.capabilities.klines ?? false} label={t.capKlines} />
            <Cap ok={status?.capabilities.orderBook ?? false} label={t.capOrderBook} />
            <Cap
              ok={status?.capabilities.account ?? false}
              label={`${t.capAccount}${status?.capabilities.account ? "" : ` · ${t.authRequired}`}`}
            />
            <Cap
              ok={status?.capabilities.trading ?? false}
              label={`${t.capTrading}${status?.capabilities.trading ? "" : ` · ${t.authRequired}`}`}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
