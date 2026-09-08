import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/**
 * Real Binance MCP (Agent OS) client built on the official
 * @modelcontextprotocol/sdk with Streamable HTTP transport.
 *
 * Principles:
 * - Tool names are NEVER hardcoded. We run tools/list and resolve
 *   capabilities from the server's actual advertised tools + input schemas.
 * - A health check performs a real connect + tools/list round trip.
 * - Debug logs go to the server console only; secrets are never logged.
 */

export interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, { type?: string; description?: string }>;
    required?: string[];
  };
}

export type McpCapability = "ticker" | "klines" | "orderBook" | "account" | "trading";

export interface McpHealth {
  connected: boolean;
  tools: string[];
  capabilities: Record<McpCapability, boolean>;
  resolvedTools: Partial<Record<McpCapability, string>>;
  error?: string;
}

const MCP_URL =
  process.env.BINANCE_MCP_URL ?? "https://agent.binance.com/mcp/agentic";

const CONNECT_TIMEOUT_MS = Number(process.env.BINANCE_MCP_CONNECT_TIMEOUT_MS ?? 5_000);
const CALL_TIMEOUT_MS = 15_000;

const CAPABILITY_PATTERNS: Record<McpCapability, RegExp[]> = {
  ticker: [/ticker/i, /price/i, /quote/i],
  klines: [/kline/i, /candlestick/i, /ohlcv/i],
  orderBook: [/order_?book/i, /orderbook/i, /depth/i, /book_?ticker/i],
  account: [/account/i, /balance/i, /wallet/i],
  trading: [/place_?order/i, /create_?order/i, /new_?order/i, /spot_?order/i, /trade/i],
};

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

class BinanceMcpClient {
  private client: Client | null = null;
  private tools: McpToolInfo[] | null = null;
  private resolved: Partial<Record<McpCapability, string>> = {};
  private lastError: string | null = null;
  private connecting: Promise<boolean> | null = null;

  private log(msg: string): void {
    // Server-side debug log only. Never log tokens or headers.
    console.log(`[fomo-firewall] ${msg}`);
  }

  /** Connect + tools/list. Returns true when the MCP server is really reachable. */
  async connect(): Promise<boolean> {
    if (this.client && this.tools) return true;
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      this.log(`Binance MCP connecting... (${MCP_URL})`);
      try {
        const headers: Record<string, string> = {};
        const token = process.env.BINANCE_MCP_TOKEN;
        if (token) headers.Authorization = `Bearer ${token}`;

        const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
          requestInit: { headers },
        });
        const client = new Client(
          { name: "fomo-firewall", version: "0.2.0" },
          { capabilities: {} },
        );
        await withTimeout(client.connect(transport), CONNECT_TIMEOUT_MS, "MCP connect");

        const list = await withTimeout(client.listTools(), CONNECT_TIMEOUT_MS, "tools/list");
        this.tools = (list.tools ?? []) as McpToolInfo[];
        this.client = client;
        this.resolveCapabilities();

        this.log("Binance MCP connected.");
        this.log(
          `Available Binance MCP Tools: ${
            this.tools.length ? this.tools.map((t) => t.name).join(", ") : "(none advertised)"
          }`,
        );
        this.lastError = null;
        return true;
      } catch (err) {
        this.lastError = err instanceof Error ? err.message : String(err);
        // The SDK often swallows the raw HTTP status (e.g. a bare 401 from the
        // OAuth gate shows up as "Error POSTing to endpoint: <empty>").
        // Do one raw probe so the status endpoint can report the real cause.
        const raw = await this.probeRawStatus();
        if (raw) this.lastError = `${this.lastError} | raw HTTP ${raw}`;
        this.log(`Binance MCP connection failed: ${this.lastError}. Falling back.`);
        this.client = null;
        this.tools = null;
        return false;
      } finally {
        this.connecting = null;
      }
    })();

    return this.connecting;
  }

  /**
   * Raw initialize probe used only for error reporting: returns the real HTTP
   * status and a hint (e.g. "401 (OAuth Bearer required)") so operators can see
   * exactly why the MCP session could not be established.
   */
  private async probeRawStatus(): Promise<string | null> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      };
      const token = process.env.BINANCE_MCP_TOKEN;
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(MCP_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "fomo-firewall-probe", version: "0.2.0" },
          },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(CONNECT_TIMEOUT_MS),
      });
      const wwwAuth = res.headers.get("www-authenticate");
      if (res.status === 401) {
        return wwwAuth?.includes("Bearer")
          ? "401 (OAuth Bearer token required — set BINANCE_MCP_TOKEN)"
          : "401 (unauthorized)";
      }
      return `${res.status}`;
    } catch (e) {
      return `probe failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  private resolveCapabilities(): void {
    this.resolved = {};
    if (!this.tools) return;
    for (const [cap, patterns] of Object.entries(CAPABILITY_PATTERNS) as [
      McpCapability,
      RegExp[],
    ][]) {
      for (const pattern of patterns) {
        const hit = this.tools.find((t) => pattern.test(t.name));
        if (hit) {
          this.resolved[cap] = hit.name;
          break;
        }
      }
    }
  }

  async healthCheck(): Promise<McpHealth> {
    const connected = await this.connect();
    const caps: Record<McpCapability, boolean> = {
      ticker: false,
      klines: false,
      orderBook: false,
      account: false,
      trading: false,
    };
    for (const key of Object.keys(caps) as McpCapability[]) {
      caps[key] = Boolean(this.resolved[key]);
    }
    // Account/trading additionally require credentials.
    const authed = Boolean(process.env.BINANCE_MCP_TOKEN);
    if (!authed) {
      caps.account = false;
      caps.trading = false;
    }
    return {
      connected,
      tools: this.tools?.map((t) => t.name) ?? [],
      capabilities: caps,
      resolvedTools: { ...this.resolved },
      error: connected ? undefined : (this.lastError ?? "not connected"),
    };
  }

  /**
   * Build tool arguments from the tool's REAL input schema:
   * map our semantic values onto whatever property names the server declares.
   */
  private buildArgs(
    capability: McpCapability,
    values: { symbol?: string; interval?: string; limit?: number; side?: string; quoteOrderQty?: number },
  ): Record<string, unknown> {
    const tool = this.tools?.find((t) => t.name === this.resolved[capability]);
    const props = tool?.inputSchema?.properties ?? {};
    const args: Record<string, unknown> = {};

    for (const key of Object.keys(props)) {
      const k = key.toLowerCase();
      if (values.symbol !== undefined && (k === "symbol" || k.includes("symbol") || k.includes("pair"))) {
        args[key] = values.symbol;
      } else if (values.interval !== undefined && (k.includes("interval") || k.includes("timeframe"))) {
        args[key] = values.interval;
      } else if (values.limit !== undefined && (k.includes("limit") || k.includes("depth") || k.includes("count"))) {
        args[key] = values.limit;
      } else if (values.side !== undefined && k === "side") {
        args[key] = values.side;
      } else if (values.quoteOrderQty !== undefined && (k.includes("quote") || k.includes("amount"))) {
        args[key] = values.quoteOrderQty;
      }
    }
    // Sensible defaults when the schema is empty/unknown.
    if (Object.keys(args).length === 0 && values.symbol) args.symbol = values.symbol;
    return args;
  }

  /** Call a resolved MCP tool and return its parsed JSON payload. */
  async callTool<T = unknown>(
    capability: McpCapability,
    values: { symbol?: string; interval?: string; limit?: number; side?: string; quoteOrderQty?: number },
  ): Promise<T> {
    const ok = await this.connect();
    if (!ok || !this.client) {
      throw new Error(`Binance MCP unavailable: ${this.lastError ?? "not connected"}`);
    }
    const toolName = this.resolved[capability];
    if (!toolName) {
      throw new Error(`Binance MCP does not advertise a tool for capability "${capability}"`);
    }
    const args = this.buildArgs(capability, values);
    const result = await withTimeout(
      this.client.callTool({ name: toolName, arguments: args }),
      CALL_TIMEOUT_MS,
      `tools/call ${toolName}`,
    );

    const content = (result as { content?: Array<{ type: string; text?: string }> }).content;
    const text = content?.find((c) => c.type === "text")?.text;
    if (!text) throw new Error(`Binance MCP tool ${toolName} returned no text content`);

    if (values.symbol) {
      this.log(`${values.symbol} ${capability} fetched via Binance MCP (tool: ${toolName}).`);
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      // Some tools return plain scalars (e.g. a bare price).
      const num = Number(text);
      if (!Number.isNaN(num)) return num as T;
      return text as T;
    }
  }

  hasCapability(cap: McpCapability): boolean {
    return Boolean(this.resolved[cap]);
  }
}

let singleton: BinanceMcpClient | null = null;

export function getMcpClient(): BinanceMcpClient {
  if (!singleton) singleton = new BinanceMcpClient();
  return singleton;
}
