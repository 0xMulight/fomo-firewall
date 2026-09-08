import type { FactorResult } from "@/types/agent";
import type { MarketSnapshot } from "@/types/market";

export const MAX_VOLATILITY = 15;

/**
 * Short-term volatility: mean 5m candle range over the last hour.
 * 6%+ average candle range reaches the max score.
 */
export function scoreVolatility(snapshot: MarketSnapshot): FactorResult {
  const vol = Math.max(0, snapshot.volatilityPct);
  const score = Math.min(
    MAX_VOLATILITY,
    Math.round(Math.sqrt(vol / 6) * MAX_VOLATILITY),
  );
  return {
    key: "volatility",
    label: "Volatility",
    score,
    maxScore: MAX_VOLATILITY,
    rawValue: snapshot.volatilityPct,
    reason: `Average 5m candle range is ${snapshot.volatilityPct.toFixed(1)}% over the last hour`,
  };
}
