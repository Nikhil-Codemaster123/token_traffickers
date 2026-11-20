# Connector spec: plugging a partner into centrix

A partner plugs in by filling 9 fields: the 5 Reltix asks for, plus identity, data needed, consent scope and the result written back. Machine-readable: [`connectors/schema.json`](../connectors/schema.json), one file per partner next to it.

| Field | What the partner provides | Heating firm (built) | Internet provider (paper example) |
|---|---|---|---|
| identity | name, category, job and offer channels | Heizung Schmidt GmbH, heating; WhatsApp for jobs, email for offers | Example Fibre GmbH, internet, API |
| offers or services | what can be booked or bought, with prices | repair call-out, maintenance at framework rates; bigger jobs as an offer by email | Fibre 500, €34.99 a month |
| eligibility rules | when the partner fits | heating trade for the building's fuel (gas or oil); postcodes it covers, e.g. 52062 | address in its fibre area; move-in date known |
| availability | when it can deliver | free slots, or a proposed time on the job card | earliest activation date |
| data needed | fields pre-filled from centrix | address, flat, heating type and fuel, building year, symptoms, photos, access notes | name, address, move-in date |
| consent scope | fields shared with the partner, and on what basis | name, phone, flat, access notes, photos; covered by the lease | name, address, move-in date; the tenant's yes |
| order or job | how centrix places it | WhatsApp job card link; Accept or propose a time | order with pre-filled fields, signed in one click |
| status updates | events back to centrix | accepted, scheduled, offer sent, done, invoiced, cancelled | ordered, signed, active, cancelled |
| result written back | what lands on the unit | completed case, appointment, invoice billed to Reltix | service_contract with consent |

## Where each field lives in this repo (heating firm)

| Field | Code |
|---|---|
| identity, offers | `partners` table (`supabase/seed.sql`), `connectors/heating-schmidt.json` |
| eligibility | `lib/pickPartner.ts`: trade + fuel + postcode filter, then maintenance firm, past jobs, rating, first free slot |
| availability | `availability` table; `book_slot` books atomically; "Propose another time" on the job card |
| data needed, consent scope | `jobView()` in `lib/tools.ts`: staged release; `consents` table |
| order | `dispatchJob()`: job card (OpenAI) + WhatsApp link via `notify()` |
| status updates | `events` table: `job.accepted`, `job.time_proposed`, `job.done`, `invoice.linked`, `job.stopped` |
| result written back | `buildResult()` → `cases.result` |

## Example result (heater flow, synthetic values)

Same shape as Reltix's sample payload (unit, contact, then what happened):

```json
{
  "unit_id": "unit_2a",
  "contact_id": "c_203",
  "case": {
    "case_id": "case_4c34f988",
    "category": "heating",
    "scope": "building",
    "partner": "Heizung Schmidt GmbH",
    "status": "closed",
    "approval": "auto",
    "appointment": { "start": "2026-11-21T12:00:00+01:00", "end": "2026-11-21T14:00:00+01:00" },
    "invoice": { "number": "R-2026-1121", "amount_eur": 318.4, "billed_to": "reltix", "document_id": "doc_47d382b3" },
    "consent": {
      "data_shared": ["name", "phone", "unit", "access_notes", "photos"],
      "legal_basis": "lease",
      "given_at": "2026-11-20T17:32:03+01:00",
      "channel": "voice"
    }
  }
}
```
