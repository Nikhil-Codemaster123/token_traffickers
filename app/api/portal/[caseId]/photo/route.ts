import { handle } from "@/lib/auth";
import { addPhoto } from "@/lib/tools";

export async function POST(req: Request, ctx: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await ctx.params;
  return handle(async () => {
    const file = (await req.formData()).get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("no photo attached");
    return addPhoto(caseId, file);
  });
}
