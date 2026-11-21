// Tenant messages in the tenant's language (German or English; anything else falls back to English).
// Partner and manager messages are in English so the jury can follow them on screen.

type Lang = "de" | "en";
const lang = (l?: string | null): Lang => (l === "de" ? "de" : "en");
const first = (name: string) => name.split(" ")[0];

export const tenantMsg = {
  booked: (l: string | null | undefined, name: string, partner: string, slot: string) =>
    lang(l) === "de"
      ? `Hallo ${first(name)}, wir haben ${partner} für ${slot} gebucht. Status, Fotos und Chat:`
      : `Hi ${first(name)}, we booked ${partner} for ${slot}. Status, photos and chat:`,
  joined: (l: string | null | undefined, name: string, partner: string | null, slot: string | null) =>
    lang(l) === "de"
      ? `Hallo ${first(name)}, das Problem ist schon gemeldet: die Heizung im ganzen Haus.${partner ? ` ${partner} kommt am ${slot}.` : ""} Updates:`
      : `Hi ${first(name)}, this is already reported: the heating for the whole building.${partner ? ` ${partner} is coming on ${slot}.` : ""} Updates:`,
  confirmed: (l: string | null | undefined, partner: string, slot: string) =>
    lang(l) === "de" ? `${partner} hat den Termin ${slot} bestätigt.` : `${partner} confirmed the appointment ${slot}.`,
  offerApproved: (l: string | null | undefined, partner: string) =>
    lang(l) === "de"
      ? `Die Reparatur wurde freigegeben. ${partner} kann jetzt loslegen.`
      : `The owner approved the repair. ${partner} can now go ahead.`,
  done: (l: string | null | undefined, partner: string) =>
    lang(l) === "de"
      ? `${partner} hat die Reparatur abgeschlossen. Funktioniert die Heizung wieder? Kurz bestätigen:`
      : `${partner} finished the repair. Is your heating working again? Please confirm:`,
  stopped: (l: string | null | undefined) =>
    lang(l) === "de"
      ? "Der Termin wurde von der Hausverwaltung angehalten. Wir melden uns gleich."
      : "The property manager paused this appointment. We'll be in touch shortly.",
};
