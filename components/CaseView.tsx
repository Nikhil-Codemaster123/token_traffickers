"use client";

import Link from "next/link";
import { useState } from "react";
import { fmtTime } from "@/lib/time";
import { Timeline, type Ev } from "./Timeline";
import { btn, Card, CentrixHeader, EmptyState, Icon, iconTile, linkClass, meta, OfferLimitBar, pageWidth, Spinner, StatusChip, surface } from "./ui";
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

  if (error && !data) return (
    <div className="centrix-page">
      <CentrixHeader caseId={id} />
      <div className={`${pageWidth} py-8`}>
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-rose-800 ring-1 ring-rose-200 ring-inset">{error}</p>
      </div>
    </div>
  );
  if (!data) return (
    <div className="centrix-page">
      <CentrixHeader caseId={id} />
      <div className={`${pageWidth} py-8`}>
        <div className={`${surface} p-5`}><Spinner /></div>
      </div>
    </div>
  );

  const c = data.case;
  const offer = data.documents.find((d) => d.document_id === c.offer_document_id);
  const invoice = data.documents.find((d) => d.type === "invoice");
  const photos = data.documents.filter((d) => d.type === "photo" && d.file_url);

  return (
    <div className="centrix-page">
      <CentrixHeader caseId={c.case_id} />
      <div className={`${pageWidth} space-y-6 py-4 sm:pb-8`}>
        <header className="space-y-2">
          <Link href="/centrix" className="inline-flex min-h-11 items-center rounded-lg px-2 -ml-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100 motion-safe:transition-colors motion-safe:duration-150">← Inbox</Link>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <div className="min-w-0 flex-[1_1_25rem] space-y-2 wrap-anywhere">
              <h1 className="text-2xl leading-tight font-semibold tracking-tight text-slate-950 sm:text-3xl">
                {c.unit_id}{c.scope === "building" ? " · whole building" : ""} · <span className="capitalize">{c.category}</span>
              </h1>
              <p className="text-sm leading-6 text-slate-600">
                {data.property.address}, {data.property.postcode} {data.property.city} · {data.property.heating} {data.property.fuel} heating, built {data.property.building_year}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusChip status={c.status} waitingForOwner={!!c.offer_resume_status} />
              {STOPPABLE.includes(c.status) && (
                <button disabled={busy} onClick={() => act("stop")} className={btn.danger}>Stop dispatch</button>
              )}
            </div>
          </div>
        </header>
        {actionError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-rose-800 ring-1 ring-rose-200 ring-inset">{actionError}</p>}

        <RepairJourney
          status={c.status}
          resumeStatus={c.offer_resume_status}
          hasOffer={Boolean(offer)}
          ownerApproved={c.approval === "owner"}
          events={data.events}
        />

        <Card title={<span className="flex items-center gap-3"><span className={iconTile}><Icon name="activity" /></span>Effort for this repair</span>} className="bg-linear-to-br from-slate-50 via-slate-50 to-indigo-100/75">
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <Field row label={data.effort.tenant_calls > 1 ? "Tenants" : "Tenant"} value={plural(data.effort.tenant_calls, "call")} />
            <Field row label="Craftsman" value={plural(data.effort.craftsman_taps, "tap")} />
            <Field row label="Property manager" value={plural(data.effort.manager_clicks, "click")} />
            <Field row label="Owner" value={plural(data.effort.owner_clicks, "click")} />
          </dl>
        </Card>

        <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-6">
            <Card title="Reported by the tenant" aside={<span className="text-xs text-slate-500">{fmtTime(c.created_at)} · by phone</span>}>
              <p className="text-pretty wrap-anywhere text-slate-800">{c.symptoms}</p>
              <dl className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-[#B6C0CA] p-4 ring-1 ring-slate-900/5 sm:grid-cols-3">
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
                <pre className="overflow-x-auto rounded-xl bg-[#B6C0CA] p-4 text-xs leading-5 text-slate-700 ring-1 ring-slate-900/5">{JSON.stringify(c.result, null, 2)}</pre>
              </Card>
            )}
          </div>

          <div className="min-w-0 space-y-6">
            <Card title="Firm">
              {data.partner ? (
                <>
                  <div className="flex items-start gap-3 rounded-xl bg-indigo-50/70 p-3">
                    <span className={iconTile}><Icon name="calendar" /></span>
                    <div className="min-w-0 wrap-anywhere">
                      <div className="font-semibold text-slate-950">{data.partner.name}</div>
                      <div className="text-sm text-slate-600">{data.appointment || "no slot yet"}</div>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {c.pick_reasons.map((r) => <li key={r} className="flex gap-3 wrap-anywhere"><span className="font-semibold text-indigo-700">✓</span>{r}</li>)}
                  </ul>
                </>
              ) : (
                <EmptyState>Not picked yet.</EmptyState>
              )}
            </Card>

            <Card title="Approval">
              {offer ? (
                <div className="space-y-4 rounded-xl bg-[#B6C0CA] p-3 ring-1 ring-slate-900/5">
                  <p className="approval-amounts">
                    <span>Offer {offer.number} <b>{euros.format(Number(offer.amount_eur))}</b></span>
                    <span> · </span>
                    <span>owner&apos;s limit <b>{euros.format(c.offer_approval_limit_eur ?? data.approval_limit_eur)}</b></span>
                  </p>
                  <OfferLimitBar amount={Number(offer.amount_eur)} limit={c.offer_approval_limit_eur ?? data.approval_limit_eur} />
                </div>
              ) : c.estimated_cost_eur === null ? (
                <EmptyState>No estimate yet.</EmptyState>
              ) : (
                <p className="approval-amounts rounded-xl bg-[#B6C0CA] p-3 ring-1 ring-slate-900/5">
                  <span>Estimate <b>€{c.estimated_cost_eur}</b></span>
                  <span> · </span>
                  <span>owner&apos;s limit <b>€{data.approval_limit_eur}</b></span>
                </p>
              )}
              {c.approval === "owner" && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">Approved by the owner.</p>}
              {offer && Number(offer.amount_eur) <= (c.offer_approval_limit_eur ?? data.approval_limit_eur) && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">Within the limit. The firm can go ahead.</p>}
              {!offer && c.approval === "auto" && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">Under the limit: sent to the firm automatically.</p>}
              {!offer && c.approval === "manager" && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">Approved by the manager.</p>}
              {c.status === "awaiting_approval" && (
                <div className="mt-3 space-y-3">
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Above the limit: the owner has to agree first.</p>
                  <button disabled={busy} onClick={() => act("approve")} className={`${btn.primary} w-full`}>Owner agreed: approve</button>
                </div>
              )}
            </Card>

            <Card title="Documents">
              {!offer && !invoice && photos.length === 0 && <EmptyState>None yet.</EmptyState>}
              {offer?.file_url && <div className="mb-3"><a href={offer.file_url} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex min-h-11 items-center gap-2 wrap-anywhere`}><Icon name="document" />Open offer {offer.number}</a></div>}
              {invoice && (
                <div className="space-y-1">
                  <div className="font-medium text-slate-900">Invoice {invoice.number ?? "(no number)"}</div>
                  <div className="text-slate-600">
                    {invoice.amount_eur !== null ? `€${Number(invoice.amount_eur).toFixed(2)}` : "amount unread"} · billed to {invoice.billed_to === "reltix" ? "Reltix" : "the owner"}
                  </div>
                  {invoice.file_url && <a href={invoice.file_url} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex min-h-11 items-center gap-2`}><Icon name="document" />Open file</a>}
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
                <EmptyState>Not logged yet.</EmptyState>
              )}
            </Card>

            <Card title="Demo shortcuts">
              <div className="divide-y divide-slate-100">
                <Link href={`/portal/${c.case_id}`} target="_blank" className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 font-semibold text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100 motion-safe:transition-colors motion-safe:duration-150">Tenant portal <span>↗</span></Link>
                {c.job_token && <Link href={`/job/${c.job_token}`} target="_blank" className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 font-semibold text-indigo-700 hover:bg-indigo-50 active:bg-indigo-100 motion-safe:transition-colors motion-safe:duration-150">Craftsman job card <span>↗</span></Link>}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

const euros = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const repairStage: Record<string, number> = {
  booked: 1, dispatched: 1, awaiting_approval: 1, scheduled: 2,
  completed: 3, reopened: 3, closed: 4,
};

function RepairJourney({ status, resumeStatus, hasOffer, ownerApproved, events }: {
  status: string;
  resumeStatus: string | null;
  hasOffer: boolean;
  ownerApproved: boolean;
  events: Ev[];
}) {
  let reached = repairStage[resumeStatus ?? status] ?? 0;
  if (status === "stopped") {
    if (events.some((e) => e.type === "job.accepted")) reached = 2;
    else if (events.some((e) => e.type === "slot.booked" || e.type === "job.dispatched")) reached = 1;
  }

  const waiting = status === "awaiting_approval" && hasOffer && !!resumeStatus;
  const interrupted = ["stopped", "emergency", "reopened"].includes(status);
  const steps = [
    { label: "Reported", icon: "phone", done: true, active: reached === 0 },
    { label: "Firm booked", icon: "calendar", done: reached >= 1, active: reached === 1 },
    { label: "Accepted", icon: "clipboard", done: reached >= 2, active: reached === 2 && !waiting },
    ...(hasOffer ? [{ label: "Owner approval", icon: "shield" as const, done: ownerApproved, active: waiting }] : []),
    { label: "Done", icon: "wrench", done: reached >= 3, active: reached === 3 },
    { label: "Confirmed", icon: "user", done: reached >= 4, active: reached === 4 },
  ] as const;

  return (
    <ol className={`${surface} flex flex-col px-4 py-4 sm:flex-row sm:px-6`}>
      {steps.map(({ label, icon, done, active }) => {
        const current = active && !interrupted;
        const skipped = icon === "shield" && !ownerApproved && !resumeStatus;
        return (
          <li key={label} aria-current={current ? "step" : undefined} aria-label={skipped ? `${label} (within the limit)` : done ? `${label} (complete)` : undefined} className={`relative flex min-w-0 items-center gap-3 pb-2 before:absolute before:top-4 before:left-[15px] before:h-full before:w-px last:pb-0 last:before:hidden sm:flex-1 sm:flex-col sm:gap-2 sm:px-1 sm:pb-0 sm:text-center sm:before:left-1/2 sm:before:h-px sm:before:w-full ${done || skipped ? "before:bg-indigo-200" : "before:bg-slate-200"}`}>
            <span className={`relative grid size-8 shrink-0 place-items-center rounded-full ring-1 ring-inset ${current && waiting ? "bg-amber-50 text-amber-800 ring-amber-300" : done ? "bg-indigo-50 text-indigo-700 ring-indigo-200" : "bg-[#B6C0CA] text-slate-500 ring-slate-300"} ${current ? "outline-2 outline-offset-2 outline-indigo-400" : ""}`}>
              {skipped ? <span aria-hidden="true" className="h-px w-2 bg-current" /> : <Icon name={done ? "check" : icon} />}
            </span>
            <span className={`text-xs leading-4 ${done || current ? "font-semibold text-slate-900" : "text-slate-500"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Field({ label, value, row = false }: { label: string; value: string; row?: boolean }) {
  if (row) {
    const [count, ...unit] = value.split(" ");
    return (
              <div className="flex min-w-0 flex-col-reverse justify-end gap-2 rounded-xl bg-[#B6C0CA]/80 px-3 py-4 ring-1 ring-indigo-900/10 sm:px-4">
        <dt className={meta}>{label}</dt>
        <dd className="text-sm leading-5 font-medium text-indigo-800">
          <span className="text-3xl leading-none font-semibold tracking-tight text-indigo-900 tabular-nums sm:text-[2.5rem]">{count}</span> {unit.join(" ")}
        </dd>
      </div>
    );
  }
  return (
    <div className="min-w-0 space-y-1"><dt className={meta}>{label}</dt><dd className="font-medium wrap-anywhere text-slate-800">{value}</dd></div>
  );
}

