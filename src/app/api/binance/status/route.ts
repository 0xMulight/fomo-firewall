import { NextResponse } from "next/server";
import { getAgentOsStatus } from "@/binance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Real Binance Agent OS status. `connected` comes from an actual MCP
 * connect + tools/list round trip; capabilities are resolved from the
 * server's advertised tool names. Nothing here is hardcoded.
 */
export async function GET() {
  const status = await getAgentOsStatus();
  return NextResponse.json({
    connected: status.mcp.connected,
    provider: status.mcp.connected ? "BINANCE_MCP" : status.dataSource === "rest" ? "BINANCE_REST" : "MOCK",
    mode: status.mode === "live" ? "LIVE" : "DEMO",
    dataSource: status.dataSource,
    mcpUrl: process.env.BINANCE_MCP_URL ?? "https://agent.binance.com/mcp/agentic",
    tools: status.mcp.tools,
    capabilities: status.mcp.capabilities,
    resolvedTools: status.mcp.resolvedTools,
    error: status.mcp.error,
    timestamp: Date.now(),
  });
}
