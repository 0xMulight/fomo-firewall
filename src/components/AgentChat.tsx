"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SendHorizontal, Check, Loader2, Bot, User } from "lucide-react";
import type {
  AgentAnalysisResult,
  AgentResult,
  AgentStep,
} from "@/types/agent";
import type { ExecutionResult } from "@/types/trading";
import { TradePlanCard } from "@/components/TradePlanCard";
import { RiskBadge } from "@/components/ui/badge";
import { useI18n } from "@/components/I18nProvider";
import { cn, formatPct } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text?: string;
  steps?: AgentStep[];
  result?: AgentResult;
}

interface Props {
  onAnalysis: (analysis: AgentAnalysisResult | null) => void;
  onActivity: (prompt: string, result: AgentResult) => void;
  onDecision: (decision: "APPROVED" | "CANCELLED", result: ExecutionResult | null) => void;
  externalPrompt: { text: string; nonce: number } | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AgentChat({ onAnalysis, onActivity, onDecision, externalPrompt }: Props) {
  const { t, locale } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastNonce = useRef(0);
  const suggestions = [t.suggestion1, t.suggestion2, t.suggestion3];

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  }, []);

  const send = useCallback(
    async (prompt: string) => {
      const text = prompt.trim();
      if (!text || busy) return;
      setBusy(true);
      setInput("");

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        text,
      };
      const agentMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "agent",
        steps: [],
      };
      setMessages((prev) => [...prev, userMsg, agentMsg]);
      scrollToBottom();

      const patchAgent = (patch: Partial<ChatMessage>) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === agentMsg.id ? { ...m, ...patch } : m)),
        );

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text, locale }),
        });
        if (!res.ok || !res.body) throw new Error(`Agent request failed (${res.status})`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const steps: AgentStep[] = [];
        let finalResult: AgentResult | null = null;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as
              | { type: "step"; step: AgentStep }
              | { type: "result"; result: AgentResult };

            if (event.type === "step") {
              const idx = steps.findIndex((s) => s.id === event.step.id);
              if (idx >= 0) steps[idx] = event.step;
              else steps.push(event.step);
              patchAgent({ steps: [...steps] });
              scrollToBottom();
              await sleep(200); // pace the visible workflow for readability
            } else {
              finalResult = event.result;
            }
          }
        }

        if (finalResult) {
          patchAgent({ result: finalResult });
          onAnalysis(finalResult.kind === "analysis" ? finalResult : null);
          onActivity(text, finalResult);
        }
      } catch (err) {
        const result: AgentResult = {
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        };
        patchAgent({ result });
        onActivity(text, result);
      } finally {
        setBusy(false);
        scrollToBottom();
      }
    },
    [busy, locale, onAnalysis, onActivity, scrollToBottom],
  );

  // Watchlist clicks trigger an analysis prompt.
  useEffect(() => {
    if (externalPrompt && externalPrompt.nonce !== lastNonce.current) {
      lastNonce.current = externalPrompt.nonce;
      void send(externalPrompt.text);
    }
  }, [externalPrompt, send]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="mx-auto mt-10 max-w-xl text-center">
            <h1 className="text-2xl font-bold">FOMO Firewall</h1>
            <p className="mt-1 text-sm text-terminal-muted">
              {t.tagline}
            </p>
            <p className="mt-5 text-xs leading-relaxed text-terminal-muted">
              {t.heroIntro1}
              {locale === "zh" ? "“" : " "}
              <em>{t.heroIntroNot}</em>
              {locale === "zh" ? "”" : " "}
              {t.heroIntro2}
            </p>
            <div className="mt-6 space-y-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="block w-full rounded border border-terminal-border bg-terminal-panel px-3 py-2 text-left text-xs text-terminal-text transition-colors hover:border-terminal-green/40"
                >
                  “{s}”
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={cn("flex gap-2", m.role === "user" && "justify-end")}>
            {m.role === "agent" && (
              <Bot className="mt-1 h-4 w-4 shrink-0 text-terminal-green" />
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed",
                m.role === "user"
                  ? "bg-terminal-green/15 text-terminal-text"
                  : "border border-terminal-border bg-terminal-panel",
              )}
            >
              {m.text && <p>{m.text}</p>}

              {m.steps && m.steps.length > 0 && (
                <div className="space-y-0.5 text-[11px] text-terminal-muted">
                  {m.steps.map((s) => (
                    <div key={s.id} className="flex items-center gap-1.5">
                      {s.status === "done" ? (
                        <Check className="h-3 w-3 text-terminal-green" />
                      ) : (
                        <Loader2 className="h-3 w-3 animate-spin text-terminal-amber" />
                      )}
                      <span className={s.status === "done" ? "text-terminal-text" : ""}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {m.result?.kind === "error" && (
                <p className="mt-2 text-terminal-red">{m.result.message}</p>
              )}

              {m.result?.kind === "analysis" && (
                <AgentResultView result={m.result} onDecision={onDecision} />
              )}
            </div>
            {m.role === "user" && (
              <User className="mt-1 h-4 w-4 shrink-0 text-terminal-muted" />
            )}
          </div>
        ))}
      </div>

      <form
        className="flex gap-2 border-t border-terminal-border bg-terminal-panel p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.inputPlaceholder}
          className="flex-1 rounded border border-terminal-border bg-terminal-bg px-3 py-2 text-xs outline-none placeholder:text-terminal-muted focus:border-terminal-green/50"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded bg-terminal-green/90 px-3 text-black transition-colors hover:bg-terminal-green disabled:opacity-40"
          aria-label="Send"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function AgentResultView({
  result,
  onDecision,
}: {
  result: AgentAnalysisResult;
  onDecision: Props["onDecision"];
}) {
  const a = result;
  const { t } = useI18n();
  return (
    <div className="mt-3 border-t border-terminal-border/60 pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <RiskBadge level={a.assessment.level} />
        <span className="text-sm font-bold">
          {a.assessment.totalScore}
          <span className="text-terminal-muted"> / 100</span>
        </span>
        <span
          className={cn(
            "text-sm font-bold",
            a.verdict === "TRADE"
              ? "text-terminal-green"
              : a.verdict === "WAIT"
                ? "text-terminal-amber"
                : "text-terminal-red",
          )}
        >
          {a.verdict}
        </span>
        <span className="text-[10px] text-terminal-muted">
          {a.source === "mcp" ? t.viaMcp : a.source === "rest" ? t.viaRest : t.demoData} · {a.symbol} · 15m{" "}
          {formatPct(a.snapshotSummary.change15m)} · 1h{" "}
          {formatPct(a.snapshotSummary.change1h)}
        </span>
      </div>

      <p className="mt-2 font-semibold">{a.explanation.headline}</p>
      <ul className="mt-1 list-inside list-disc space-y-0.5 text-terminal-muted">
        {a.explanation.bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
      <p className="mt-2 text-[11px]">
        <span className="font-semibold text-terminal-amber">{t.suggestedAction} </span>
        {a.explanation.suggestedAction}
      </p>

      {a.blocked && (
        <p className="mt-2 rounded border border-terminal-red/40 bg-terminal-red/10 px-2 py-1.5 text-[11px] text-terminal-red">
          {a.blocked}
        </p>
      )}

      {a.tradePlan && (
        <TradePlanCard plan={a.tradePlan} onDecision={onDecision} />
      )}
    </div>
  );
}
