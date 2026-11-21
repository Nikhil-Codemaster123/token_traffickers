"use client";

import { useState } from "react";
import { shrinkImage } from "./imageUpload";
import { btn, chip, inputClass, linkClass, meta, PhoneFrame, Spinner } from "./ui";
import { post, usePoll } from "./usePoll";

type Job = {
  status: string;
  waiting_for_owner: boolean;
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
  const [offerFile, setOfferFile] = useState<File | null>(null);
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

  async function sendOffer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!offerFile) return;
    const form = new FormData(e.currentTarget);
    const offerForm = e.currentTarget;
    await run("offer", async () => {
      const result = await post<{ needsOwner: boolean }>(`/api/job/${token}/offer`, form);
      setOfferFile(null);
      offerForm.reset();
      setMsg(result.needsOwner ? null : "Go ahead. The offer is within the approval limit.");
    });
  }

  return (
    <PhoneFrame label="Job via WhatsApp link">
      {!data && (error ? <p className="p-5 text-sm text-rose-700">{error}</p> : <div className="p-5"><Spinner /></div>)}
      {data && (
        <div className="space-y-6 p-5 sm:p-6">
          <header className="space-y-2">
            <p className={meta}>{data.partner} · new job</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{data.job_card?.headline ?? "Preparing the job card…"}</h1>
            {data.waiting_for_owner && <p role="status" className={`${chip} bg-amber-50 text-amber-800 ring-amber-200`}>Waiting for owner</p>}
            {["completed", "closed"].includes(data.status) && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-emerald-800">Done. The invoice is on the case. Thank you!</p>}
            {data.status === "stopped" && <p className="rounded-lg bg-rose-50 px-4 py-3 text-rose-800">This job was cancelled by the property manager.</p>}
          </header>

          {data.status === "scheduled" && (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h2 className="text-sm font-semibold text-slate-900">Job done?</h2>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you did (e.g. ignition electrode replaced)" className={`${inputClass} h-11 w-full`} />
              <label className={`${btn.secondary} relative w-full py-2 wrap-anywhere`}>
                {file ? `Invoice: ${file.name}` : "Attach invoice (PDF or photo)"}
                <input type="file" accept="application/pdf,image/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
                <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Invoice no. (optional)" className={`${inputClass} h-11 w-full`} />
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="€ gross" className={`${inputClass} h-11 w-full`} />
              </div>
              <button disabled={!!busy} onClick={done} className={`${btn.success} w-full`}>{busy === "done" ? "Reading the invoice…" : "Mark as done"}</button>
            </div>
          )}

          <div className="space-y-1 border-l-2 border-indigo-400 bg-indigo-50/50 px-4 py-3">
            <div className="font-medium text-slate-900">{data.street}</div>
            <div className="text-slate-600">
              {data.building.heating} {data.building.fuel} heating · built {data.building.year} · {data.scope === "building" ? "whole building" : "one flat"}
            </div>
            <div className="font-medium text-indigo-800">{data.appointment}</div>
          </div>

          {data.status === "dispatched" && (
            <div className="space-y-3">
              <button disabled={!!busy} onClick={() => run("accept", () => post(`/api/job/${token}/accept`))} className={`${btn.success} w-full`}>
                {busy === "accept" ? "Accepting…" : "Accept job"}
              </button>
              {!propose ? (
                <button onClick={() => setPropose(true)} className={`${btn.secondary} w-full`}>Propose another time</button>
              ) : (
                <div className="grid gap-3">
                  <input value={proposal} onChange={(e) => setProposal(e.target.value)} placeholder="e.g. tomorrow 8–10" className={`${inputClass} h-11 w-full`} />
                  <button disabled={!proposal.trim() || !!busy} onClick={() => run("propose", async () => { await post(`/api/job/${token}/propose`, { note: proposal }); setPropose(false); setMsg("Sent to the property manager."); })} className={btn.secondary}>Send</button>
                </div>
              )}
              <p className="text-xs leading-5 text-slate-500">The tenant&apos;s name, phone and flat appear after you accept.</p>
            </div>
          )}

          {data.accepted && (
            <div className="space-y-3 border-t border-slate-100 pt-4 text-sm">
              <div className="flex items-baseline justify-between gap-4"><span className={meta}>Flat</span><span>{data.flat}</span></div>
              {data.tenant && (
                <div className="flex items-baseline justify-between gap-4">
                  <span className={meta}>Tenant</span>
                  <span className="min-w-0 text-right">{data.tenant.name}{data.tenant.phone && <> · <a href={`tel:${data.tenant.phone.replace(/\s/g, "")}`} className={`${linkClass} inline-flex min-h-11 items-center`}>{data.tenant.phone}</a></>}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4"><span className={meta}>Access</span><span className="min-w-0 text-right wrap-anywhere">{data.access_notes ?? "—"}</span></div>
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
            <form onSubmit={sendOffer} className="space-y-3 border-t border-slate-100 pt-4">
              <label className="block text-sm font-semibold text-slate-900" htmlFor="offer-pdf">Offer PDF</label>
              <input id="offer-pdf" name="file" type="file" accept="application/pdf,.pdf" required disabled={!!busy}
                onChange={(e) => setOfferFile(e.target.files?.[0] ?? null)} className="block h-11 w-full cursor-pointer rounded-lg text-sm text-slate-600 file:mr-3 file:h-11 file:cursor-pointer file:rounded-lg file:bg-slate-100 file:px-4 file:font-medium file:text-slate-800 hover:file:bg-slate-200 disabled:cursor-not-allowed" />
              <button disabled={!!busy || !offerFile} className={`${btn.secondary} w-full`}>{busy === "offer" ? "Reading the offer…" : "Send offer"}</button>
            </form>
          )}

          {data.job_card && (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <p>{data.job_card.problem_summary}</p>
              <p className="text-slate-600">{data.job_card.urgency_reason}</p>
              <ul className="space-y-3">
                {data.job_card.checklist.map((item) => <li key={item} className="flex gap-3"><span className="text-slate-500">☐</span>{item}</li>)}
              </ul>
            </div>
          )}
          {msg && <p className="text-sm text-slate-700">{msg}</p>}
        </div>
      )}
    </PhoneFrame>
  );
}
