import crypto from "node:crypto";
import { after } from "next/server";
import { approvalLimitFor, decideApproval, estimateCost } from "./approval";
import { logEvent } from "./events";
import { tenantMsg } from "./messages";
import { notify } from "./notify";
import { fileToContent, structured } from "./openai";
import { pickPartner } from "./pickPartner";
import { db, must } from "./supabase";
import { fmtSlot, isAppointmentDay, parseAfter, slotTemplate } from "./time";
import type { CaseRow, Contact, EventRow, JobCard, Partner, Property, Unit } from "./types";

// ---------- helpers ----------

const base = () => (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
export const portalUrl = (caseId: string) => `${base()}/portal/${caseId}`;
export const jobUrl = (token: string) => `${base()}/job/${token}`;
const OPEN_STATUSES_EXCLUDED = "(closed,stopped,emergency)";

async function loadCase(case_id: string): Promise<CaseRow> {
  return must<CaseRow>(await db().from("cases").select("*").eq("case_id", case_id).single(), `case ${case_id}`);
}
async function loadCaseByToken(token: string): Promise<CaseRow> {
  return must<CaseRow>(await db().from("cases").select("*").eq("job_token", token).single(), "job");
}
async function loadContact(id: string): Promise<Contact> {
  return must<Contact>(await db().from("contacts").select("*").eq("contact_id", id).single(), `contact ${id}`);
}
async function loadPartner(id: string): Promise<Partner> {
  return must<Partner>(await db().from("partners").select("*").eq("partner_id", id).single(), `partner ${id}`);
}
async function loadProperty(id: string): Promise<Property> {
  return must<Property>(await db().from("properties").select("*").eq("property_id", id).single(), `property ${id}`);
}
async function loadUnit(id: string): Promise<Unit> {
  return must<Unit>(await db().from("units").select("*").eq("unit_id", id).single(), `unit ${id}`);
}
async function updateCase(case_id: string, patch: Partial<CaseRow>): Promise<CaseRow> {
  return must<CaseRow>(
      await db().from("cases").update(patch).eq("case_id", case_id).select("*").single(),
      `update case ${case_id}`,
  );
}

// ---------- the 5 agent tools ----------

/** Tool 1: who is calling, which unit and building, and any open case to join. */
export async function getResidentContext(args: { contact_id?: string; phone?: string }) {
  let contact: Contact | null = null;
  if (args.contact_id) {
    contact = (await db().from("contacts").select("*").eq("contact_id", args.contact_id).maybeSingle()).data as Contact | null;
  } else if (args.phone) {
    const digits = args.phone.replace(/\D/g, "").slice(-8);
    const all = must<Contact[]>(await db().from("contacts").select("*").eq("role", "tenant"), "contacts");
    contact = all.find((c) => (c.phone ?? "").replace(/\D/g, "").endsWith(digits)) ?? null;
  }
  if (!contact || !contact.unit_id) {
    return { found: false, instruction: "Ask for the caller's name and address, then call this tool again with their contact_id." };
  }
  const unit = await loadUnit(contact.unit_id);
  const property = await loadProperty(unit.property_id);
  const open = must<CaseRow[]>(
      await db()
          .from("cases")
          .select("*")
          .eq("property_id", property.property_id)
          .not("status", "in", OPEN_STATUSES_EXCLUDED)
          .order("created_at", { ascending: false }),
      "open cases",
  ).filter((c) => c.scope === "building" || c.unit_id === unit.unit_id);

  const partnerNames: Record<string, string> = {};
  for (const c of open) if (c.partner_id && !partnerNames[c.partner_id]) partnerNames[c.partner_id] = (await loadPartner(c.partner_id)).name;

  await logEvent({
    unit_id: unit.unit_id,
    property_id: property.property_id,
    type: "call.started",
    actor: "tenant",
    channel: "voice",
    text: `Incoming call from ${contact.name} (${unit.unit_id})`,
  });

  const buildingHeatingCase = open.find((c) => c.scope === "building" && c.category === "heating");
  return {
    found: true,
    contact: { contact_id: contact.contact_id, name: contact.name, language: contact.language },
    unit: { unit_id: unit.unit_id, floor: unit.floor },
    property: {
      property_id: property.property_id,
      address: `${property.address}, ${property.postcode} ${property.city}`,
      building_year: property.building_year,
      heating: property.heating,
      fuel: property.fuel,
    },
    open_cases: open.map((c) => ({
      case_id: c.case_id,
      category: c.category,
      scope: c.scope,
      status: c.status,
      partner: c.partner_id ? partnerNames[c.partner_id] : null,
      appointment: fmtSlot(c.appointment_start, c.appointment_end) || null,
    })),
    hint: buildingHeatingCase
        ? "A building-wide heating case is already open. If the caller has the same problem, call open_case with scope 'building': it joins that case instead of dispatching twice."
        : undefined,
  };
}

/** Tool 2: opens the case, joins an open building case, or raises an emergency. */
export async function openCase(args: {
  contact_id: string;
  category?: string;
  scope?: "unit" | "building";
  symptoms: string;
  safety_flags?: string[] | string;
  urgency?: "low" | "normal" | "high" | "emergency";
  availability_note?: string;
}) {
  const contact = await loadContact(args.contact_id);
  if (!contact.unit_id) throw new Error("caller has no unit");
  const unit = await loadUnit(contact.unit_id);
  const property = await loadProperty(unit.property_id);
  const category = args.category ?? "heating";
  const scope = args.scope ?? "unit";
  const rawFlags = Array.isArray(args.safety_flags) ? args.safety_flags : (args.safety_flags ?? "").split(",");
  const flags = rawFlags.map((f) => f.trim().toLowerCase()).filter((f) => f && f !== "none");
  const emergency = flags.some((f) => ["gas_smell", "co_alarm", "fire", "flooding"].includes(f));

  // "emergency" is reserved for danger (gas, CO, fire, water); a cold flat is at most "high"
  const urgency = emergency ? "emergency" : args.urgency === "emergency" ? "high" : (args.urgency ?? "normal");

  // Voice agents sometimes call open_case twice in one call: reuse the caller's fresh, unbooked case
  if (!emergency) {
    const recent = (
        await db()
            .from("cases")
            .select("*")
            .eq("contact_id", contact.contact_id)
            .eq("category", category)
            .in("status", ["new", "partner_picked"])
            .gte("created_at", new Date(Date.now() - 15 * 60_000).toISOString())
            .order("created_at", { ascending: false })
            .limit(1)
    ).data?.[0] as CaseRow | undefined;
    if (recent) {
      await updateCase(recent.case_id, {
        symptoms: args.symptoms,
        summary: args.symptoms,
        scope,
        urgency,
        availability_note: args.availability_note ?? recent.availability_note,
      });
      return {
        case_id: recent.case_id,
        reused: true,
        next: "This call's case already exists and was updated. Continue: data notice and record_consent if not done yet, then pick_partner.",
      };
    }
  }
  if (!emergency && category === "heating" && scope === "building") {
    const existing = (
        await db()
            .from("cases")
            .select("*")
            .eq("property_id", property.property_id)
            .eq("category", "heating")
            .eq("scope", "building")
            .not("status", "in", OPEN_STATUSES_EXCLUDED)
            .order("created_at", { ascending: false })
            .limit(1)
    ).data?.[0] as CaseRow | undefined;
    if (existing) {
      const reporters = Array.from(new Set([...(existing.reporters ?? []), contact.contact_id]));
      await updateCase(existing.case_id, { reporters });
      const partner = existing.partner_id ? await loadPartner(existing.partner_id) : null;
      const slot = fmtSlot(existing.appointment_start, existing.appointment_end) || null;
      await logEvent({
        case_id: existing.case_id,
        unit_id: unit.unit_id,
        type: "case.joined",
        actor: "agent",
        channel: "voice",
        text: `${contact.name} (${unit.unit_id}) reported the same problem: added to the open building case, no second dispatch`,
      });
      await notify({
        flow: "tenant_update",
        channel: "whatsapp",
        case_id: existing.case_id,
        unit_id: unit.unit_id,
        to: { name: contact.name, phone: contact.phone, language: contact.language },
        text: tenantMsg.joined(contact.language, contact.name, partner?.name ?? null, fmtSlot(existing.appointment_start, existing.appointment_end, contact.language) || null),
        link: portalUrl(existing.case_id),
      });
      return {
        case_id: existing.case_id,
        joined_existing: true,
        partner: partner?.name ?? null,
        appointment: slot,
        say: "Tell the caller the building's heating problem is already known and being handled, with the appointment if there is one. They will get updates by message. Don't book anything.",
      };
    }
  }

  const created = must<CaseRow>(
      await db()
          .from("cases")
          .insert({
            property_id: property.property_id,
            unit_id: unit.unit_id,
            contact_id: contact.contact_id,
            scope,
            category,
            urgency,
            status: emergency ? "emergency" : "new",
            symptoms: args.symptoms,
            summary: args.symptoms,
            safety_flags: flags,
            availability_note: args.availability_note ?? null,
            reporters: [contact.contact_id],
          })
          .select("*")
          .single(),
      "open case",
  );
  await logEvent({
    case_id: created.case_id,
    unit_id: unit.unit_id,
    type: "case.opened",
    actor: "agent",
    channel: "voice",
    text: `Case opened from the call: ${category} · ${scope} · ${urgency}. ${args.symptoms}`,
  });

  if (emergency) {
    await logEvent({
      case_id: created.case_id,
      unit_id: unit.unit_id,
      type: "case.emergency",
      actor: "agent",
      channel: "voice",
      text: `Emergency (${flags.join(", ")}): caller told to leave and call 112. Nothing booked.`,
    });
    await notify({
      flow: "manager_update",
      channel: "email",
      case_id: created.case_id,
      unit_id: unit.unit_id,
      to: { name: "Property manager" },
      text: `EMERGENCY at ${property.address}, ${unit.unit_id}: ${flags.join(", ")}. Caller told to leave and call 112.`,
    });
    return { case_id: created.case_id, emergency: true, say: "Tell the caller to leave the building now and call 112. Do not book anything." };
  }
  return {
    case_id: created.case_id,
    next: "Tell the caller which data you share with the heating firm (name, phone, flat, access details, photos), then call record_consent, then pick_partner.",
  };
}

/** Tool 3: logs the data-sharing notice (our assumption: the lease covers it). */
export async function recordConsent(args: {
  case_id: string;
  contact_id?: string;
  data_shared?: string[];
  legal_basis?: string;
  channel?: string;
}) {
  const c = await loadCase(args.case_id);
  const data_shared = args.data_shared?.length ? args.data_shared : ["name", "phone", "unit", "access_notes", "photos"];
  const row = must<{ consent_id: string; given_at: string }>(
      await db()
          .from("consents")
          .insert({
            case_id: c.case_id,
            contact_id: args.contact_id ?? c.contact_id,
            data_shared,
            legal_basis: args.legal_basis ?? "lease",
            channel: args.channel ?? "voice",
          })
          .select("consent_id, given_at")
          .single(),
      "record consent",
  );
  await logEvent({
    case_id: c.case_id,
    unit_id: c.unit_id,
    type: "consent.logged",
    actor: "tenant",
    channel: args.channel ?? "voice",
    text: `Data-sharing notice given (basis: ${args.legal_basis ?? "lease"}): ${data_shared.join(", ")}`,
  });
  return { consent_id: row.consent_id, next: `Now call pick_partner with case_id ${c.case_id}.` };
}

/** Tool 4: picks the right craftsman and returns 2 free slots to offer. */
export async function pickPartnerTool(args: { case_id: string; after?: string }) {
  const c = await loadCase(args.case_id);
  const pick = await pickPartner(c, { after: parseAfter(args.after) });
  if (!pick) {
    await logEvent({ case_id: c.case_id, unit_id: c.unit_id, type: "partner.none", actor: "agent", text: "No suitable firm free: handed to the property manager" });
    return { found: false, say: "No suitable firm is free right now. Tell the caller the property manager will call back within the hour." };
  }
  const estimate = estimateCost(pick.partner);
  await updateCase(c.case_id, {
    partner_id: pick.partner.partner_id,
    pick_reasons: pick.reasons,
    estimated_cost_eur: estimate,
    status: "partner_picked",
  });
  await logEvent({
    case_id: c.case_id,
    unit_id: c.unit_id,
    type: "partner.picked",
    actor: "agent",
    text: `Picked ${pick.partner.name}: ${pick.reasons.join("; ")}.${pick.rejected.length ? ` Not picked: ${pick.rejected.map((r) => `${r.name} (${r.why})`).join("; ")}.` : ""}`,
  });
  const slots = pick.slots.map((s) => ({ slot_id: s.slot_id, label: fmtSlot(s.slot_start, s.slot_end) }));
  const offer = slots.map((s) => s.label).join(", or ");
  return {
    found: true,
    partner: pick.partner.name,
    slots,
    say: `${pick.partner.name} can come ${offer}. Which suits you?`,
    next: `Wait for the caller's choice, then call book_slot with case_id ${c.case_id} and the chosen slot_id (${slots.map((s) => s.slot_id).join(" or ")}). Never read out ids. Don't say the job is sent before book_slot answers.`,
  };
}

/** Tool 5: books the slot; under the owner's limit the job goes out automatically. */
export async function bookSlot(args: { case_id: string; slot_id: string }) {
  const c = await loadCase(args.case_id);
  if (!c.partner_id) return { booked: false, say: "Call pick_partner first." };
  const slot = (
      await db().from("availability").update({ booked: true }).eq("slot_id", args.slot_id).eq("booked", false).select("*").maybeSingle()
  ).data as { slot_id: string; slot_start: string; slot_end: string } | null;
  if (!slot) return { booked: false, say: "That slot was just taken. Offer the other one, or call pick_partner again." };

  const contact = c.contact_id ? await loadContact(c.contact_id) : null;
  const partner = await loadPartner(c.partner_id);
  const limit = await approvalLimitFor(c.property_id);
  const approval = decideApproval(c.estimated_cost_eur ?? 0, limit);
  const label = fmtSlot(slot.slot_start, slot.slot_end);
  const updated = await updateCase(c.case_id, {
    slot_id: slot.slot_id,
    appointment_start: slot.slot_start,
    appointment_end: slot.slot_end,
    approval,
    status: approval === "auto" ? "booked" : "awaiting_approval",
    job_token: crypto.randomBytes(9).toString("base64url"),
  });
  await logEvent({ case_id: c.case_id, unit_id: c.unit_id, type: "slot.booked", actor: "tenant", channel: "voice", text: `Tenant picked ${label} with ${partner.name}` });

  if (contact) {
    await notify({
      flow: "tenant_update",
      channel: "whatsapp",
      case_id: c.case_id,
      unit_id: c.unit_id,
      to: { name: contact.name, phone: contact.phone, language: contact.language },
      text: tenantMsg.booked(contact.language, contact.name, partner.name, fmtSlot(slot.slot_start, slot.slot_end, contact.language)),
      link: portalUrl(c.case_id),
    });
  }

  if (approval === "auto") {
    // Runs after the tool answers, so the voice agent isn't kept waiting for the job card
    after(() =>
        dispatchJob(updated, {
          by: "system",
          reason: `estimated €${c.estimated_cost_eur} is under the owner's €${limit} limit`,
        }).catch((e) => console.error("dispatch failed", e)),
    );
  } else {
    await logEvent({
      case_id: c.case_id,
      unit_id: c.unit_id,
      type: "approval.needed",
      actor: "system",
      text: `Estimated €${c.estimated_cost_eur} is above the owner's €${limit} limit: waiting for approval`,
    });
    await notify({
      flow: "owner_approval",
      channel: "email",
      case_id: c.case_id,
      unit_id: c.unit_id,
      to: { name: "Property manager" },
      text: `Repair at ${c.unit_id} estimated at €${c.estimated_cost_eur}, above the €${limit} limit. Approve in centrix.`,
      link: `${base()}/centrix/case/${c.case_id}`,
    });
  }
  return {
    booked: true,
    partner: partner.name,
    appointment: label,
    approval,
    say:
        approval === "auto"
            ? `Confirm ${partner.name} for ${label}. Say they'll get a message with a link to follow the case, add a photo or chat.`
            : `Say the slot ${label} is reserved and the property manager confirms it shortly, because the job needs approval.`,
  };
}

// ---------- dispatch and the partner side ----------

/** Writes the job card (OpenAI, cheap model) and sends the WhatsApp link to the firm. */
export async function dispatchJob(c: CaseRow, opts: { by: "system" | "manager"; reason: string }) {
  if (!c.partner_id || !c.job_token) throw new Error("case has no partner or job token");
  const partner = await loadPartner(c.partner_id);
  const property = await loadProperty(c.property_id);
  const history = must<{ summary: string | null; created_at: string }[]>(
      await db().from("cases").select("summary, created_at").eq("property_id", c.property_id).eq("status", "closed").order("created_at", { ascending: false }).limit(3),
      "history",
  );

  let card: JobCard;
  try {
    card = await structured<JobCard>({
      name: "job_card",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["headline", "problem_summary", "urgency_reason", "checklist"],
        properties: {
          headline: { type: "string" },
          problem_summary: { type: "string" },
          urgency_reason: { type: "string" },
          checklist: { type: "array", items: { type: "string" } },
        },
      },
      instructions:
          "You write a short job card for a heating craftsman in English. Use only the facts given. No prices, no personal data. Headline under 8 words; checklist of at most 4 short items to check or bring.",
      content: [
        {
          type: "input_text",
          text: JSON.stringify({
            category: c.category,
            scope: c.scope,
            urgency: c.urgency,
            symptoms: c.symptoms,
            reporters: c.reporters.length,
            building: { year: property.building_year, heating: property.heating, fuel: property.fuel },
            past_repairs_on_building: history.map((h) => h.summary),
          }),
        },
      ],
    });
  } catch (e) {
    console.error("job card generation failed, using a template", e);
    card = {
      headline: `${c.scope === "building" ? "Building" : "Flat"} heating not working`,
      problem_summary: c.symptoms ?? "No heating",
      urgency_reason: c.urgency === "high" ? "Tenant without heating in cold weather" : "Reported by the tenant",
      checklist: ["Check burner and ignition", "Check system pressure", "Check circulation pump"],
    };
  }

  await updateCase(c.case_id, { job_card: card, status: "dispatched", approval: opts.by === "system" ? "auto" : "manager" });
  await logEvent({
    case_id: c.case_id,
    unit_id: c.unit_id,
    type: "job.dispatched",
    actor: opts.by === "system" ? "system" : "manager",
    text: opts.by === "system" ? `Dispatched automatically: ${opts.reason}` : `Approved and dispatched by the manager: ${opts.reason}`,
  });
  await notify({
    flow: "dispatch",
    channel: (partner.job_channel as "whatsapp" | "email") ?? "whatsapp",
    case_id: c.case_id,
    unit_id: c.unit_id,
    to: { name: partner.name, phone: partner.phone, email: partner.email },
    text: `New job: ${card.headline}. ${property.address}, ${property.postcode} ${property.city}. Slot ${fmtSlot(c.appointment_start, c.appointment_end)}. Open the job card:`,
    link: jobUrl(c.job_token),
  });
}

/** Craftsman taps Accept. */
export async function acceptJob(token: string) {
  const c = await loadCaseByToken(token);
  if (c.status !== "dispatched") return { ok: false, status: c.status };
  await updateCase(c.case_id, { status: "scheduled" });
  const partner = await loadPartner(c.partner_id!);
  const slot = fmtSlot(c.appointment_start, c.appointment_end);
  await logEvent({ case_id: c.case_id, unit_id: c.unit_id, type: "job.accepted", actor: "partner", channel: "whatsapp", text: `${partner.name} accepted ${slot}` });
  for (const id of c.reporters) {
    const t = await loadContact(id);
    await notify({
      flow: "tenant_update",
      channel: "whatsapp",
      case_id: c.case_id,
      unit_id: t.unit_id,
      to: { name: t.name, phone: t.phone, language: t.language },
      text: tenantMsg.confirmed(t.language, partner.name, fmtSlot(c.appointment_start, c.appointment_end, t.language)),
      link: portalUrl(c.case_id),
    });
  }
  return { ok: true };
}

/** Craftsman proposes another time (logged; the manager follows up). */
export async function proposeTime(token: string, note: string) {
  const c = await loadCaseByToken(token);
  const partner = await loadPartner(c.partner_id!);
  await logEvent({ case_id: c.case_id, unit_id: c.unit_id, type: "job.time_proposed", actor: "partner", channel: "whatsapp", text: `${partner.name} proposed another time: ${note}` });
  return { ok: true };
}

/** Craftsman taps Done and uploads the invoice; OpenAI reads number and amount; the loop closes. */
export async function completeJob(token: string, input: { note: string; file?: File | null; number?: string; amount_eur?: number }) {
  const c = await loadCaseByToken(token);
  if (!["scheduled", "dispatched"].includes(c.status)) return { ok: false, status: c.status };
  const partner = await loadPartner(c.partner_id!);
  const limit = await approvalLimitFor(c.property_id);

  let file_url: string | null = null;
  let number = input.number?.trim() || null;
  let amount = input.amount_eur && !Number.isNaN(input.amount_eur) ? input.amount_eur : null;

  if (input.file && input.file.size > 0) {
    const bytes = await input.file.arrayBuffer();
    const path = `${c.case_id}/invoice-${Date.now()}-${input.file.name.replace(/[^\w.-]/g, "_")}`;
    const up = await db().storage.from("documents").upload(path, bytes, { contentType: input.file.type || "application/pdf" });
    if (!up.error) file_url = db().storage.from("documents").getPublicUrl(path).data.publicUrl;
    if (!number || amount === null) {
      try {
        const read = await structured<{ invoice_number: string; amount_eur_gross: number }>({
          name: "invoice",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["invoice_number", "amount_eur_gross"],
            properties: { invoice_number: { type: "string" }, amount_eur_gross: { type: "number" } },
          },
          instructions: "Read this craftsman invoice. Return the invoice number and the gross total in euros. If a value is missing, return an empty string or 0.",
          content: [{ type: "input_text", text: "Invoice attached." }, fileToContent(input.file.name, input.file.type, bytes)],
        });
        number = number || read.invoice_number || null;
        amount = amount ?? (read.amount_eur_gross || null);
      } catch (e) {
        console.error("invoice reading failed", e);
      }
    }
  }

  const billed_to = (amount ?? 0) <= limit ? "reltix" : "owner"; // Reltix: below the limit invoices go through Reltix
  const doc = must<{ document_id: string }>(
      await db().from("documents").insert({ case_id: c.case_id, type: "invoice", file_url, number, amount_eur: amount, billed_to }).select("document_id").single(),
      "save invoice",
  );
  await updateCase(c.case_id, { status: "completed" });
  await logEvent({ case_id: c.case_id, unit_id: c.unit_id, type: "job.done", actor: "partner", channel: "whatsapp", text: `${partner.name} marked the job done: "${input.note}"` });
  await logEvent({
    case_id: c.case_id,
    unit_id: c.unit_id,
    type: "invoice.linked",
    actor: "system",
    text: `Invoice ${number ?? "(no number)"}${amount !== null ? ` · €${amount.toFixed(2)}` : ""} linked to the case, billed to ${billed_to === "reltix" ? "Reltix" : "the owner"} (${doc.document_id})`,
  });

  const result = await buildResult(c.case_id);
  await updateCase(c.case_id, { result });
  await logEvent({ case_id: c.case_id, unit_id: c.unit_id, type: "result.written", actor: "system", text: `Result written back to ${c.unit_id}` });

  for (const id of c.reporters) {
    const t = await loadContact(id);
    await notify({
      flow: "tenant_update",
      channel: "whatsapp",
      case_id: c.case_id,
      unit_id: t.unit_id,
      to: { name: t.name, phone: t.phone, language: t.language },
      text: tenantMsg.done(t.language, partner.name),
      link: portalUrl(c.case_id),
    });
  }
  await notify({
    flow: "manager_update",
    channel: "email",
    case_id: c.case_id,
    unit_id: c.unit_id,
    to: { name: "Property manager" },
    text: `Repair done at ${c.unit_id} by ${partner.name}. Invoice ${number ?? ""} ${amount !== null ? `€${amount.toFixed(2)}` : ""} is on the case.`,
  });
  return { ok: true, result };
}

/** The result written back to centrix, in the shape of Reltix's sample payload. */
export async function buildResult(case_id: string) {
  const c = await loadCase(case_id);
  const partner = c.partner_id ? await loadPartner(c.partner_id) : null;
  const invoice = (await db().from("documents").select("*").eq("case_id", case_id).eq("type", "invoice").order("created_at", { ascending: false }).limit(1)).data?.[0];
  const consent = (await db().from("consents").select("*").eq("case_id", case_id).order("given_at", { ascending: false }).limit(1)).data?.[0];
  return {
    unit_id: c.unit_id,
    contact_id: c.contact_id,
    case: {
      case_id: c.case_id,
      category: c.category,
      scope: c.scope,
      partner: partner?.name ?? null,
      status: c.status,
      approval: c.approval,
      appointment: { start: c.appointment_start, end: c.appointment_end },
      invoice: invoice
          ? { number: invoice.number, amount_eur: invoice.amount_eur, billed_to: invoice.billed_to, document_id: invoice.document_id }
          : null,
      consent: consent
          ? { data_shared: consent.data_shared, legal_basis: consent.legal_basis, given_at: consent.given_at, channel: consent.channel }
          : null,
    },
  };
}

// ---------- tenant and manager actions ----------

export async function tenantConfirm(case_id: string, fixed: boolean) {
  const c = await loadCase(case_id);
  if (fixed) {
    await updateCase(case_id, { status: "closed", closed_at: new Date().toISOString() });
    await logEvent({ case_id, unit_id: c.unit_id, type: "tenant.confirmed", actor: "tenant", channel: "portal", text: "Tenant confirmed: the heating works again" });
    await updateCase(case_id, { result: await buildResult(case_id) });
  } else {
    await updateCase(case_id, { status: "reopened" });
    await logEvent({ case_id, unit_id: c.unit_id, type: "tenant.not_fixed", actor: "tenant", channel: "portal", text: "Tenant says it's still not working: case reopened" });
    await notify({ flow: "manager_update", channel: "email", case_id, unit_id: c.unit_id, to: { name: "Property manager" }, text: `Case ${case_id} reopened: tenant says the heating still doesn't work.` });
  }
  return { ok: true };
}

export async function tenantNote(case_id: string, text: string) {
  const c = await loadCase(case_id);
  const clean = text.trim().slice(0, 500);
  if (!clean) return { ok: false };
  await logEvent({ case_id, unit_id: c.unit_id, type: "tenant.note", actor: "tenant", channel: "portal", text: `Tenant note: ${clean}` });
  return { ok: true };
}

export async function addPhoto(case_id: string, file: File) {
  const c = await loadCase(case_id);
  const path = `${case_id}/photo-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const up = await db().storage.from("documents").upload(path, await file.arrayBuffer(), { contentType: file.type || "image/jpeg" });
  if (up.error) throw new Error(up.error.message);
  const url = db().storage.from("documents").getPublicUrl(path).data.publicUrl;
  await db().from("documents").insert({ case_id, type: "photo", file_url: url });
  await logEvent({ case_id, unit_id: c.unit_id, type: "photo.added", actor: "tenant", channel: "portal", text: "Tenant added a photo" });
  return { ok: true, url };
}

export async function managerStop(case_id: string) {
  const c = await loadCase(case_id);
  await updateCase(case_id, { status: "stopped" });
  if (c.slot_id) await db().from("availability").update({ booked: false }).eq("slot_id", c.slot_id);
  await logEvent({ case_id, unit_id: c.unit_id, type: "job.stopped", actor: "manager", channel: "centrix", text: "The manager stopped the automatic dispatch" });
  if (c.partner_id) {
    const p = await loadPartner(c.partner_id);
    await notify({ flow: "partner_cancel", channel: "whatsapp", case_id, unit_id: c.unit_id, to: { name: p.name, phone: p.phone }, text: "This job was cancelled by the property manager." });
  }
  if (c.contact_id) {
    const t = await loadContact(c.contact_id);
    await notify({ flow: "tenant_update", channel: "whatsapp", case_id, unit_id: c.unit_id, to: { name: t.name, phone: t.phone, language: t.language }, text: tenantMsg.stopped(t.language) });
  }
  return { ok: true };
}

export async function managerApprove(case_id: string) {
  const c = await loadCase(case_id);
  if (c.status !== "awaiting_approval") return { ok: false, status: c.status };
  await dispatchJob(c, { by: "manager", reason: "above the limit, approved after the owner agreed" });
  return { ok: true };
}

// ---------- read models for the screens ----------

export async function listCases(filter: { contact_id?: string } = {}) {
  let q = db().from("cases").select("*").order("created_at", { ascending: false }).limit(50);
  if (filter.contact_id) q = q.contains("reporters", [filter.contact_id]);
  const cases = must<CaseRow[]>(await q, "cases");
  const partners = must<Partner[]>(await db().from("partners").select("partner_id, name"), "partners");
  const contacts = must<Contact[]>(await db().from("contacts").select("contact_id, name"), "contacts");
  return cases.map((c) => ({
    ...c,
    partner_name: partners.find((p) => p.partner_id === c.partner_id)?.name ?? null,
    contact_name: contacts.find((p) => p.contact_id === c.contact_id)?.name ?? null,
    appointment: fmtSlot(c.appointment_start, c.appointment_end),
  }));
}

export async function caseState(case_id: string, view: "manager" | "tenant") {
  const c = await loadCase(case_id);
  const property = await loadProperty(c.property_id);
  const unit = c.unit_id ? await loadUnit(c.unit_id) : null;
  const contact = c.contact_id ? await loadContact(c.contact_id) : null;
  const partner = c.partner_id ? await loadPartner(c.partner_id) : null;
  const events = must<EventRow[]>(await db().from("events").select("*").eq("case_id", case_id).order("occurred_at"), "events");
  const documents = must<{ document_id: string; type: string; file_url: string | null; number: string | null; amount_eur: number | null; billed_to: string | null }[]>(
      await db().from("documents").select("*").eq("case_id", case_id).order("created_at"),
      "documents",
  );
  const appointment = fmtSlot(c.appointment_start, c.appointment_end);

  if (view === "tenant") {
    // Neutral milestones only: a building case is shared by several tenants, so no names or other flats here
    const line = (e: EventRow): string | null => {
      switch (e.type) {
        case "case.opened": return "Problem reported";
        case "case.joined": return "Another resident reported the same problem";
        case "slot.booked": return `Appointment booked${appointment ? `: ${appointment}` : ""}`;
        case "approval.needed": return "Waiting for the property manager's approval";
        case "job.dispatched": return `${partner?.name ?? "The firm"} got the job`;
        case "job.accepted": return `${partner?.name ?? "The firm"} confirmed the appointment`;
        case "job.done": return "Repair finished: please confirm it works";
        case "tenant.confirmed": return "You confirmed it works. Case closed";
        case "tenant.not_fixed": return "You said it still doesn't work: the manager is on it";
        case "job.stopped": return "The property manager paused the appointment";
        case "photo.added": return "Photo added";
        case "tenant.note": return `Your note: ${e.text?.replace(/^Tenant note: /, "")}`;
        default: return null;
      }
    };
    return {
      case_id: c.case_id,
      status: c.status,
      category: c.category,
      scope: c.scope,
      symptoms: c.symptoms,
      address: `${property.address}, ${property.postcode} ${property.city}`,
      partner: partner?.name ?? null,
      appointment,
      photos: documents.filter((d) => d.type === "photo").map((d) => d.file_url),
      updates: events.map((e) => ({ at: e.occurred_at, text: line(e) })).filter((u) => u.text),
    };
  }

  const limit = await approvalLimitFor(c.property_id);
  const consent = (await db().from("consents").select("*").eq("case_id", case_id).limit(1)).data?.[0] ?? null;
  return {
    case: c,
    property,
    unit,
    contact,
    partner,
    appointment,
    approval_limit_eur: limit,
    consent,
    documents,
    events,
    effort: {
      tenant_calls: Math.max(1, c.reporters.length),
      // Accept, invoice upload, Done (3 taps for a normal job)
      craftsman_taps: events.filter((e) => e.actor === "partner").length + documents.filter((d) => d.type === "invoice").length,
      manager_clicks: events.filter((e) => e.actor === "manager").length,
    },
  };
}

/** What the craftsman sees: staged sharing, so personal data appears only after Accept. */
export async function jobView(token: string) {
  const c = await loadCaseByToken(token);
  const property = await loadProperty(c.property_id);
  const partner = c.partner_id ? await loadPartner(c.partner_id) : null;
  const accepted = ["scheduled", "completed", "closed"].includes(c.status);
  const before = {
    status: c.status,
    partner: partner?.name ?? null,
    job_card: c.job_card,
    street: `${property.address}, ${property.postcode} ${property.city}`,
    building: { year: property.building_year, heating: property.heating, fuel: property.fuel },
    scope: c.scope,
    appointment: fmtSlot(c.appointment_start, c.appointment_end),
  };
  if (!accepted) return { ...before, accepted: false };
  const unit = c.unit_id ? await loadUnit(c.unit_id) : null;
  const contact = c.contact_id ? await loadContact(c.contact_id) : null;
  const photos = must<{ file_url: string | null }[]>(await db().from("documents").select("file_url").eq("case_id", c.case_id).eq("type", "photo"), "photos");
  const showAccess = c.status === "scheduled" && isAppointmentDay(c.appointment_start);
  return {
    ...before,
    accepted: true,
    flat: unit ? `${unit.unit_id} · floor ${unit.floor}` : null,
    tenant: contact ? { name: contact.name, phone: contact.phone } : null,
    access_notes: showAccess ? unit?.access_notes ?? null : c.status === "scheduled" ? "Visible on the appointment day." : "Hidden after the job.",
    photos: photos.map((p) => p.file_url),
  };
}

// ---------- demo reset ----------

/** Deletes demo cases (keeps the 2 historical ones) and re-creates free slots relative to now. */
export async function resetDemo() {
  await db().from("cases").update({ slot_id: null }).not("case_id", "like", "hist_%");
  await db().from("cases").delete().not("case_id", "like", "hist_%");
  await db().from("events").delete().gte("event_id", 0);
  await db().from("availability").delete().neq("slot_id", "");
  const ins = await db().from("availability").insert(slotTemplate());
  if (ins.error) throw new Error(ins.error.message);
  return { ok: true, slots: slotTemplate().map((s) => ({ ...s, label: fmtSlot(s.slot_start, s.slot_end) })) };
}