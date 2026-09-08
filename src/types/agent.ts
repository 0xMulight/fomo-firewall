import type { RiskLevel } from "./market";
import type { TradePlan } from "./trading";

export type IntentType = "ANALYZE" | "BUY" | "SELL" | "UNKNOWN";

export interface ParsedIntent {
  intent: IntentType;
  symbol: string | null;
  amount: number | null;
  currency: string | null;
  requiresTrade: boolean;
  raw: string;
}

export interface FactorResult {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  rawValue: number;
  reason: string;
}

export interface FomoAssessment {
  totalScore: number;
  level: RiskLevel;
  factors: FactorResult[];
}

export type Verdict = "TRADE" | "WAIT" | "AVOID";

export interface AgentStep {
  id: string;
  label: string;
  status: "running" | "done";
}

/** Explanation produced by the agent reasoning layer. */
export interface AgentExplanation {
  headline: string;
  bullets: string[];
  suggestedAction: string;
}

export type AgentSource = "mcp" | "rest" | "mock";

export interface AgentAnalysisResult {
  kind: "analysis";
  symbol: string;
  snapshotSummary: {
    price: number;
    change5m: number;
    change15m: number;
    change1h: number;
    volumeMultiplier: number;
    vwapDeviation: number;
    spreadPct: number;
    bidShare: number;
  };
  assessment: FomoAssessment;
  verdict: Verdict;
  explanation: AgentExplanation;
  source: AgentSource;
  tradePlan?: TradePlan;
  blocked?: string;
}

export interface AgentErrorResult {
  kind: "error";
  message: string;
}

export type AgentResult = AgentAnalysisResult | AgentErrorResult;
