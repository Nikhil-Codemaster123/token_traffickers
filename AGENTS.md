# AGENTS.md · Token Traffickers

## What this is
A hackathon build for MAIN Summit 2026, Reltix track "Plug a Partner into centrix". Reltix is an AI-native property manager. centrix is its platform: property managers and AI agents work side by side on one record per property, plus a portal for owners and tenants. Our job: plug in one partner, a heating craftsman, so a broken heater becomes a finished repair with zero forms.

Hand-in: Sat 21 Nov 10:30, the code (same version as the demo) plus a 3-minute video with a live demo. The demo must not break, so prefer small, safe changes.

## The flow
1. The tenant calls an ElevenLabs voice agent (web widget on /line). It asks the safety question, gives the data notice, offers a firm and 2 slots, and books. Its 5 server tools (agent/tools.md) call our API.
2. A case appears in /centrix. OpenAI turns the call into a job card. Under the owner's limit, the job goes to the firm automatically.
3. The craftsman gets a WhatsApp link to the job card: Accept, then Done + invoice PDF. OpenAI reads the invoice number and amount.
4. The tenant gets WhatsApp updates and taps "Yes, it works" in the portal. The case closes and a result JSON is written back to the unit.
5. A neighbour calling about the same building problem joins the existing case, so nothing is booked twice. A gas smell makes it an emergency with nothing booked.

## Stack
Next.js App Router + Tailwind on Vercel, Supabase (Postgres + realtime), OpenAI structured outputs, ElevenLabs Agents, n8n Cloud → Twilio WhatsApp sandbox + Gmail. NOTIFY_MODE=log writes messages only to the case timeline; NOTIFY_MODE=n8n also posts them to the n8n webhook.

## Demo data (all synthetic)
Musterstraße 12, 52062 Aachen: built 1972, gas central heating. Tenants Jonas Weber and his neighbour Aylin Demir, owner Maria Becker, firm Heizung Schmidt GmbH, owner's limit €3,500.

## Confirmed by Reltix
- Property managers approve repairs alone up to a limit agreed per owner, often €3–4k. Above it, the owner decides.
- Craftsmen get jobs via WhatsApp; long offers go by email.
- Heating is mostly central, often gas.
- Invoices under the limit go through Reltix.

## How we're judged
Demo quality 30% · user experience 25% (minimal effort for tenant, craftsman and manager) · feasibility & realism 20% (realistic data, consent and privacy, the partner side) · connector spec 15% · partner choice 10%. So keep taps and clicks to a minimum, show each party only the data it needs, and keep everyone updated.

## Rules
- Read README.md and docs/ first, and follow the existing patterns.
- `npm run build` must pass. No new dependencies.
- Never touch .env files or connect to a database. Schema changes go in an idempotent SQL file in supabase/, which we run by hand.
- "Reset demo data" must keep working.