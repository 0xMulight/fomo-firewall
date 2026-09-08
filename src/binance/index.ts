import type { BinanceProvider } from "./provider";
import { MockBinanceProvider } from "./mockProvider";
import { BinanceMCPProvider } from "./mcpProvider";
import { BinanceRESTProvider } from "./restProvider";
import { FallbackProvider } from "./fallbackProvider";
import { getMcpClient, type McpHealth } from "./mcpClient";

export type DataMode = "mock" | "live";
export type DataSource = "mcp" | "rest" | "mock";

export function getDataMode(): DataMode {
  return process.env.DATA_MODE === "live" ? "live" : "mock";
}

export function isDryRun(): boolean {
  // Default safe: anything other than an explicit "false" means DRY RUN.
  return process.env.DRY_RUN !== "false";
}

export function getMaxTradeUsdt(): number {
  const v = parseFloat(process.env.MAX_TRADE_USDT ?? "50");
  return Number.isFinite(v) && v > 0 ? v : 50;
}

let cached: BinanceProvider | null = null;

export function getProvider(): BinanceProvider {
  if (cached) return cached;
  cached =
    getDataMode() === "live"
      ? // Live mode: real Binance MCP first, official public REST as fallback
        // for market data, mock only for symbols Binance doesn't list (PONS).
        new FallbackProvider(
          new BinanceMCPProvider(),
          new BinanceRESTProvider(),
          new MockBinanceProvider(),
        )
      : new MockBinanceProvider();
  return cached;
}

/* ------------------------------------------------------------------ */
/* Real Agent OS status: actual MCP health check + REST reachability   */
/* ------------------------------------------------------------------ */

export interface AgentOsStatus {
  mode: DataMode;
  /** Real MCP health check result (connect + tools/list). */
  mcp: McpHealth;
  /** Which source will actually serve market data right now. */
  dataSource: DataSource;
  restReachable: boolean;
}

let statusCache: { value: AgentOsStatus; at: number } | null = null;
const STATUS_TTL_MS = 60_000;

const REST_BASE = process.env.BINANCE_REST_URL ?? "https://api.binance.com";

async function checkRest(): Promise<boolean> {
  try {
    const res = await fetch(`${REST_BASE}/api/v3/ping`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getAgentOsStatus(force = false): Promise<AgentOsStatus> {
  if (!force && statusCache && Date.now() - statusCache.at < STATUS_TTL_MS) {
    return statusCache.value;
  }

  const mode = getDataMode();
  if (mode === "mock") {
    const value: AgentOsStatus = {
      mode,
      mcp: {
        connected: false,
        tools: [],
        capabilities: { ticker: false, klines: false, orderBook: false, account: false, trading: false },
        resolvedTools: {},
        error: "DATA_MODE=mock — MCP not contacted in demo mode",
      },
      dataSource: "mock",
      restReachable: false,
    };
    statusCache = { value, at: Date.now() };
    return value;
  }

  const [mcp, restReachable] = await Promise.all([
    getMcpClient().healthCheck(),
    checkRest(),
  ]);

  const dataSource: DataSource = mcp.connected ? "mcp" : restReachable ? "rest" : "mock";
  const value: AgentOsStatus = { mode, mcp, dataSource, restReachable };
  statusCache = { value, at: Date.now() };
  return value;
}
