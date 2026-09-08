import type { FomoAssessment, Verdict } from "@/types/agent";

/**
 * Maps a FOMO assessment to an actionable verdict.
 * TRADE  - conditions are calm enough to proceed (still requires approval)
 * WAIT   - elevated risk; better to wait for consolidation
 * AVOID  - chasing here has clearly poor risk/reward
 *
 * Human-readable verdict copy lives in src/lib/i18n.ts (bilingual).
 */
export function verdictForAssessment(assessment: FomoAssessment): Verdict {
  const { totalScore, level } = assessment;
  if (level === "LOW") return "TRADE";
  if (level === "MEDIUM") return totalScore <= 45 ? "TRADE" : "WAIT";
  return "AVOID";
}
