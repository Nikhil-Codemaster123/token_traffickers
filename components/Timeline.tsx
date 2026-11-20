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
    <ol className={compact ? "space-y-2" : "space-y-3"}>
      {events.map((e) => {
        const a = ACTOR[e.actor] ?? { label: e.actor, dot: "bg-slate-400" };
        return (
          <li key={e.event_id} className="flex gap-3">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${a.dot}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-medium text-slate-700">{a.label}</span>
                {e.channel && <span>· {CHANNEL[e.channel] ?? e.channel}</span>}
                <span className="ml-auto tabular-nums">{fmtTime(e.occurred_at)}</span>
              </div>
              <p className={`break-words text-slate-800 ${compact ? "text-xs" : "text-sm"}`}>
                <Linkify text={e.text ?? e.type} />
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
