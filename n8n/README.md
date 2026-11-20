# n8n: message delivery

The app decides who gets which message and when, and writes every message to the case timeline first. With `NOTIFY_MODE=n8n` it also POSTs each one to a single n8n webhook, which delivers it by WhatsApp (Twilio sandbox) or email. If n8n is down, the screens keep working and the timeline shows `(n8n unreachable)`.

## What n8n receives

```json
{
  "flow": "dispatch",
  "channel": "whatsapp",
  "case_id": "case_4c34f988",
  "unit_id": "unit_2a",
  "to": { "name": "Heizung Schmidt GmbH", "phone": "+49 151 00000101", "email": "auftrag@heizung-schmidt.example" },
  "text": "New job: Building heating not working. Musterstraße 12, 52062 Aachen. Slot Sat 21 Nov, 12:00–14:00. Open the job card:",
  "link": "https://YOUR-APP.vercel.app/job/ZNis-IWmI81Z"
}
```

`flow` is one of `dispatch` (to the firm), `tenant_update` (booked, joined, confirmed, done, paused), `manager_update`, `owner_approval`, `partner_cancel`. `channel` is `whatsapp` or `email`.

## Workflow (4 nodes)

1. **Webhook**
   - HTTP method POST, path `centrix-messages`
   - Authentication: Header Auth, name `x-webhook-secret`, value = your `N8N_WEBHOOK_SECRET`
   - Respond: Immediately
   - Activate the workflow and put the **Production URL** in `N8N_WEBHOOK_URL` (the Test URL only works while n8n is listening).
2. **Switch** on `{{ $json.body.channel }}`: `whatsapp` → Twilio, `email` → Send Email.
   For the video, a second Switch on `{{ $json.body.flow }}` (dispatch / tenant_update / manager_update) makes the branches read well on screen.
3. **Twilio** (Send SMS)
   - From: `+14155238886` (Twilio WhatsApp sandbox), **To Whatsapp: on**
   - To: your own phone that joined the sandbox. The seeded numbers are fake, so in the demo every WhatsApp goes to you.
   - Message: `For {{ $json.body.to.name }}: {{ $json.body.text }} {{ $json.body.link }}`
4. **Send Email** (SMTP or Gmail)
   - To: your demo inbox
   - Subject: `{{ $json.body.flow }} · {{ $json.body.case_id }}`
   - Text: `{{ $json.body.text }} {{ $json.body.link }}`

Twilio sandbox: Twilio Console → Messaging → Try it out → Send a WhatsApp message, then send the `join <code>` message from your phone to +1 415 523 8886.

Links in messages use `APP_BASE_URL`: set it to the Vercel URL so they open on a phone.

## Optional: replies from WhatsApp

`POST /api/hooks/n8n` with header `x-webhook-secret` and body `{ "job_token": "...", "action": "accept" | "propose", "note": "..." }` accepts a job or logs a proposed time, e.g. from a Twilio inbound webhook. Not needed for the demo: the craftsman taps the job link.
