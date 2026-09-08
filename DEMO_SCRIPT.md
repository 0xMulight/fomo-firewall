# FOMO Firewall — 60–90s Demo Script

> 演示环境：https://fomo-firewall-pearl.vercel.app （LIVE 模式）
> 行情 = Binance 真实数据（REST，顶栏如实标注）；PONS = 标注 DEMO 的虚构币演示场景。
> 全程 DRY RUN，无需任何 Binance 授权，零风险。

---

## 录制前检查（30 秒，不录进去）

1. 打开生产站点，确认顶栏：`FOMO Firewall` · `● LIVE` · `REST` · `DRY RUN` · `AGENT OS DISCONNECTED`
2. 左侧 Watchlist 应显示 BTC / ETH / BNB 真实价格和风险徽章
3. 语言用 English（顶栏可切中文，评委是国际的就用英文）
4. 录屏分辨率 1920×1080，浏览器全屏

---

## 正式录制

### 第一幕 · Hook（0:00–0:10）

**画面**：首页停留。

**台词**：
> "Most trading bots answer 'what should I buy'. FOMO Firewall answers a harder question: SHOULD you trade this right now?"

### 第二幕 · 拦截冲动交易（0:10–0:40）⭐ 核心镜头

**操作**：输入
```
PONS just pumped 20%. Should I chase it with 50 USDT?
```

**画面**（Agent 逐步工作，让它跑完）：
- `Checking market...` → `✓ Ticker` `✓ Klines` `✓ Volume` `✓ Orderbook` `✓ VWAP` `✓ Volatility`
- `Analyzing FOMO risk...`
- 结果：**FOMO SCORE 87 · EXTREME · AVOID**

**台词**：
> "I'm about to chase a pump. Watch the agent work: it pulls price, klines, volume, order book, VWAP — then a deterministic risk engine, not the LLM, computes the FOMO score. 87 out of 100. EXTREME. The verdict: AVOID."

**镜头给到右侧 Risk Panel**（因子分解）：
> "Every point is auditable — Price Extension 22 of 25, Volume Spike 18 of 20, order book weakening. The AI's job is to explain the math, not to invent it."

### 第三幕 · 通过检查 + 人工审批（0:40–1:05）

**操作**：输入
```
Buy 30 USDT of BNB, but check the risk first.
```

**画面**：同样的检查流程 → 低分 LOW → `TRADE` → 弹出 **REVIEW ORDER** 卡片。

**台词**：
> "Same agent, calm market. Score is LOW, so it prepares a trade plan — but look: nothing has executed. Every order stops at this approval gate. The human always has the final word."

**操作**：点击 **Approve Trade** → 显示 DRY RUN 成交回执。

> "Approved. It executes — in dry run. Real money only moves with Binance OAuth and an explicit opt-in."

### 第四幕 · 护栏（1:05–1:20，可选）

**操作**：输入
```
Buy 500 USDT of BNB
```

**画面**：`Trade blocked. Requested: 500 USDT. Maximum allowed: 50 USDT.`

**台词**：
> "And a hard capital cap — the agent refuses anything above my limit."

### 第五幕 · 收尾（1:20–1:30）

**画面**：顶部状态栏 + 左侧 AGENT OS 面板。

**台词**：
> "It's built on Binance Agent OS: the MCP client is wired to the official endpoint with real health checks — this DISCONNECTED badge is honest, because no token is connected yet. Market data is live Binance. FOMO Firewall: an agent that knows when NOT to trade."

---

## 评委可能问 MCP 部分的标准回答

> "The MCP integration is code-complete: official SDK, tools/list-driven tool resolution, honest fallback to Binance public REST. The endpoint requires Binance OAuth — we've verified the live OAuth metadata and ship a one-command helper (`node scripts/binance-oauth.mjs`). The CONNECTED badge only lights up after a real tools/list succeeds — we don't fake it."

## 备用方案

- 如果录制时 BNB 波动大（MEDIUM/HIGH），第三幕改用 Watchlist 上当时显示 LOW 徽章的币（点 Watchlist 条目即可让 Agent 分析该币）。
- PONS 场景分数恒定 87/EXTREME/AVOID，永远稳定，是整个 Demo 的锚点。
