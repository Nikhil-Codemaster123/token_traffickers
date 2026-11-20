import { handle } from "@/lib/auth";
import { managerApprove } from "@/lib/tools";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(() => managerApprove(id));
}
