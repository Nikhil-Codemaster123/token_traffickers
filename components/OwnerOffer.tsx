"use client";

import { useState } from "react";
import { btn, PhoneFrame, Spinner } from "./ui";
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
      <div className="space-y-4 p-5">
        {!data && (error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : <Spinner />)}
        {data && (
          <>
            <div>
              <h1 className="text-lg font-semibold">Heating repair offer</h1>
              <p className="text-sm text-slate-600">{data.address}</p>
            </div>
            <p className="text-sm">{data.summary}</p>
            <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-medium">{data.firm} · {data.offer.number}</p>
              <dl className="space-y-1">
                <div className="flex justify-between gap-3"><dt>Offer total (gross)</dt><dd className="font-semibold">{euros.format(data.offer.amount_eur)}</dd></div>
                <div className="flex justify-between gap-3"><dt>Approval limit</dt><dd>{euros.format(data.limit)}</dd></div>
              </dl>
              <a href={data.offer.file_url} target="_blank" rel="noreferrer" className="inline-block py-2 text-indigo-700 underline">Open offer PDF</a>
            </div>
            {data.approved ? (
              <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Approved by the owner.</p>
            ) : data.canApprove ? (
              <button disabled={busy} onClick={approve} className={`${btn.success} min-h-11 w-full`}>{busy ? "Approving…" : "Approve"}</button>
            ) : (
              <p className="text-sm text-slate-600">This offer is no longer awaiting approval.</p>
            )}
            {actionError && <p role="alert" className="text-sm text-rose-700">{actionError}</p>}
          </>
        )}
      </div>
    </PhoneFrame>
  );
}
