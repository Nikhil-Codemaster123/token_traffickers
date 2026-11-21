"use client";

import { useState } from "react";
import { btn, Icon, meta, OfferLimitBar, phoneCard, PhoneFrame, phoneHero, Spinner } from "./ui";
import { post, usePoll } from "./usePoll";

type OfferView = {
  address: string;
  summary: string | null;
  firm: string;
  offer: { number: string; amount_eur: number; file_url: string };
  limit: number;
  approved: boolean;
  canApprove: boolean;
};

const euros = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

export function OwnerOffer({ token }: { token: string }) {
  const url = `/api/owner/${token}`;
  const { data, error, reload } = usePoll<OfferView>(url);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function approve() {
    setBusy(true);
    setActionError(null);
    try {
      await post(url);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PhoneFrame label="Owner approval">
      <div className="flex flex-col gap-4 p-3 sm:p-4">
        {!data && (error ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200 ring-inset">{error}</p> : <div className="p-2"><Spinner /></div>)}
        {data && (
          <>
            <header className={`${phoneHero} order-first`}>
              <p className={meta}>{data.address}</p>
              <h1 className="text-2xl leading-tight font-semibold tracking-tight text-slate-950">Heating repair offer</h1>
            </header>
            <div className={`${phoneCard} space-y-4`}>
              <p className="font-semibold wrap-anywhere text-slate-950">{data.firm} · <span className="font-mono text-xs text-slate-600">{data.offer.number}</span></p>
              <div className="space-y-4 rounded-xl bg-indigo-50/75 p-4 ring-1 ring-indigo-100 ring-inset">
                <dl className="space-y-3">
                  <div className="space-y-2"><dt className={meta}>Offer total (gross)</dt><dd className="text-4xl leading-none font-semibold tracking-tight wrap-anywhere text-indigo-900 tabular-nums">{euros.format(data.offer.amount_eur)}</dd></div>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><dt className={meta}>Approval limit</dt><dd className="font-semibold wrap-anywhere">{euros.format(data.limit)}</dd></div>
                </dl>
                <OfferLimitBar amount={data.offer.amount_eur} limit={data.limit} />
              </div>
              <p className="wrap-anywhere">{data.summary}</p>
              <a href={data.offer.file_url} target="_blank" rel="noreferrer" className={`${btn.secondary} w-full`}><Icon name="document" />Open offer PDF</a>
            </div>
            {data.approved ? (
              <p role="status" className="-order-1 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-800 ring-1 ring-emerald-200 ring-inset"><Icon name="check" />Approved by the owner.</p>
            ) : data.canApprove ? (
              <button disabled={busy} onClick={approve} className={`${btn.success} w-full py-3.5`}><Icon name="check" />{busy ? "Approving…" : "Approve"}</button>
            ) : (
              <p className="-order-1 rounded-xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-900/5">This offer is no longer awaiting approval.</p>
            )}
            {actionError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200 ring-inset">{actionError}</p>}
          </>
        )}
      </div>
    </PhoneFrame>
  );
}
