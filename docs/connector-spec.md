# centrix partner connector · Heating repairs

**Heizung Schmidt GmbH** (`p_schmidt`) maintains the central gas heating at Musterstraße 12 in Aachen. One boiler failure can leave several flats cold. With a heating firm connected, a tenant’s call becomes a booked visit, the firm accepts and invoices through one job link, and the tenant confirms the repair. A reported gas smell ends the booking flow and alerts the manager.

## Partner and services

Each `offers` entry has a `name` and optional `price_eur`, `per` and `note`. [Heating profile](../connectors/heating-schmidt.json) · [Seed records](../supabase/seed.sql)

| What the firm offers | Fields and demo values |
|---|---|
| Local coverage | `partners.category` = `heating`, `trades` = heating and plumbing, `fuels` = gas, `postcodes` = 52062, 52064, 52066. |
| Repair call-out and labour | `callout_fee_eur` = €59 per visit, `hourly_rate_eur` = €78, `response_time_h` = 4, `rating` = 4.6. |
| Annual boiler maintenance | The building’s `contracts` row has `type = service`, `partner_id = p_schmidt` and `terms.scope` “annual boiler maintenance”. |
| Larger repairs by quotation | `documents` stores `document_id`, `case_id`, `type` = `offer`, PDF `file_url`, `number` and gross `amount_eur`. |

## Eligibility and availability

`POST /api/agent/tools/pick_partner` takes JSON with `case_id` and optional earliest time `after`. Agent tools use the `x-agent-secret` header. [Selection rules](../lib/pickPartner.ts)

1. Match `partners.category` to `cases.category` (`trades` describes skills). Check the building’s `fuel` against `fuels` when both are supplied, then its `postcode` against any nonempty `postcodes` list.
2. Read eligible firms’ `availability` rows with `booked = false` and `slot_start` at or after the requested time (default now), earliest first.
3. Start each firm’s score at twice its `rating` (default 4). Add 5 for matching `properties.maintenance_partner_id` and 1 per closed case it handled at the property (max 3). Subtract a quarter of the hours until its first free slot, or the full number of hours for `high` or `emergency` urgency. A firm without a slot gets a 999-hour wait and a further 100-point penalty.
4. Offer up to two of the highest scorer’s earliest free slots, each with a `slot_id` and Berlin-time `label`. If no firm qualifies or the winner has no slot, the agent offers a manager callback within the hour.

At Musterstraße 12 the fuel check excludes oil-only Ölheizung Meyer. Schmidt earns 5 points for maintenance and 2 for its two previous repairs.

`POST /api/agent/tools/book_slot` takes JSON with `case_id` and the chosen `slot_id`. It sets `booked = true` only on a free row, saves `slot_id` and copies `slot_start` and `slot_end` to `appointment_start` and `appointment_end`. A competing booking gets `booked: false` and the agent offers another slot. Reset starts the demo schedule today if run before 10:00 Berlin time, otherwise tomorrow.

## Placing the job

The case links `case_id`, `property_id`, `unit_id` and `contact_id`. OpenAI uses `symptoms`, `scope`, `urgency`, building details and repair history to write `job_card` (`headline`, `problem_summary`, `urgency_reason`, `checklist`). A template supplies the card if generation fails.

Booking creates a random `cases.job_token`. Schmidt’s `job_channel` is WhatsApp. The dispatch message gives the headline, address, appointment and `/job/[token]` link. Its delivery fields are `flow` = `dispatch`, `channel` = `whatsapp`, `case_id`, `unit_id`, `to` (firm’s name, phone and email), `text` and `link`. `NOTIFY_MODE=log` records messages on the timeline. Configured n8n mode also sends them. Schmidt lists email for long offers (`offer_channel`). In the demo the firm uploads its PDF on the job card. [Delivery payload](../n8n/README.md)

**In production:** the dispatch goes out as a WhatsApp template from Reltix’s registered sender, with the job link as a variable. Twilio’s trial only allows fixed templates, so the demo logs messages on the timeline. Document links would be signed and expiring instead of public.

<div style="page-break-before: always"></div>

## Status updates back to centrix

| Partner request | Payload and case effect |
|---|---|
| **Accept** · `POST /api/job/[token]/accept` | Empty body. `dispatched` → `scheduled`. Logs `job.accepted` and confirms the appointment to all reporting tenants by WhatsApp. |
| **Propose a time** · `POST /api/job/[token]/propose` | JSON, e.g. `{"note":"Tomorrow 08:00–10:00"}`. Logs `job.time_proposed` for the manager to reschedule manually. |
| **Send offer** · `POST /api/job/[token]/offer` | From `scheduled`, send `multipart/form-data` with `file` (PDF, up to 4 MiB). OpenAI must read an offer number and positive gross total. centrix saves `offer_document_id` and `offer_approval_limit_eur`, logs `offer.received` and returns `ok` and `needsOwner`. |
| **Done + invoice** · `POST /api/job/[token]/done` | `multipart/form-data` with optional `note`, `file` (invoice PDF or photo), `number`, `amount_eur`. OpenAI reads missing invoice fields from the file when possible. The API accepts `scheduled` or `dispatched`, sets `completed`, logs `job.done` and `invoice.linked`, and asks tenants to confirm. |

## Approval and billing

| Decision | What centrix does |
|---|---|
| Estimate at booking | Schmidt’s estimate is €59 + 2 × €78 + €150 parts = **€365**. At or below the management contract’s `approval_limit_eur` (€3,500 here), centrix dispatches with `approval = auto`. Above it, centrix reserves the slot, sets `awaiting_approval` and emails the manager. The manager records the owner’s agreement via `POST /api/cases/[id]/approve`, dispatching with `approval = owner`. |
| Gross offer after Accept | Within the limit, the job stays `scheduled` and the firm gets a go-ahead. Above it, centrix logs `offer.approval_requested`, sets `approval = pending` and pauses completion in `awaiting_approval`. The owner gets a separate `/owner/[token]` link by email. `GET /api/owner/[token]` shows the PDF, total and limit. One **Approve** tap sends an empty `POST /api/owner/[token]`, logs `offer.approved`, sets `approval = owner`, restores `scheduled` and notifies the firm and reporting tenants. |
| Invoice recipient | At completion, `documents.billed_to` is `owner` when `cases.approval = owner`. All other invoices go to `reltix`. [Document and billing rules](../supabase/offer-approval.sql) |

## Consent and privacy

The agent gives a repair-specific notice. If the tenant objects, the manager arranges the visit. Otherwise `POST /api/agent/tools/record_consent` takes `case_id` and optional `contact_id`. The `consents` row records both IDs, `given_at`, `channel = voice`, `legal_basis = lease` and `data_shared` (`name`, `phone`, `unit`, `access_notes`, `photos`). The lease basis is a demo assumption.

| When the firm opens `GET /api/job/[token]` | Data returned |
|---|---|
| Before Accept | `status`, `accepted`, `waiting_for_owner`, `partner`, `job_card`, `street`, `building` (year, heating, fuel), `scope`, `appointment`. |
| After Accept | Adds `flat` (unit ID and floor), `tenant.name`, `tenant.phone` and `photos` (case photo URLs). These fields also appear during offer approval and on completed or closed jobs. |
| On the appointment day | The card reveals `units.access_notes` only while `scheduled` and the date matches `appointment_start` in Europe/Berlin. It hides the notes during owner review and after Done. |

The job link grants access to the card. The synthetic demo uses public document URLs. [Job card and status handlers](../lib/tools.ts)

<div style="page-break-before: always"></div>

## Result on the unit

Done writes `cases.result` with `unit_id`, `contact_id` and a `case` object containing `case_id`, `category`, `scope`, `partner`, `status`, `approval`, `appointment`, `invoice` and the latest `consent`. The tenant confirms via `POST /api/portal/[caseId]/confirm`. Sending `{"fixed":true}` closes the case and refreshes the result. Sending `{"fixed":false}` reopens it and alerts the manager. [Example result](../connectors/heating-schmidt.json)

## Next partner · Internet provider

Both partners use the same nine connector fields: Heizung Schmidt is live in the demo, and Example Fibre GmbH is a paper integration. [Connector schema](../connectors/schema.json) · [Heating profile](../connectors/heating-schmidt.json) · [Internet example](../connectors/internet-example-fibre.json)

| Connector field | Heating · Heizung Schmidt (live) | Internet · Example Fibre (paper) |
|---|---|---|
| `identity` | `p_schmidt`, category `heating`, `job_channel` = `whatsapp`. | `p_fibre`, category `internet`, `job_channel` = `api`. |
| `offers` | Call-out €59, labour €78 per hour, annual boiler maintenance, larger repairs by quotation. | Fibre 500 at €34.99 per month. |
| `eligibility` | Category `heating`, fuel `gas`, postcodes 52062, 52064, 52066. | The address is in the fibre area and the move-in date is known. |
| `availability` | Free `availability` slots; the two earliest are offered. | Offer the earliest activation date (`earliest_date`). |
| `data_needed` | The job card from the call; flat, tenant name, phone and photos after Accept; access notes on the appointment day. | Pre-fill tenant name, address and move-in date. |
| `consent_scope` | `name`, `phone`, `unit`, `access_notes`, `photos`, on the lease basis. | Share those three fields with the tenant’s explicit agreement (`tenant_yes`). |
| `order` | Booking a slot sends the WhatsApp job link (`/job/[token]`). | Submit the pre-filled order by API with the tenant’s one-click signature. |
| `status_updates` | `accept`, `propose`, `offer`, `done` with invoice. | Report `ordered`, `signed`, `active` or `cancelled`. |
| `result` | `cases.result` with the invoice and consent; the tenant’s confirmation closes the case. | Write a `service_contract` with consent to the unit. |

## Confirmed by Reltix and our assumptions

**Confirmed by Reltix (on site, 20 Nov)** · [Original notes](assumptions.md)

- Managers decide repairs alone up to a limit agreed per owner, most often €3–4k; above it, the owner is asked.
- Craftsmen get jobs mostly by WhatsApp; longer offers go by email.
- Heating is mostly central, often gas; 10–15% of buildings still use oil.
- Invoices below the limit mostly go through Reltix; some go to owners.

**Our assumptions**

- Reltix keeps its own list of craftsmen, with framework terms (rates, area, response time) and each building's maintenance firm.
- In Germany the signed lease covers sharing the data a repair needs, so we inform and log instead of asking for new consent.
- A repair's estimated cost comes from framework rates, so centrix can check it against the limit before dispatching.
- Craftsmen share free slots; when none fits, they propose a time on the job card.
- Tenants' phone numbers are on file, so callers are identified; an unknown number is checked by name and address.
- Access details (key safe code, caretaker) are stored in centrix and released only after Accept, on the appointment day.
- Craftsmen send invoices as PDF; we read number and amount with OpenAI.
- All data is synthetic and extends Reltix's sample payload.