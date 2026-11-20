import Link from "next/link";
import { ResetDemo } from "@/components/ResetDemo";
import { Card } from "@/components/ui";

// Demo hub: where each part of the flow lives, which modes are on, and the reset before a dry run.
export default function Home() {
  const agentMode = Boolean(process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID);
  const notify = process.env.NOTIFY_MODE === "n8n" ? "n8n (WhatsApp / email)" : "log only (timeline)";

  const screens = [
    { href: "/line", title: "1 · Tenant calls", text: "Voice agent takes the heating problem, picks the firm, books a slot." },
    { href: "/centrix", title: "2 · centrix inbox", text: "Cases, timeline, why this firm, approval, invoice, write-back." },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Broken heater → craftsman</h1>
        <p className="mt-1 text-slate-600">A partner plugged into centrix: one tenant call, the craftsman gets the job, the result lands on the unit.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {screens.map((s) => (
          <Link key={s.href} href={s.href} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300">
            <div className="font-semibold">{s.title}</div>
            <p className="mt-1 text-sm text-slate-600">{s.text}</p>
          </Link>
        ))}
      </div>
      <p className="text-sm text-slate-500">
        The tenant portal and the craftsman&apos;s job card open from the links in each case&apos;s timeline (the WhatsApp messages).
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Modes">
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Voice</dt><dd>{agentMode ? "ElevenLabs agent" : "Fallback loop (OpenAI + TTS)"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Messages</dt><dd>{notify}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-slate-500">Models</dt><dd>{process.env.OPENAI_MODEL_FAST || "gpt-6-luna"} / {process.env.OPENAI_MODEL_AGENT || "gpt-6-luna"}</dd></div>
          </dl>
        </Card>
        <Card title="Before every dry run">
          <ResetDemo />
        </Card>
      </div>
    </div>
  );
}
