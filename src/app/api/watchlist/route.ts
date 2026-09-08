import { NextResponse } from "next/server";
import { getProvider } from "@/binance";
import { computeFomoScore } from "@/scoring/fomoScore";
import type { WatchlistEntry } from "@/types/market";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WATCHLIST_SYMBOLS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "PONSUSDT"];

async function buildEntry(symbol: string): Promise<WatchlistEntry | null> {
  const provider = getProvider();
  try {
    const snapshot = await provider.getMarketSnapshot(symbol);
    const assessment = computeFomoScore(snapshot);
    return {
      symbol,
      price: snapshot.price,
      change15m: snapshot.change15m,
      change1h: snapshot.change1h,
      fomoScore: assessment.totalScore,
      level: assessment.level,
      source: snapshot.source,
    };
  } catch {
    // Skip symbols that fail entirely (e.g. delisted pairs in live mode).
    return null;
  }
}

export async function GET() {
  const provider = getProvider();
  const results = await Promise.all(WATCHLIST_SYMBOLS.map(buildEntry));
  return NextResponse.json({
    mode: provider.mode,
    entries: results.filter((e): e is WatchlistEntry => e !== null),
    timestamp: Date.now(),
  });
}
