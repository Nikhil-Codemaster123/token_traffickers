import { handle } from "@/lib/auth";
import { db, must } from "@/lib/supabase";

// Tenants for the caller picker on /line (stands in for caller-ID matching on a real phone line).
export async function GET() {
  return handle(async () =>
    must(
      await db().from("contacts").select("contact_id, name, unit_id, language").eq("role", "tenant").order("unit_id"),
      "residents",
    ),
  );
}
