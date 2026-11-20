import { runTool, TOOL_DEFS } from "@/lib/agentTools";
import { hasSecret, jsonRoute, unauthorized } from "@/lib/auth";

// Webhook tools of the ElevenLabs agent: POST /api/agent/tools/<tool name> with header x-agent-secret.
// Same names and parameters as the fallback loop (lib/agentTools.ts).
const NAMES = new Set<string>(TOOL_DEFS.map((t) => t.name));

export async function POST(req: Request, ctx: { params: Promise<{ tool: string }> }) {
  if (!hasSecret(req)) return unauthorized();
  const { tool } = await ctx.params;
  if (!NAMES.has(tool)) return Response.json({ error: `unknown tool ${tool}` }, { status: 404 });
  return jsonRoute<Record<string, unknown>>(req, (body) => runTool(tool, body));
}
