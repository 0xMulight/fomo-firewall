import { NextRequest, NextResponse } from "next/server";
import { getMaxTradeUsdt, getProvider, isDryRun } from "@/binance";
import { getExecStrings, normalizeLocale } from "@/lib/i18n";
import type { ExecutionResult, TradePlan } from "@/types/trading";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The human approval gate's server side. An order is only sent when:
 *   1. the client explicitly passes `approved: true` (user clicked Approve),
 *   2. the plan passes server-side re-validation (amount cap, risk verdict),
 *   3. and even then, DRY_RUN=true keeps it simulated.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    plan?: TradePlan;
    approved?: boolean;
    locale?: string;
  } | null;

  const s = getExecStrings(normalizeLocale(body?.locale));

  if (!body?.plan) {
    return NextResponse.json({ error: s.missingPlan }, { status: 400 });
  }

  const plan = body.plan;

  const reject = (message: string): NextResponse => {
    const result: ExecutionResult = {
      planId: plan.id,
      status: "REJECTED",
      message,
      dryRun: isDryRun(),
      timestamp: Date.now(),
    };
    return NextResponse.json({ result }, { status: 403 });
  };

  if (body.approved !== true) {
    return reject(s.notApproved);
  }

  const maxCapital = getMaxTradeUsdt();
  if (plan.amountUsdt > maxCapital) {
    return reject(s.overCap(plan.amountUsdt, maxCapital));
  }

  if (plan.verdict === "AVOID" || plan.riskScore > 60) {
    return reject(s.riskyVerdict(plan.verdict, plan.riskScore));
  }

  const provider = getProvider();

  // Real execution requires an authenticated Binance Agentic account.
  if (provider.mode === "live" && !isDryRun() && !process.env.BINANCE_MCP_TOKEN) {
    const result: ExecutionResult = {
      planId: plan.id,
      status: "FAILED",
      message: s.agenticRequired,
      dryRun: false,
      timestamp: Date.now(),
    };
    return NextResponse.json({ result }, { status: 412 });
  }

  // Mock data mode or DRY_RUN always simulates.
  if (provider.mode === "mock" || isDryRun()) {
    const result: ExecutionResult = {
      planId: plan.id,
      status: "SIMULATED",
      message: s.dryRunFill(
        plan.side,
        plan.estimatedQuantity.toFixed(6),
        plan.symbol,
        plan.amountUsdt,
        plan.referencePrice,
      ),
      orderId: `DRY-${Date.now()}`,
      executedQty: plan.estimatedQuantity,
      executedPrice: plan.referencePrice,
      dryRun: true,
      timestamp: Date.now(),
    };
    return NextResponse.json({ result });
  }

  try {
    const result = await provider.createSpotOrder(plan);
    return NextResponse.json({ result });
  } catch (err) {
    const result: ExecutionResult = {
      planId: plan.id,
      status: "FAILED",
      message: err instanceof Error ? err.message : String(err),
      dryRun: false,
      timestamp: Date.now(),
    };
    return NextResponse.json({ result }, { status: 502 });
  }
}
