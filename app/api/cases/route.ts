import { handle } from "@/lib/auth";
import { listCases } from "@/lib/tools";

// centrix inbox (newest first). ?contact_id= keeps the cases a tenant reported.
export async function GET(req: Request) {
  const contact_id = new URL(req.url).searchParams.get("contact_id") || undefined;
  return handle(() => listCases({ contact_id }));
}
