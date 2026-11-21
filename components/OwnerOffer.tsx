"use client";

import { useState } from "react";
import { btn, linkClass, meta, PhoneFrame, Spinner } from "./ui";
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
      <div className="flex flex-col gap-6 p-5 sm:p-6">
        {!data && (error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : <Spinner />)}
        {data && (
          <>
            <header className="order-first space-y-2">
              <p className={meta}>{data.address}</p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Heating repair offer</h1>
            </header>
            <div className="space-y-3">
              <p className="font-medium text-slate-900">{data.firm} · {data.offer.number}</p>
              <dl className="space-y-3 border-y border-slate-100 py-4">
                <div className="space-y-1"><dt className={meta}>Offer total (gross)</dt><dd className="text-3xl font-semibold tracking-tight text-indigo-700 tabular-nums">{euros.format(data.offer.amount_eur)}</dd></div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3"><dt className={meta}>Approval limit</dt><dd className="font-medium">{euros.format(data.limit)}</dd></div>
              </dl>
              <p className="wrap-anywhere">{data.summary}</p>
              <a href={data.offer.file_url} target="_blank" rel="noreferrer" className={`${linkClass} inline-flex min-h-11 items-center`}>Open offer PDF</a>
            </div>
            {data.approved ? (
              <p role="status" className="-order-1 rounded-lg bg-emerald-50 px-4 py-3 font-medium text-emerald-800">Approved by the owner.</p>
            ) : data.canApprove ? (
              <button disabled={busy} onClick={approve} className={`${btn.success} min-h-11 w-full`}>{busy ? "Approving…" : "Approve"}</button>
            ) : (
              <p className="-order-1 text-sm text-slate-600">This offer is no longer awaiting approval.</p>
            )}
            {actionError && <p role="alert" className="text-sm text-rose-700">{actionError}</p>}
          </>
        )}
      </div>
    </PhoneFrame>
  );
}
