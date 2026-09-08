"use client";

import type { AgentAnalysisResult } from "@/types/agent";
import { Card, CardHeader } from "@/components/ui/card";
import { RiskBadge } from "@/components/ui/badge";
import { useI18n } from "@/components/I18nProvider";
import { cn, formatPct, formatPrice } from "@/lib/utils";

const LEVEL_TEXT: Record<string, string> = {
  LOW: "text-terminal-green",
  MEDIUM: "text-terminal-amber",
  HIGH: "text-terminal-orange",
  EXTREME: "text-terminal-red",
};

const FACTOR_LABEL_KEYS: Record<string, string> = {
  priceExtension: "Price Extension",
  volumeSpike: "Volume Spike",
  orderbookImbalance: "Orderbook Imbalance",
  spread: "Spread",
  volatility: "Volatility",
  momentumExhaustion: "Momentum Exhaustion",
};

const FACTOR_LABELS_ZH: Record<string, string> = {
  priceExtension: "价格延伸",
  volumeSpike: "成交量激增",
  orderbookImbalance: "盘口失衡",
  spread: "价差",
  volatility: "短期波动",
  momentumExhaustion: "动量衰竭",
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-terminal-border/50 py-1.5 text-[11px] last:border-0">
      <span className="text-terminal-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export function RiskPanel({
  analysis,
}: {
  analysis: AgentAnalysisResult | null;
}) {
  const { t, locale } = useI18n();

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <Card>
        <CardHeader>{t.riskPanelTitle}</CardHeader>
        {analysis ? (
          <div className="px-3 py-3">
            <div className="flex items-end justify-between">
              <div>
                <div
                  className={cn(
                    "text-4xl font-bold tabular-nums",
                    LEVEL_TEXT[analysis.assessment.level],
                  )}
                >
                  {analysis.assessment.totalScore}
                  <span className="text-base text-terminal-muted"> / 100</span>
                </div>
                <RiskBadge level={analysis.assessment.level} className="mt-1" />
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-terminal-muted">
                  {t.verdict}
                </div>
                <div
                  className={cn(
                    "text-xl font-bold",
                    analysis.verdict === "TRADE"
                      ? "text-terminal-green"
                      : analysis.verdict === "WAIT"
                        ? "text-terminal-amber"
                        : "text-terminal-red",
                  )}
                >
                  {analysis.verdict}
                </div>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-terminal-muted">
              {t.deterministicNote(
                analysis.assessment.factors.length,
                analysis.source === "mcp"
                  ? t.viaMcp
                  : analysis.source === "rest"
                    ? t.viaRest
                    : t.demoData,
                analysis.symbol,
              )}
            </p>
          </div>
        ) : (
          <p className="px-3 py-6 text-center text-[11px] text-terminal-muted">
            {t.emptyRisk}
          </p>
        )}
      </Card>

      {analysis && (
        <>
          <Card>
            <CardHeader>{t.factorBreakdown}</CardHeader>
            <div className="space-y-2 px-3 py-3">
              {analysis.assessment.factors.map((f) => (
                <div key={f.key}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>
                      {locale === "zh"
                        ? (FACTOR_LABELS_ZH[f.key] ?? f.label)
                        : (FACTOR_LABEL_KEYS[f.key] ?? f.label)}
                    </span>
                    <span className="tabular-nums text-terminal-muted">
                      {f.score} / {f.maxScore}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-terminal-bg">
                    <div
                      className={cn(
                        "h-full rounded",
                        f.score / f.maxScore > 0.66
                          ? "bg-terminal-red"
                          : f.score / f.maxScore > 0.33
                            ? "bg-terminal-amber"
                            : "bg-terminal-green",
                      )}
                      style={{ width: `${(f.score / f.maxScore) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-terminal-border pt-2 text-[11px] font-bold">
                <span>{t.total}</span>
                <span>{analysis.assessment.totalScore} / 100</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>{t.marketMetrics}</CardHeader>
            <div className="px-3 py-2">
              <Metric label={t.price} value={`$${formatPrice(analysis.snapshotSummary.price)}`} />
              <Metric label={t.change5m} value={formatPct(analysis.snapshotSummary.change5m)} />
              <Metric label={t.change15m} value={formatPct(analysis.snapshotSummary.change15m)} />
              <Metric label={t.change1h} value={formatPct(analysis.snapshotSummary.change1h)} />
              <Metric
                label={t.volume}
                value={t.volumeAvg(analysis.snapshotSummary.volumeMultiplier.toFixed(1))}
              />
              <Metric label={t.vwapDeviation} value={formatPct(analysis.snapshotSummary.vwapDeviation)} />
              <Metric label={t.spread} value={`${analysis.snapshotSummary.spreadPct.toFixed(2)}%`} />
              <Metric
                label={t.orderbook}
                value={
                  analysis.snapshotSummary.bidShare > 0.55
                    ? t.bidsStronger
                    : analysis.snapshotSummary.bidShare < 0.45
                      ? t.bidWeakening
                      : t.balanced
                }
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
