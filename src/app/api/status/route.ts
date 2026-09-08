import { NextResponse } from "next/server";
import { getAgentOsStatus, getMaxTradeUsdt, isDryRun } from "@/binance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const agentOs = await getAgentOsStatus();
  return NextResponse.json({
    mode: agentOs.mode,
    dryRun: isDryRun(),
    maxTradeUsdt: getMaxTradeUsdt(),
    dataSource: agentOs.dataSource,
    binance: {
      mcpUrl: process.env.BINANCE_MCP_URL ?? "https://agent.binance.com/mcp/agentic",
      mcpConnected: agentOs.mcp.connected,
      authenticated: Boolean(process.env.BINANCE_MCP_TOKEN),
      restReachable: agentOs.restReachable,
      capabilities: agentOs.mcp.capabilities,
      tools: agentOs.mcp.tools,
    },
  });
}
