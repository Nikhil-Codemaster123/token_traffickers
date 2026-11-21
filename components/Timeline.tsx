import { fmtTime } from "@/lib/time";
import { ACTOR, Linkify } from "./ui";

export type Ev = {
  event_id: number;
  type: string;
  actor: string;
  channel: string | null;
  text: string | null;
  occurred_at: string;
};

const CHANNEL: Record<string, string> = { voice: "call", whatsapp: "WhatsApp", email: "email", portal: "portal", centrix: "centrix" };

/** The case's communication log: every call, message and status change, in order. */
export function Timeline({ events, compact = false }: { events: Ev[]; compact?: boolean }) {
  if (events.length === 0) return <p className="text-sm text-slate-500">Nothing yet.</p>;
  return (
    <ol className="pl-1">
      {events.map((e) => {
        const a = ACTOR[e.actor] ?? { label: e.actor, dot: "bg-slate-400" };
        return (
          <li key={e.event_id} className={`relative flex gap-4 before:absolute before:top-2 before:left-[3.5px] before:h-full before:w-px before:bg-slate-200 last:pb-0 last:before:hidden ${compact ? "pb-4" : "pb-5"}`}>
            <span className={`relative mt-1.5 size-2 shrink-0 rounded-full ring-4 ring-white ${a.dot}`} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-slate-500">
                <span className="font-semibold text-slate-800">{a.label}</span>
                {e.channel && <span>· {CHANNEL[e.channel] ?? e.channel}</span>}
                <time className="ml-auto font-mono text-xs tabular-nums">{fmtTime(e.occurred_at)}</time>
              </div>
              <p className={`mt-1 wrap-anywhere text-slate-700 ${compact ? "text-xs leading-5" : "text-sm leading-6"}`}>
                <Linkify text={e.text ?? e.type} />
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
