/**
 * Binance Agent OS — OAuth helper for the MCP endpoint.
 *
 * The Binance MCP endpoint (https://agent.binance.com/mcp/agentic) requires an
 * OAuth 2.1 Authorization Code flow with PKCE (public client, no secret).
 * Verified server metadata:
 *   authorize: https://accounts.binance.com/agentic-oauth/authorize
 *   token:     https://accounts.binance.com/oauth-agentic/token
 *   resource:  https://agent.binance.com/mcp/agentic
 *
 * This script:
 *   1. starts a local callback server on http://127.0.0.1:8790/callback
 *   2. prints the Binance authorization URL — open it in your browser
 *      (client_id is the metadata document hosted on the deployed site)
 *   3. exchanges the returned code for an access token
 *   4. writes BINANCE_MCP_TOKEN into your local .env (never committed)
 *
 * Usage:  node scripts/binance-oauth.mjs
 * Proxy:  set HTTPS_PROXY if your network needs one (e.g. http://127.0.0.1:7897)
 */
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ProxyAgent, fetch as undiciFetch } from "undici";

const CLIENT_ID =
  process.env.OAUTH_CLIENT_ID_URL ??
  "https://fomo-firewall-pearl.vercel.app/oauth-client.json";
const AUTHORIZE_URL = "https://accounts.binance.com/agentic-oauth/authorize";
const TOKEN_URL = "https://accounts.binance.com/oauth-agentic/token";
const RESOURCE = "https://agent.binance.com/mcp/agentic";
const REDIRECT_URI = "http://127.0.0.1:8790/callback";
const PORT = 8790;

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
  if (!res.ok) {
    throw new Error(`token exchange failed: HTTP ${res.status} ${text}`);
  }
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
  if (url.pathname !== "/callback") {
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
      "<h2>FOMO Firewall — Binance connected ✔</h2>" +
        "<p>Access token saved to your local .env. You can close this tab.</p>",
    );
    const masked = `${token.access_token.slice(0, 8)}…(${token.access_token.length} chars)`;
    console.log("\n✔ Authorization successful");
    console.log(`  access_token: ${masked}`);
    console.log(`  expires_in:   ${token.expires_in ?? "unknown"}s`);
    console.log("  Saved to .env as BINANCE_MCP_TOKEN (gitignored, server-side only).");
    console.log("\nNext steps:");
    console.log("  1. Local:  restart the app, then run  node scripts/test-mcp.mjs");
    console.log("  2. Vercel: add BINANCE_MCP_TOKEN in the project dashboard");
    console.log("     (Settings → Environment Variables), then redeploy.");
    console.log("  3. Open /api/binance/status — expect \"connected\": true.");
  } catch (e) {
    res.writeHead(500).end("token exchange failed");
    console.error("\n", e.message);
  } finally {
    server.close();
    setTimeout(() => process.exit(0), 500);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("FOMO Firewall — Binance Agent OS OAuth helper\n");
  console.log("Open this URL in your browser and authorize with your Binance account:\n");
  console.log(authUrl.toString());
  console.log("\nWaiting for the authorization callback on", REDIRECT_URI, "…");
  console.log("(Prerequisite: create + fund an Agentic subaccount in your Binance account.)");
});
