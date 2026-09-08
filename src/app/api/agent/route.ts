import { NextRequest } from "next/server";
import { runAgent } from "@/agent/agent";
import { normalizeLocale } from "@/lib/i18n";
import type { AgentStep } from "@/types/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Streams the agent's work as NDJSON lines:
 *   { "type": "step",   "step": { id, label, status } }
 *   { "type": "result", "result": AgentResult }
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    prompt?: string;
    locale?: string;
  } | null;
  const prompt = body?.prompt?.trim();
  const locale = normalizeLocale(body?.locale);
  if (!prompt) {
    return new Response(JSON.stringify({ error: "Missing prompt" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      const emit = (step: AgentStep) => send({ type: "step", step });

      try {
        const result = await runAgent(prompt, emit, locale);
        send({ type: "result", result });
      } catch (err) {
        send({
          type: "result",
          result: {
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
