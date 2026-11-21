import { db } from "./supabase";
import * as tools from "./tools";

// The 5 tools of the voice agent, as OpenAI function tools (fallback loop).
// The ElevenLabs agent gets the same 5 as webhook tools: see agent/tools.md (same names, same parameters).

export const TOOL_DEFS = [
  {
    type: "function",
    name: "get_resident_context",
    description: "Look up the caller: name, flat, building, heating type and open cases. Call it first in every call.",
    parameters: {
      type: "object",
      properties: {
        contact_id: { type: "string", description: "The caller's contact_id from your instructions" },
        phone: { type: "string", description: "Only if there is no contact_id" },
      },
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: "function",
    name: "open_case",
    description: "Open the repair case. With scope 'building' it joins an already open building heating case instead of dispatching twice.",
    parameters: {
      type: "object",
      properties: {
        contact_id: { type: "string" },
        category: { type: "string", enum: ["heating", "other"] },
        scope: { type: "string", enum: ["unit", "building"] },
        symptoms: { type: "string", description: "One English sentence" },
        urgency: { type: "string", enum: ["low", "normal", "high"] },
        safety_flags: { type: "string", description: "Comma-separated: gas_smell, co_alarm, fire, flooding. Empty if none." },
        availability_note: { type: "string", description: "When the tenant is home, in their words" },
      },
      required: ["symptoms"],
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: "function",
    name: "record_consent",
    description: "Log that you told the caller which data is shared with the firm (name, phone, flat, access details, photos).",
    parameters: {
      type: "object",
      properties: { case_id: { type: "string" }, contact_id: { type: "string" } },
      required: ["case_id"],
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: "function",
    name: "pick_partner",
    description: "Pick the right heating firm for this building and get 2 free slots to offer.",
    parameters: {
      type: "object",
      properties: {
        case_id: { type: "string" },
        after: { type: "string", description: "Earliest time the tenant is home: 'HH:MM' (today) or 'tomorrow'. Leave out if any time works." },
      },
      required: ["case_id"],
      additionalProperties: false,
    },
    strict: false,
  },
  {
    type: "function",
    name: "book_slot",
    description: "Book the slot the caller chose. Under the owner's limit the job goes to the firm automatically.",
    parameters: {
      type: "object",
      properties: { case_id: { type: "string" }, slot_id: { type: "string" } },
      required: ["case_id", "slot_id"],
      additionalProperties: false,
    },
    strict: false,
  },
] as const;

type Args = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/**
 * Voice agents sometimes mangle the case id ("CASE_5AECBD7C", "5aecbd7c", empty).
 * Fix the format; if it still isn't found, use the caller's newest open case from the last 30 minutes.
 */
async function resolveCaseId(raw: unknown, contactId?: string): Promise<string> {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (s && s !== "undefined" && s !== "null") {
    const id = s.startsWith("case_") ? s : `case_${s.replace(/^case[\s_-]*/, "")}`;
    const hit = await db().from("cases").select("case_id").eq("case_id", id).maybeSingle();
    if (hit.data) return id;
  }
  let q = db()
      .from("cases")
      .select("case_id")
      .not("status", "in", "(closed,stopped,emergency)")
      .gte("created_at", new Date(Date.now() - 30 * 60_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1);
  if (contactId) q = q.contains("reporters", [contactId]);
  const latest = (await q).data?.[0] as { case_id: string } | undefined;
  if (!latest) throw new Error(`case ${String(raw)} not found`);
  return latest.case_id;
}

/** Runs a tool by name. `contactId` fills in the caller when the model leaves it out. */
export async function runTool(name: string, args: Args, contactId?: string): Promise<unknown> {
  const contact_id = str(args.contact_id) ?? contactId;
  switch (name) {
    case "get_resident_context":
      return tools.getResidentContext({ contact_id, phone: str(args.phone) });
    case "open_case":
      if (!contact_id) throw new Error("contact_id missing");
      return tools.openCase({
        contact_id,
        // Voice agents send free text ("Heating", "heating system", "Whole building", "urgent"): normalise it
        category: /heat|hvac|boiler|radiator|hot water|heiz/i.test(String(args.category ?? "heating")) ? "heating" : "other",
        scope: /build|whole|all|geb/i.test(String(args.scope ?? "")) ? "building" : "unit",
        symptoms: str(args.symptoms) ?? "Heating problem",
        urgency: /high|urgent|emergency|dringend/i.test(String(args.urgency ?? "")) ? "high" : /low|niedrig/i.test(String(args.urgency ?? "")) ? "low" : "normal",
        safety_flags: (args.safety_flags as string | string[] | undefined) ?? "",
        availability_note: str(args.availability_note),
      });
    case "record_consent":
      return tools.recordConsent({ case_id: await resolveCaseId(args.case_id, contact_id), contact_id });
    case "pick_partner":
      return tools.pickPartnerTool({ case_id: await resolveCaseId(args.case_id, contact_id), after: str(args.after) });
    case "book_slot":
      return tools.bookSlot({ case_id: await resolveCaseId(args.case_id, contact_id), slot_id: String(args.slot_id) });
    default:
      throw new Error(`unknown tool ${name}`);
  }
}