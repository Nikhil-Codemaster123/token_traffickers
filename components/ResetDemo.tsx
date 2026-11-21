"use client";

import { useState } from "react";
import { btn, inputClass } from "./ui";

/** Deletes demo cases and events and re-creates free slots relative to now (keeps the 2 historical repairs). */
export function ResetDemo() {
  const [secret, setSecret] = useState("");
  const [state, setState] = useState<string | null>(null);

  async function reset() {
    setState("Resetting…");
    try {
      const res = await fetch("/api/admin/reset", { method: "POST", headers: { "x-agent-secret": secret } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setState(`Done. Free slots: ${json.slots.map((s: { label: string }) => s.label).slice(0, 3).join(" · ")} …`);
    } catch (e) {
      setState(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="password"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        placeholder="AGENT_TOOL_SECRET"
        className={`${inputClass} h-10 w-full`}
      />
      <button onClick={reset} className={btn.secondary}>Reset demo data</button>
      {state && <p className="text-xs text-slate-600">{state}</p>}
    </div>
  );
}
