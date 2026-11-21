import type { ComponentProps } from "react";
import { fmtTime } from "@/lib/time";
import { EmptyState, Icon, Linkify } from "./ui";

export type Ev = {
  event_id: number;
  type: string;
  actor: string;
  channel: string | null;
  text: string | null;
  occurred_at: string;
};

const CHANNEL: Record<string, string> = { voice: "call", whatsapp: "WhatsApp", email: "email", portal: "portal", centrix: "centrix" };
const ACTOR: Record<string, { label: string; icon: ComponentProps<typeof Icon>["name"]; tone: string }> = {
  tenant: { label: "Tenant", icon: "user", tone: "bg-slate-50 text-slate-700 ring-slate-200" },
  agent: { label: "Voice agent", icon: "microphone", tone: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  partner: { label: "Craftsman", icon: "wrench", tone: "bg-slate-50 text-slate-700 ring-slate-200" },
  manager: { label: "Manager", icon: "building", tone: "bg-slate-50 text-slate-700 ring-slate-200" },
  owner: { label: "Owner", icon: "key", tone: "bg-slate-50 text-slate-700 ring-slate-200" },
  system: { label: "Automation", icon: "bolt", tone: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
};

/** The case's communication log: every call, message and status change, in order. */
export function Timeline({ events, compact = false }: { events: Ev[]; compact?: boolean }) {
  if (events.length === 0) return <EmptyState>Nothing yet.</EmptyState>;
  return (
    <ol>
      {events.map((e) => {
        const a = ACTOR[e.actor] ?? { label: e.actor, icon: "activity" as const, tone: "bg-slate-50 text-slate-700 ring-slate-200" };
        return (
          <li key={e.event_id} className={`relative flex before:absolute before:top-4 before:left-[15px] before:h-full before:w-px before:bg-slate-200 last:pb-0 last:before:hidden ${compact ? "gap-3 pb-4" : "gap-4 pb-5"}`}>
            <span className={`relative z-0 grid size-8 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${a.tone}`}><Icon name={a.icon} /></span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-slate-500">
                <span className="font-semibold text-slate-800">{a.label}</span>
                {e.channel && <span>· {CHANNEL[e.channel] ?? e.channel}</span>}
                <time className="ml-auto font-mono text-xs tabular-nums">{fmtTime(e.occurred_at)}</time>
              </div>
              <p className={`mt-1 wrap-anywhere text-slate-700 ${compact ? "text-sm leading-5" : "text-sm leading-6"}`}>
                <Linkify text={e.text ?? e.type} />
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
