import { jsonRoute } from "@/lib/auth";
import { proposeTime } from "@/lib/tools";

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  return jsonRoute<{ note?: string }>(req, (b) => proposeTime(token, b.note?.trim() || "(no note)"));
}
