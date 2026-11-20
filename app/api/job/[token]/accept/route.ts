import { handle } from "@/lib/auth";
import { acceptJob } from "@/lib/tools";

export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  return handle(() => acceptJob(token));
}
