import type { ReactNode } from "react";

const glyphs = {
  activity: <path d="M2.5 12h4l3-7 4 14 3-7h5" />,
  bolt: <path d="m13 2-9 12h7l-1 8 10-12h-8l1-8Z" />,
  building: <path d="M3 21h18M5 21V7l8-4v18m0-12h6v12M8.5 9h1m-1 4h1m-1 4h1m6.5-4h1m-1 4h1" />,
  calendar: <path d="M7 3v4m10-4v4M4 10h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2 9h2m4 0h2m-8 3h2" />,
  check: <path d="m5 12 4 4L19 6" />,
  clipboard: <path d="M9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3M9 11h6m-6 5h6M9 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2H9V4Z" />,
  document: <path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10l-7-7Zm0 0v7h7M8 14h8m-8 3h5" />,
  inbox: <path d="M3 14 6 5h12l3 9m-18 0h5l2 3h4l2-3h5v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4Z" />,
  key: <path d="M15 14a5 5 0 1 0-5-5l-7 7v5h5v-3h3v-3l1-1h3Zm2-6h.01" />,
  microphone: <path d="M8 10V6a4 4 0 0 1 8 0v4a4 4 0 0 1-8 0Zm-3 0a7 7 0 0 0 14 0m-7 7v4m-3 0h6" />,
  phone: <path d="m7 3 3 5-2 2a14 14 0 0 0 6 6l2-2 5 3v2a2 2 0 0 1-2 2C10 20 4 14 3 5a2 2 0 0 1 2-2h2Z" />,
  photo: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="9" r="1.5" /><path d="m3 17 4-4 4 4 5-6 5 6" /></>,
  shield: <path d="m12 3 7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Zm-3 9 2 2 4-4" />,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20v-1a7 7 0 0 1 14 0v1" /></>,
  wrench: <path d="M20.5 4.5 17 8l-2-2 3.5-3.5a6 6 0 0 0-7.3 7.3L4 17a2.1 2.1 0 0 0 3 3l7.2-7.2a6 6 0 0 0 6.3-8.3Z" />,
};

export function Icon({ name, className = "size-4" }: { name: keyof typeof glyphs; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      {glyphs[name]}
    </svg>
  );
}

export function BrandMark() {
  return (
    <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-[9px] bg-linear-to-br from-indigo-500 to-violet-700 text-white shadow-[0_2px_4px_#4633a333,inset_0_1px_0_#ffffff33] ring-1 ring-indigo-900/15 ring-inset">
      <svg viewBox="0 0 24 24" fill="none" className="size-[18px]" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 18.5h16M6 18.5v-8l6-3v11m0-11 6-3v14" />
        <path d="M9 13.5v1.25m6-4.25v1.25" />
      </svg>
    </span>
  );
}

export const pageWidth = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";

export function CentrixHeader({ caseId }: { caseId?: string }) {
  return (
    <header className="border-b border-slate-300/80 bg-[#B6C0CA]/90">
      <div className={`${pageWidth} flex min-h-12 items-center gap-3 py-2`}>
        <BrandMark />
        <p className="min-w-0 text-xs font-semibold tracking-[0.1em] text-slate-800 uppercase">
          centrix · mock{caseId && <> · <span className="font-mono font-normal tracking-normal wrap-anywhere text-slate-500 normal-case">{caseId}</span></>}
        </p>
      </div>
    </header>
  );
}

export const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-[#B6C0CA] text-black ring-slate-200" },
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

export const chip = "inline-flex w-fit max-w-full shrink-0 items-center gap-2 rounded-full px-2.5 py-1 text-xs leading-4 font-semibold ring-1 ring-inset before:size-1.5 before:shrink-0 before:rounded-full before:bg-current";

export function StatusChip({ status, waitingForOwner = false }: { status: string; waitingForOwner?: boolean }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-[#B6C0CA] text-black ring-slate-200" };
  return <span className={`${chip} ${s.cls}`}>{status === "awaiting_approval" && waitingForOwner ? "Waiting for owner" : s.label}</span>;
}

export const surface = "min-w-0 rounded-2xl bg-[#B6C0CA]/95 text-[#243442] shadow-[0_1px_2px_rgba(15,23,42,.06),0_12px_24px_-18px_rgba(15,23,42,.24)] ring-1 ring-slate-400/25";
export const meta = "text-xs leading-4 font-semibold uppercase tracking-[0.075em] text-slate-500";
export const inputClass = "min-w-0 rounded-xl border border-slate-400 bg-[#D3D9DF] px-3 text-base text-black shadow-xs placeholder:text-black hover:border-slate-500 focus:border-indigo-600 motion-safe:transition-colors motion-safe:duration-150 sm:text-sm";
export const linkClass = "rounded-sm font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:text-indigo-900 hover:decoration-indigo-700 motion-safe:transition-colors motion-safe:duration-150";
export const iconTile = "grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 ring-inset";
export const phoneCard = `${surface} p-4 sm:p-5`;
export const phoneHero = "space-y-3 rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50 via-[#B6C0CA] to-[#B6C0CA] p-4 sm:p-5";

export function Card({ title, aside, children, className = "" }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`${surface} p-5 sm:p-6 ${className}`}>
      {(title || aside) && (
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          {title && <h2 className="text-base leading-6 font-semibold tracking-tight text-slate-950">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

const buttonBase = "inline-flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-center text-sm leading-5 font-semibold motion-safe:transition-[background-color,color,box-shadow] motion-safe:duration-150 disabled:cursor-not-allowed disabled:bg-[#B6C0CA] disabled:text-slate-500 disabled:shadow-none";
const primary = `${buttonBase} bg-indigo-600 text-white shadow-[0_1px_2px_#29205d26,inset_0_1px_0_#ffffff26] ring-1 ring-indigo-900/20 ring-inset hover:bg-indigo-700 active:bg-indigo-800 disabled:ring-slate-200`;
export const btn = {
  primary,
  secondary: `${buttonBase} bg-[#D3D9DF] text-black shadow-xs ring-1 ring-slate-300 ring-inset hover:bg-[#E0E5E9] active:bg-[#BFC9D2] disabled:ring-slate-200`,
  danger: `${buttonBase} bg-[#D3D9DF] text-rose-800 shadow-xs ring-1 ring-rose-200 ring-inset hover:bg-rose-50 active:bg-rose-100 disabled:ring-slate-200`,
  success: `${buttonBase} bg-[#E49A72] text-slate-950 shadow-[0_1px_2px_rgba(103,54,31,.24),inset_0_1px_0_#ffffff44] ring-1 ring-[#b96f4c] ring-inset hover:bg-[#d98a62] active:bg-[#c97b55] disabled:ring-slate-200`,
};

/** Phone-sized frame for the WhatsApp screens. */
export function PhoneFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={`${pageWidth} flex items-start justify-center py-6 sm:py-8`}>
      <div className="w-full max-w-md rounded-2xl bg-[#B6C0CA]/95 shadow-[0_2px_6px_rgba(15,23,42,.07),0_20px_56px_-24px_rgba(42,35,88,.24)] ring-1 ring-slate-400/25">
        <div className="flex min-h-14 items-center justify-between gap-4 rounded-t-2xl bg-[#2C2456] px-4 py-3 text-indigo-50 ring-1 ring-white/10 ring-inset sm:px-5">
          <span className="text-sm font-semibold tracking-tight">{label}</span>
          <BrandMark />
        </div>
        <div className="rounded-b-2xl bg-[#B6C0CA]/95 [&_button]:w-full [&_label:has(input[type=file])]:min-h-11">{children}</div>
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
  return (
    <div role="status" className="space-y-3">
      <p className="flex items-center gap-3 text-sm text-slate-500">
        <span aria-hidden="true" className="size-4 rounded-full border-2 border-indigo-200 border-t-indigo-600 motion-safe:animate-spin" />
        {label}
      </p>
      <div aria-hidden="true" className="h-2 w-24 rounded-full bg-slate-200" />
    </div>
  );
}

export function EmptyState({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-3 text-sm text-slate-500 ${className}`}>
      <span className={iconTile}><Icon name="inbox" /></span>
      <p>{children}</p>
    </div>
  );
}

export function OfferLimitBar({ amount, limit }: { amount: number; limit: number }) {
  const scale = Math.max(amount, limit, 1);
  const limitWidth = Math.max(0, limit) / scale * 100;
  const coveredWidth = Math.max(0, Math.min(amount, limit)) / scale * 100;
  const overageWidth = Math.max(0, amount - Math.max(0, limit)) / scale * 100;

  return (
    <div aria-hidden="true" className="relative flex h-2 rounded-full bg-slate-200">
      <div className="flex h-full w-full overflow-hidden rounded-[inherit]">
        <span className="bg-indigo-600" style={{ width: `${coveredWidth}%` }} />
        <span className="bg-amber-700" style={{ width: `${overageWidth}%` }} />
      </div>
      <span className="absolute -inset-y-0.5 w-0.5 -translate-x-1/2 rounded-full bg-slate-700 ring-2 ring-white" style={{ left: `${limitWidth}%` }} />
    </div>
  );
}
