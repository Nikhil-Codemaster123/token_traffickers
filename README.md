# Broken heater → craftsman · a partner plugged into centrix

Token Traffickers · MAIN Summit hackathon · Reltix track ("Plug a Partner into centrix").

A tenant reports "no heating" in one call. The voice agent opens the case, picks the right heating firm from Reltix's own list, and books a slot. Under the owner's limit the job goes to the firm by WhatsApp without a click. The craftsman accepts, finishes, and uploads the invoice; the result lands on the unit in centrix. That's 1 call for the tenant, 3 taps for the craftsman and 0 clicks for the manager.

All data is synthetic and extends Reltix's sample payload (Musterstraße 12, Aachen).

## Screens

| URL | Who | What |
|---|---|---|
| `/` | team | Links, active modes, **Reset demo data** |
| `/line` | tenant | The phone call: ElevenLabs widget, or the fallback voice loop. Shows the case live next to it |
| `/centrix` | property manager | Inbox of cases (mock of centrix), refreshes every 2 s |
| `/centrix/case/[id]` | property manager | Timeline, firm and reasons, estimate vs owner's limit, Stop / Approve, invoice, data sharing, result written back, effort counter |
| `/portal/[caseId]` | tenant (WhatsApp link) | Status, appointment, photo, note, "Is it working again?" |
| `/job/[token]` | craftsman (WhatsApp link) | Job card; flat, name, phone after Accept; access notes on the appointment day only; Done + invoice |

## How it fits together

```
tenant ── voice ──▶ ElevenLabs agent ──▶ POST /api/agent/tools/*  (5 tools, header x-agent-secret)
                    (or fallback: browser speech → /api/chat → OpenAI + same tools → /api/tts)
                                              │
                                              ▼
                          Supabase Postgres: cases, events, consents, documents …
                                              │ book_slot under the owner's limit
                                              ▼
                      dispatchJob(): OpenAI job card → notify() → timeline (+ n8n → WhatsApp / email)
                                              │
            craftsman /job/[token]: Accept → Done + invoice (OpenAI reads number + amount)
                                              │
                         result JSON written to the case · tenant confirms on /portal
```

- **Logic lives in the app** (`lib/tools.ts`). n8n only delivers messages, so the screens never wait on it and the demo runs with `NOTIFY_MODE=log`.
- **Screens poll our own API** every 2–3 s. No Supabase keys in the browser.
- **OpenAI** (Responses API, structured outputs): the job card, reading the invoice, and the fallback agent loop. If a call fails, a template job card is used and the invoice fields typed by the craftsman count.
- Differences from the build spec: polling instead of Supabase Realtime, plain Tailwind instead of shadcn/ui, and the OpenAI steps run in the app instead of in n8n.

## Setup (about 20 minutes)

1. **Supabase:** create a project → SQL editor → run `supabase/schema.sql`, then `supabase/seed.sql` (both safe to re-run). Project Settings → API: copy the URL and the `service_role` key (or the new secret key, `sb_secret_…`).
2. **Env:** `cp .env.example .env.local` and fill it in. Minimum: Supabase, `OPENAI_API_KEY`, `AGENT_TOOL_SECRET`.
3. **Run:** `npm install && npm run dev` → http://localhost:3000 → enter `AGENT_TOOL_SECRET` → **Reset demo data** → `/line`. Typing into the fallback loop works with just the OpenAI key.
4. **Deploy:** push to GitHub → import into Vercel → add the same env vars, with `APP_BASE_URL` = your Vercel URL → deploy.
5. **Voice agent:** follow [`agent/tools.md`](agent/tools.md), then set `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` and redeploy.
6. **WhatsApp / email (optional):** follow [`n8n/README.md`](n8n/README.md), then set `NOTIFY_MODE=n8n`.

Node 20.9+ (Next.js 16). `npm run build` must pass before you deploy.

## Dry run (the demo story)

1. `/` → **Reset demo data**. Do this before every run: slots are created relative to now (today if before 10:00 Berlin time, otherwise tomorrow).
2. `/line`, caller **Jonas Weber** → call: radiators cold since this morning, neighbours too, no gas smell, home from 12. Pick the first slot.
3. `/centrix` → open the case: reasons for the firm, "sent to the firm automatically", WhatsApp messages in the timeline.
4. Timeline → craftsman link → **Accept** (flat and phone unlock) → one line + invoice PDF → **Mark as done**.
5. Timeline → tenant link → **Yes, it works** → case closed, result JSON on the case.
6. Bonus: caller **Aylin Demir**, same problem → joins the open building case, no second dispatch.
7. Gas test: "I smell gas" → leave the flat, call 112, emergency case, nothing booked.
8. Above the limit: in Supabase run `update contracts set approval_limit_eur = 100 where type = 'management';` → book → **Needs approval** → approve. Set it back to 3500 afterwards.

## Repo map

| Path | What |
|---|---|
| `lib/tools.ts` | Everything that happens: the 5 agent tools, dispatch, accept, done, confirm, stop, approve, read models, reset |
| `lib/pickPartner.ts` | Which firm and why (fuel, postcode, maintenance firm, past jobs, rating, first free slot) |
| `lib/approval.ts` | Estimate and owner's limit |
| `lib/agentPrompt.ts`, `lib/agentTools.ts` | Agent prompt and tool definitions (shared by both voice modes) |
| `lib/notify.ts`, `lib/messages.ts` | Outgoing messages (timeline, optional n8n); tenant texts in German or English |
| `app/api/**` | Route handlers (thin wrappers around `lib/tools.ts`) |
| `components/**` | Screens (client components) |
| `supabase/` | Schema and seed |
| `agent/`, `n8n/` | ElevenLabs and n8n setup |
| `connectors/`, `docs/connector-spec.md` | Connector spec: schema, the heating firm (built), the internet provider (paper example) |
| `docs/assumptions.md` | Confirmed by Reltix vs our assumptions, and the numbers we set |

## Tested before handover

`npm run build` passes. The whole story ran end to end against a local Postgres with PostgREST in place of Supabase: booking, auto-dispatch, double booking blocked, second caller joining, staged data on the job card, invoice linked and billed to Reltix, result written back, approval, stop and emergency paths, photo and note uploads. Screens were rendered in headless Chrome with no console errors.

Not tested here: real OpenAI calls (no key in the build environment, so the fallbacks ran), ElevenLabs, n8n and Supabase Storage.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Agent tools answer 401 | `x-agent-secret` header ≠ `AGENT_TOOL_SECRET` |
| Agent can't reach the tools | Tool URLs must be the public Vercel URL, not localhost |
| Widget doesn't appear | Add your domains to the agent's allowlist; redeploy after setting `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` |
| "No suitable firm is free" | Reset demo data (slots are in the past) |
| Links in messages open localhost | Set `APP_BASE_URL` to the Vercel URL |
| OpenAI "model not found" | Set `OPENAI_MODEL_FAST` / `OPENAI_MODEL_AGENT` to a model your key has, e.g. `gpt-6-sol` |
| Mic does nothing | Speech recognition needs Chrome or Edge; typing always works |

## Demo-only shortcuts

No logins: the portal, job card and manager buttons are open, and `/api/chat` and `/api/tts` spend your API credits. Fine for synthetic data during the event; take the deployment down or rotate the keys afterwards.
