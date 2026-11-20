import { handle } from "@/lib/auth";
import { completeJob } from "@/lib/tools";

export const maxDuration = 60; // reading the invoice with OpenAI can take a few seconds

// multipart form: note, file (invoice PDF or photo), optional number and amount_eur
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  return handle(async () => {
    const form = await req.formData();
    const file = form.get("file");
    const amount = form.get("amount_eur");
    return completeJob(token, {
      note: String(form.get("note") ?? "").trim() || "Repair done",
      file: file instanceof File ? file : null,
      number: String(form.get("number") ?? ""),
      amount_eur: amount ? Number(String(amount).replace(",", ".")) : undefined,
    });
  });
}
