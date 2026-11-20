"use client";

import { useState } from "react";
import { shrinkImage } from "./imageUpload";
import { btn, PhoneFrame, Spinner } from "./ui";
import { post, usePoll } from "./usePoll";

type Job = {
  status: string;
  partner: string | null;
  job_card: { headline: string; problem_summary: string; urgency_reason: string; checklist: string[] } | null;
  street: string;
  building: { year: number | null; heating: string | null; fuel: string | null };
  scope: string;
  appointment: string;
  accepted: boolean;
  flat?: string | null;
  tenant?: { name: string; phone: string | null } | null;
  access_notes?: string | null;
  photos?: (string | null)[];
};

/** What the craftsman opens from WhatsApp: the job, then Accept; contact details only after Accept; Done with the invoice. */
export function JobCard({ token }: { token: string }) {
  const { data, error, reload } = usePoll<Job>(`/api/job/${token}`, 3000);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [propose, setPropose] = useState(false);
  const [proposal, setProposal] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");

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

  async function done() {
    const form = new FormData();
    form.append("note", note);
    if (file) form.append("file", await shrinkImage(file));
    if (number) form.append("number", number);
    if (amount) form.append("amount_eur", amount);
    await run("done", () => post(`/api/job/${token}/done`, form));
  }

  return (
    <PhoneFrame label="Job via WhatsApp link">
      {!data && (error ? <p className="p-5 text-sm text-rose-700">{error}</p> : <div className="p-5"><Spinner /></div>)}
      {data && (
        <div className="space-y-4 p-5">
          <div>
            <p className="text-xs text-slate-500">{data.partner} · new job</p>
            <h1 className="text-lg font-semibold">{data.job_card?.headline ?? "Preparing the job card…"}</h1>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <div className="font-medium">{data.street}</div>
            <div className="text-slate-600">
              {data.building.heating} {data.building.fuel} heating · built {data.building.year} · {data.scope === "building" ? "whole building" : "one flat"}
            </div>
            <div className="mt-1 font-medium text-indigo-800">{data.appointment}</div>
          </div>

          {data.job_card && (
            <div className="space-y-2 text-sm">
              <p>{data.job_card.problem_summary}</p>
              <p className="text-amber-800">{data.job_card.urgency_reason}</p>
              <ul className="space-y-1">
                {data.job_card.checklist.map((item) => <li key={item} className="flex gap-2"><span className="text-slate-400">☐</span>{item}</li>)}
              </ul>
            </div>
          )}

          {data.status === "dispatched" && (
            <div className="space-y-2">
              <button disabled={!!busy} onClick={() => run("accept", () => post(`/api/job/${token}/accept`))} className={`${btn.success} w-full`}>
                {busy === "accept" ? "Accepting…" : "Accept job"}
              </button>
              {!propose ? (
                <button onClick={() => setPropose(true)} className={`${btn.secondary} w-full`}>Propose another time</button>
              ) : (
                <div className="flex gap-2">
                  <input value={proposal} onChange={(e) => setProposal(e.target.value)} placeholder="e.g. tomorrow 8–10" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <button disabled={!proposal.trim() || !!busy} onClick={() => run("propose", async () => { await post(`/api/job/${token}/propose`, { note: proposal }); setPropose(false); setMsg("Sent to the property manager."); })} className={btn.primary}>Send</button>
                </div>
              )}
              <p className="text-xs text-slate-500">The tenant&apos;s name, phone and flat appear after you accept.</p>
            </div>
          )}

          {data.accepted && (
            <div className="space-y-1 rounded-xl border border-slate-200 p-3 text-sm">
              <div className="flex justify-between gap-3"><span className="text-slate-500">Flat</span><span>{data.flat}</span></div>
              {data.tenant && (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Tenant</span>
                  <span>{data.tenant.name}{data.tenant.phone && <> · <a href={`tel:${data.tenant.phone.replace(/\s/g, "")}`} className="text-indigo-600 underline underline-offset-2">{data.tenant.phone}</a></>}</span>
                </div>
              )}
              <div className="flex justify-between gap-3"><span className="text-slate-500">Access</span><span className="text-right">{data.access_notes ?? "—"}</span></div>
              {(data.photos ?? []).filter(Boolean).length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {(data.photos ?? []).filter(Boolean).map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={p!} src={p!} alt="Tenant photo" className="aspect-square w-full rounded-lg object-cover" />
                  ))}
                </div>
              )}
            </div>
          )}

          {data.status === "scheduled" && (
            <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
              <p className="text-sm font-medium">Job done?</p>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you did (e.g. ignition electrode replaced)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <label className={`${btn.secondary} w-full cursor-pointer`}>
                {file ? `Invoice: ${file.name}` : "Attach invoice (PDF or photo)"}
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <div className="flex gap-2">
                <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Invoice no. (optional)" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="€ gross" className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <button disabled={!!busy} onClick={done} className={`${btn.success} w-full`}>{busy === "done" ? "Reading the invoice…" : "Mark as done"}</button>
            </div>
          )}

          {["completed", "closed"].includes(data.status) && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">Done. The invoice is on the case. Thank you!</p>}
          {data.status === "stopped" && <p className="rounded-xl bg-slate-100 p-3 text-sm">This job was cancelled by the property manager.</p>}
          {msg && <p className="text-sm text-slate-700">{msg}</p>}
        </div>
      )}
    </PhoneFrame>
  );
}
