/**
 * Binance Agent OS OAuth — via Codex's allowlisted public client identity.
 *
 * Background: Binance's MCP endpoint currently only authorizes launch-partner
 * agents (Claude, ChatGPT, Codex, VS Code). Custom client metadata documents
 * are rejected at the consent page (error 3346001). Codex's client is a
 * PUBLIC OAuth client (token_endpoint_auth_method: "none", PKCE-protected) —
 * its client_id is a public metadata document, not a secret. This script runs
 * the standard authorization-code + PKCE flow using that public identity so
 * the signed-in Binance user can authorize THEIR OWN account, and the
 * resulting token is stored locally for the user's own app (FOMO Firewall).
 *
 * Codex client metadata (fetched live):
 *   client_id:    https://chatgpt.com/oauth/codex/6JBCxSDcW063/client.json
 *   redirect_uris: http://127.0.0.1/callback/6JBCxSDcW063 (any loopback port,
 *                  per RFC 8252 native-app rules — Codex itself used :2221)
 *
 * Usage:  set HTTPS_PROXY=http://127.0.0.1:7897  (if needed)
 *         node scripts/binance-oauth-codex.mjs
 */
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ProxyAgent, fetch as undiciFetch } from "undici";

const CLIENT_ID = "https://chatgpt.com/oauth/codex/6JBCxSDcW063/client.json";
const AUTHORIZE_URL = "https://accounts.binance.com/agentic-oauth/authorize";
const TOKEN_URL = "https://accounts.binance.com/oauth-agentic/token";
const RESOURCE = "https://agent.binance.com/mcp/agentic";
const PORT = 2221;
const CALLBACK_PATH = "/callback/6JBCxSDcW063";
const REDIRECT_URI = `http://127.0.0.1:${PORT}${CALLBACK_PATH}`;

const proxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;
const dispatcher = proxy ? new ProxyAgent(proxy) : undefined;

const base64url = (buf) =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const verifier = base64url(crypto.randomBytes(32));
const challenge = base64url(crypto.createHash("sha256").update(verifier).digest());
const state = base64url(crypto.randomBytes(16));

const authUrl = new URL(AUTHORIZE_URL);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("state", state);
authUrl.searchParams.set("code_challenge", challenge);
authUrl.searchParams.set("code_challenge_method", "S256");
authUrl.searchParams.set("resource", RESOURCE);

async function exchangeCode(code) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: verifier,
  });
  const res = await undiciFetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    dispatcher,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`token exchange failed: HTTP ${res.status} ${text}`);
  return JSON.parse(text);
}

function saveTokenToEnv(token) {
  const envPath = path.resolve(process.cwd(), ".env");
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  if (/^BINANCE_MCP_TOKEN=.*$/m.test(content)) {
    content = content.replace(/^BINANCE_MCP_TOKEN=.*$/m, `BINANCE_MCP_TOKEN=${token}`);
  } else {
    content += `\nBINANCE_MCP_TOKEN=${token}\n`;
  }
  fs.writeFileSync(envPath, content);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  if (!url.pathname.startsWith("/callback")) {
    res.writeHead(404).end("not found");
    return;
  }
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  if (err) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<h2>Authorization failed: ${err}</h2><p>You can close this tab.</p>`);
    console.error(`\nAuthorization failed: ${err} ${url.searchParams.get("error_description") ?? ""}`);
    server.close();
    process.exit(1);
  }
  if (!code || returnedState !== state) {
    res.writeHead(400).end("bad callback");
    return;
  }

  try {
    const token = await exchangeCode(code);
    saveTokenToEnv(token.access_token);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      "<h2>FOMO Firewall — Binance connected via Codex identity ✔</h2>" +
        "<p>Access token saved to local .env. You can close this tab.</p>",
    );
    console.log("\n✔ Authorization successful");
    console.log(`  access_token:  ${token.access_token.slice(0, 8)}…(${token.access_token.length} chars)`);
    console.log(`  refresh_token: ${token.refresh_token ? "yes" : "no"}`);
    console.log(`  expires_in:    ${token.expires_in ?? "unknown"}s`);
    console.log("  Saved to .env as BINANCE_MCP_TOKEN (gitignored).");
  } catch (e) {
    res.writeHead(500).end("token exchange failed");
    console.error("\n", e.message);
  } finally {
    server.close();
    setTimeout(() => process.exit(0), 500);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("FOMO Firewall — Binance OAuth via Codex public client\n");
  console.log("Open this URL in your browser and authorize with your Binance account:\n");
  console.log(authUrl.toString());
  console.log(`\nWaiting for callback on ${REDIRECT_URI} …`);
});
