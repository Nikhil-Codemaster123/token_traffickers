import type OpenAI from "openai";
import { agentPrompt } from "@/lib/agentPrompt";
import { runTool, TOOL_DEFS } from "@/lib/agentTools";
import { MODEL_AGENT, openai } from "@/lib/openai";

// Fallback voice loop (when the ElevenLabs agent isn't available):
// browser speech-to-text → this route (OpenAI + the same 5 tools) → /api/tts or browser speech.
// OpenAI keeps the conversation: the client sends back `response_id` as `previous_response_id`.

type CreateParams = Parameters<OpenAI["responses"]["create"]>[0];
type FnCall = { type: "function_call"; name: string; arguments: string; call_id: string };

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { message?: string; contact_id?: string; previous_response_id?: string };
    const contactId = body.contact_id || "";
    const instructions = agentPrompt(contactId);
    const trace: { tool: string; args: unknown; result: unknown }[] = [];

    let input: unknown[] = [{ role: "user", content: body.message || "(call connected)" }];
    let previous = body.previous_response_id || undefined;

    for (let round = 0; round < 8; round++) {
      const res = await openai().responses.create({
        model: MODEL_AGENT,
        instructions,
        input,
        tools: TOOL_DEFS,
        ...(previous ? { previous_response_id: previous } : {}),
      } as unknown as CreateParams);

      const r = res as unknown as { id: string; output: { type: string }[]; output_text?: string };
      const calls = r.output.filter((o): o is FnCall => o.type === "function_call");
      if (calls.length === 0) {
        return Response.json({ reply: r.output_text ?? "", response_id: r.id, trace });
      }

      input = [];
      for (const call of calls) {
        let args: Record<string, unknown> = {};
        let result: unknown;
        try {
          args = JSON.parse(call.arguments || "{}");
          result = await runTool(call.name, args, contactId);
        } catch (e) {
          result = { error: e instanceof Error ? e.message : String(e) };
        }
        trace.push({ tool: call.name, args, result });
        input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
      }
      previous = r.id;
    }
    return Response.json({ reply: "Sorry, one moment please, the property manager will call you back.", response_id: previous, trace });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(message);
    return Response.json({ error: message }, { status: 500 });
  }
}
