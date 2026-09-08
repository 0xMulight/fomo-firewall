"use client";

import { useCallback, useEffect, useState } from "react";
import { I18nProvider, useI18n } from "@/components/I18nProvider";
import { StatusBar } from "@/components/StatusBar";
import { Watchlist } from "@/components/Watchlist";
import { AgentOsPanel } from "@/components/AgentOsPanel";
import { AgentChat } from "@/components/AgentChat";
import { RiskPanel } from "@/components/RiskPanel";
import { ActivityLog } from "@/components/ActivityLog";
import type { AgentAnalysisResult, AgentResult } from "@/types/agent";
import type { ActivityEntry, ExecutionResult } from "@/types/trading";
import { appendActivity, loadActivity, updateLastActivity } from "@/lib/activityLog";

function Shell() {
  const { t } = useI18n();
  const [analysis, setAnalysis] = useState<AgentAnalysisResult | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [externalPrompt, setExternalPrompt] = useState<{
    text: string;
    nonce: number;
  } | null>(null);

  useEffect(() => {
    setActivity(loadActivity());
  }, []);

  const handleActivity = useCallback((prompt: string, result: AgentResult) => {
    const entry: ActivityEntry = {
      timestamp: Date.now(),
      prompt,
      symbol: result.kind === "analysis" ? result.symbol : "-",
      fomoScore: result.kind === "analysis" ? result.assessment.totalScore : null,
      verdict: result.kind === "analysis" ? result.verdict : null,
      tradePlan:
        result.kind === "analysis" && result.tradePlan
          ? `${result.tradePlan.amountUsdt} USDT ${result.tradePlan.side}`
          : null,
      userDecision: "NONE",
      executionResult: null,
      dataSource: result.kind === "analysis" ? result.source : null,
    };
    setActivity(appendActivity(entry));
  }, []);

  const handleDecision = useCallback(
    (decision: "APPROVED" | "CANCELLED", result: ExecutionResult | null) => {
      setActivity(
        updateLastActivity({
          userDecision: decision,
          executionResult: result ? result.status : "CANCELLED",
        }),
      );
    },
    [],
  );

  const handleWatchlistSelect = useCallback(
    (symbol: string) => {
      setExternalPrompt({ text: t.watchlistPrompt(symbol), nonce: Date.now() });
    },
    [t],
  );

  return (
    <main className="flex h-screen flex-col">
      <StatusBar />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 md:grid-cols-[220px_1fr_280px]">
        {/* Left: watchlist + agent os status + activity */}
        <div className="hidden min-h-0 flex-col gap-3 md:flex">
          <div className="min-h-0 flex-[3]">
            <Watchlist onSelect={handleWatchlistSelect} />
          </div>
          <AgentOsPanel />
          <div className="min-h-0 flex-[2]">
            <ActivityLog entries={activity} />
          </div>
        </div>

        {/* Center: agent chat (primary surface) */}
        <div className="flex min-h-0 flex-col rounded-lg border border-terminal-border bg-terminal-bg">
          <AgentChat
            onAnalysis={setAnalysis}
            onActivity={handleActivity}
            onDecision={handleDecision}
            externalPrompt={externalPrompt}
          />
        </div>

        {/* Right: risk panel */}
        <div className="hidden min-h-0 overflow-y-auto md:block">
          <RiskPanel analysis={analysis} />
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <I18nProvider>
      <Shell />
    </I18nProvider>
  );
}
