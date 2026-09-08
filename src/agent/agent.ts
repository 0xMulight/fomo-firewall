import type {
  AgentAnalysisResult,
  AgentExplanation,
  AgentResult,
  AgentStep,
  FomoAssessment,
  ParsedIntent,
  Verdict,
} from "@/types/agent";
import type { MarketSnapshot } from "@/types/market";
import type { TradePlan } from "@/types/trading";
import { getAgentOsStatus, getMaxTradeUsdt, getProvider, isDryRun } from "@/binance";
import { computeFomoScore } from "@/scoring/fomoScore";
import { getServerStrings, type ServerStrings } from "@/lib/i18n";
import { parseIntent } from "./intentParser";
import { verdictForAssessment } from "./verdict";
import { buildTradePlan } from "./tradePlan";

export type StepEmitter = (step: AgentStep) => void;

async function emitStep(
  emit: StepEmitter,
  id: string,
  label: string,
  work?: () => Promise<unknown>,
): Promise<void> {
  emit({ id, label, status: "running" });
  if (work) await work();
  emit({ id, label, status: "done" });
}

function verdictCopy(verdict: Verdict, s: ServerStrings): string {
  if (verdict === "TRADE") return s.verdictTrade;
  if (verdict === "WAIT") return s.verdictWait;
  return s.verdictAvoid;
}

function buildExplanation(
  snapshot: MarketSnapshot,
  assessment: FomoAssessment,
  verdict: Verdict,
  s: ServerStrings,
): AgentExplanation {
  const bullets: string[] = [];

  if (snapshot.vwapDeviation > 3) {
    bullets.push(s.bulletExtended(snapshot.vwapDeviation.toFixed(1)));
  } else if (snapshot.vwapDeviation >= 0) {
    bullets.push(s.bulletNotExtended(snapshot.vwapDeviation.toFixed(1)));
  } else {
    bullets.push(s.bulletBelowVwap(Math.abs(snapshot.vwapDeviation).toFixed(1)));
  }

  if (snapshot.volumeMultiplier >= 2.5) {
    bullets.push(s.bulletVolumeHigh(snapshot.volumeMultiplier.toFixed(1)));
  } else {
    bullets.push(s.bulletVolumeNormal(snapshot.volumeMultiplier.toFixed(1)));
  }

  if (snapshot.orderbookImbalance > 0.05) {
    bullets.push(s.bulletBidsWeak);
  } else if (snapshot.orderbookImbalance < -0.05) {
    bullets.push(s.bulletBidsStrong);
  } else {
    bullets.push(s.bulletBookBalanced);
  }

  if (snapshot.change15m > 5) {
    bullets.push(s.bulletLateEntry(snapshot.change15m.toFixed(1)));
  }

  const suggestedAction =
    verdict === "AVOID"
      ? snapshot.change15m > 5
        ? s.actionAvoidPump
        : s.actionAvoidCalm
      : verdict === "WAIT"
        ? s.actionWait
        : s.actionTrade;

  const headline =
    verdict === "AVOID"
      ? s.headlineAvoid
      : verdict === "WAIT"
        ? s.headlineWait
        : s.headlineTrade;

  return { headline, bullets, suggestedAction };
}

/**
 * Core agent pipeline:
 * User intent -> market data -> FOMO Risk Engine -> verdict -> (optional)
 * trade plan. The agent never executes anything itself.
 */
export async function runAgent(
  rawPrompt: string,
  emit: StepEmitter,
  locale: "en" | "zh" = "en",
): Promise<AgentResult> {
  const s = getServerStrings(locale);
  const intent: ParsedIntent = parseIntent(rawPrompt);

  if (!intent.symbol) {
    return { kind: "error", message: s.noSymbol };
  }

  const provider = getProvider();
  const symbol = intent.symbol;

  // Label the data-fetching steps with the data source that will actually
  // serve them (real MCP health check, cached). Never claims MCP when the
  // MCP server isn't really connected.
  let stepTicker: string = s.stepCheckingPrice(symbol);
  let stepKlines: string = s.stepKlines;
  let stepOrderbook: string = s.stepOrderbook;
  if (provider.mode === "live") {
    const status = await getAgentOsStatus();
    const srcLabel =
      status.dataSource === "mcp"
        ? s.sourceLabelMcp
        : status.dataSource === "rest"
          ? s.sourceLabelRest
          : s.sourceLabelMock;
    stepTicker = s.stepTickerSrc(srcLabel);
    stepKlines = s.stepKlinesSrc(srcLabel);
    stepOrderbook = s.stepOrderbookSrc(srcLabel);
  }

  await emitStep(emit, "price", stepTicker);
  await emitStep(emit, "klines", stepKlines);
  await emitStep(emit, "momentum", s.stepMomentum);
  await emitStep(emit, "volume", s.stepVolume);
  await emitStep(emit, "orderbook", stepOrderbook);
  await emitStep(emit, "spread", s.stepSpread);
  await emitStep(emit, "vwap", s.stepVwap);
  await emitStep(emit, "volatility", s.stepVolatility);

  let snapshot: MarketSnapshot;
  try {
    snapshot = await provider.getMarketSnapshot(symbol);
  } catch (err) {
    return {
      kind: "error",
      message: s.fetchFailed(symbol, err instanceof Error ? err.message : String(err)),
    };
  }

  await emitStep(emit, "risk", s.stepRisk);
  const assessment: FomoAssessment = computeFomoScore(snapshot);
  const verdict = verdictForAssessment(assessment);
  const explanation = buildExplanation(snapshot, assessment, verdict, s);

  if (intent.requiresTrade) {
    await emitStep(emit, "balance", s.stepBalance, async () => {
      try {
        await provider.getBalance();
      } catch {
        // Balance is informational only; lack of auth never blocks analysis.
      }
    });
  }

  const result: AgentAnalysisResult = {
    kind: "analysis",
    symbol,
    snapshotSummary: {
      price: snapshot.price,
      change5m: snapshot.change5m,
      change15m: snapshot.change15m,
      change1h: snapshot.change1h,
      volumeMultiplier: snapshot.volumeMultiplier,
      vwapDeviation: snapshot.vwapDeviation,
      spreadPct: snapshot.spreadPct,
      bidShare: snapshot.bidShare,
    },
    assessment,
    verdict,
    explanation,
    source: snapshot.source,
  };

  // ---- Trade intent handling ----
  if (intent.requiresTrade) {
    const side = intent.intent === "SELL" ? "SELL" : "BUY";
    const amount = intent.amount;
    const maxCapital = getMaxTradeUsdt();

    if (amount === null) {
      result.blocked = s.blockedNoAmount;
    } else if (amount > maxCapital) {
      result.blocked = s.blockedCap(amount, maxCapital);
    } else if (verdict === "AVOID") {
      result.blocked = s.blockedAvoid(
        assessment.totalScore,
        assessment.level,
        verdictCopy("AVOID", s),
      );
    } else {
      const plan: TradePlan = buildTradePlan({
        symbol,
        side,
        amountUsdt: amount,
        snapshot,
        assessment,
        verdict,
        dryRun: isDryRun() || provider.mode === "mock",
      });
      result.tradePlan = plan;
    }
  }

  await emitStep(emit, "done", s.stepDone);
  return result;
}
