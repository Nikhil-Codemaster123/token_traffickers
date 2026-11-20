import { handle, hasSecret, unauthorized } from "@/lib/auth";
import { resetDemo } from "@/lib/tools";

// Run before every dry run: removes demo cases and events, re-creates free slots relative to now.
export async function POST(req: Request) {
  if (!hasSecret(req)) return unauthorized();
  return handle(() => resetDemo());
}
