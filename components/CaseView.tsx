"use client";

import Link from "next/link";
import { useState } from "react";
import { fmtTime } from "@/lib/time";
import { Timeline, type Ev } from "./Timeline";
import { btn, Card, linkClass, meta, Spinner, StatusChip } from "./ui";
import { post, usePoll } from "./usePoll";

type Doc = { document_id: string; type: string; file_url: string | null; number: string | null; amount_eur: number | null; billed_to: string | null };
type Manager = {
  case: {
    case_id: string;
    unit_id: string | null;
    scope: string;
    category: string;
    urgency: string;
    status: string;
    symptoms: string | null;
    availability_note: string | null;
    safety_flags: string[];
    reporters: string[];
    pick_reasons: string[];
    estimated_cost_eur: number | null;
    approval: string | null;
    offer_document_id: string | null;
    offer_approval_limit_eur: number | null;
    offer_resume_status: string | null;
    job_token: string | null;
    result: unknown;
    created_at: string;
  };
  property: { address: string; postcode: string; city: string; building_year: number | null; heating: string | null; fuel: string | null };
  unit: { unit_id: string; floor: number | null } | null;
  contact: { name: string; phone: string | null; language: string | null } | null;
  partner: { name: string; phone: string | null; rating: number | null } | null;
  appointment: string;
  approval_limit_eur: number;
  consent: { data_shared: string[]; legal_basis: string; given_at: string; channel: string } | null;
  documents: Doc[];
  events: Ev[];
  effort: { tenant_calls: number; craftsman_taps: number; manager_clicks: number; owner_clicks: number };
};

const STOPPABLE = ["booked", "dispatched", "scheduled", "awaiting_approval", "partner_picked"];

/** One case in centrix: what happened, why this firm, the money rule, the documents, and what was written back. */
export function CaseView({ id }: { id: string }) {
  const { data, error, reload } = usePoll<Manager>(`/api/cases/${id}?view=manager`, 2000);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function act(path: string) {
    setBusy(true);
    setActionError(null);
    try {
      await post(`/api/cases/${id}/${path}`);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) return <div className="centrix-page mx-auto max-w-6xl px-4 py-8 text-rose-800 sm:px-6 lg:px-8">{error}</div>;
  if (!data) return <div className="centrix-page mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><Spinner /></div>;

  const c = data.case;
  const offer = data.documents.find((d) => d.document_id === c.offer_document_id);
  const invoice = data.documents.find((d) => d.type === "invoice");
  const photos = data.documents.filter((d) => d.type === "photo" && d.file_url);

  return (
    <div className="centrix-page mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/centrix" className="rounded-sm text-sm font-medium text-indigo-700 hover:underline hover:underline-offset-4">← Inbox</Link>

      <header className="my-6 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 space-y-2 wrap-anywhere">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">centrix · mock · {c.case_id}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            {c.unit_id}{c.scope === "building" ? " · whole building" : ""} · <span className="capitalize">{c.category}</span>
          </h1>
          <p className="text-sm leading-6 text-slate-700">
            {data.property.address}, {data.property.postcode} {data.property.city} · {data.property.heating} {data.property.fuel} heating, built {data.property.building_year}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip status={c.status} waitingForOwner={!!c.offer_resume_status} />
          {STOPPABLE.includes(c.status) && (
            <button disabled={busy} onClick={() => act("stop")} className={btn.danger}>Stop dispatch</button>
          )}
        </div>
      </header>
      {actionError && <p className="mb-6 rounded-lg bg-rose-50 px-4 py-3 text-rose-800">{actionError}</p>}

      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card title="Reported by the tenant" aside={<span className="text-xs text-slate-500">{fmtTime(c.created_at)} · by phone</span>}>
            <p className="wrap-anywhere">{c.symptoms}</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
              <Field label="Tenant" value={data.contact ? `${data.contact.name}${c.reporters.length > 1 ? ` +${c.reporters.length - 1}` : ""}` : "—"} />
              <Field label="Urgency" value={c.urgency} />
              <Field label="Home" value={c.availability_note ?? "—"} />
              {c.safety_flags.length > 0 && <Field label="Safety" value={c.safety_flags.join(", ")} />}
            </dl>
          </Card>

          <Card title="Timeline" aside={<span className="text-xs text-slate-500">every call, message and change, on the unit</span>}>
            <Timeline events={data.events} />
          </Card>

          {Boolean(c.result) && (
            <Card title="Written back to centrix" aside={<span className="text-xs text-slate-500">unit · contact · case</span>}>
              <pre className="overflow-x-auto rounded-lg bg-slate-50 p-4 text-xs leading-5 text-slate-700">{JSON.stringify(c.result, null, 2)}</pre>
            </Card>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          <Card title="Effort for this repair" className="border-t-2 border-indigo-500">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-slate-100 pt-4">
              <Field row label={data.effort.tenant_calls > 1 ? "Tenants" : "Tenant"} value={plural(data.effort.tenant_calls, "call")} />
              <Field row label="Craftsman" value={plural(data.effort.craftsman_taps, "tap")} />
              <Field row label="Property manager" value={plural(data.effort.manager_clicks, "click")} />
              <Field row label="Owner" value={plural(data.effort.owner_clicks, "click")} />
            </dl>
          </Card>

          <Card title="Firm">
            {data.partner ? (
              <>
                <div className="font-medium text-slate-900">{data.partner.name}</div>
                <div className="mt-1 text-slate-600">{data.appointment || "no slot yet"}</div>
                <ul className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                  {c.pick_reasons.map((r) => <li key={r} className="flex gap-3"><span className="font-medium text-indigo-700">✓</span>{r}</li>)}
                </ul>
              </>
            ) : (
              <p className="text-sm text-slate-500">Not picked yet.</p>
            )}
          </Card>

          <Card title="Approval">
            {offer ? (
              <p className="text-sm">Offer {offer.number} <b>{euros.format(Number(offer.amount_eur))}</b> · owner&apos;s limit <b>{euros.format(c.offer_approval_limit_eur ?? data.approval_limit_eur)}</b></p>
            ) : c.estimated_cost_eur === null ? (
              <p className="text-sm text-slate-500">No estimate yet.</p>
            ) : (
              <p className="text-sm">Estimate <b>€{c.estimated_cost_eur}</b> · owner&apos;s limit <b>€{data.approval_limit_eur}</b></p>
            )}
            {c.approval === "owner" && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">Approved by the owner.</p>}
            {offer && Number(offer.amount_eur) <= (c.offer_approval_limit_eur ?? data.approval_limit_eur) && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">Within the limit. The firm can go ahead.</p>}
            {!offer && c.approval === "auto" && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">Under the limit: sent to the firm automatically.</p>}
            {!offer && c.approval === "manager" && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">Approved by the manager.</p>}
            {c.status === "awaiting_approval" && (
              <div className="mt-3 space-y-3">
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Above the limit: the owner has to agree first.</p>
                <button disabled={busy} onClick={() => act("approve")} className={btn.primary}>Owner agreed: approve</button>
              </div>
            )}
          </Card>

          <Card title="Documents">
            {!offer && !invoice && photos.length === 0 && <p className="text-sm text-slate-500">None yet.</p>}
            {offer?.file_url && <div className="mb-3"><a href={offer.file_url} target="_blank" rel="noreferrer" className={linkClass}>Open offer {offer.number}</a></div>}
            {invoice && (
              <div className="space-y-1">
                <div className="font-medium text-slate-900">Invoice {invoice.number ?? "(no number)"}</div>
                <div className="text-slate-600">
                  {invoice.amount_eur !== null ? `€${Number(invoice.amount_eur).toFixed(2)}` : "amount unread"} · billed to {invoice.billed_to === "reltix" ? "Reltix" : "the owner"}
                </div>
                {invoice.file_url && <a href={invoice.file_url} target="_blank" rel="noreferrer" className={linkClass}>Open file</a>}
              </div>
            )}
            {photos.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a key={p.document_id} href={p.file_url!} target="_blank" rel="noreferrer"><img src={p.file_url!} alt="Tenant photo" className="aspect-square w-full rounded-lg object-cover" /></a>
                ))}
              </div>
            )}
          </Card>

          <Card title="Data sharing">
            {data.consent ? (
              <p className="text-sm text-slate-700">
                Told by {data.consent.channel === "voice" ? "phone" : data.consent.channel} at {fmtTime(data.consent.given_at)}: {data.consent.data_shared.join(", ")} go to the firm for this repair (basis: {data.consent.legal_basis}).
              </p>
            ) : (
              <p className="text-sm text-slate-500">Not logged yet.</p>
            )}
          </Card>

          <Card title="Demo shortcuts">
            <div className="flex flex-col items-start gap-3">
              <Link href={`/portal/${c.case_id}`} target="_blank" className={linkClass}>Tenant portal ↗</Link>
              {c.job_token && <Link href={`/job/${c.job_token}`} target="_blank" className={linkClass}>Craftsman job card ↗</Link>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const euros = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Field({ label, value, row = false }: { label: string; value: string; row?: boolean }) {
  return row ? (
    <div className="flex min-w-0 flex-col-reverse justify-end gap-1">
      <dt className={meta}>{label}</dt>
      <dd className="text-2xl leading-8 font-semibold tracking-tight text-indigo-700 tabular-nums">{value}</dd>
    </div>
  ) : (
    <div className="min-w-0 space-y-1"><dt className={meta}>{label}</dt><dd className="font-medium wrap-anywhere text-slate-800">{value}</dd></div>
  );
}

