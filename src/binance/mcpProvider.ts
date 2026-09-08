import type { BinanceProvider } from "./provider";
import { normalizeSymbol } from "./provider";
import { getMcpClient } from "./mcpClient";
import type {
  Balance,
  Kline,
  MarketSnapshot,
  OrderBook,
  Ticker,
} from "@/types/market";
import type { ExecutionResult, TradePlan } from "@/types/trading";

/**
 * Binance MCP (Agent OS) provider — market data and trading go through the
 * real MCP server at https://agent.binance.com/mcp/agentic.
 *
 * Tool names are resolved from the server's own tools/list response
 * (never assumed). Responses are parsed defensively because different MCP
 * builds serialize Binance payloads differently.
 */

type RawKlineArray = [number, string, string, string, string, string, ...unknown[]];

function parseKlines(payload: unknown): Kline[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((k): Kline | null => {
      if (Array.isArray(k)) {
        const a = k as RawKlineArray;
        return {
          openTime: Number(a[0]),
          open: parseFloat(String(a[1])),
          high: parseFloat(String(a[2])),
          low: parseFloat(String(a[3])),
          close: parseFloat(String(a[4])),
          volume: parseFloat(String(a[5])),
        };
      }
      if (typeof k === "object" && k !== null) {
        const o = k as Record<string, unknown>;
        const num = (...keys: string[]) => {
          for (const key of keys) {
            const v = o[key];
            if (v !== undefined) return parseFloat(String(v));
          }
          return NaN;
        };
        return {
          openTime: num("openTime", "open_time", "time") || Date.now(),
          open: num("open"),
          high: num("high"),
          low: num("low"),
          close: num("close"),
          volume: num("volume", "vol"),
        };
      }
      return null;
    })
    .filter((k): k is Kline => k !== null && Number.isFinite(k.close));
}

function parseLevels(payload: unknown): { price: number; quantity: number }[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((l) => {
      if (Array.isArray(l)) {
        return { price: parseFloat(String(l[0])), quantity: parseFloat(String(l[1])) };
      }
      if (typeof l === "object" && l !== null) {
        const o = l as Record<string, unknown>;
        return {
          price: parseFloat(String(o.price ?? o.p)),
          quantity: parseFloat(String(o.quantity ?? o.qty ?? o.q)),
        };
      }
      return null;
    })
    .filter(
      (l): l is { price: number; quantity: number } =>
        l !== null && Number.isFinite(l.price) && Number.isFinite(l.quantity),
    );
}

function parsePrice(payload: unknown): number {
  if (typeof payload === "number") return payload;
  if (typeof payload === "string") return parseFloat(payload);
  if (typeof payload === "object" && payload !== null) {
    const o = payload as Record<string, unknown>;
    for (const key of ["price", "lastPrice", "last_price", "markPrice"]) {
      if (o[key] !== undefined) return parseFloat(String(o[key]));
    }
  }
  return NaN;
}

function pctChange(now: number, then: number): number {
  if (!then) return 0;
  return ((now - then) / then) * 100;
}

export class BinanceMCPProvider implements BinanceProvider {
  readonly mode = "live" as const;
  private mcp = getMcpClient();

  async getTicker(symbol: string): Promise<Ticker> {
    const sym = normalizeSymbol(symbol);
    const payload = await this.mcp.callTool("ticker", { symbol: sym });
    const price = parsePrice(payload);
    if (!Number.isFinite(price)) {
      throw new Error(`Binance MCP ticker for ${sym} returned an unparseable payload`);
    }
    return { symbol: sym, price };
  }

  async getKlines(symbol: string, interval: string, limit = 24): Promise<Kline[]> {
    const sym = normalizeSymbol(symbol);
    const payload = await this.mcp.callTool("klines", { symbol: sym, interval, limit });
    const klines = parseKlines(payload);
    if (klines.length === 0) {
      throw new Error(`Binance MCP klines for ${sym} returned no candles`);
    }
    return klines;
  }

  async getOrderBook(symbol: string, limit = 20): Promise<OrderBook> {
    const sym = normalizeSymbol(symbol);
    const payload = await this.mcp.callTool("orderBook", { symbol: sym, limit });
    const o = payload as Record<string, unknown>;
    const bids = parseLevels(o?.bids);
    const asks = parseLevels(o?.asks);
    if (bids.length === 0 && asks.length === 0) {
      throw new Error(`Binance MCP order book for ${sym} returned no levels`);
    }
    return { bids, asks };
  }

  async getBalance(): Promise<Balance[]> {
    const payload = await this.mcp.callTool<{ balances?: unknown }>("account", {});
    const list = Array.isArray(payload)
      ? payload
      : ((payload as { balances?: unknown[] })?.balances ?? []);
    return (list as Array<Record<string, unknown>>).map((b) => ({
      asset: String(b.asset ?? ""),
      free: parseFloat(String(b.free ?? 0)),
      locked: parseFloat(String(b.locked ?? 0)),
    }));
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

    const prev = klines.slice(-21, -1);
    const avgVol = prev.length
      ? prev.reduce((acc, k) => acc + k.volume, 0) / prev.length
      : 1;
    const lastVol = klines[klines.length - 1]?.volume ?? 0;

    const bestBid = book.bids[0]?.price ?? last;
    const bestAsk = book.asks[0]?.price ?? last;
    const mid = (bestBid + bestAsk) / 2;
    const spreadPct = mid > 0 ? ((bestAsk - bestBid) / mid) * 100 : 0;

    const bidDepth = book.bids.reduce((acc, l) => acc + l.price * l.quantity, 0);
    const askDepth = book.asks.reduce((acc, l) => acc + l.price * l.quantity, 0);
    const bidShare = bidDepth + askDepth > 0 ? bidDepth / (bidDepth + askDepth) : 0.5;

    const volatilityPct =
      windowKlines.length > 0
        ? windowKlines.reduce(
            (acc, k) => acc + (k.close > 0 ? ((k.high - k.low) / k.close) * 100 : 0),
            0,
          ) / windowKlines.length
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
      source: "mcp",
      timestamp: Date.now(),
    };
  }

  async createSpotOrder(plan: TradePlan): Promise<ExecutionResult> {
    const payload = await this.mcp.callTool<Record<string, unknown>>("trading", {
      symbol: plan.symbol,
      side: plan.side,
      quoteOrderQty: plan.amountUsdt,
    });
    const orderId = payload?.orderId ?? payload?.id;
    return {
      planId: plan.id,
      status: "EXECUTED",
      message: `${plan.side} ${plan.symbol} for ~${plan.amountUsdt} USDT executed via Binance MCP.`,
      orderId: orderId !== undefined ? String(orderId) : undefined,
      executedQty: plan.estimatedQuantity,
      executedPrice: plan.referencePrice,
      dryRun: false,
      timestamp: Date.now(),
    };
  }
}
