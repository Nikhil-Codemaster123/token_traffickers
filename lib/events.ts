import { db } from "./supabase";

export type Actor = "tenant" | "agent" | "partner" | "manager" | "owner" | "system";

/** Every call, message and status change lands on the unit (centrix's communication log). */
export async function logEvent(e: {
  case_id?: string | null;
  unit_id?: string | null;
  property_id?: string | null;
  type: string;
  actor: Actor;
  channel?: string;
  text: string;
}) {
  const { error } = await db().from("events").insert({
    case_id: e.case_id ?? null,
    unit_id: e.unit_id ?? null,
    property_id: e.property_id ?? null,
    type: e.type,
    actor: e.actor,
    channel: e.channel ?? null,
    text: e.text,
  });
  if (error) console.error("logEvent failed", error.message);
}
