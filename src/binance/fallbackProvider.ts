import type { BinanceProvider } from "./provider";
import type {
  Balance,
  Kline,
  MarketSnapshot,
  OrderBook,
  Ticker,
} from "@/types/market";
import type { ExecutionResult, TradePlan } from "@/types/trading";

/**
 * Live-first provider with an honest fallback chain:
 *
 *   Binance MCP (source: "mcp")
 *     → Binance public REST (source: "rest")   [MCP unreachable / symbol error]
 *       → Mock demo data (source: "mock")      [symbol doesn't exist, e.g. PONS]
 *
 * The fallback only applies to PUBLIC MARKET DATA, and every snapshot keeps
 * its real `source` so the UI can label it truthfully. Account data and
 * order execution are never silently mocked — they always go to the live
 * providers and surface real errors.
 */
export class FallbackProvider implements BinanceProvider {
  readonly mode = "live" as const;

  /** Skip MCP attempts for this long after a failure, so every market-data
   *  call doesn't pay the MCP connect timeout while the endpoint is down. */
  private static MCP_COOLDOWN_MS = 60_000;
  private mcpDownUntil = 0;

  constructor(
    private mcp: BinanceProvider,
    private rest: BinanceProvider,
    private mock: BinanceProvider,
  ) {}

  private async marketData<T>(
    fn: (p: BinanceProvider) => Promise<T>,
  ): Promise<T> {
    if (Date.now() < this.mcpDownUntil) {
      try {
        return await fn(this.rest);
      } catch {
        return fn(this.mock);
      }
    }
    try {
      return await fn(this.mcp);
    } catch {
      this.mcpDownUntil = Date.now() + FallbackProvider.MCP_COOLDOWN_MS;
      try {
        return await fn(this.rest);
      } catch {
        return fn(this.mock);
      }
    }
  }

  getTicker(symbol: string): Promise<Ticker> {
    return this.marketData((p) => p.getTicker(symbol));
  }

  getKlines(symbol: string, interval: string, limit?: number): Promise<Kline[]> {
    return this.marketData((p) => p.getKlines(symbol, interval, limit));
  }

  getOrderBook(symbol: string, limit?: number): Promise<OrderBook> {
    return this.marketData((p) => p.getOrderBook(symbol, limit));
  }

  getMarketSnapshot(symbol: string): Promise<MarketSnapshot> {
    return this.marketData((p) => p.getMarketSnapshot(symbol));
  }

  getBalance(): Promise<Balance[]> {
    return this.mcp.getBalance();
  }

  createSpotOrder(plan: TradePlan): Promise<ExecutionResult> {
    return this.mcp.createSpotOrder(plan);
  }
}
