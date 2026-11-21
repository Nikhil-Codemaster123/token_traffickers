import Link from "next/link";
import { ResetDemo } from "@/components/ResetDemo";
import { Card, meta, surface } from "@/components/ui";

// Demo hub: where each part of the flow lives, which modes are on, and the reset before a dry run.
export default function Home() {
  const agentMode = Boolean(process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID);
  const notify = process.env.NOTIFY_MODE === "n8n" ? "n8n (WhatsApp / email)" : "log only (timeline)";

  const screens = [
    { href: "/line", title: "1 · Tenant calls", text: "Voice agent takes the heating problem, picks the firm, books a slot." },
    { href: "/centrix", title: "2 · centrix inbox", text: "Cases, timeline, why this firm, approval, invoice, write-back." },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Broken heater → craftsman</h1>
        <p className="max-w-2xl">A partner plugged into centrix: one tenant call, the craftsman gets the job, the result lands on the unit.</p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        {screens.map((s) => (
          <Link key={s.href} href={s.href} className={`group ${surface} flex items-center justify-between gap-6 p-5 transition-colors hover:bg-indigo-50 sm:p-6`}>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-950">{s.title}</h2>
              <p>{s.text}</p>
            </div>
            <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 group-hover:bg-white">
              <span className="size-2 -translate-x-px rotate-45 border-t-2 border-r-2" />
            </span>
          </Link>
        ))}
      </div>
      <p className="border-l-2 border-indigo-200 pl-4 text-slate-600">
        The tenant portal and the craftsman&apos;s job card open from the links in each case&apos;s timeline (the WhatsApp messages).
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card title="Modes">
          <dl className="space-y-3 [&_dd]:min-w-0 [&_dd]:text-right [&_dd]:font-medium [&_dd]:wrap-anywhere">
            <div className="flex items-baseline justify-between gap-4"><dt className={meta}>Voice</dt><dd>{agentMode ? "ElevenLabs agent" : "Fallback loop (OpenAI + TTS)"}</dd></div>
            <div className="flex items-baseline justify-between gap-4"><dt className={meta}>Messages</dt><dd>{notify}</dd></div>
            <div className="flex items-baseline justify-between gap-4"><dt className={meta}>Models</dt><dd>{process.env.OPENAI_MODEL_FAST || "gpt-6-luna"} / {process.env.OPENAI_MODEL_AGENT || "gpt-6-luna"}</dd></div>
          </dl>
        </Card>
        <Card title="Before every dry run">
          <ResetDemo />
        </Card>
      </div>
    </div>
  );
}
