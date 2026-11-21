"use client";

import { useState } from "react";
import { fmtTime } from "@/lib/time";
import { shrinkImage } from "./imageUpload";
import { btn, Icon, iconTile, inputClass, meta, phoneCard, PhoneFrame, phoneHero, Spinner } from "./ui";
import { post, usePoll } from "./usePoll";

type TenantView = {
  case_id: string;
  status: string;
  category: string;
  scope: string;
  symptoms: string | null;
  address: string;
  partner: string | null;
  appointment: string;
  photos: (string | null)[];
  updates: { at: string; text: string }[];
};

const STEPS = [
  { label: "Reported", when: () => true },
  { label: "Booked", when: (s: string) => ["booked", "awaiting_approval", "dispatched", "scheduled", "completed", "closed"].includes(s) },
  { label: "Firm confirmed", when: (s: string) => ["scheduled", "completed", "closed"].includes(s) },
  { label: "Repaired", when: (s: string) => ["completed", "closed"].includes(s) },
  { label: "Closed", when: (s: string) => s === "closed" },
];

/** What the tenant opens from the WhatsApp link: status, appointment, add a photo, a note, confirm the fix. */
export function Portal({ caseId }: { caseId: string }) {
  const { data, error, reload } = usePoll<TenantView>(`/api/cases/${caseId}?view=tenant`, 3000);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setMsg(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    const form = new FormData();
    form.append("file", await shrinkImage(file));
    await run("photo", () => post(`/api/portal/${caseId}/photo`, form));
  }

  return (
    <PhoneFrame label="Tenant portal">
      {!data && (error ? <p className="m-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200 ring-inset">{error}</p> : <div className="p-5"><Spinner /></div>)}
      {data && (
        <div className="@container space-y-4 p-3 sm:p-4">
          <header className={phoneHero}>
            <p className={meta}>{data.address}</p>
            <h1 className="text-2xl leading-tight font-semibold tracking-tight text-slate-950"><span className="capitalize">{data.category}</span>{data.scope === "building" ? " · whole building" : ""}</h1>
            <p className="wrap-anywhere">{data.symptoms}</p>
          </header>

          <ol className={`${phoneCard} repair-progress`}>
            {STEPS.map((s) => (
              <li key={s.label}>
                <div className={`step-marker ${s.when(data.status) ? "step-complete" : ""}`} />
                <div className={`text-xs leading-4 ${s.when(data.status) ? "font-semibold text-slate-900" : "text-slate-500"}`}>{s.label}</div>
              </li>
            ))}
          </ol>

          {data.status === "completed" && (
            <div className={`${phoneCard} space-y-3 bg-linear-to-br from-[#B6C0CA] to-indigo-50/70`}>
              <h2 className="text-base font-semibold tracking-tight text-slate-950">Is your heating working again?</h2>
              <div className="grid gap-3">
                <button disabled={!!busy} onClick={() => run("yes", () => post(`/api/portal/${caseId}/confirm`, { fixed: true }))} className={`${btn.success} py-3.5`}><Icon name="check" />Yes, it works</button>
                <button disabled={!!busy} onClick={() => run("no", () => post(`/api/portal/${caseId}/confirm`, { fixed: false }))} className={btn.secondary}>No, still broken</button>
              </div>
            </div>
          )}

          {data.status === "stopped" ? (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-rose-800 ring-1 ring-rose-200 ring-inset">The property manager paused this appointment and will contact you.</div>
          ) : data.partner ? (
            <div className={`${phoneCard} flex items-start gap-3`}>
              <span className={iconTile}><Icon name="calendar" /></span>
              <div className="min-w-0 space-y-1 wrap-anywhere">
                <div className={meta}>Appointment</div>
                <div className="font-semibold text-slate-950">{data.appointment || "being arranged"}</div>
                <div className="text-slate-600">{data.partner}</div>
              </div>
            </div>
          ) : null}

          {!["closed", "stopped"].includes(data.status) && (
            <div className={`${phoneCard} space-y-3`}>
              <label className={`${btn.secondary} relative w-full`}>
                <Icon name="photo" />
                {busy === "photo" ? "Uploading…" : "Add a photo (boiler display, radiator)"}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
              </label>
              {data.photos.filter(Boolean).length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {data.photos.filter(Boolean).map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={p!} src={p!} alt="Your photo" className="aspect-square w-full rounded-lg object-cover" />
                  ))}
                </div>
              )}
              <div className="grid gap-3">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the property manager" className={`${inputClass} h-11 w-full`} />
                <button
                  disabled={!note.trim() || !!busy}
                  onClick={() => run("note", async () => { await post(`/api/portal/${caseId}/note`, { text: note }); setNote(""); })}
                  className={data.status === "completed" ? btn.secondary : btn.primary}
                >
                  Send
                </button>
              </div>
            </div>
          )}
          {msg && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200 ring-inset">{msg}</p>}

          <div className={`${phoneCard} space-y-3`}>
            <h2 className="text-base font-semibold tracking-tight text-slate-950">Updates</h2>
            <ol className="divide-y divide-slate-100">
              {[...data.updates].reverse().map((u, i) => (
                <li key={i} className="flex gap-3 py-2 text-sm first:pt-0 last:pb-0">
                  <span className="w-11 shrink-0 font-mono text-xs leading-6 text-slate-500 tabular-nums">{fmtTime(u.at)}</span>
                  <span className="min-w-0 wrap-anywhere">{u.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}
