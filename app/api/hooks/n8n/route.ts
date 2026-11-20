import { jsonRoute, unauthorized } from "@/lib/auth";
import { acceptJob, proposeTime } from "@/lib/tools";

// Optional: lets n8n pass on a craftsman's WhatsApp reply (e.g. "JA" = accept) instead of a tap on the job link.
// Body: { job_token, action: "accept" | "propose", note? }  Header: x-webhook-secret = N8N_WEBHOOK_SECRET
export async function POST(req: Request) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-webhook-secret") !== secret) return unauthorized();
  return jsonRoute<{ job_token?: string; action?: string; note?: string }>(req, async (b) => {
    if (!b.job_token) throw new Error("job_token missing");
    if (b.action === "accept") return acceptJob(b.job_token);
    if (b.action === "propose") return proposeTime(b.job_token, b.note ?? "");
    throw new Error('action must be "accept" or "propose"');
  });
}
