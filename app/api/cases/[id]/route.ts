import { handle } from "@/lib/auth";
import { caseState } from "@/lib/tools";

// ?view=manager (centrix, full record) or ?view=tenant (portal, neutral milestones only)
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const view = new URL(req.url).searchParams.get("view") === "tenant" ? "tenant" : "manager";
  return handle(() => caseState(id, view));
}
