import type { ReactNode } from "react";

export const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-slate-100 text-slate-700 ring-slate-200" },
  partner_picked: { label: "Firm picked", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  booked: { label: "Booked", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  awaiting_approval: { label: "Needs approval", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  dispatched: { label: "Sent to firm", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  scheduled: { label: "Firm confirmed", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  completed: { label: "Repaired", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  closed: { label: "Closed", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  reopened: { label: "Reopened", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  stopped: { label: "Stopped", cls: "bg-rose-50 text-rose-800 ring-rose-200" },
  emergency: { label: "Emergency", cls: "bg-rose-50 text-rose-800 ring-rose-200" },
};

export const chip = "inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset before:size-1.5 before:rounded-full before:bg-current";

export function StatusChip({ status, waitingForOwner = false }: { status: string; waitingForOwner?: boolean }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-slate-100 text-slate-700 ring-slate-200" };
  return <span className={`${chip} ${s.cls}`}>{status === "awaiting_approval" && waitingForOwner ? "Waiting for owner" : s.label}</span>;
}

export const ACTOR: Record<string, { label: string; dot: string }> = {
  tenant: { label: "Tenant", dot: "bg-slate-500" },
  agent: { label: "Voice agent", dot: "bg-indigo-500" },
  partner: { label: "Craftsman", dot: "bg-slate-600" },
  manager: { label: "Manager", dot: "bg-slate-700" },
  owner: { label: "Owner", dot: "bg-slate-500" },
  system: { label: "Automation", dot: "bg-indigo-500" },
};

export const surface = "min-w-0 rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5";
export const meta = "text-xs font-medium uppercase tracking-[0.065em] text-slate-500";
export const recordLabel = "flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-indigo-700 before:h-px before:w-5 before:shrink-0 before:bg-indigo-400";
export const inputClass = "min-w-0 rounded-lg border border-slate-500/75 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 transition-colors hover:border-slate-500 focus:border-indigo-600";
export const linkClass = "rounded-sm font-medium text-indigo-700 underline decoration-indigo-300 underline-offset-4 transition-colors hover:text-indigo-900 hover:decoration-indigo-700";

export function Card({ title, aside, children, className = "" }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`${surface} p-5 sm:p-6 ${className}`}>
      {(title || aside) && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {title && <h2 className="text-sm font-semibold tracking-[-0.015em] text-slate-950">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

const buttonBase = "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-center text-sm leading-5 font-medium shadow-xs transition-colors disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none";
const primary = `${buttonBase} bg-indigo-600 text-white ring-1 ring-inset ring-indigo-900/15 enabled:hover:bg-indigo-700 disabled:ring-slate-200`;
export const btn = {
  primary,
  secondary: `${buttonBase} bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:ring-slate-200`,
  danger: `${buttonBase} bg-white text-rose-800 ring-1 ring-inset ring-rose-200 enabled:hover:bg-rose-50`,
  success: primary,
};

/** Phone-sized frame for the tenant portal and the craftsman job card (looks right on a laptop screen recording). */
export function PhoneFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-6xl items-start justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg shadow-slate-900/5 ring-1 ring-slate-900/10">
        <div className="flex items-center justify-between gap-4 rounded-t-2xl bg-indigo-900 px-5 py-3 text-indigo-50 sm:px-6">
          <span className="text-sm font-medium">{label}</span>
          <span aria-hidden="true" className="building-mark text-indigo-200" />
        </div>
        <div className="rounded-b-2xl sm:max-h-[calc(100dvh-12rem)] sm:overflow-y-auto [&_button]:h-auto [&_button]:min-h-11 [&_button]:w-full [&_label:has(input[type=file])]:h-auto [&_label:has(input[type=file])]:min-h-11">{children}</div>
      </div>
    </div>
  );
}

/** Renders text with clickable links (messages in the timeline carry the tenant and craftsman links). */
export function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/\S+|\(logged\)$)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noreferrer" className={`${linkClass} break-all`}>
            {p.replace(/^https?:\/\/[^/]+/, "")}
          </a>
        ) : (
          <span key={i} className={p === "(logged)" ? "text-slate-500" : undefined}>{p}</span>
        ),
      )}
    </>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return <p className="flex items-center gap-2 text-sm text-slate-500 before:size-2 before:rounded-full before:bg-indigo-500">{label}</p>;
}
