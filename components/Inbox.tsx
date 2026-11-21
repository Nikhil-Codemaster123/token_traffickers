"use client";

import Link from "next/link";
import { fmtDay, fmtTime } from "@/lib/time";
import { meta, recordLabel, StatusChip, Spinner, surface } from "./ui";
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

/** Mock of the centrix inbox for the demo building: every case the voice agent opened, live. */
export function Inbox() {
  const { data, error } = usePoll<CaseItem[]>("/api/cases", 2000);
  const cases = data ?? [];
  const open = cases.filter((c) => OPEN(c.status));
  const auto = cases.filter((c) => c.approval === "auto");

  return (
    <div className="centrix-page mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="grid items-center gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <p className={recordLabel}>centrix · mock</p>
          <h1 className="text-2xl font-semibold tracking-tight text-balance text-slate-950">Musterstraße 12, 52062 Aachen</h1>
        </div>
        <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-6">
          <Kpi label="Open cases" value={open.length} />
          <Kpi label="Sent to a firm automatically" value={auto.length} />
        </div>
      </header>

      {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-rose-800">{error}</p>}
      {!data && !error && <Spinner />}

      {data && (
        <div className={`${surface} @container overflow-x-auto`}>
          <table className="w-full min-w-[44rem] table-fixed text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-600 [&_th]:py-3 [&_th]:font-medium">
              <tr>
                <th className="w-[20%] pr-3 pl-5 sm:pl-6">Unit · tenant</th>
                <th className="w-[26%] px-3">Problem</th>
                <th className="w-[23%] px-3">Firm · appointment</th>
                <th className="w-38 px-3">Status</th>
                <th className="pr-5 pl-3 text-right sm:pr-6">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cases.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="sticky left-0 flex w-[100cqw] flex-col items-center gap-3 px-5 py-10 text-center text-slate-600">
                      <span aria-hidden="true" className="building-mark text-indigo-500" />
                      No cases yet. Call the line to open one.
                    </div>
                  </td>
                </tr>
              )}
              {cases.map((c) => (
                <tr key={c.case_id} className="align-top transition-colors hover:bg-indigo-50/50 focus-within:bg-indigo-50/50">
                  <td className="space-y-1 py-4 pr-3 pl-5 sm:pl-6">
                    <Link href={`/centrix/case/${c.case_id}`} className="rounded-sm font-medium text-indigo-700 hover:underline hover:underline-offset-4">
                      <span className="font-mono text-[13px] font-semibold">{c.unit_id ?? "—"}</span>{c.scope === "building" ? " · whole building" : ""}
                    </Link>
                    <div className="text-xs leading-5 text-slate-500">
                      {c.contact_name}{c.reporters.length > 1 ? ` +${c.reporters.length - 1} more` : ""}
                    </div>
                  </td>
                  <td className="space-y-1 px-3 py-4 wrap-anywhere">
                    <div className="font-medium text-slate-900 capitalize">{c.category}{c.urgency === "high" ? " · urgent" : ""}</div>
                    <div className="text-xs leading-5 text-slate-500">{c.symptoms}</div>
                  </td>
                  <td className="space-y-1 px-3 py-4 wrap-anywhere">
                    <div className="font-medium text-slate-900">{c.partner_name ?? "—"}</div>
                    <div className="text-xs leading-5 text-slate-500">{c.appointment}</div>
                  </td>
                  <td className="px-3 py-4"><StatusChip status={c.status} waitingForOwner={!!c.offer_resume_status} /></td>
                  <td className="py-4 pr-5 pl-3 text-right text-xs leading-5 text-slate-500 sm:pr-6">{fmtDay(c.created_at)}, <span className="font-mono">{fmtTime(c.created_at)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className={`${surface} flex h-full flex-col gap-2 p-5 lg:p-6`}>
      <div className="text-3xl leading-none font-semibold tracking-tight text-indigo-900 tabular-nums">{value}</div>
      <div className={meta}>{label}</div>
    </div>
  );
}
