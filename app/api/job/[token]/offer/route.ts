import { handle } from "@/lib/auth";
import { submitOffer } from "@/lib/tools";

export const maxDuration = 60;

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  return handle(async () => {
    const file = (await req.formData()).get("file");
    return submitOffer(token, file instanceof File ? file : null);
  });
}
