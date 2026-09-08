import type { FomoAssessment, FactorResult } from "@/types/agent";
import type { MarketSnapshot, RiskLevel } from "@/types/market";
import { scorePriceExtension } from "./factors/priceExtension";
import { scoreVolumeSpike } from "./factors/volumeSpike";
import { scoreOrderbookImbalance } from "./factors/orderbookImbalance";
import { scoreSpread } from "./factors/spread";
import { scoreVolatility } from "./factors/volatility";
import { scoreMomentumExhaustion } from "./factors/momentumExhaustion";

export type FactorScorer = (snapshot: MarketSnapshot) => FactorResult;

/** Ordered factor pipeline. Weights: 25 + 20 + 20 + 10 + 15 + 10 = 100. */
export const FACTOR_PIPE: FactorScorer[] = [
  scorePriceExtension,
  scoreVolumeSpike,
  scoreOrderbookImbalance,
  scoreSpread,
  scoreVolatility,
  scoreMomentumExhaustion,
];

export function levelForScore(score: number): RiskLevel {
  if (score <= 30) return "LOW";
  if (score <= 60) return "MEDIUM";
  if (score <= 80) return "HIGH";
  return "EXTREME";
}

/**
 * Deterministic FOMO Score (0-100). Pure function of the market snapshot:
 * no LLM, no randomness, fully auditable per factor.
 */
export function computeFomoScore(snapshot: MarketSnapshot): FomoAssessment {
  const factors = FACTOR_PIPE.map((score) => score(snapshot));
  const totalScore = factors.reduce((acc, f) => acc + f.score, 0);
  return {
    totalScore,
    level: levelForScore(totalScore),
    factors,
  };
}
