"use client";

import Link from "next/link";
import Script from "next/script";
import { createElement, useEffect, useRef, useState } from "react";
import { Timeline, type Ev } from "./Timeline";
import { btn, Card, EmptyState, Icon, iconTile, inputClass, linkClass, meta, pageWidth, StatusChip, surface } from "./ui";
import { post, usePoll } from "./usePoll";

type Resident = { contact_id: string; name: string; unit_id: string | null; language: string | null };

/**
 * The tenant's phone call. Agent mode: the ElevenLabs widget (its webhook tools call /api/agent/tools/*).
 * Fallback mode: browser speech-to-text → /api/chat (OpenAI + the same tools) → /api/tts (ElevenLabs voice) or browser voice.
 * The caller picker stands in for caller-ID matching on a real phone line.
 */
export function CallLine({ agentId }: { agentId?: string }) {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [contactId, setContactId] = useState("c_203");
  const [mode, setMode] = useState<"agent" | "fallback">(agentId ? "agent" : "fallback");

  useEffect(() => {
    fetch("/api/residents")
      .then((r) => r.json())
      .then((j) => Array.isArray(j) && setResidents(j))
      .catch(() => {});
  }, []);

  return (
    <div className={`line-page ${pageWidth} grid items-start gap-6 py-6 sm:py-8 md:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]`}>
      <section className={`${surface} p-5 sm:p-6`}>
        <header className="-mx-5 -mt-5 mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 rounded-t-2xl border-b border-indigo-100 bg-linear-to-br from-indigo-50 to-white p-5 sm:-mx-6 sm:-mt-6 sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className={iconTile}><Icon name="phone" /></span>
            <h1 className="text-2xl leading-8 font-semibold tracking-tight text-slate-950">
              Incoming call <span className="block text-sm leading-6 font-normal tracking-normal text-slate-600">· property management line</span>
            </h1>
          </div>
          {agentId ? (
            <button onClick={() => setMode(mode === "agent" ? "fallback" : "agent")} className={`${btn.secondary} text-xs`}>
              {mode === "agent" ? "use fallback loop" : "use ElevenLabs agent"}
            </button>
          ) : (
            <span className="rounded-full bg-white px-3 py-1 text-xs leading-5 font-semibold text-slate-600 ring-1 ring-slate-200">fallback loop</span>
          )}
        </header>
        <label className="mb-4 block rounded-xl bg-slate-50 p-4 ring-1 ring-slate-900/5">
          <span className={`${meta} flex items-center gap-2`}><Icon name="user" />Caller (matched by phone number)</span>
          <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={`${inputClass} mt-3 min-h-11 w-full`}>
            {residents.length === 0 && <option value="c_203">Jonas Weber · unit_2a</option>}
            {residents.map((r) => (
              <option key={r.contact_id} value={r.contact_id}>{r.name} · {r.unit_id}</option>
            ))}
            <option value="unknown">Unknown number</option>
          </select>
        </label>
        {mode === "agent" && agentId ? <AgentWidget key={contactId} agentId={agentId} contactId={contactId} /> : <VoiceLoop key={contactId} contactId={contactId} />}
      </section>
      <LiveCase contactId={contactId} />
    </div>
  );
}

function AgentWidget({ agentId, contactId }: { agentId: string; contactId: string }) {
  return (
    <div className="space-y-4">
      <Script src="https://unpkg.com/@elevenlabs/convai-widget-embed" strategy="afterInteractive" />
      <p className="rounded-xl bg-indigo-50/70 p-4 text-pretty text-slate-700">Start the call in the ElevenLabs widget. Its tools write into centrix live (right).</p>
      {createElement("elevenlabs-convai", {
        "agent-id": agentId,
        "dynamic-variables": JSON.stringify({ contact_id: contactId }),
        variant: "expanded",
      })}
    </div>
  );
}

// ---------- fallback loop ----------

type Msg = { who: "caller" | "agent"; text: string };
type Trace = { tool: string; args: unknown; result: unknown };
type Recognizer = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
};

function speechRecognition(): (new () => Recognizer) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognizer; webkitSpeechRecognition?: new () => Recognizer };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function VoiceLoop({ contactId }: { contactId: string }) {
  const [lang, setLang] = useState("en-GB");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [trace, setTrace] = useState<Trace[]>([]);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const previous = useRef<string | undefined>(undefined);
  const liveRef = useRef(false);
  const recRef = useRef<Recognizer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function speak(reply: string) {
    try {
      const res = await fetch("/api/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: reply }) });
      if (!res.ok) throw new Error("no tts");
      const url = URL.createObjectURL(await res.blob());
      await new Promise<void>((resolve) => {
        const a = new Audio(url);
        audioRef.current = a;
        a.onended = () => resolve();
        a.onerror = () => resolve();
        a.play().catch(() => resolve());
      });
    } catch {
      await new Promise<void>((resolve) => {
        if (!("speechSynthesis" in window)) return resolve();
        const u = new SpeechSynthesisUtterance(reply);
        u.lang = lang;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      });
    }
  }

  function listen() {
    const SR = speechRecognition();
    if (!SR) {
      setErr("Speech recognition needs Chrome or Edge. Type instead.");
      return;
    }
    recRef.current?.abort();
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const said = e.results[0]?.[0]?.transcript?.trim();
      if (said) void send(said);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  async function send(message: string, silent = false) {
    if (!silent) setMsgs((m) => [...m, { who: "caller", text: message }]);
    setBusy(true);
    setErr(null);
    try {
      const res = await post<{ reply: string; response_id: string; trace: Trace[] }>("/api/chat", {
        message,
        contact_id: contactId,
        previous_response_id: previous.current,
      });
      previous.current = res.response_id;
      setTrace((t) => [...t, ...res.trace]);
      setBusy(false);
      if (res.reply) {
        setMsgs((m) => [...m, { who: "agent", text: res.reply }]);
        await speak(res.reply);
      }
      if (liveRef.current) listen();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  function start() {
    liveRef.current = true;
    previous.current = undefined;
    setLive(true);
    setMsgs([]);
    setTrace([]);
    void send("(call connected)", true);
  }

  function hangUp() {
    liveRef.current = false;
    setLive(false);
    recRef.current?.abort();
    audioRef.current?.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {!live ? (
          <button onClick={start} className={btn.success}><Icon name="phone" />Call the line</button>
        ) : (
          <>
            <button onClick={listen} disabled={busy || listening} className={btn.primary}><Icon name="microphone" />{listening ? "Listening…" : "Speak"}</button>
            <button onClick={hangUp} className={btn.danger}>Hang up</button>
          </>
        )}
        <select value={lang} onChange={(e) => setLang(e.target.value)} className={`${inputClass} min-h-11`}>
          <option value="en-GB">English</option>
          <option value="de-DE">Deutsch</option>
        </select>
        {busy && <span className="text-sm text-slate-500">agent is thinking…</span>}
      </div>

      <div className="max-h-80 space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-4 ring-1 ring-slate-900/5 ring-inset">
        {msgs.length === 0 && <p className="flex items-start gap-3 text-sm text-pretty text-slate-600"><Icon name="activity" className="mt-1 size-4 text-indigo-700" />Press “Call the line”, then talk (Chrome) or type.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.who === "caller" ? "justify-end" : "justify-start"}`}>
            <p className={`max-w-[90%] rounded-2xl px-4 py-2 text-sm leading-6 wrap-anywhere ${m.who === "caller" ? "rounded-br-sm bg-indigo-600 text-white" : "rounded-bl-sm bg-white text-slate-800 ring-1 ring-slate-900/8"}`}>{m.text}</p>
          </div>
        ))}
      </div>

      {live && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) void send(text.trim());
            setText("");
          }}
          className="flex gap-2"
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="…or type what the caller says" className={`${inputClass} min-h-11 flex-1`} />
          <button disabled={busy} className={btn.secondary}>Send</button>
        </form>
      )}
      {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200 ring-inset">{err}</p>}

      {trace.length > 0 && (
        <div className="rounded-xl bg-indigo-50/65 p-4 ring-1 ring-indigo-100 ring-inset">
          <h3 className={`${meta} mb-3`}>Tool calls</h3>
          <ol className="space-y-3 border-l border-indigo-200 pl-3">
            {trace.map((t, i) => (
              <li key={i} className="font-mono text-xs leading-5 wrap-anywhere text-slate-600">
                <span className="text-indigo-700">{t.tool}</span> → {JSON.stringify(t.result).slice(0, 120)}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ---------- live case (what centrix shows while the call runs) ----------

type CaseItem = { case_id: string; status: string; partner_name: string | null; appointment: string; unit_id: string | null; scope: string };

function LiveCase({ contactId }: { contactId: string }) {
  const { data } = usePoll<CaseItem[]>(`/api/cases?contact_id=${encodeURIComponent(contactId)}`, 2000);
  const latest = data?.[0];
  const { data: detail } = usePoll<{ events: Ev[] }>(latest ? `/api/cases/${latest.case_id}?view=manager` : null, 2000);

  return (
    <Card
      title={<span className="flex items-center gap-3"><span aria-hidden="true" className="ml-1 size-2 shrink-0 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />Live in centrix</span>}
      aside={latest && <Link href={`/centrix/case/${latest.case_id}`} className={`${linkClass} inline-flex min-h-11 items-center text-xs`}>open case ↗</Link>}
    >
      {!latest ? (
        <EmptyState className="min-h-36 flex-col justify-center rounded-xl bg-slate-50 p-4 text-center">No case for this caller yet.</EmptyState>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-slate-50 px-3 py-3 text-sm wrap-anywhere ring-1 ring-slate-900/5 ring-inset">
            <StatusChip status={latest.status} />
            <span className="text-slate-600">{latest.unit_id}{latest.scope === "building" ? " · whole building" : ""}</span>
            {latest.partner_name && <span className="text-slate-600">· {latest.partner_name}</span>}
            {latest.appointment && <span className="text-slate-600">· {latest.appointment}</span>}
          </div>
          <Timeline events={detail?.events ?? []} compact />
        </div>
      )}
    </Card>
  );
}
