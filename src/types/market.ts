/** A normalized market snapshot consumed by the FOMO Risk Engine. */
export interface MarketSnapshot {
  symbol: string;
  /** Latest traded price. */
  price: number;
  /** % change over the last 5 minutes. */
  change5m: number;
  /** % change over the last 15 minutes. */
  change15m: number;
  /** % change over the last 1 hour. */
  change1h: number;
  /** Current 5m volume relative to the 20-period average (1.0 = normal). */
  volumeMultiplier: number;
  /** % deviation of price above/below short-term VWAP. */
  vwapDeviation: number;
  /** Top-of-book spread as % of mid price. */
  spreadPct: number;
  /**
   * Orderbook imbalance in [-1, 1].
   * Positive = ask-side heavier (bids weakening), negative = bid-side heavier.
   */
  orderbookImbalance: number;
  /** Bid share of top-20-level depth, 0..1 (0.5 = balanced). */
  bidShare: number;
  /** Mean 5m candle range (high-low)/close as %, over the last 12 candles. */
  volatilityPct: number;
  /** Where this snapshot came from. */
  source: "mcp" | "rest" | "mock";
  /** Unix ms timestamp of the snapshot. */
  timestamp: number;
}

export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface Ticker {
  symbol: string;
  price: number;
}

export interface Balance {
  asset: string;
  free: number;
  locked: number;
}

export interface WatchlistEntry {
  symbol: string;
  price: number;
  change15m: number;
  change1h: number;
  fomoScore: number;
  level: RiskLevel;
  source: "mcp" | "rest" | "mock";
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
