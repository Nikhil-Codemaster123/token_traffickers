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
      <div className={surface}>
        <header className="flex items-center justify-between gap-8 rounded-t-2xl bg-[#2C2456] px-5 py-8 text-white sm:px-8">
          <div className="max-w-lg space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight text-[#E49A72]">centrix partner studio</h1>
            <p className="text-sm font-medium tracking-wide text-indigo-200">Broken heater → craftsman</p>
            <p className="max-w-[50ch] text-pretty text-indigo-100">A partner plugged into centrix: one tenant call, the craftsman gets the job, the result lands on the unit.</p>
          </div>
          <div aria-hidden="true" className="hidden shrink-0 sm:block">
            <div className="building-elevation">
              {[4, 12, 6].map((windows) => (
                <span key={windows}>
                  {Array.from({ length: windows }, (_, i) => <span key={i} />)}
                </span>
              ))}
            </div>
          </div>
        </header>
        <div className="grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {screens.map((s) => (
            <Link key={s.href} href={s.href} className="flex items-start justify-between gap-4 p-5 text-black transition-colors last:rounded-b-2xl hover:bg-[#D3D9DF] focus-visible:-outline-offset-4 sm:p-6 sm:first:rounded-bl-2xl sm:last:rounded-bl-none">
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-black">{s.title}</h2>
                <p className="max-w-[40ch] text-pretty text-black">{s.text}</p>
              </div>
              <span aria-hidden="true" className="entry-arrow mt-2 text-black" />
            </Link>
          ))}
        </div>
      </div>
      <p className="max-w-3xl text-pretty text-slate-600">
        The tenant portal and the craftsman&apos;s job card open from the links in each case&apos;s timeline (the WhatsApp messages).
      </p>

      <div className="grid gap-6 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
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
