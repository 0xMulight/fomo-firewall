import type { BinanceProvider } from "./provider";
import { normalizeSymbol } from "./provider";
import type {
  Balance,
  Kline,
  MarketSnapshot,
  OrderBook,
  Ticker,
} from "@/types/market";
import type { ExecutionResult, TradePlan } from "@/types/trading";

const REST_BASE = process.env.BINANCE_REST_URL ?? "https://api.binance.com";

type RawKline = [
  number, string, string, string, string, string,
  number, string, number, string, string, string,
];

function pctChange(now: number, then: number): number {
  if (then === 0) return 0;
  return ((now - then) / then) * 100;
}

/**
 * Live market data from Binance public REST endpoints (no auth required).
 * Account data and order execution require the MCP provider, so those
 * methods throw a clear error here.
 */
export class BinanceRESTProvider implements BinanceProvider {
  readonly mode = "live" as const;

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${REST_BASE}${path}`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Binance REST ${path} failed: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  }

  async getTicker(symbol: string): Promise<Ticker> {
    const sym = normalizeSymbol(symbol);
    const data = await this.get<{ symbol: string; price: string }>(
      `/api/v3/ticker/price?symbol=${sym}`,
    );
    return { symbol: data.symbol, price: parseFloat(data.price) };
  }

  async getKlines(symbol: string, interval: string, limit = 24): Promise<Kline[]> {
    const sym = normalizeSymbol(symbol);
    const raw = await this.get<RawKline[]>(
      `/api/v3/klines?symbol=${sym}&interval=${interval}&limit=${limit}`,
    );
    return raw.map((k) => ({
      openTime: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  }

  async getOrderBook(symbol: string, limit = 20): Promise<OrderBook> {
    const sym = normalizeSymbol(symbol);
    const data = await this.get<{ bids: string[][]; asks: string[][] }>(
      `/api/v3/depth?symbol=${sym}&limit=${limit}`,
    );
    const map = (levels: string[][]) =>
      levels.map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
      }));
    return { bids: map(data.bids), asks: map(data.asks) };
  }

  async getBalance(): Promise<Balance[]> {
    throw new Error(
      "Account balance requires Binance MCP authentication (BINANCE_MCP_TOKEN). " +
        "Public REST market data is available; private endpoints are not.",
    );
  }

  async getMarketSnapshot(symbol: string): Promise<MarketSnapshot> {
    const sym = normalizeSymbol(symbol);
    const [ticker, klines, book] = await Promise.all([
      this.getTicker(sym),
      this.getKlines(sym, "5m", 24),
      this.getOrderBook(sym, 20),
    ]);

    const closes = klines.map((k) => k.close);
    const last = closes[closes.length - 1] ?? ticker.price;

    // VWAP over the last 12 five-minute candles (1 hour window).
    const windowKlines = klines.slice(-12);
    let pv = 0;
    let vv = 0;
    for (const k of windowKlines) {
      const typical = (k.high + k.low + k.close) / 3;
      pv += typical * k.volume;
      vv += k.volume;
    }
    const vwap = vv > 0 ? pv / vv : last;

    // Volume multiplier: latest candle vs average of the previous 20.
    const prev = klines.slice(-21, -1);
    const avgVol = prev.length
      ? prev.reduce((acc, k) => acc + k.volume, 0) / prev.length
      : 1;
    const lastVol = klines[klines.length - 1]?.volume ?? 0;

    // Spread at top of book.
    const bestBid = book.bids[0]?.price ?? last;
    const bestAsk = book.asks[0]?.price ?? last;
    const mid = (bestBid + bestAsk) / 2;
    const spreadPct = mid > 0 ? ((bestAsk - bestBid) / mid) * 100 : 0;

    // Orderbook imbalance from top-20 depth.
    const bidDepth = book.bids.reduce((acc, l) => acc + l.price * l.quantity, 0);
    const askDepth = book.asks.reduce((acc, l) => acc + l.price * l.quantity, 0);
    const bidShare = bidDepth + askDepth > 0 ? bidDepth / (bidDepth + askDepth) : 0.5;

    // Volatility: mean 5m candle range over the last 12 candles.
    const volatilityPct =
      windowKlines.length > 0
        ? (windowKlines.reduce(
            (acc, k) => acc + (k.close > 0 ? ((k.high - k.low) / k.close) * 100 : 0),
            0,
          ) /
            windowKlines.length)
        : 0;

    return {
      symbol: sym,
      price: ticker.price,
      change5m: pctChange(last, closes[closes.length - 2] ?? last),
      change15m: pctChange(last, closes[closes.length - 4] ?? last),
      change1h: pctChange(last, closes[closes.length - 13] ?? last),
      volumeMultiplier: avgVol > 0 ? lastVol / avgVol : 1,
      vwapDeviation: vwap > 0 ? ((ticker.price - vwap) / vwap) * 100 : 0,
      spreadPct,
      orderbookImbalance: (0.5 - bidShare) * 2,
      bidShare,
      volatilityPct,
      source: "rest",
      timestamp: Date.now(),
    };
  }

  async createSpotOrder(_plan: TradePlan): Promise<ExecutionResult> {
    throw new Error(
      "Order execution requires Binance MCP authentication. " +
        "Complete the OAuth flow and set BINANCE_MCP_TOKEN.",
    );
  }
}
