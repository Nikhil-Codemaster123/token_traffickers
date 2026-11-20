import { jsonRoute } from "@/lib/auth";
import { tenantConfirm } from "@/lib/tools";

export async function POST(req: Request, ctx: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await ctx.params;
  return jsonRoute<{ fixed?: boolean }>(req, (b) => tenantConfirm(caseId, b.fixed !== false));
}
