import { jsonRoute } from "@/lib/auth";
import { tenantNote } from "@/lib/tools";

export async function POST(req: Request, ctx: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await ctx.params;
  return jsonRoute<{ text?: string }>(req, (b) => tenantNote(caseId, b.text ?? ""));
}
