# Confirmed facts and assumptions

## Confirmed by Reltix (on site, 20 Nov)

- Managers decide repairs alone up to a limit agreed per owner, most often €3–4k; above it, the owner is asked.
- Craftsmen get jobs mostly by WhatsApp; longer offers go by email.
- Heating is mostly central, often gas; 10–15% of buildings still use oil.
- Invoices below the limit mostly go through Reltix; above it, sometimes straight to the owner.

## Our assumptions

- Reltix keeps its own list of craftsmen, with framework terms (rates, area, response time) and each building's maintenance firm.
- In Germany the signed lease covers sharing the data a repair needs, so we inform and log instead of asking for new consent.
- A repair's estimated cost comes from framework rates, so centrix can check it against the limit before dispatching.
- Craftsmen share free slots; when none fits, they propose a time on the job card.
- Tenants' phone numbers are on file, so callers are identified; an unknown number is checked by name and address.
- Access details (key safe code, caretaker) are stored in centrix and released only after Accept.
- Craftsmen send invoices as PDF; we read number and amount with OpenAI.
- All data is synthetic and extends Reltix's sample payload.

## Numbers we set for the demo (change in one place)

| What | Value | Where |
|---|---|---|
| Owner's approval limit | €3,500 | `contracts.approval_limit_eur` in `supabase/seed.sql` |
| Cost estimate | call-out fee + 2 h labour + €150 parts | `lib/approval.ts` |
| Free slots | relative to now: today if before 10:00 Berlin, else tomorrow | `slotTemplate()` in `lib/time.ts` |
| Firm ranking | maintenance firm +5, rating × 2, past jobs (max 3), minus hours to the first free slot (÷4 unless urgent) | `lib/pickPartner.ts` |
