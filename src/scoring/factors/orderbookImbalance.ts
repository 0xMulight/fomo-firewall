import type { FactorResult } from "@/types/agent";
import type { MarketSnapshot } from "@/types/market";

export const MAX_ORDERBOOK_IMBALANCE = 20;

/**
 * Positive imbalance = ask-side depth outweighs bids (buy support weakening),
 * which makes chasing a pump dangerous.
 */
export function scoreOrderbookImbalance(snapshot: MarketSnapshot): FactorResult {
  const bearishImbalance = Math.max(0, snapshot.orderbookImbalance);
  const score = Math.min(
    MAX_ORDERBOOK_IMBALANCE,
    Math.round(bearishImbalance * 60),
  );
  const description =
    snapshot.orderbookImbalance > 0.05
      ? "Bid depth weakening vs asks"
      : snapshot.orderbookImbalance < -0.05
        ? "Bid depth stronger than asks"
        : "Order book roughly balanced";
  return {
    key: "orderbookImbalance",
    label: "Orderbook Imbalance",
    score,
    maxScore: MAX_ORDERBOOK_IMBALANCE,
    rawValue: snapshot.orderbookImbalance,
    reason: `${description} (bid share ${(snapshot.bidShare * 100).toFixed(0)}%)`,
  };
}
