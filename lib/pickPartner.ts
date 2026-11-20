import { db, must } from "./supabase";
import { fmtSlot } from "./time";
import type { CaseRow, Partner, Property, Slot } from "./types";

export type PickResult = {
  partner: Partner;
  reasons: string[];
  slots: Slot[]; // up to 2 free slots offered to the tenant
  rejected: { name: string; why: string }[];
};

/**
 * Picks the right craftsman from Reltix's own list with plain, explainable rules:
 * 1) right trade and fuel (gas or oil), 2) covers the postcode, then a score:
 *    the building's maintenance firm first, past jobs on the building, rating,
 *    and how soon the firm is free (weighted much more when the case is urgent).
 */
export async function pickPartner(c: CaseRow, opts: { after?: string } = {}): Promise<PickResult | null> {
  const property = must<Property>(
    await db().from("properties").select("*").eq("property_id", c.property_id).single(),
    "load property",
  );
  const partners = must<Partner[]>(await db().from("partners").select("*").eq("category", c.category), "load partners");

  const rejected: PickResult["rejected"] = [];
  const eligible = partners.filter((p) => {
    if (property.fuel && p.fuels.length > 0 && !p.fuels.includes(property.fuel)) {
      rejected.push({ name: p.name, why: `${p.fuels.join("/")} only, the building runs on ${property.fuel}` });
      return false;
    }
    if (p.postcodes.length > 0 && !p.postcodes.includes(property.postcode)) {
      rejected.push({ name: p.name, why: `doesn't cover ${property.postcode}` });
      return false;
    }
    return true;
  });
  if (eligible.length === 0) return null;

  const after = opts.after ? new Date(opts.after) : new Date();
  const slots = must<Slot[]>(
    await db()
      .from("availability")
      .select("*")
      .in("partner_id", eligible.map((p) => p.partner_id))
      .eq("booked", false)
      .gte("slot_start", after.toISOString())
      .order("slot_start"),
    "load slots",
  );
  const history = must<{ partner_id: string | null }[]>(
    await db().from("cases").select("partner_id").eq("property_id", c.property_id).eq("status", "closed"),
    "load history",
  );

  const urgent = c.urgency === "high" || c.urgency === "emergency";
  const scored = eligible
    .map((p) => {
      const own = slots.filter((s) => s.partner_id === p.partner_id);
      const first = own[0];
      const waitHours = first ? (new Date(first.slot_start).getTime() - Date.now()) / 36e5 : 999;
      const isMaintenance = property.maintenance_partner_id === p.partner_id;
      const pastJobs = history.filter((h) => h.partner_id === p.partner_id).length;
      let score = (p.rating ?? 4) * 2 + (isMaintenance ? 5 : 0) + Math.min(pastJobs, 3);
      score -= urgent ? waitHours : waitHours / 4;
      if (!first) score -= 100;
      return { p, own, first, isMaintenance, pastJobs, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best.first) return null;

  const reasons = [
    `${property.fuel} heating firm (the building has ${property.heating} ${property.fuel} heating)`,
    `covers ${property.postcode}`,
    ...(best.isMaintenance ? ["holds this building's maintenance contract"] : []),
    ...(best.pastJobs > 0 ? [`${best.pastJobs} past job${best.pastJobs > 1 ? "s" : ""} on this building`] : []),
    `free ${fmtSlot(best.first.slot_start, best.first.slot_end)}`,
    ...(best.p.rating ? [`rating ${best.p.rating}`] : []),
  ];
  for (const other of scored.slice(1)) {
    rejected.push({
      name: other.p.name,
      why: other.first ? `ranked lower, first free ${fmtSlot(other.first.slot_start, other.first.slot_end)}` : "no free slot",
    });
  }

  return { partner: best.p, reasons, slots: best.own.slice(0, 2), rejected };
}
