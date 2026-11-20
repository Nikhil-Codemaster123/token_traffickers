import { logEvent } from "./events";

export type Flow = "dispatch" | "tenant_update" | "manager_update" | "owner_approval" | "partner_cancel";
export type Channel = "whatsapp" | "email" | "portal";

/**
 * Sends a message out. NOTIFY_MODE=log only writes it to the case timeline (the demo works without n8n);
 * NOTIFY_MODE=n8n also POSTs it to your n8n webhook, which routes it to WhatsApp (Twilio) or email.
 */
export async function notify(msg: {
  flow: Flow;
  channel: Channel;
  case_id: string;
  unit_id?: string | null;
  to: { name: string; phone?: string | null; email?: string | null; language?: string | null };
  text: string;
  link?: string;
}) {
  let delivery = "logged";
  if (process.env.NOTIFY_MODE === "n8n" && process.env.N8N_WEBHOOK_URL) {
    try {
      const res = await fetch(process.env.N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(process.env.N8N_WEBHOOK_SECRET ? { "x-webhook-secret": process.env.N8N_WEBHOOK_SECRET } : {}),
        },
        body: JSON.stringify(msg),
      });
      delivery = res.ok ? "sent via n8n" : `n8n answered ${res.status}`;
    } catch {
      delivery = "n8n unreachable";
    }
  }
  const label = msg.channel === "whatsapp" ? "WhatsApp" : msg.channel === "email" ? "Email" : "Portal";
  await logEvent({
    case_id: msg.case_id,
    unit_id: msg.unit_id,
    type: `message.${msg.flow}`,
    actor: "system",
    channel: msg.channel,
    text: `${label} to ${msg.to.name}: ${msg.text}${msg.link ? ` → ${msg.link}` : ""} (${delivery})`,
  });
}
