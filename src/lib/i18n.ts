/**
 * Shared i18n module. Used by both client components (UI copy) and
 * server-side agent/execution code (steps, explanations, receipts).
 */

export type Locale = "en" | "zh";

export const LOCALES: Locale[] = ["en", "zh"];

export function normalizeLocale(value: unknown): Locale {
  return value === "zh" ? "zh" : "en";
}

/* ------------------------------------------------------------------ */
/* Client UI copy                                                      */
/* ------------------------------------------------------------------ */

const ui = {
  en: {
    tagline: "An AI trading agent that stops you from chasing pumps.",
    heroIntro1: "Crypto traders don't need another signal bot. They need an agent that knows when",
    heroIntroNot: "not",
    heroIntro2:
      "to trade. FOMO Firewall analyzes live Binance market conditions, challenges impulsive trades, and only executes after human approval.",
    live: "● LIVE",
    demo: "● DEMO DATA",
    dryRun: "DRY RUN",
    maxPerTrade: (n: number) => `MAX ${n} USDT / TRADE`,
    mcpAuthed: "BINANCE MCP: AUTHENTICATED",
    mcpNotAuthed: "BINANCE MCP: NOT AUTHENTICATED",
    watchlist: "Market Watchlist",
    watchlistHint: "Click a symbol to have the agent analyze it.",
    loadingMarket: "Loading market data...",
    riskPanelTitle: "FOMO Score",
    factorBreakdown: "Factor Breakdown",
    marketMetrics: "Market Metrics",
    total: "Total",
    verdict: "Verdict",
    deterministicNote: (n: number, source: string, symbol: string) =>
      `Deterministic score from ${n} audited factors. ${source} · ${symbol}`,
    liveData: "LIVE DATA",
    demoData: "DEMO DATA",
    emptyRisk: "Ask the agent about a symbol to see its FOMO breakdown.",
    price: "Price",
    change5m: "5m Change",
    change15m: "15m Change",
    change1h: "1h Change",
    volume: "Volume",
    vwapDeviation: "VWAP Deviation",
    spread: "Spread",
    orderbook: "Orderbook",
    bidsStronger: "Bids stronger",
    bidWeakening: "Bid depth weakening",
    balanced: "Balanced",
    volumeAvg: (v: string) => `${v}x avg`,
    inputPlaceholder: "Ask FOMO Firewall... e.g. “BNB just pumped. Should I chase it?”",
    suggestion1: "PONS just pumped 20%. Should I chase it with 50 USDT?",
    suggestion2: "Buy 30 USDT of BNB, but check the risk first.",
    suggestion3: "Is ETH a good buy right now?",
    reviewOrder: "Review Order",
    symbol: "Symbol",
    side: "Side",
    amount: "Amount",
    orderType: "Order Type",
    estQuantity: "Est. Quantity",
    refPrice: "Ref. Price",
    riskScore: "Risk Score",
    cancel: "Cancel",
    approveTrade: "Approve Trade",
    executing: "Executing...",
    suggestedAction: "Suggested action:",
    activityLog: "Activity Log",
    activityEmpty: "No activity yet. Every analysis, verdict and decision is recorded here.",
    score: "Score",
    approved: "APPROVED",
    cancelled: "CANCELLED",
    watchlistPrompt: (symbol: string) => `Analyze ${symbol} — is it safe to buy right now?`,
    langSwitch: "中文",
    sourceMcp: "LIVE · BINANCE MCP",
    sourceRest: "LIVE · BINANCE REST",
    agentOsConnected: "AGENT OS: CONNECTED",
    agentOsDisconnected: "AGENT OS: DISCONNECTED",
    agentOsAuthRequired: "AGENT OS: AUTH REQUIRED",
    agentOsTitle: "Binance Agent OS",
    mcpServer: "MCP Server",
    dataSourceLabel: "Data Source",
    capabilities: "Capabilities",
    connected: "CONNECTED",
    disconnected: "DISCONNECTED",
    authRequired: "AUTH REQUIRED",
    notConnected: "NOT CONNECTED",
    capTicker: "Ticker",
    capKlines: "Klines",
    capOrderBook: "Order Book",
    capAccount: "Account",
    capTrading: "Spot Trading",
    viaMcp: "BINANCE MCP",
    viaRest: "BINANCE REST",
  },
  zh: {
    tagline: "一个阻止你追高接盘的 AI 交易 Agent。",
    heroIntro1: "加密交易者不需要又一个信号机器人，他们需要一个知道什么时候",
    heroIntroNot: "不",
    heroIntro2:
      "该交易的 Agent。FOMO Firewall 分析 Binance 实时行情，挑战冲动交易，并且只在人工批准后才执行。",
    live: "● 实时行情",
    demo: "● 模拟数据",
    dryRun: "模拟运行",
    maxPerTrade: (n: number) => `单笔上限 ${n} USDT`,
    mcpAuthed: "BINANCE MCP：已授权",
    mcpNotAuthed: "BINANCE MCP：未授权",
    watchlist: "行情观察列表",
    watchlistHint: "点击任意币种，让 Agent 自动分析。",
    loadingMarket: "正在加载行情…",
    riskPanelTitle: "FOMO 评分",
    factorBreakdown: "因子拆解",
    marketMetrics: "市场指标",
    total: "总分",
    verdict: "结论",
    deterministicNote: (n: number, source: string, symbol: string) =>
      `由 ${n} 个可审计因子确定性计算 · ${source} · ${symbol}`,
    liveData: "真实数据",
    demoData: "模拟数据",
    emptyRisk: "向 Agent 询问某个币种，即可查看 FOMO 评分明细。",
    price: "价格",
    change5m: "5 分钟涨跌",
    change15m: "15 分钟涨跌",
    change1h: "1 小时涨跌",
    volume: "成交量",
    vwapDeviation: "VWAP 偏离",
    spread: "价差",
    orderbook: "盘口",
    bidsStronger: "买盘更强",
    bidWeakening: "买盘深度减弱",
    balanced: "买卖均衡",
    volumeAvg: (v: string) => `均量 ${v} 倍`,
    inputPlaceholder: "向 FOMO Firewall 提问… 例如：“BNB 刚拉了，现在能追吗？”",
    suggestion1: "PONS 刚拉了 20%，我拿 50 USDT 追一下行不行？",
    suggestion2: "帮我用 30 USDT 买 BNB，但先检查风险。",
    suggestion3: "帮我看看 ETH 现在适不适合买。",
    reviewOrder: "订单确认",
    symbol: "交易对",
    side: "方向",
    amount: "金额",
    orderType: "订单类型",
    estQuantity: "预估数量",
    refPrice: "参考价格",
    riskScore: "风险评分",
    cancel: "取消",
    approveTrade: "批准交易",
    executing: "执行中…",
    suggestedAction: "建议操作：",
    activityLog: "活动记录",
    activityEmpty: "暂无记录。每次分析、结论与你的决策都会记录在这里。",
    score: "评分",
    approved: "已批准",
    cancelled: "已取消",
    watchlistPrompt: (symbol: string) => `帮我分析 ${symbol}，现在适不适合买？`,
    langSwitch: "EN",
    sourceMcp: "实时 · BINANCE MCP",
    sourceRest: "实时 · BINANCE REST",
    agentOsConnected: "AGENT OS：已连接",
    agentOsDisconnected: "AGENT OS：未连接",
    agentOsAuthRequired: "AGENT OS：需要授权",
    agentOsTitle: "Binance Agent OS",
    mcpServer: "MCP 服务器",
    dataSourceLabel: "数据来源",
    capabilities: "能力",
    connected: "已连接",
    disconnected: "未连接",
    authRequired: "需要授权",
    notConnected: "未连接",
    capTicker: "行情快照",
    capKlines: "K 线",
    capOrderBook: "盘口",
    capAccount: "账户",
    capTrading: "现货交易",
    viaMcp: "BINANCE MCP",
    viaRest: "BINANCE REST",
  },
} as const;

export type UiDict = (typeof ui)["en"];

export function getUi(locale: Locale): UiDict {
  return ui[locale] as UiDict;
}

/* ------------------------------------------------------------------ */
/* Server-side agent strings                                           */
/* ------------------------------------------------------------------ */

export const serverStrings = {
  en: {
    stepCheckingPrice: (s: string) => `Checking ${s} current price`,
    stepTickerSrc: (src: string) => `${src} · Ticker`,
    stepKlinesSrc: (src: string) => `${src} · Klines`,
    stepOrderbookSrc: (src: string) => `${src} · Order Book`,
    sourceLabelMcp: "Binance MCP",
    sourceLabelRest: "Binance REST",
    sourceLabelMock: "Demo Data",
    stepKlines: "Fetching 5m klines",
    stepMomentum: "Computing 5m / 15m / 1h momentum",
    stepVolume: "Measuring volume spike",
    stepOrderbook: "Reading order book depth",
    stepSpread: "Measuring spread",
    stepVwap: "Computing short-term VWAP",
    stepVolatility: "Estimating short-term volatility",
    stepRisk: "Analyzing FOMO risk",
    stepBalance: "Checking account balance",
    stepDone: "Analysis complete",
    noSymbol:
      "I couldn't find a symbol in your message. Try something like \"BNB just pumped, should I chase it?\" or \"Buy 30 USDT of BNB, but check risk first\".",
    fetchFailed: (symbol: string, msg: string) =>
      `Failed to fetch market data for ${symbol}: ${msg}`,
    headlineAvoid: "You're chasing an extended move.",
    headlineWait: "This entry is late, not impossible.",
    headlineTrade: "Market conditions look calm and orderly.",
    bulletExtended: (dev: string) =>
      `Price is already ${dev}% above short-term VWAP — the move is extended.`,
    bulletNotExtended: (dev: string) =>
      `Price trades only ${dev}% above short-term VWAP — no significant extension.`,
    bulletBelowVwap: (dev: string) =>
      `Price is ${dev}% below short-term VWAP — no pump to chase.`,
    bulletVolumeHigh: (mult: string) =>
      `Volume has expanded rapidly (${mult}x average) — late-stage crowd behavior.`,
    bulletVolumeNormal: (mult: string) =>
      `Volume is ${mult}x average — no abnormal crowd activity.`,
    bulletBidsWeak: "Buy-side order book depth is weakening while price rises — support is thinning.",
    bulletBidsStrong: "Buy-side depth outweighs asks — bids are supporting the price.",
    bulletBookBalanced: "Order book is roughly balanced on both sides.",
    bulletLateEntry: (chg: string) =>
      `Entering after a ${chg}% fifteen-minute move creates poor short-term risk/reward.`,
    actionAvoidPump: "Wait for a 5-8% retracement or for price to consolidate before reconsidering.",
    actionAvoidCalm: "Stand aside until conditions normalize.",
    actionWait: "Wait for a pullback or sideways consolidation before entering.",
    actionTrade: "If you proceed, keep size small and confirm the order in the approval step.",
    blockedNoAmount:
      "You asked me to trade but didn't specify an amount. Tell me how much (in USDT) and I'll prepare a plan.",
    blockedCap: (amount: number, max: number) =>
      `Trade blocked. Requested: ${amount} USDT. Maximum allowed: ${max} USDT. Lower the amount or raise MAX_TRADE_USDT.`,
    blockedAvoid: (score: number, level: string, copy: string) =>
      `I won't prepare this trade. FOMO Score is ${score} (${level}) — ${copy}`,
    verdictTrade:
      "Conditions look healthy. If you proceed, size stays capped and you still approve the final order.",
    verdictWait: "Risk is elevated. Waiting for a pullback or consolidation would improve your entry.",
    verdictAvoid: "This looks like chasing an extended move. Standing aside is the disciplined trade.",
  },
  zh: {
    stepCheckingPrice: (s: string) => `正在查询 ${s} 当前价格`,
    stepTickerSrc: (src: string) => `${src} · 行情快照`,
    stepKlinesSrc: (src: string) => `${src} · K 线`,
    stepOrderbookSrc: (src: string) => `${src} · 盘口`,
    sourceLabelMcp: "Binance MCP",
    sourceLabelRest: "Binance REST",
    sourceLabelMock: "模拟数据",
    stepKlines: "获取 5 分钟 K 线",
    stepMomentum: "计算 5m / 15m / 1h 动量",
    stepVolume: "检测成交量放大",
    stepOrderbook: "读取盘口深度",
    stepSpread: "测量买卖价差",
    stepVwap: "计算短期 VWAP",
    stepVolatility: "估算短期波动率",
    stepRisk: "分析 FOMO 风险",
    stepBalance: "查询账户余额",
    stepDone: "分析完成",
    noSymbol:
      "我没有在你的消息里找到币种。可以试试：“BNB 刚涨了，还能追吗？”或“帮我用 30 USDT 买 BNB，先检查风险”。",
    fetchFailed: (symbol: string, msg: string) => `获取 ${symbol} 行情数据失败：${msg}`,
    headlineAvoid: "你正在追一个已经过度拉升的行情。",
    headlineWait: "现在进场偏晚，但并非完全不可行。",
    headlineTrade: "市场状况平稳有序。",
    bulletExtended: (dev: string) => `价格已高于短期 VWAP ${dev}% —— 行情已经过度延伸。`,
    bulletNotExtended: (dev: string) => `价格仅高于短期 VWAP ${dev}% —— 没有明显拉升。`,
    bulletBelowVwap: (dev: string) => `价格低于短期 VWAP ${dev}% —— 没有可追的上涨。`,
    bulletVolumeHigh: (mult: string) => `成交量急速放大（均量 ${mult} 倍）—— 典型的末期跟风行为。`,
    bulletVolumeNormal: (mult: string) => `成交量为均量 ${mult} 倍 —— 没有异常拥挤的交易。`,
    bulletBidsWeak: "价格上涨但买盘深度正在减弱 —— 支撑正在变薄。",
    bulletBidsStrong: "买盘深度强于卖盘 —— 买方在支撑价格。",
    bulletBookBalanced: "盘口买卖两侧大致均衡。",
    bulletLateEntry: (chg: string) => `在 15 分钟已上涨 ${chg}% 后进场，短期风险回报比很差。`,
    actionAvoidPump: "建议等待 5–8% 的回调，或等待价格横盘整理后再重新考虑。",
    actionAvoidCalm: "建议观望，直到市场状况恢复正常。",
    actionWait: "建议等待回调或横盘整理后再进场。",
    actionTrade: "如果继续，请控制仓位，并在审批步骤中确认订单。",
    blockedNoAmount: "你想交易但没有说明金额。告诉我金额（USDT），我再为你生成交易计划。",
    blockedCap: (amount: number, max: number) =>
      `交易已被拦截。请求金额：${amount} USDT，允许上限：${max} USDT。请降低金额或调高 MAX_TRADE_USDT。`,
    blockedAvoid: (score: number, level: string, copy: string) =>
      `我不会为这笔交易生成计划。FOMO 评分为 ${score}（${level}）—— ${copy}`,
    verdictTrade: "市场状况健康。如果继续，仓位仍受上限约束，且最终订单需要你亲自批准。",
    verdictWait: "风险偏高。等待回调或横盘整理会有更好的进场位置。",
    verdictAvoid: "这看起来像是在追已经拉升的行情。克制观望才是有纪律的交易。",
  },
} as const;

export type ServerStrings = (typeof serverStrings)["en"];

export function getServerStrings(locale: Locale): ServerStrings {
  return serverStrings[locale] as ServerStrings;
}

/* ------------------------------------------------------------------ */
/* Execution-layer strings                                             */
/* ------------------------------------------------------------------ */

export const execStrings = {
  en: {
    missingPlan: "Missing trade plan",
    notApproved: "Order was not approved by the user. Execution refused.",
    overCap: (amount: number, max: number) =>
      `Plan exceeds max capital per trade (${amount} > ${max} USDT).`,
    riskyVerdict: (verdict: string, score: number) =>
      `Plan carries FOMO verdict ${verdict} (score ${score}). Execution refused.`,
    dryRunFill: (side: string, qty: string, symbol: string, amount: number, price: number) =>
      `DRY RUN: simulated ${side} ${qty} ${symbol} (~${amount} USDT) at ~${price}. No real order was sent.`,
    agenticRequired:
      "Agentic Account connection required. Complete Binance OAuth and set BINANCE_MCP_TOKEN to enable real execution.",
  },
  zh: {
    missingPlan: "缺少交易计划",
    notApproved: "订单未获得用户批准，已拒绝执行。",
    overCap: (amount: number, max: number) => `计划超出单笔资金上限（${amount} > ${max} USDT）。`,
    riskyVerdict: (verdict: string, score: number) =>
      `计划带有 FOMO 结论 ${verdict}（评分 ${score}），已拒绝执行。`,
    dryRunFill: (side: string, qty: string, symbol: string, amount: number, price: number) =>
      `模拟运行：已模拟 ${side} ${qty} ${symbol}（约 ${amount} USDT），参考价 ~${price}。未发送真实订单。`,
    agenticRequired:
      "需要先连接 Agentic 账户。完成 Binance OAuth 授权并设置 BINANCE_MCP_TOKEN 后才能真实执行。",
  },
} as const;

export type ExecStrings = (typeof execStrings)["en"];

export function getExecStrings(locale: Locale): ExecStrings {
  return execStrings[locale] as ExecStrings;
}
