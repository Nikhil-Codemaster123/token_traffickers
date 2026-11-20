// All times are shown in Berlin time (the demo building is in Aachen).
const TZ = "Europe/Berlin";

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

const locale = (lang?: string | null) => (lang === "de" ? "de-DE" : "en-GB");

export function fmtDay(iso: string | null | undefined, lang?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const otherYear = d.getFullYear() !== new Date().getFullYear();
  return new Intl.DateTimeFormat(locale(lang), {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(otherYear ? { year: "numeric" } : {}),
  }).format(d);
}

/** "Sat 21 Nov, 12:00–14:00" (or German for German-speaking tenants: "Sa., 21. Nov., 12:00–14:00") */
export function fmtSlot(start: string | null | undefined, end: string | null | undefined, lang?: string | null): string {
  if (!start || !end) return "";
  return `${fmtDay(start, lang)}, ${fmtTime(start)}–${fmtTime(end)}`;
}

export function berlinDate(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso)); // YYYY-MM-DD
}

/** True when the appointment is today (Berlin): access notes are only visible on that day. */
export function isAppointmentDay(appointmentStart: string | null | undefined): boolean {
  if (!appointmentStart) return false;
  return berlinDate(appointmentStart) === berlinDate(new Date());
}

/** Free-slot template relative to now. Day 0 = today if before 10:00 Berlin, else tomorrow. */
export function slotTemplate(now = new Date()): { slot_id: string; partner_id: string; slot_start: string; slot_end: string }[] {
  const berlinHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(now));
  const day0 = berlinDate(now);
  const base = new Date(`${day0}T00:00:00+01:00`); // November = CET (UTC+1)
  if (berlinHour >= 10) base.setUTCDate(base.getUTCDate() + 1);
  const at = (dayOffset: number, hour: number) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + dayOffset);
    d.setUTCHours(d.getUTCHours() + hour);
    return d.toISOString();
  };
  return [
    { slot_id: "s_schmidt_1", partner_id: "p_schmidt", slot_start: at(0, 12), slot_end: at(0, 14) },
    { slot_id: "s_schmidt_2", partner_id: "p_schmidt", slot_start: at(0, 16), slot_end: at(0, 18) },
    { slot_id: "s_schmidt_3", partner_id: "p_schmidt", slot_start: at(1, 10), slot_end: at(1, 12) },
    { slot_id: "s_klein_1", partner_id: "p_klein", slot_start: at(0, 10), slot_end: at(0, 12) },
    { slot_id: "s_klein_2", partner_id: "p_klein", slot_start: at(0, 14), slot_end: at(0, 16) },
    { slot_id: "s_meyer_1", partner_id: "p_meyer", slot_start: at(0, 9), slot_end: at(0, 11) },
  ];
}

/** The agent's "after": "HH:MM" (today, Berlin), "tomorrow", or an ISO time. Never earlier than now. */
export function parseAfter(after?: string | null, now = new Date()): string | undefined {
  if (!after) return undefined;
  const a = after.trim().toLowerCase();
  const today = berlinDate(now);
  let d: Date | null = null;
  if (a === "tomorrow" || a === "morgen") {
    d = new Date(`${today}T00:00:00+01:00`);
    d.setUTCDate(d.getUTCDate() + 1);
  } else {
    const m = a.match(/^(\d{1,2})(?:[:.h](\d{2}))?$/);
    d = m ? new Date(`${today}T${m[1].padStart(2, "0")}:${m[2] ?? "00"}:00+01:00`) : new Date(after);
    // "home from 16:00" said in the evening means tomorrow from 16:00
    if (m && d.getTime() < now.getTime()) d.setUTCDate(d.getUTCDate() + 1);
  }
  if (Number.isNaN(d.getTime())) return undefined;
  return new Date(Math.max(d.getTime(), now.getTime())).toISOString();
}
