"use client";

import { useEffect, useRef, useState } from "react";

type Turn = { who: "you" | "priya"; text: string };
type Extracted = {
  name?: string;
  classLevel?: string;
  subjects?: string[];
  area?: string;
  city?: string;
};

const PARENT_SAMPLE = "Mujhe 8th class ke liye Rohini mein tutor chahiye";
const TUTOR_SAMPLE = "Main tutor hoon, leads kaise milenge?";

function pickVoice(text: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined") return null;
  const hindi = /[\u0900-\u097F]/.test(text);
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const score = (voice: SpeechSynthesisVoice) => {
    const blob = `${voice.lang} ${voice.name}`;
    if (hindi && /hi-IN|Hindi/i.test(blob)) return /female|heera|swara|google/i.test(blob) ? 3 : 2;
    if (!hindi && /en-IN|Indian/i.test(blob)) return /female|heera|google/i.test(blob) ? 3 : 2;
    return 0;
  };
  return voices.filter((v) => score(v) > 0).sort((a, b) => score(b) - score(a))[0] ?? null;
}

function speakInBrowser(text: string, onDone?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onDone?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const hindi = /[\u0900-\u097F]/.test(text);
  const match = pickVoice(text);
  if (hindi && !match) {
    onDone?.();
    return;
  }
  if (match) utter.voice = match;
  utter.lang = hindi ? "hi-IN" : "en-IN";
  utter.rate = 1;
  utter.onend = () => onDone?.();
  utter.onerror = () => onDone?.();
  window.speechSynthesis.speak(utter);
}

export default function VoiceDemoPage() {
  const [callId] = useState(() => `demo-${Date.now()}`);
  const [fromPhone, setFromPhone] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [micLang, setMicLang] = useState<"hi-IN" | "en-IN">("hi-IN");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [extracted, setExtracted] = useState<Extracted>({});
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Ready");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listenAfterRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis?.getVoices();
    const refresh = () => window.speechSynthesis.getVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", refresh);
  }, []);

  async function playPriya(say: string, audioUrl?: string | null) {
    window.speechSynthesis?.cancel();
    const player = audioRef.current;
    if (audioUrl && player) {
      try {
        const res = await fetch(audioUrl);
        const type = res.headers.get("content-type") || "";
        if (res.ok && type.includes("audio")) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          player.src = url;
          setStatus("Priya speaking");
          await player.play();
          return;
        }
      } catch {
        /* Chrome Hindi voice below */
      }
    }
    setStatus("Priya speaking");
    speakInBrowser(say, () => {
      setStatus("Ready");
      if (listenAfterRef.current) startMic();
    });
  }

  async function sendCallerText(text: string, listenAfter = false) {
    const line = text.trim();
    setError("");
    setBusy(true);
    listenAfterRef.current = listenAfter;
    if (line) setTurns((prev) => [...prev, { who: "you", text: line }]);
    setStatus(line ? "Priya thinking" : "Connecting");
    try {
      const res = await fetch("/api/voice/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId, from: fromPhone || "919876543210", text: line }),
      });
      const data = (await res.json()) as {
        say?: string;
        audioUrl?: string | null;
        error?: string;
        role?: string | null;
        extracted?: Extracted;
      };
      const say = data.say?.trim();
      if (!say) {
        setError(data.error || "Priya did not reply. Try again.");
        setStatus("Ready");
        return;
      }
      if (data.role) setRole(data.role);
      if (data.extracted) setExtracted(data.extracted);
      setTurns((prev) => [...prev, { who: "priya", text: say }]);
      await playPriya(say, data.audioUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Call failed");
      setStatus("Ready");
    } finally {
      setBusy(false);
      setTyped("");
    }
  }

  function startMic() {
    const w = window as unknown as {
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onstart: (() => void) | null;
        onend: (() => void) | null;
        onerror: ((event: { error?: string }) => void) | null;
        onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null;
        start: () => void;
      };
    };
    const SpeechRecognition = w.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Chrome mic is needed for voice. Typing still works.");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = micLang;
    rec.interimResults = false;
    rec.onstart = () => {
      setListening(true);
      setStatus("Listening");
    };
    rec.onend = () => {
      setListening(false);
      setStatus((prev) => (prev === "Listening" ? "Ready" : prev));
    };
    rec.onerror = (event) => {
      setListening(false);
      if (event.error === "not-allowed") setError("Allow microphone in Chrome, then try again.");
    };
    rec.onresult = (event) => {
      const said = event.results[0]?.[0]?.transcript || "";
      if (said) void sendCallerText(said, true);
    };
    rec.start();
  }

  const facts = [
    role,
    extracted.classLevel,
    extracted.subjects?.join(", "),
    extracted.area,
    extracted.city,
    extracted.name,
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-[#F0F4F8] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-lg space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#2D9E6B]">ApnaTutorHub · live demo</p>
          <h1 className="font-heading text-2xl font-extrabold text-[#0F2540]">Talk to Priya</h1>
          <p className="mt-1 text-sm text-slate-600">
            Same coordinator brain as production. Use Chrome, allow the mic, then start the call. This is not the
            08062180653 helpline.
          </p>
        </div>

        <section className="overflow-hidden rounded-3xl bg-[#0F2540] text-white shadow-lg">
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2D9E6B] text-lg font-extrabold">
              P
            </span>
            <div className="min-w-0">
              <p className="font-heading text-lg font-extrabold">Priya</p>
              <p className="text-xs text-white/70">{status}</p>
            </div>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto bg-[#0A192F] px-4 py-4">
            {turns.length === 0 && (
              <p className="text-sm text-white/60">Start the call, then speak or type like a parent or a tutor.</p>
            )}
            {turns.map((turn, i) => (
              <p
                key={`${turn.who}-${i}`}
                className={
                  turn.who === "priya"
                    ? "rounded-2xl rounded-tl-sm bg-[#1E3A5F] px-3 py-2 text-sm"
                    : "rounded-2xl rounded-tr-sm bg-[#2D9E6B] px-3 py-2 text-sm"
                }
              >
                <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                  {turn.who === "priya" ? "Priya" : "You"}
                </span>
                <span className="mt-0.5 block">{turn.text}</span>
              </p>
            ))}
          </div>
          {facts.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-3">
              {facts.map((fact) => (
                <span key={fact} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold">
                  {fact}
                </span>
              ))}
            </div>
          )}
        </section>

        <label className="block text-sm font-semibold text-[#0F2540]">
          Your mobile (for a real enquiry save)
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal"
            inputMode="tel"
            placeholder="98xxxxxxxx"
            value={fromPhone}
            onChange={(e) => setFromPhone(e.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full bg-[#2D9E6B] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            disabled={busy}
            onClick={() => void sendCallerText("", true)}
          >
            Start call
          </button>
          <button
            type="button"
            className="rounded-full border border-[#0F2540] px-4 py-2.5 text-sm font-bold text-[#0F2540]"
            onClick={startMic}
          >
            {listening ? "Listening…" : micLang === "hi-IN" ? "Speak Hindi" : "Speak English"}
          </button>
          <button
            type="button"
            className="rounded-full bg-white px-3 py-2.5 text-xs font-bold text-slate-600"
            onClick={() => setMicLang((prev) => (prev === "hi-IN" ? "en-IN" : "hi-IN"))}
          >
            Mic: {micLang === "hi-IN" ? "Hindi" : "English"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#0F2540] shadow-sm"
            disabled={busy}
            onClick={() => void sendCallerText(PARENT_SAMPLE, true)}
          >
            Try parent
          </button>
          <button
            type="button"
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#0F2540] shadow-sm"
            disabled={busy}
            onClick={() => void sendCallerText(TUTOR_SAMPLE, true)}
          >
            Try tutor
          </button>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim()) void sendCallerText(typed, false);
          }}
        >
          <input
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2"
            placeholder={PARENT_SAMPLE}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <button type="submit" className="rounded-full bg-[#0F2540] px-4 py-2 text-sm font-bold text-white" disabled={busy}>
            Send
          </button>
        </form>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <audio
          ref={audioRef}
          className="hidden"
          onEnded={() => {
            setStatus("Ready");
            if (listenAfterRef.current) startMic();
          }}
          onError={() => setStatus("Ready")}
        />
      </div>
    </main>
  );
}
