# ElevenLabs agent setup (agent mode)

The agent talks; our API does the work. It calls 5 webhook tools on the deployed app (never localhost: ElevenLabs can't reach your laptop).

## 1. Agent

1. ElevenLabs → Agents → create a blank agent.
2. **System prompt:** paste the text from [`prompt.md`](prompt.md).
3. **First message** (suggestion, change freely): `Hello, property management line for Musterstraße 12. How can I help?`
4. **Language:** English, plus German as an additional language so it can switch.
5. **Dynamic variable:** `contact_id`, test placeholder `c_203` (Jonas Weber). The widget on `/line` passes the real value.
6. **LLM:** pick a fast model; the tools do the heavy lifting.
7. **Security → allowlist:** add `localhost:3000` and your Vercel domain, or the widget won't connect.
8. Copy the agent id into `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` and **redeploy** (`NEXT_PUBLIC_*` values are baked in at build time).

## 2. Tools (5 webhook tools)

Same for all 5:

| Setting | Value |
|---|---|
| Type | Webhook |
| Method | POST |
| URL | `https://YOUR-APP.vercel.app/api/agent/tools/<tool name>` |
| Header | `x-agent-secret` = your `AGENT_TOOL_SECRET` (store it as a secret) |
| Body | JSON, parameters below |

For `contact_id`, use the dynamic variable `{{contact_id}}` as the value instead of letting the LLM fill it.

### get_resident_context
Look up the caller: name, flat, building, heating type and open cases. Call it first in every call.

| Param | Type | Required | Description |
|---|---|---|---|
| contact_id | string | yes | dynamic variable `contact_id` |
| phone | string | no | Only if there is no contact_id |

### open_case
Open the repair case. With scope "building" it joins an already open building heating case instead of dispatching twice.

| Param | Type | Required | Description |
|---|---|---|---|
| contact_id | string | yes | dynamic variable `contact_id` |
| category | string | no | `heating` or `other` |
| scope | string | no | `unit` or `building` |
| symptoms | string | yes | One English sentence |
| urgency | string | no | `low`, `normal` or `high` |
| safety_flags | string | no | Comma-separated: gas_smell, co_alarm, fire, flooding. Empty if none. |
| availability_note | string | no | When the tenant is home, in their words |

### record_consent
Log that you told the caller which data is shared with the firm (name, phone, flat, access details, photos).

| Param | Type | Required | Description |
|---|---|---|---|
| case_id | string | yes | From open_case |
| contact_id | string | no | dynamic variable `contact_id` |

### pick_partner
Pick the right heating firm for this building and get 2 free slots to offer.

| Param | Type | Required | Description |
|---|---|---|---|
| case_id | string | yes | From open_case |
| after | string | no | Earliest time the tenant is home: `HH:MM` or `tomorrow`. Leave out if any time works. |

### book_slot
Book the slot the caller chose. Under the owner's limit the job goes to the firm automatically.

| Param | Type | Required | Description |
|---|---|---|---|
| case_id | string | yes | From open_case |
| slot_id | string | yes | From pick_partner |

## 3. Test

1. Hub (`/`) → **Reset demo data**.
2. `/line` → caller Jonas Weber → start the call in the widget.
3. Keep `/centrix` open next to it: the case, messages and dispatch appear live.

Quick check of a tool without the agent:

```bash
curl -X POST https://YOUR-APP.vercel.app/api/agent/tools/get_resident_context \
  -H "content-type: application/json" -H "x-agent-secret: $AGENT_TOOL_SECRET" \
  -d '{"contact_id":"c_203"}'
```

If ElevenLabs Agents isn't on your key, leave `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` empty: `/line` then runs the fallback loop (browser speech → `/api/chat` with the same 5 tools → ElevenLabs text-to-speech, or the browser's voice).
