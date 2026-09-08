import type { ParsedIntent } from "@/types/agent";
import { normalizeSymbol } from "@/binance/provider";

const KNOWN_BASES = [
  "BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT",
  "MATIC", "LTC", "TRX", "ATOM", "NEAR", "ARB", "OP", "SUI", "PEPE", "SHIB",
  "PONS",
];

const BUY_PATTERN =
  /(buy|long|purchase|买|买入|追|上车|抄底|all[\s-]?in|ape)/i;
const SELL_PATTERN = /(sell|short|卖|卖出|清仓|止盈|止损)/i;
const ANALYZE_PATTERN =
  /(should|can i|还能|适不适合|能不能|要不要|追吗|check|analy[sz]e|看看|分析|评估|风险|怎么样|如何|chase)/i;

const AMOUNT_PATTERN =
  /(\d+(?:\.\d+)?)\s*(usdt|usdc|u|刀|美元|块)/i;

function extractSymbol(text: string): string | null {
  const upper = text.toUpperCase();
  // Explicit pair like BNBUSDT / BNB-USDT / BNB/USDT
  const pairMatch = upper.match(/\b([A-Z0-9]{2,12})[\-/]?(USDT|USDC)\b/);
  if (pairMatch) return normalizeSymbol(pairMatch[1]);

  // Known base asset mention
  for (const base of KNOWN_BASES) {
    const re = new RegExp(`\\b${base}\\b`, "i");
    if (re.test(text)) return normalizeSymbol(base);
  }

  // "$TICKER" style mention
  const cashtag = upper.match(/\$([A-Z]{2,10})\b/);
  if (cashtag) return normalizeSymbol(cashtag[1]);

  return null;
}

/**
 * Deterministic intent parser. The agent's understanding of the user's
 * natural language is transparent and testable — no hidden LLM guessing.
 */
export function parseIntent(raw: string): ParsedIntent {
  const text = raw.trim();
  const symbol = extractSymbol(text);

  const amountMatch = text.match(AMOUNT_PATTERN);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : null;
  const currency = amountMatch
    ? amountMatch[2].toUpperCase().startsWith("USD")
      ? amountMatch[2].toUpperCase()
      : "USDT"
    : null;

  const wantsBuy = BUY_PATTERN.test(text);
  const wantsSell = SELL_PATTERN.test(text);
  const wantsAnalyze = ANALYZE_PATTERN.test(text);

  let intent: ParsedIntent["intent"] = "UNKNOWN";
  if (wantsBuy) intent = "BUY";
  else if (wantsSell) intent = "SELL";
  else if (wantsAnalyze || symbol) intent = "ANALYZE";

  return {
    intent,
    symbol,
    amount,
    currency: currency ?? (amount !== null ? "USDT" : null),
    requiresTrade: intent === "BUY" || intent === "SELL",
    raw,
  };
}
