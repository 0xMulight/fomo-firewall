import type { FactorResult } from "@/types/agent";
import type { MarketSnapshot } from "@/types/market";

export const MAX_VOLUME_SPIKE = 20;

/**
 * Latest 5m volume vs the 20-period average.
 * 1x = normal, 5x+ = max score.
 */
export function scoreVolumeSpike(snapshot: MarketSnapshot): FactorResult {
  const excess = Math.max(0, snapshot.volumeMultiplier - 1);
  const score = Math.min(
    MAX_VOLUME_SPIKE,
    Math.round(MAX_VOLUME_SPIKE * Math.sqrt(excess / 4)),
  );
  return {
    key: "volumeSpike",
    label: "Volume Spike",
    score,
    maxScore: MAX_VOLUME_SPIKE,
    rawValue: snapshot.volumeMultiplier,
    reason: `Volume is ${snapshot.volumeMultiplier.toFixed(1)}x the recent average`,
  };
}
