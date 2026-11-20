"use client";

import Link from "next/link";
import { fmtDay, fmtTime } from "@/lib/time";
import { StatusChip, Spinner } from "./ui";
import { usePoll } from "./usePoll";

type CaseItem = {
  case_id: string;
  unit_id: string | null;
  category: string;
  scope: string;
  urgency: string;
  status: string;
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
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">centrix · mock</p>
          <h1 className="text-xl font-semibold">Musterstraße 12, 52062 Aachen</h1>
        </div>
        <div className="flex gap-3 text-sm">
          <Kpi label="Open cases" value={open.length} />
          <Kpi label="Sent to a firm automatically" value={auto.length} />
        </div>
      </div>

      {error && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {!data && !error && <Spinner />}

      {data && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Unit · tenant</th>
                <th className="px-4 py-2.5">Problem</th>
                <th className="px-4 py-2.5">Firm · appointment</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cases.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No cases yet. Call the line to open one.</td></tr>
              )}
              {cases.map((c) => (
                <tr key={c.case_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/centrix/case/${c.case_id}`} className="font-medium text-slate-900 hover:text-indigo-700">
                      {c.unit_id ?? "—"}{c.scope === "building" ? " · whole building" : ""}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {c.contact_name}{c.reporters.length > 1 ? ` +${c.reporters.length - 1} more` : ""}
                    </div>
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <div className="capitalize">{c.category}{c.urgency === "high" ? " · urgent" : ""}</div>
                    <div className="truncate text-xs text-slate-500">{c.symptoms}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{c.partner_name ?? "—"}</div>
                    <div className="text-xs text-slate-500">{c.appointment}</div>
                  </td>
                  <td className="px-4 py-3"><StatusChip status={c.status} /></td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500">{fmtDay(c.created_at)}, {fmtTime(c.created_at)}</td>
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
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
