import type {
  Balance,
  Kline,
  MarketSnapshot,
  OrderBook,
  Ticker,
} from "@/types/market";
import type { ExecutionResult, TradePlan } from "@/types/trading";

/**
 * Unified Binance data + execution interface.
 * Mock, REST and MCP providers all implement this contract, so the
 * risk engine and agent layers never care where data comes from.
 */
export interface BinanceProvider {
  readonly mode: "mock" | "live";
  getTicker(symbol: string): Promise<Ticker>;
  getKlines(symbol: string, interval: string, limit?: number): Promise<Kline[]>;
  getOrderBook(symbol: string, limit?: number): Promise<OrderBook>;
  getBalance(): Promise<Balance[]>;
  /** Builds a normalized market snapshot used by the FOMO Risk Engine. */
  getMarketSnapshot(symbol: string): Promise<MarketSnapshot>;
  /** Executes an approved trade plan. Must only be called after human approval. */
  createSpotOrder(plan: TradePlan): Promise<ExecutionResult>;
}

const QUOTE_SUFFIXES = ["USDT", "USDC", "FDUSD", "BTC"];

export function normalizeSymbol(raw: string): string {
  const s = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Only treat as a complete pair when there is a base asset before the
  // quote suffix — "BTC" alone is a base asset, not a pair.
  for (const quote of QUOTE_SUFFIXES) {
    if (s.endsWith(quote) && s.length > quote.length) return s;
  }
  return `${s}USDT`;
}
