"use client";

import { useState } from "react";
import { fmtTime } from "@/lib/time";
import { shrinkImage } from "./imageUpload";
import { btn, inputClass, meta, PhoneFrame, Spinner } from "./ui";
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
      {!data && (error ? <p className="p-5 text-sm text-rose-700">{error}</p> : <div className="p-5"><Spinner /></div>)}
      {data && (
        <div className="@container space-y-6 p-5 sm:p-6">
          <header className="space-y-2">
            <p className={meta}>{data.address}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950"><span className="capitalize">{data.category}</span>{data.scope === "building" ? " · whole building" : ""}</h1>
            <p className="wrap-anywhere">{data.symptoms}</p>
          </header>

          <ol className="grid gap-2 @min-[17rem]:grid-cols-[repeat(5,auto)] @min-[17rem]:gap-1">
            {STEPS.map((s) => (
              <li key={s.label} className="flex items-center gap-2 @min-[17rem]:block">
                <div className={`size-2 shrink-0 rounded-full @min-[17rem]:h-1 @min-[17rem]:w-full ${s.when(data.status) ? "bg-emerald-600" : "bg-slate-200"}`} />
                <div className={`text-xs leading-4 @min-[17rem]:mt-2 ${s.when(data.status) ? "font-medium text-slate-800" : "text-slate-500"}`}>{s.label}</div>
              </li>
            ))}
          </ol>

          {data.status === "completed" && (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h2 className="text-sm font-semibold text-slate-900">Is your heating working again?</h2>
              <div className="grid gap-3">
                <button disabled={!!busy} onClick={() => run("yes", () => post(`/api/portal/${caseId}/confirm`, { fixed: true }))} className={btn.success}>Yes, it works</button>
                <button disabled={!!busy} onClick={() => run("no", () => post(`/api/portal/${caseId}/confirm`, { fixed: false }))} className={btn.secondary}>No, still broken</button>
              </div>
            </div>
          )}

          {data.status === "stopped" ? (
            <div className="rounded-lg bg-rose-50 px-4 py-3 text-rose-800">The property manager paused this appointment and will contact you.</div>
          ) : data.partner ? (
            <div className="space-y-1 border-l-2 border-indigo-400 bg-indigo-50/25 px-4 py-3">
              <div className={meta}>Appointment</div>
              <div className="font-semibold text-slate-900">{data.appointment || "being arranged"}</div>
              <div>{data.partner}</div>
            </div>
          ) : null}

          {!["closed", "stopped"].includes(data.status) && (
            <div className="space-y-3">
              <label className={`${btn.secondary} relative w-full py-2`}>
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
          {msg && <p className="text-sm text-rose-700">{msg}</p>}

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <h2 className="text-sm font-semibold text-slate-900">Updates</h2>
            <ol className="space-y-3">
              {[...data.updates].reverse().map((u, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="w-11 shrink-0 text-xs leading-6 text-slate-500 tabular-nums">{fmtTime(u.at)}</span>
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
