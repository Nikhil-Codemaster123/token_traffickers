import { db } from "./supabase";
import type { Partner } from "./types";

// Our assumption: estimate = call-out fee + 2 hours of labour + a parts allowance, from the framework rates.
const LABOUR_HOURS = 2;
const PARTS_ALLOWANCE_EUR = 150;

export function estimateCost(p: Pick<Partner, "callout_fee_eur" | "hourly_rate_eur">): number {
  return Math.round((p.callout_fee_eur ?? 60) + (p.hourly_rate_eur ?? 80) * LABOUR_HOURS + PARTS_ALLOWANCE_EUR);
}

/** Confirmed by Reltix: managers decide alone up to a limit agreed per owner (most often €3–4k). */
export async function approvalLimitFor(propertyId: string): Promise<number> {
  const { data } = await db()
    .from("contracts")
    .select("approval_limit_eur")
    .eq("type", "management")
    .eq("property_id", propertyId)
    .maybeSingle();
  return Number(data?.approval_limit_eur ?? 3500);
}

/** Under the limit the job goes out automatically; above it the owner must approve first. */
export function decideApproval(estimateEur: number, limitEur: number): "auto" | "pending" {
  return estimateEur <= limitEur ? "auto" : "pending";
}
