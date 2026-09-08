"use client";

import { useState } from "react";
import type { ExecutionResult, TradePlan } from "@/types/trading";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/I18nProvider";
import { cn, formatPrice } from "@/lib/utils";

interface Props {
  plan: TradePlan;
  onDecision: (decision: "APPROVED" | "CANCELLED", result: ExecutionResult | null) => void;
}

/**
 * The Human Approval Gate. Nothing executes until the user explicitly
 * clicks "Approve Trade". Cancellation is always one click away.
 */
export function TradePlanCard({ plan, onDecision }: Props) {
  const { t, locale } = useI18n();
  const [state, setState] = useState<"pending" | "busy" | "done">("pending");
  const [result, setResult] = useState<ExecutionResult | null>(null);

  async function approve() {
    setState("busy");
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, approved: true, locale }),
      });
      const data = (await res.json()) as { result: ExecutionResult };
      setResult(data.result);
      onDecision("APPROVED", data.result);
    } catch (err) {
      const failed: ExecutionResult = {
        planId: plan.id,
        status: "FAILED",
        message: err instanceof Error ? err.message : String(err),
        dryRun: plan.dryRun,
        timestamp: Date.now(),
      };
      setResult(failed);
      onDecision("APPROVED", failed);
    } finally {
      setState("done");
    }
  }

  function cancel() {
    setState("done");
    setResult({
      planId: plan.id,
      status: "REJECTED",
      message:
        locale === "zh"
          ? "用户已取消，未发送任何订单。"
          : "Cancelled by user. No order was sent.",
      dryRun: plan.dryRun,
      timestamp: Date.now(),
    });
    onDecision("CANCELLED", null);
  }

  return (
    <div className="mt-3 rounded-md border border-terminal-amber/40 bg-terminal-bg p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-terminal-amber">
          {t.reviewOrder}
        </span>
        {plan.dryRun && (
          <span className="rounded border border-terminal-amber/50 px-1.5 py-0.5 text-[9px] font-semibold text-terminal-amber">
            {t.dryRun}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
        <span className="text-terminal-muted">{t.symbol}</span>
        <span className="text-right font-semibold">{plan.symbol}</span>
        <span className="text-terminal-muted">{t.side}</span>
        <span
          className={cn(
            "text-right font-semibold",
            plan.side === "BUY" ? "text-terminal-green" : "text-terminal-red",
          )}
        >
          {plan.side}
        </span>
        <span className="text-terminal-muted">{t.amount}</span>
        <span className="text-right font-semibold">{plan.amountUsdt} USDT</span>
        <span className="text-terminal-muted">{t.orderType}</span>
        <span className="text-right">{plan.orderType}</span>
        <span className="text-terminal-muted">{t.estQuantity}</span>
        <span className="text-right tabular-nums">
          {plan.estimatedQuantity.toFixed(6)}
        </span>
        <span className="text-terminal-muted">{t.refPrice}</span>
        <span className="text-right tabular-nums">${formatPrice(plan.referencePrice)}</span>
        <span className="text-terminal-muted">{t.riskScore}</span>
        <span className="text-right">
          {plan.riskScore} ({plan.riskLevel}) · {plan.verdict}
        </span>
      </div>

      {state !== "done" ? (
        <div className="mt-3 flex gap-2">
          <Button variant="ghost" onClick={cancel} disabled={state === "busy"} className="flex-1">
            {t.cancel}
          </Button>
          <Button onClick={approve} disabled={state === "busy"} className="flex-1">
            {state === "busy" ? t.executing : t.approveTrade}
          </Button>
        </div>
      ) : (
        result && (
          <div
            className={cn(
              "mt-3 rounded border px-2 py-1.5 text-[11px]",
              result.status === "EXECUTED" || result.status === "SIMULATED"
                ? "border-terminal-green/40 text-terminal-green"
                : "border-terminal-red/40 text-terminal-red",
            )}
          >
            <div className="font-bold">
              {result.status}
              {result.orderId ? ` · ${result.orderId}` : ""}
            </div>
            <div className="mt-0.5 text-terminal-text">{result.message}</div>
          </div>
        )
      )}
    </div>
  );
}
