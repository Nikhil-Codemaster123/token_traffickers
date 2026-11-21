"use client";

import Link from "next/link";
import Script from "next/script";
import { createElement, useEffect, useRef, useState } from "react";
import { Timeline, type Ev } from "./Timeline";
import { btn, Card, inputClass, linkClass, meta, StatusChip, surface } from "./ui";
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
    <div className="line-page mx-auto grid max-w-6xl items-start gap-6 px-4 py-8 sm:px-6 md:grid-cols-2 lg:px-8">
      <section className={`${surface} p-5 sm:p-6`}>
        <header className="-mx-5 -mt-5 mb-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-t-2xl border-b border-indigo-100 bg-indigo-50/70 p-5 sm:-mx-6 sm:-mt-6 sm:p-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Incoming call <span className="text-sm font-normal tracking-normal text-slate-600">· property management line</span>
          </h1>
          {agentId ? (
            <button onClick={() => setMode(mode === "agent" ? "fallback" : "agent")} className={`${linkClass} min-h-10 cursor-pointer text-xs`}>
              {mode === "agent" ? "use fallback loop" : "use ElevenLabs agent"}
            </button>
          ) : (
            <span className="text-xs font-medium text-slate-500">fallback loop</span>
          )}
        </header>
        <label className="mb-4 block">
          <span className={meta}>Caller (matched by phone number)</span>
          <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={`${inputClass} mt-2 h-10 w-full`}>
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
    <div className="space-y-3">
      <Script src="https://unpkg.com/@elevenlabs/convai-widget-embed" strategy="afterInteractive" />
      <p className="border-t border-slate-200 pt-4 text-pretty">Start the call in the ElevenLabs widget. Its tools write into centrix live (right).</p>
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {!live ? (
          <button onClick={start} className={btn.success}><span aria-hidden="true" className="voice-mark" />Call the line</button>
        ) : (
          <>
            <button onClick={listen} disabled={busy || listening} className={btn.primary}>{listening ? "Listening…" : "Speak"}</button>
            <button onClick={hangUp} className={btn.danger}>Hang up</button>
          </>
        )}
        <select value={lang} onChange={(e) => setLang(e.target.value)} className={`${inputClass} h-10`}>
          <option value="en-GB">English</option>
          <option value="de-DE">Deutsch</option>
        </select>
        {busy && <span className="text-sm text-slate-500">agent is thinking…</span>}
      </div>

      <div className="max-h-80 space-y-3 overflow-y-auto border-t border-slate-200 pt-4">
        {msgs.length === 0 && <p className="text-sm text-pretty text-slate-600">Press “Call the line”, then talk (Chrome) or type.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.who === "caller" ? "justify-end" : "justify-start"}`}>
            <p className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-6 wrap-anywhere ${m.who === "caller" ? "rounded-br-sm bg-indigo-600 text-white" : "rounded-bl-sm bg-slate-50 text-slate-800"}`}>{m.text}</p>
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
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="…or type what the caller says" className={`${inputClass} h-10 flex-1`} />
          <button disabled={busy} className={btn.secondary}>Send</button>
        </form>
      )}
      {err && <p className="text-sm text-rose-700">{err}</p>}

      {trace.length > 0 && (
        <div>
          <h3 className={`${meta} mb-3`}>Tool calls</h3>
          <ol className="space-y-3 border-l border-slate-200 pl-3">
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
      title="Live in centrix"
      aside={latest && <Link href={`/centrix/case/${latest.case_id}`} className={`${linkClass} text-xs`}>open case ↗</Link>}
    >
      {!latest ? (
        <p className="text-sm text-slate-500">No case for this caller yet.</p>
      ) : (
        <div className="space-y-3">
          <div className="-mx-5 mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-y border-slate-100 bg-slate-50/60 px-5 py-3 text-sm sm:-mx-6 sm:px-6">
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
