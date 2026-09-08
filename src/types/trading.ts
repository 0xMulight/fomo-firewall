export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET";

export interface TradePlan {
  id: string;
  symbol: string;
  side: OrderSide;
  amountUsdt: number;
  orderType: OrderType;
  referencePrice: number;
  estimatedQuantity: number;
  riskScore: number;
  riskLevel: string;
  verdict: string;
  dryRun: boolean;
  createdAt: number;
}

export type ExecutionStatus = "SIMULATED" | "EXECUTED" | "FAILED" | "REJECTED";

export interface ExecutionResult {
  planId: string;
  status: ExecutionStatus;
  message: string;
  orderId?: string;
  executedQty?: number;
  executedPrice?: number;
  dryRun: boolean;
  timestamp: number;
}

export interface ActivityEntry {
  timestamp: number;
  prompt: string;
  symbol: string;
  fomoScore: number | null;
  verdict: string | null;
  tradePlan: string | null;
  userDecision: "APPROVED" | "CANCELLED" | "NONE";
  executionResult: string | null;
  dataSource: "mcp" | "rest" | "mock" | null;
}
