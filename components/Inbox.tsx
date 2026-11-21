"use client";

import Link from "next/link";
import { fmtDay, fmtTime } from "@/lib/time";
import { CentrixHeader, EmptyState, Icon, iconTile, meta, pageWidth, StatusChip, Spinner, surface } from "./ui";
import { usePoll } from "./usePoll";

type CaseItem = {
  case_id: string;
  unit_id: string | null;
  category: string;
  scope: string;
  urgency: string;
  status: string;
  offer_resume_status: string | null;
  symptoms: string | null;
  approval: string | null;
  reporters: string[];
  partner_name: string | null;
  contact_name: string | null;
  appointment: string;
  created_at: string;
};

const OPEN = (s: string) => !["closed", "stopped"].includes(s);

const columns = {
  tenant: "Unit · tenant",
  problem: "Problem",
  firm: "Firm · appointment",
  status: "Status",
  opened: "Opened",
};

/** Mock of the centrix inbox for the demo building: every case the voice agent opened, live. */
export function Inbox() {
  const { data, error } = usePoll<CaseItem[]>("/api/cases", 2000);
  const cases = data ?? [];
  const open = cases.filter((c) => OPEN(c.status));
  const auto = cases.filter((c) => c.approval === "auto");

  return (
    <div className="centrix-page">
      <CentrixHeader />
      <div className={`${pageWidth} space-y-6 py-6 sm:py-8`}>
        <header className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-6">
          <h1 className="max-w-[22ch] text-2xl leading-tight font-semibold tracking-tight text-balance text-slate-950 sm:text-3xl">Musterstraße 12, 52062 Aachen</h1>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.18fr)] gap-3 sm:gap-4">
            <Kpi label="Open cases" value={open.length} />
            <Kpi label="Sent to a firm automatically" value={auto.length} />
          </div>
        </header>

        {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-rose-800 ring-1 ring-rose-200 ring-inset">{error}</p>}
        {!data && !error && <div className={`${surface} p-5`}><Spinner /></div>}

        {data && (
          <div className={surface}>
            <table role="table" className="w-full table-fixed text-left text-sm max-md:block">
              <thead role="rowgroup" className={`text-slate-600 max-md:block ${cases.length ? "max-md:sr-only" : ""}`}>
                <tr role="row" className="border-b border-slate-200/80 bg-[#7F93A7]/80 max-md:flex max-md:flex-wrap max-md:gap-x-4 max-md:gap-y-2 max-md:rounded-t-2xl max-md:px-4 max-md:py-3 md:[&_th]:py-3">
                  <th role="columnheader" scope="col" className={`${meta} md:w-[24%] md:rounded-tl-2xl md:pr-2 md:pl-5`}>{columns.tenant}</th>
                  <th role="columnheader" scope="col" className={`${meta} md:w-[24%] md:px-2`}>{columns.problem}</th>
                  <th role="columnheader" scope="col" className={`${meta} md:w-[22%] md:px-2`}>{columns.firm}</th>
                  <th role="columnheader" scope="col" className={`${meta} md:w-[9rem] md:px-2`}>{columns.status}</th>
                  <th role="columnheader" scope="col" className={`${meta} md:rounded-tr-2xl md:pr-5 md:pl-2 md:text-right`}>{columns.opened}</th>
                </tr>
              </thead>
              <tbody role="rowgroup" className="divide-y divide-slate-200/70 max-md:block">
                {cases.length === 0 && (
                  <tr role="row" className="max-md:block">
                    <td role="cell" colSpan={5} className="max-md:block">
                      <EmptyState className="flex-col justify-center px-4 py-12 text-center">No cases yet. Call the line to open one.</EmptyState>
                    </td>
                  </tr>
                )}
                {cases.map((c) => (
                  <tr role="row" key={c.case_id} className="group align-top last:rounded-b-2xl hover:bg-indigo-50/50 focus-within:bg-indigo-50/50 motion-safe:transition-colors motion-safe:duration-150 max-md:grid max-md:grid-cols-2 max-md:gap-x-4 max-md:gap-y-4 max-md:p-4 md:last:[&>td:first-child]:rounded-bl-2xl md:last:[&>td:last-child]:rounded-br-2xl md:[&>td]:py-4">
                    <td role="cell" className="min-w-0 space-y-1 max-md:col-start-1 max-md:row-start-1 md:pr-2 md:pl-5">
                      <span aria-hidden="true" className={`${meta} block md:hidden`}>{columns.tenant}</span>
                      <div className="flex min-w-0 items-start gap-2 sm:gap-3">
                        <TenantAvatar name={c.contact_name} />
                        <div className="min-w-0">
                          <Link href={`/centrix/case/${c.case_id}`} className="inline-flex items-center rounded-sm text-sm leading-5 font-semibold wrap-anywhere text-indigo-700 hover:underline hover:underline-offset-4 max-md:min-h-11 max-md:min-w-11">
                            <span><span className="font-mono text-[13px]">{c.unit_id ?? "—"}</span>{c.scope === "building" ? " · whole building" : ""}</span>
                          </Link>
                          <div className="text-xs leading-5 wrap-anywhere text-slate-500">
                            {c.contact_name}{c.reporters.length > 1 ? ` +${c.reporters.length - 1} more` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td role="cell" className="min-w-0 space-y-1 wrap-anywhere md:px-2">
                      <span aria-hidden="true" className={`${meta} block md:hidden`}>{columns.problem}</span>
                      <div className="font-semibold text-slate-900 capitalize">{c.category}{c.urgency === "high" ? " · urgent" : ""}</div>
                      <div className="text-xs leading-5 text-slate-500">{c.symptoms}</div>
                    </td>
                    <td role="cell" className="min-w-0 space-y-1 wrap-anywhere md:px-2">
                      <span aria-hidden="true" className={`${meta} block md:hidden`}>{columns.firm}</span>
                      <div className="font-semibold text-slate-900">{c.partner_name ?? "—"}</div>
                      <div className="text-xs leading-5 text-slate-500">{c.appointment}</div>
                    </td>
                    <td role="cell" className="min-w-0 space-y-2 max-md:col-start-2 max-md:row-start-1 max-md:text-right md:px-2">
                      <span aria-hidden="true" className={`${meta} block md:hidden`}>{columns.status}</span>
                      <StatusChip status={c.status} waitingForOwner={!!c.offer_resume_status} />
                    </td>
                    <td role="cell" className="min-w-0 space-y-1 text-xs leading-5 text-slate-500 max-md:col-span-2 max-md:border-t max-md:border-slate-200/75 max-md:pt-3 md:pr-5 md:pl-2 md:text-right">
                      <span aria-hidden="true" className={`${meta} mr-3 md:hidden`}>{columns.opened}</span>
                      {fmtDay(c.created_at)}, <span className="font-mono">{fmtTime(c.created_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className={`${surface} grid content-start gap-3 bg-linear-to-br from-slate-50 via-slate-50 to-indigo-50/80 p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 text-3xl leading-none font-semibold tracking-tight wrap-anywhere text-slate-950 tabular-nums sm:text-[2.5rem]">{value}</div>
        <span className={iconTile}><Icon name={label === "Open cases" ? "inbox" : "bolt"} /></span>
      </div>
      <div className={meta}>{label}</div>
    </div>
  );
}

function TenantAvatar({ name }: { name: string | null }) {
  const initials = name?.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join("");

  return (
    <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-indigo-50 text-[11px] leading-none font-semibold text-indigo-800 uppercase ring-1 ring-indigo-100 ring-inset md:mt-0.5 md:size-9">
      {initials || <Icon name="user" />}
    </span>
  );
}
