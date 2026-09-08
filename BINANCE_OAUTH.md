# Binance OAuth — 获取 MCP Token 的完整步骤

> **2026-09-08 实测更新**：OAuth 流程已端到端跑到币安授权页——client metadata document、PKCE、redirect 全部通过校验（授权页正常渲染「访问 Agentic 账户」）。但币安在授权页弹出：
>
> **「当前 Agent 暂时不支持。请使用支持的 Agent 重新连接币安 MCP server。(3346001-0cd913e4)」**
>
> 结论：Binance Agent OS MCP 当前处于**白名单阶段**，只接受官方合作的 Agent（Claude / ChatGPT / Codex / VS Code 等），自定义 OAuth client 在授权环节被服务端拒绝。这是平台侧策略，非代码问题。待币安开放注册后，运行 `node scripts/binance-oauth.mjs` 即可完成接入。

## 已实测确认的事实（2026-09-08，非猜测）

对 `https://agent.binance.com/mcp/agentic` 发起真实 `initialize` 握手，服务器返回：

- `HTTP 401 Unauthorized`
- `WWW-Authenticate: Bearer resource_metadata="https://agent.binance.com/.well-known/oauth-protected-resource/gateway-mcp"`

拉取 OAuth 元数据（实际返回）：

| 项 | 值 |
|---|---|
| authorization_endpoint | `https://accounts.binance.com/agentic-oauth/authorize` |
| token_endpoint | `https://accounts.binance.com/oauth-agentic/token` |
| 授权类型 | `authorization_code` + PKCE (S256) |
| 客户端类型 | Public client（无 client secret） |
| 客户端注册 | Client ID Metadata Document（client_id 即一个托管 JSON 的 URL） |

本项目的 client metadata document 已托管在：
`https://fomo-firewall-pearl.vercel.app/oauth-client.json`

## 前提（在 Binance 账户里手动完成）

1. 登录 Binance，创建一个 **Agentic 子账户**（Agent OS 的隔离账户）。
2. 给该子账户**转入少量资金**（Agent 无法从主账户划转，必须自己充值）。
3. 注意地区限制：部分国家/地区的账户无法使用 Agent OS。

## 一键获取 Token

```bash
# 本机如需要代理才能访问 Binance（本项目开发机就是）：
set HTTPS_PROXY=http://127.0.0.1:7897      # Windows cmd
export HTTPS_PROXY=http://127.0.0.1:7897   # Git Bash / macOS / Linux

node scripts/binance-oauth.mjs
```

脚本会打印一个授权链接。在浏览器打开它 → 用 Binance 账户登录 → 确认授权范围和金额限制 → 授权后脚本自动：

1. 在 `http://127.0.0.1:8790/callback` 接收授权码
2. 用 PKCE verifier 换取 access token
3. 把 token 写入本地 `.env` 的 `BINANCE_MCP_TOKEN`（`.env` 已被 gitignore，永不入库）

## 启用

**本地：**

```bash
npm run dev        # 或 npm start
node scripts/test-mcp.mjs   # 应看到 tools/list 真实返回工具列表
```

**Vercel 生产环境：**

1. Vercel Dashboard → `fomo-firewall` → Settings → Environment Variables
2. 新增 `BINANCE_MCP_TOKEN` = 刚才的 token（Production）
3. Redeploy
4. 打开 `https://fomo-firewall-pearl.vercel.app/api/binance/status` 验证：
   - 期望：`"connected": true, "provider": "BINANCE_MCP", "tools": [...]`
   - 此时把 `tools` 列表记录下来（黑客松提交材料）
5. 首页问 `Analyze BTC`，步骤日志应显示 `Binance MCP · Ticker / Klines / Order Book`

## 真实交易（可选，最后一步）

确认 MCP 连通后，仍然建议保持 `DRY_RUN=true` 完成演示。若要真实下单：
设 `DRY_RUN=false` —— 人工审批门依旧强制，资金安全不受此开关影响。

## 故障排查

| 现象 | 原因 | 处理 |
|---|---|---|
| 授权页打不开 | 网络无法访问 accounts.binance.com | 开代理 / 换网络 |
| 授权页提示地区限制 | Binance 账户所在地区不支持 Agent OS | 无法在 Demo 前解决则继续用 REST+DEMO 演示 |
| token exchange 401 | PKCE/state 不匹配 | 重新运行脚本 |
| status 仍 connected:false | token 过期或环境变量未生效 | 重新运行脚本并在 Vercel 更新后 redeploy |
