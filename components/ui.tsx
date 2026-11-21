import type { ReactNode } from "react";

export const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-slate-100 text-slate-700" },
  partner_picked: { label: "Firm picked", cls: "bg-sky-50 text-sky-700" },
  booked: { label: "Booked", cls: "bg-sky-50 text-sky-700" },
  awaiting_approval: { label: "Needs approval", cls: "bg-amber-100 text-amber-800" },
  dispatched: { label: "Sent to firm", cls: "bg-indigo-50 text-indigo-700" },
  scheduled: { label: "Firm confirmed", cls: "bg-indigo-100 text-indigo-800" },
  completed: { label: "Repaired", cls: "bg-emerald-50 text-emerald-700" },
  closed: { label: "Closed", cls: "bg-emerald-100 text-emerald-800" },
  reopened: { label: "Reopened", cls: "bg-rose-100 text-rose-700" },
  stopped: { label: "Stopped", cls: "bg-slate-200 text-slate-700" },
  emergency: { label: "Emergency", cls: "bg-red-600 text-white" },
};

export function StatusChip({ status, waitingForOwner = false }: { status: string; waitingForOwner?: boolean }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-slate-100 text-slate-700" };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{status === "awaiting_approval" && waitingForOwner ? "Waiting for owner" : s.label}</span>;
}

export const ACTOR: Record<string, { label: string; dot: string }> = {
  tenant: { label: "Tenant", dot: "bg-sky-500" },
  agent: { label: "Voice agent", dot: "bg-violet-500" },
  partner: { label: "Craftsman", dot: "bg-orange-500" },
  manager: { label: "Manager", dot: "bg-slate-900" },
  owner: { label: "Owner", dot: "bg-amber-500" },
  system: { label: "Automation", dot: "bg-indigo-500" },
};

export function Card({ title, aside, children, className = "" }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {(title || aside) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export const btn = {
  primary: "inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50",
  secondary: "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50",
  danger: "inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50",
  success: "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50",
};

/** Phone-sized frame for the tenant portal and the craftsman job card (looks right on a laptop screen recording). */
export function PhoneFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-start justify-center bg-slate-100 px-3 py-6">
      <div className="w-full max-w-[400px] overflow-hidden rounded-[2rem] border-[6px] border-slate-900 bg-white shadow-xl">
        <div className="flex items-center justify-between bg-slate-900 px-5 py-2 text-[11px] font-medium text-slate-300">
          <span>{label}</span>
          <span className="h-1.5 w-12 rounded-full bg-slate-700" />
        </div>
        <div className="max-h-[calc(100vh-7rem)] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/** Renders text with clickable links (messages in the timeline carry the tenant and craftsman links). */
export function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/\S+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noreferrer" className="break-all text-indigo-600 underline underline-offset-2">
            {p.replace(/^https?:\/\/[^/]+/, "")}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return <p className="animate-pulse text-sm text-slate-500">{label}</p>;
}
