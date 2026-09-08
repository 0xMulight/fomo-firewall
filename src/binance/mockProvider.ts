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

interface MockScenario {
  price: number;
  change5m: number;
  change15m: number;
  change1h: number;
  volumeMultiplier: number;
  vwapDeviation: number;
  spreadPct: number;
  bidShare: number;
  volatilityPct: number;
}

/**
 * Stable, deterministic demo scenarios.
 * PONSUSDT -> FOMO Score ~87 (EXTREME / AVOID)  "chasing a pump"
 * BNBUSDT  -> FOMO Score ~24 (LOW / TRADE)      "healthy market"
 */
const SCENARIOS: Record<string, MockScenario> = {
  PONSUSDT: {
    price: 0.0428,
    change5m: 7.4,
    change15m: 12.8,
    change1h: 23.1,
    volumeMultiplier: 4.7,
    vwapDeviation: 9.1,
    spreadPct: 0.32,
    bidShare: 0.36, // buy-side depth weakening
    volatilityPct: 4.0,
  },
  BNBUSDT: {
    price: 692.4,
    change5m: 0.3,
    change15m: 0.8,
    change1h: 1.6,
    volumeMultiplier: 1.2,
    vwapDeviation: 1.1,
    spreadPct: 0.04,
    bidShare: 0.495, // balanced book
    volatilityPct: 0.9,
  },
  BTCUSDT: {
    price: 104230,
    change5m: 0.2,
    change15m: 0.8,
    change1h: 1.2,
    volumeMultiplier: 1.1,
    vwapDeviation: 0.6,
    spreadPct: 0.02,
    bidShare: 0.5,
    volatilityPct: 0.5,
  },
  ETHUSDT: {
    price: 3418.2,
    change5m: 0.9,
    change15m: 2.1,
    change1h: 3.4,
    volumeMultiplier: 1.8,
    vwapDeviation: 1.9,
    spreadPct: 0.05,
    bidShare: 0.47,
    volatilityPct: 1.4,
  },
};

/** Generic mild scenario for any other symbol asked in demo mode. */
function fallbackScenario(symbol: string): MockScenario {
  const base = symbol.startsWith("BTC") ? 100000 : symbol.startsWith("ETH") ? 3000 : 100;
  return {
    price: base,
    change5m: 0.4,
    change15m: 0.9,
    change1h: 1.5,
    volumeMultiplier: 1.1,
    vwapDeviation: 0.8,
    spreadPct: 0.06,
    bidShare: 0.5,
    volatilityPct: 0.7,
  };
}

function scenarioFor(symbol: string): MockScenario {
  return SCENARIOS[symbol] ?? fallbackScenario(symbol);
}

function synthesizeKlines(s: MockScenario, limit: number): Kline[] {
  const now = Date.now();
  const klines: Kline[] = [];
  // Walk backwards from the current price using the 1h drift.
  const perCandleDrift = s.change1h / 100 / 12;
  let close = s.price;
  for (let i = 0; i < limit; i++) {
    const range = (s.volatilityPct / 100) * close;
    const open = close / (1 + perCandleDrift);
    const high = Math.max(open, close) + range / 2;
    const low = Math.min(open, close) - range / 2;
    const volume = i === 0 ? s.volumeMultiplier * 1000 : 1000;
    klines.unshift({
      openTime: now - (i + 1) * 5 * 60 * 1000,
      open,
      high,
      low,
      close,
      volume,
    });
    close = open;
  }
  return klines;
}

function synthesizeOrderBook(s: MockScenario): OrderBook {
  const bids = [] as OrderBook["bids"];
  const asks = [] as OrderBook["asks"];
  const halfSpread = (s.spreadPct / 100) * s.price * 0.5;
  const bidTotal = s.bidShare * 1000;
  const askTotal = (1 - s.bidShare) * 1000;
  for (let i = 0; i < 20; i++) {
    const decay = Math.exp(-i / 6);
    bids.push({
      price: s.price - halfSpread - i * s.price * 0.0005,
      quantity: (bidTotal / 20) * decay * 4,
    });
    asks.push({
      price: s.price + halfSpread + i * s.price * 0.0005,
      quantity: (askTotal / 20) * decay * 4,
    });
  }
  return { bids, asks };
}

export class MockBinanceProvider implements BinanceProvider {
  readonly mode = "mock" as const;

  async getTicker(symbol: string): Promise<Ticker> {
    const sym = normalizeSymbol(symbol);
    return { symbol: sym, price: scenarioFor(sym).price };
  }

  async getKlines(symbol: string, _interval: string, limit = 24): Promise<Kline[]> {
    return synthesizeKlines(scenarioFor(normalizeSymbol(symbol)), limit);
  }

  async getOrderBook(symbol: string): Promise<OrderBook> {
    return synthesizeOrderBook(scenarioFor(normalizeSymbol(symbol)));
  }

  async getBalance(): Promise<Balance[]> {
    return [
      { asset: "USDT", free: 500, locked: 0 },
      { asset: "BNB", free: 0.5, locked: 0 },
    ];
  }

  async getMarketSnapshot(symbol: string): Promise<MarketSnapshot> {
    const sym = normalizeSymbol(symbol);
    const s = scenarioFor(sym);
    return {
      symbol: sym,
      price: s.price,
      change5m: s.change5m,
      change15m: s.change15m,
      change1h: s.change1h,
      volumeMultiplier: s.volumeMultiplier,
      vwapDeviation: s.vwapDeviation,
      spreadPct: s.spreadPct,
      orderbookImbalance: (0.5 - s.bidShare) * 2,
      bidShare: s.bidShare,
      volatilityPct: s.volatilityPct,
      source: "mock",
      timestamp: Date.now(),
    };
  }

  async createSpotOrder(plan: TradePlan): Promise<ExecutionResult> {
    return {
      planId: plan.id,
      status: "SIMULATED",
      message: `Simulated ${plan.side} ${plan.estimatedQuantity} ${plan.symbol} (~${plan.amountUsdt} USDT). No real order was sent.`,
      orderId: `MOCK-${Date.now()}`,
      executedQty: plan.estimatedQuantity,
      executedPrice: plan.referencePrice,
      dryRun: true,
      timestamp: Date.now(),
    };
  }
}
