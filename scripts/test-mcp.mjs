/**
 * Honest MCP connectivity test (spec section 50, TEST 1-4).
 * Attempts a real connection to the Binance Agent OS MCP endpoint and
 * exercises tools/list + ticker/klines/orderbook tool calls.
 * Every result is printed verbatim — failures are reported, not hidden.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL =
  process.env.BINANCE_MCP_URL ?? "https://agent.binance.com/mcp/agentic";
const TOKEN = process.env.BINANCE_MCP_TOKEN ?? "";
const TIMEOUT_MS = 12000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  —  ${detail}`);
}

async function main() {
  console.log(`MCP endpoint: ${MCP_URL}`);
  console.log(`Token present: ${TOKEN ? "yes" : "no"}\n`);

  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: TOKEN
      ? { headers: { Authorization: `Bearer ${TOKEN}` } }
      : undefined,
  });
  const client = new Client(
    { name: "fomo-firewall-test", version: "0.1.0" },
    { capabilities: {} },
  );

  // TEST 1: connect + tools/list
  let tools = [];
  try {
    await withTimeout(client.connect(transport), TIMEOUT_MS, "MCP connect");
    const list = await withTimeout(client.listTools(), TIMEOUT_MS, "tools/list");
    tools = list.tools ?? [];
    record(
      "TEST 1 tools/list",
      true,
      `connected, ${tools.length} tools: ${tools.map((t) => t.name).join(", ") || "(none)"}`,
    );
  } catch (err) {
    record("TEST 1 tools/list", false, String(err?.message ?? err));
    console.log(
      "\nMCP unreachable from this machine — TEST 2-4 skipped (they require a live MCP session).",
    );
    await client.close().catch(() => {});
    summarize();
    return;
  }

  const find = (re) => tools.find((t) => re.test(t.name));

  // TEST 2: ticker tool
  const tickerTool = find(/ticker|price/i);
  if (!tickerTool) {
    record("TEST 2 ticker tool", false, "no ticker-like tool exposed");
  } else {
    try {
      const r = await withTimeout(
        client.callTool({ name: tickerTool.name, arguments: { symbol: "BTCUSDT" } }),
        TIMEOUT_MS,
        "ticker call",
      );
      record("TEST 2 ticker tool", true, JSON.stringify(r).slice(0, 200));
    } catch (err) {
      record("TEST 2 ticker tool", false, String(err?.message ?? err));
    }
  }

  // TEST 3: klines tool
  const klineTool = find(/kline|candle|ohlc/i);
  if (!klineTool) {
    record("TEST 3 klines tool", false, "no kline-like tool exposed");
  } else {
    try {
      const r = await withTimeout(
        client.callTool({
          name: klineTool.name,
          arguments: { symbol: "BTCUSDT", interval: "5m", limit: 5 },
        }),
        TIMEOUT_MS,
        "klines call",
      );
      record("TEST 3 klines tool", true, JSON.stringify(r).slice(0, 200));
    } catch (err) {
      record("TEST 3 klines tool", false, String(err?.message ?? err));
    }
  }

  // TEST 4: order book tool
  const bookTool = find(/depth|order.?book|book/i);
  if (!bookTool) {
    record("TEST 4 orderbook tool", false, "no orderbook-like tool exposed");
  } else {
    try {
      const r = await withTimeout(
        client.callTool({ name: bookTool.name, arguments: { symbol: "BTCUSDT", limit: 5 } }),
        TIMEOUT_MS,
        "orderbook call",
      );
      record("TEST 4 orderbook tool", true, JSON.stringify(r).slice(0, 200));
    } catch (err) {
      record("TEST 4 orderbook tool", false, String(err?.message ?? err));
    }
  }

  await client.close().catch(() => {});
  summarize();
}

function summarize() {
  const pass = results.filter((r) => r.ok).length;
  console.log(`\n${pass}/${results.length} MCP tests passed.`);
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
