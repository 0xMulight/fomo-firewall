import type { FactorResult } from "@/types/agent";
import type { MarketSnapshot } from "@/types/market";

export const MAX_SPREAD = 10;

/**
 * Wide spreads mean poor fills and thin liquidity.
 * 0.5%+ spread reaches the max score.
 */
export function scoreSpread(snapshot: MarketSnapshot): FactorResult {
  const spread = Math.max(0, snapshot.spreadPct);
  const score = Math.min(MAX_SPREAD, Math.round(Math.sqrt(spread / 0.5) * MAX_SPREAD));
  return {
    key: "spread",
    label: "Spread",
    score,
    maxScore: MAX_SPREAD,
    rawValue: snapshot.spreadPct,
    reason: `Top-of-book spread is ${snapshot.spreadPct.toFixed(2)}% of mid price`,
  };
}
