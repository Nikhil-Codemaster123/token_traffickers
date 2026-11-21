"use client";

import { useState } from "react";
import { shrinkImage } from "./imageUpload";
import { btn, chip, Icon, iconTile, inputClass, linkClass, meta, phoneCard, PhoneFrame, phoneHero, Spinner } from "./ui";
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
      {!data && (error ? <p className="m-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200 ring-inset">{error}</p> : <div className="p-5"><Spinner /></div>)}
      {data && (
        <div className="space-y-4 p-3 sm:p-4">
          <header className={phoneHero}>
            <p className={meta}>{data.partner} · new job</p>
            <h1 className="text-2xl leading-tight font-semibold tracking-tight wrap-anywhere text-slate-950">{data.job_card?.headline ?? "Preparing the job card…"}</h1>
            {data.waiting_for_owner && <p role="status" className={`${chip} bg-amber-50 text-amber-800 ring-amber-200`}>Waiting for owner</p>}
            {["completed", "closed"].includes(data.status) && <p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 font-medium text-emerald-800 ring-1 ring-emerald-200 ring-inset"><Icon name="check" className="mt-1 size-4" />Done. The invoice is on the case. Thank you!</p>}
            {data.status === "stopped" && <p className="rounded-xl bg-rose-50 p-3 font-medium text-rose-800 ring-1 ring-rose-200 ring-inset">This job was cancelled by the property manager.</p>}
          </header>

          {data.accepted && (
            <div className={`${phoneCard} divide-y divide-slate-100 [&>div+div]:pt-2 [&>div:not(:last-child)]:pb-2`}>
              <div className="flex items-baseline justify-between gap-4"><span className={meta}>Flat</span><span className="font-mono text-xs">{data.flat}</span></div>
              {data.tenant && (
                <div className="flex items-baseline justify-between gap-4">
                  <span className={meta}>Tenant</span>
                  <span className="min-w-0 text-right font-medium wrap-anywhere">{data.tenant.name}{data.tenant.phone && <> · <a href={`tel:${data.tenant.phone.replace(/\s/g, "")}`} className={`${linkClass} inline-flex min-h-11 items-center`}>{data.tenant.phone}</a></>}</span>
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
            <div className={`${phoneCard} space-y-3`}>
              <h2 className="text-base font-semibold tracking-tight text-slate-950">Job done?</h2>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you did (e.g. ignition electrode replaced)" className={`${inputClass} h-11 w-full`} />
              <label className={`${btn.secondary} relative w-full wrap-anywhere`}>
                <Icon name="document" />
                {file ? `Invoice: ${file.name}` : "Attach invoice (PDF or photo)"}
                <input type="file" accept="application/pdf,image/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
                <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Invoice no. (optional)" className={`${inputClass} h-11 w-full`} />
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="€ gross" className={`${inputClass} h-11 w-full`} />
              </div>
              <button disabled={!!busy} onClick={done} className={`${btn.success} w-full py-3.5`}>{busy === "done" ? "Reading the invoice…" : "Mark as done"}</button>
            </div>
          )}

          <div className={`${phoneCard} flex items-start gap-3`}>
            <span className={iconTile}><Icon name="building" /></span>
            <div className="min-w-0 space-y-1 wrap-anywhere">
              <div className="font-semibold text-slate-950">{data.street}</div>
              <div className="text-slate-600">
                {data.building.heating} {data.building.fuel} heating · built {data.building.year} · {data.scope === "building" ? "whole building" : "one flat"}
              </div>
              <div className="font-medium text-indigo-800">{data.appointment}</div>
            </div>
          </div>

          {data.status === "dispatched" && (
            <div className={`${phoneCard} space-y-3`}>
              <button disabled={!!busy} onClick={() => run("accept", () => post(`/api/job/${token}/accept`))} className={`${btn.success} w-full py-3.5`}>
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

          {data.status === "scheduled" && (
            <form onSubmit={sendOffer} className={`${phoneCard} space-y-3`}>
              <label className="block text-base font-semibold tracking-tight text-slate-950" htmlFor="offer-pdf">Offer PDF</label>
              <input id="offer-pdf" name="file" type="file" accept="application/pdf,.pdf" required disabled={!!busy}
                onChange={(e) => setOfferFile(e.target.files?.[0] ?? null)} className="block h-11 w-full cursor-pointer rounded-xl bg-[#7F93A7] text-sm text-slate-700 ring-1 ring-slate-400 ring-inset file:mr-3 file:h-11 file:cursor-pointer file:border-0 file:bg-indigo-50 file:px-3 file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 disabled:cursor-not-allowed" />
              <button disabled={!!busy || !offerFile} className={`${btn.secondary} w-full`}>{busy === "offer" ? "Reading the offer…" : "Send offer"}</button>
            </form>
          )}

          {data.job_card && (
            <div className={`${phoneCard} space-y-3 wrap-anywhere`}>
              <p>{data.job_card.problem_summary}</p>
              <p className="text-slate-600">{data.job_card.urgency_reason}</p>
              <ul className="space-y-2 border-t border-slate-100 pt-3">
                {data.job_card.checklist.map((item) => <li key={item} className="flex gap-3"><span className="text-slate-500">☐</span>{item}</li>)}
              </ul>
            </div>
          )}
          {msg && <p className="rounded-xl bg-indigo-50 p-3 text-sm text-slate-700 ring-1 ring-indigo-100 ring-inset">{msg}</p>}
        </div>
      )}
    </PhoneFrame>
  );
}
