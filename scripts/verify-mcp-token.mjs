/**
 * Verify BINANCE_MCP_TOKEN against the real Binance MCP endpoint.
 * Full session: initialize -> notifications/initialized -> tools/list
 * -> tools/call ticker/klines/orderbook for BTCUSDT.
 * Prints real results verbatim. Uses HTTPS_PROXY if set.
 */
import fs from "node:fs";
import path from "node:path";
import { ProxyAgent, fetch as undiciFetch } from "undici";

const MCP_URL = process.env.BINANCE_MCP_URL ?? "https://agent.binance.com/mcp/agentic";

// Load token from .env (gitignored) if not in env
let token = process.env.BINANCE_MCP_TOKEN;
if (!token) {
  const envPath = path.resolve(process.cwd(), ".env");
  const m = fs.readFileSync(envPath, "utf8").match(/^BINANCE_MCP_TOKEN=(.+)$/m);
  token = m?.[1]?.trim();
}
if (!token) {
  console.error("No BINANCE_MCP_TOKEN found in env or .env");
  process.exit(1);
}

const proxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;
const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;

let sessionId = null;

async function rpc(method, params, id = null) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${token}`,
  };
  if (sessionId) headers["mcp-session-id"] = sessionId;
  const res = await undiciFetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", ...(id !== null ? { id } : {}), method, params }),
    dispatcher,
  });
  const sid = res.headers.get("mcp-session-id");
  if (sid) sessionId = sid;
  const text = await res.text();
  // Streamable HTTP may answer as SSE; extract the JSON payload
  if (text.startsWith("event:") || text.includes("\ndata:") || res.headers.get("content-type")?.includes("text/event-stream")) {
    const dataLine = text.split("\n").find((l) => l.startsWith("data:"));
    return { status: res.status, body: dataLine ? JSON.parse(dataLine.slice(5)) : null };
  }
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const find = (tools, ...res) =>
  tools.find((t) => res.some((re) => re.test(t.name)));

async function main() {
  console.log(`Endpoint: ${MCP_URL}`);
  console.log(`Token: ${token.slice(0, 8)}… (${token.length} chars)\n`);

  // 1. initialize
  const init = await rpc("initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "fomo-firewall-verify", version: "0.1.0" },
  }, 1);
  console.log("initialize:", init.status, init.body?.result?.serverInfo ?? init.body?.error ?? "");
  if (init.status !== 200) { console.log(JSON.stringify(init.body).slice(0, 300)); process.exit(1); }

  await rpc("notifications/initialized", {});

  // 2. tools/list
  const list = await rpc("tools/list", {}, 2);
  const tools = list.body?.result?.tools ?? [];
  console.log(`\ntools/list: ${list.status} — ${tools.length} tools`);
  for (const t of tools) console.log(`  - ${t.name}`);

  if (!tools.length) { console.log("No tools advertised."); process.exit(1); }

  // 3. call ticker / klines / orderbook for BTCUSDT
  const ticker = find(tools, /ticker|price/i);
  const klines = find(tools, /kline|candle|ohlc/i);
  const book = find(tools, /depth|order_?book|book/i);

  async function call(tool, args, label) {
    if (!tool) { console.log(`\n${label}: NO MATCHING TOOL`); return; }
    const r = await rpc("tools/call", { name: tool.name, arguments: args }, Math.floor(Math.random() * 1e6));
    const content = r.body?.result?.content;
    const txt = Array.isArray(content) ? content.map((c) => c.text ?? "").join("") : JSON.stringify(r.body);
    console.log(`\n${label} (${tool.name}): ${r.status}`);
    console.log("  ", txt.slice(0, 400));
  }

  await call(ticker, { symbol: "BTCUSDT" }, "TEST ticker BTCUSDT");
  await call(klines, { symbol: "BTCUSDT", interval: "5m", limit: 3 }, "TEST klines BTCUSDT");
  await call(book, { symbol: "BTCUSDT", limit: 5 }, "TEST orderbook BTCUSDT");
}

main().catch((e) => { console.error("fatal:", e.message); process.exit(1); });
