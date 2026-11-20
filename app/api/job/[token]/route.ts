import { handle } from "@/lib/auth";
import { jobView } from "@/lib/tools";

// What the craftsman sees: before Accept no personal data, after Accept the flat and contact.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  return handle(() => jobView(token));
}
