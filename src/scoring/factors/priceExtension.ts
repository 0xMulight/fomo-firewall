import type { FactorResult } from "@/types/agent";
import type { MarketSnapshot } from "@/types/market";

export const MAX_PRICE_EXTENSION = 25;

/**
 * How far price is stretched above short-term VWAP.
 * Square-root scaling keeps small deviations meaningful while capping
 * parabolic moves at the max score.
 */
export function scorePriceExtension(snapshot: MarketSnapshot): FactorResult {
  const dev = Math.max(0, snapshot.vwapDeviation);
  const score = Math.min(
    MAX_PRICE_EXTENSION,
    Math.round(MAX_PRICE_EXTENSION * Math.sqrt(dev / 12)),
  );
  return {
    key: "priceExtension",
    label: "Price Extension",
    score,
    maxScore: MAX_PRICE_EXTENSION,
    rawValue: snapshot.vwapDeviation,
    reason: `Price is ${snapshot.vwapDeviation.toFixed(1)}% ${
      snapshot.vwapDeviation >= 0 ? "above" : "below"
    } short-term VWAP`,
  };
}
