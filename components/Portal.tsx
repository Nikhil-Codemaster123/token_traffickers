"use client";

import { useState } from "react";
import { fmtTime } from "@/lib/time";
import { shrinkImage } from "./imageUpload";
import { btn, PhoneFrame, Spinner } from "./ui";
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
        <div className="space-y-4 p-5">
          <div>
            <p className="text-xs text-slate-500">{data.address}</p>
            <h1 className="text-lg font-semibold"><span className="capitalize">{data.category}</span>{data.scope === "building" ? " · whole building" : ""}</h1>
            <p className="text-sm text-slate-600">{data.symptoms}</p>
          </div>

          <ol className="flex items-center gap-1">
            {STEPS.map((s) => (
              <li key={s.label} className="flex-1">
                <div className={`h-1.5 rounded-full ${s.when(data.status) ? "bg-emerald-500" : "bg-slate-200"}`} />
                <div className={`mt-1 text-[10px] ${s.when(data.status) ? "text-slate-800" : "text-slate-400"}`}>{s.label}</div>
              </li>
            ))}
          </ol>

          {data.status === "stopped" ? (
            <div className="rounded-xl bg-slate-100 p-3 text-sm">The property manager paused this appointment and will contact you.</div>
          ) : data.partner ? (
            <div className="rounded-xl bg-indigo-50 p-3">
              <div className="text-xs text-indigo-700">Appointment</div>
              <div className="font-semibold text-indigo-950">{data.appointment || "being arranged"}</div>
              <div className="text-sm text-indigo-900">{data.partner}</div>
            </div>
          ) : null}

          {data.status === "completed" && (
            <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-medium text-emerald-900">Is your heating working again?</p>
              <div className="flex gap-2">
                <button disabled={!!busy} onClick={() => run("yes", () => post(`/api/portal/${caseId}/confirm`, { fixed: true }))} className={btn.success}>Yes, it works</button>
                <button disabled={!!busy} onClick={() => run("no", () => post(`/api/portal/${caseId}/confirm`, { fixed: false }))} className={btn.secondary}>No, still broken</button>
              </div>
            </div>
          )}

          {!["closed", "stopped"].includes(data.status) && (
            <div className="space-y-2">
              <label className={`${btn.secondary} w-full cursor-pointer`}>
                {busy === "photo" ? "Uploading…" : "Add a photo (boiler display, radiator)"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
              </label>
              {data.photos.filter(Boolean).length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {data.photos.filter(Boolean).map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={p!} src={p!} alt="Your photo" className="aspect-square w-full rounded-lg object-cover" />
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the property manager" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <button
                  disabled={!note.trim() || !!busy}
                  onClick={() => run("note", async () => { await post(`/api/portal/${caseId}/note`, { text: note }); setNote(""); })}
                  className={btn.primary}
                >
                  Send
                </button>
              </div>
            </div>
          )}
          {msg && <p className="text-sm text-rose-700">{msg}</p>}

          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Updates</h2>
            <ol className="space-y-2">
              {[...data.updates].reverse().map((u, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="w-11 shrink-0 tabular-nums text-slate-400">{fmtTime(u.at)}</span>
                  <span className="text-slate-800">{u.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}
