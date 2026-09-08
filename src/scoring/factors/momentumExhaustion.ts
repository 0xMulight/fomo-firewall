import type { FactorResult } from "@/types/agent";
import type { MarketSnapshot } from "@/types/market";

export const MAX_MOMENTUM_EXHAUSTION = 10;

/**
 * A large 15m move means late buyers are entering well after the impulse.
 * Only positive (pump-side) momentum contributes to FOMO risk.
 */
export function scoreMomentumExhaustion(snapshot: MarketSnapshot): FactorResult {
  const pump = Math.max(0, snapshot.change15m);
  const score = Math.min(
    MAX_MOMENTUM_EXHAUSTION,
    Math.round(Math.sqrt(pump / 15) * MAX_MOMENTUM_EXHAUSTION),
  );
  return {
    key: "momentumExhaustion",
    label: "Momentum Exhaustion",
    score,
    maxScore: MAX_MOMENTUM_EXHAUSTION,
    rawValue: snapshot.change15m,
    reason: `Price already moved ${snapshot.change15m.toFixed(1)}% in 15m — late entries carry poor risk/reward`,
  };
}
