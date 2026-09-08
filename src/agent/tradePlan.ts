import type { FomoAssessment } from "@/types/agent";
import type { MarketSnapshot } from "@/types/market";
import type { TradePlan } from "@/types/trading";
import { randomUUID } from "crypto";

/**
 * Builds a trade plan from an approved-risk analysis.
 * Plans are proposals only — nothing executes without the human
 * approval gate, and amounts are hard-capped by MAX_TRADE_USDT.
 */
export function buildTradePlan(params: {
  symbol: string;
  side: "BUY" | "SELL";
  amountUsdt: number;
  snapshot: MarketSnapshot;
  assessment: FomoAssessment;
  verdict: string;
  dryRun: boolean;
}): TradePlan {
  const { symbol, side, amountUsdt, snapshot, assessment, verdict, dryRun } = params;
  const estimatedQuantity =
    snapshot.price > 0 ? amountUsdt / snapshot.price : 0;
  return {
    id: randomUUID(),
    symbol,
    side,
    amountUsdt,
    orderType: "MARKET",
    referencePrice: snapshot.price,
    estimatedQuantity,
    riskScore: assessment.totalScore,
    riskLevel: assessment.level,
    verdict,
    dryRun,
    createdAt: Date.now(),
  };
}
