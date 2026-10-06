"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "incoming" | "incall" | "ended";
type Turn = { who: "you" | "priya"; text: string };
type Extracted = {
  name?: string;
  classLevel?: string;
  subjects?: string[];
  area?: string;
  city?: string;
};

type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: {
    results: ArrayLike<ArrayLike<{ transcript?: string }>>;
  }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

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

function formatTimer(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function VoiceDemoPage() {
  const [callId, setCallId] = useState(() => `demo-${Date.now()}`);
  const [phase, setPhase] = useState<Phase>("incoming");
  const [fromPhone, setFromPhone] = useState("");
  const [typed, setTyped] = useState("");
  const [listening, setListening] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [extracted, setExtracted] = useState<Extracted>({});
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Incoming call");
  const [elapsed, setElapsed] = useState(0);
  const [caption, setCaption] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recRef = useRef<Rec | null>(null);
  const inCallRef = useRef(false);
  const busyRef = useRef(false);
  const startedAtRef = useRef(0);
  const ringRef = useRef<{ ctx: AudioContext; stop: () => void } | null>(null);
  const sendRef = useRef<(text: string) => Promise<void>>(async () => undefined);
  const listenRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    window.speechSynthesis?.getVoices();
    const refresh = () => window.speechSynthesis.getVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", refresh);
  }, []);

  useEffect(() => {
    if (phase !== "incall") return;
    const id = window.setInterval(() => setElapsed(Date.now() - startedAtRef.current), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const stopRing = useCallback(() => {
    ringRef.current?.stop();
    ringRef.current = null;
  }, []);

  const startRing = useCallback(() => {
    stopRing();
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const gain = ctx.createGain();
      gain.gain.value = 0.08;
      gain.connect(ctx.destination);
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      o1.type = "sine";
      o2.type = "sine";
      o1.frequency.value = 440;
      o2.frequency.value = 480;
      o1.connect(gain);
      o2.connect(gain);
      o1.start();
      o2.start();
      const pulse = window.setInterval(() => {
        gain.gain.value = gain.gain.value > 0.02 ? 0.005 : 0.08;
      }, 400);
      ringRef.current = {
        ctx,
        stop: () => {
          window.clearInterval(pulse);
          try {
            o1.stop();
            o2.stop();
            void ctx.close();
          } catch {
            /* already closed */
          }
        },
      };
    } catch {
      /* autoplay blocked until Answer */
    }
  }, [stopRing]);

  useEffect(() => {
    if (phase === "incoming") startRing();
    else stopRing();
    return () => stopRing();
  }, [phase, startRing, stopRing]);

  const stopMic = useCallback(() => {
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setListening(false);
  }, []);

  const startMic = useCallback(() => {
    if (!inCallRef.current || busyRef.current) return;
    const w = window as unknown as { webkitSpeechRecognition?: new () => Rec };
    const SpeechRecognition = w.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Chrome mic is needed. Allow microphone, or type below.");
      return;
    }
    stopMic();
    const rec = new SpeechRecognition();
    rec.lang = "hi-IN";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => {
      setListening(true);
      setStatus("Listening");
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      if (inCallRef.current && !busyRef.current) {
        window.setTimeout(() => listenRef.current(), 280);
      }
    };
    rec.onerror = (event) => {
      setListening(false);
      if (event.error === "not-allowed") setError("Allow microphone, then answer again.");
    };
    rec.onresult = (event) => {
      const said = event.results[0]?.[0]?.transcript || "";
      if (said) void sendRef.current(said);
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      window.setTimeout(() => listenRef.current(), 400);
    }
  }, [stopMic]);

  const playPriya = useCallback(async (say: string, audioUrl?: string | null) => {
    window.speechSynthesis?.cancel();
    const player = audioRef.current;
    const after = () => {
      setStatus("Listening");
      if (inCallRef.current) window.setTimeout(() => listenRef.current(), 250);
    };
    if (audioUrl && player) {
      try {
        const res = await fetch(audioUrl);
        const type = res.headers.get("content-type") || "";
        if (res.ok && type.includes("audio")) {
          const blob = await res.blob();
          player.src = URL.createObjectURL(blob);
          setStatus("Priya speaking");
          player.onended = after;
          await player.play();
          return;
        }
      } catch {
        /* browser voice */
      }
    }
    setStatus("Priya speaking");
    const utter = new SpeechSynthesisUtterance(say);
    const match = pickVoice(say);
    if (match) utter.voice = match;
    utter.lang = /[\u0900-\u097F]/.test(say) ? "hi-IN" : "en-IN";
    utter.rate = 1.06;
    utter.onend = after;
    utter.onerror = after;
    window.speechSynthesis.speak(utter);
  }, []);

  const sendCallerText = useCallback(
    async (text: string) => {
      if (!inCallRef.current) return;
      const line = text.trim();
      setError("");
      busyRef.current = true;
      stopMic();
      if (line) setTurns((prev) => [...prev, { who: "you", text: line }]);
      setStatus(line ? "…" : "Connecting");
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
          setError(data.error || "Line dropped. Speak again.");
          setStatus("Listening");
          return;
        }
        if (data.role) setRole(data.role);
        if (data.extracted) setExtracted(data.extracted);
        setCaption(say);
        setTurns((prev) => [...prev, { who: "priya", text: say }]);
        await playPriya(say, data.audioUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Call failed");
        setStatus("Listening");
      } finally {
        busyRef.current = false;
        setTyped("");
      }
    },
    [callId, fromPhone, playPriya, stopMic]
  );

  useEffect(() => {
    sendRef.current = sendCallerText;
    listenRef.current = startMic;
  }, [sendCallerText, startMic]);

  function answer() {
    stopRing();
    inCallRef.current = true;
    startedAtRef.current = Date.now();
    setElapsed(0);
    setPhase("incall");
    setStatus("Connecting");
    void sendCallerText("");
  }

  function hangup() {
    inCallRef.current = false;
    busyRef.current = false;
    stopMic();
    stopRing();
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setPhase("ended");
    setStatus("Call ended");
  }

  function recall() {
    setCallId(`demo-${Date.now()}`);
    setTurns([]);
    setExtracted({});
    setRole(null);
    setCaption("");
    setError("");
    setElapsed(0);
    setPhase("incoming");
    setStatus("Incoming call");
  }

  const facts = [role, extracted.classLevel, extracted.area, extracted.city].filter(Boolean);
  const lastPriya = [...turns].reverse().find((t) => t.who === "priya")?.text || caption;

  if (phase === "incoming") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#0A192F] px-4 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#2D9E6B]">Incoming call</p>
        <span className="mt-8 flex h-28 w-28 items-center justify-center rounded-full bg-[#2D9E6B] text-4xl font-extrabold shadow-[0_0_0_12px_rgba(45,158,107,0.25)]">
          P
        </span>
        <h1 className="mt-6 font-heading text-3xl font-extrabold">Priya</h1>
        <p className="mt-1 text-sm text-white/60">ApnaTutorHub coordinator</p>
        <label className="mt-8 w-full max-w-xs text-center text-xs text-white/50">
          Your mobile (optional)
          <input
            className="mt-2 w-full rounded-full border border-white/15 bg-white/10 px-4 py-2 text-center text-sm text-white"
            inputMode="tel"
            placeholder="98xxxxxxxx"
            value={fromPhone}
            onChange={(e) => setFromPhone(e.target.value)}
          />
        </label>
        <div className="mt-10 flex gap-10">
          <button
            type="button"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-sm font-bold"
            onClick={() => {
              stopRing();
              setPhase("ended");
              setStatus("Declined");
            }}
          >
            End
          </button>
          <button
            type="button"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2D9E6B] text-sm font-bold"
            onClick={answer}
          >
            Answer
          </button>
        </div>
        <p className="mt-8 max-w-xs text-center text-xs text-white/40">
          Chrome, speaker on, allow mic. This is a live call demo — not 08062180653.
        </p>
        <audio ref={audioRef} className="hidden" />
      </main>
    );
  }

  if (phase === "ended") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#0A192F] px-4 text-white">
        <p className="text-sm text-white/50">Call ended · {formatTimer(elapsed)}</p>
        <h1 className="mt-3 font-heading text-2xl font-extrabold">Priya</h1>
        <button
          type="button"
          className="mt-8 rounded-full bg-[#2D9E6B] px-6 py-3 text-sm font-bold"
          onClick={recall}
        >
          Call again
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#0A192F] text-white">
      <div className="flex flex-1 flex-col items-center px-4 pt-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2D9E6B]">{status}</p>
        <p className="mt-1 font-mono text-sm text-white/50">{formatTimer(elapsed)}</p>
        <span
          className={`mt-8 flex h-28 w-28 items-center justify-center rounded-full bg-[#2D9E6B] text-4xl font-extrabold ${
            listening ? "shadow-[0_0_0_14px_rgba(45,158,107,0.35)]" : ""
          }`}
        >
          P
        </span>
        <h1 className="mt-5 font-heading text-2xl font-extrabold">Priya</h1>
        {facts.length > 0 && (
          <p className="mt-2 text-center text-xs text-white/45">{facts.join(" · ")}</p>
        )}
        <p className="mt-8 max-w-sm text-center text-lg font-semibold leading-snug text-white/90">
          {lastPriya || "…"}
        </p>
        {listening && <p className="mt-6 text-sm font-bold text-[#2D9E6B]">Speak now</p>}
        {error && <p className="mt-4 text-center text-sm text-red-300">{error}</p>}
      </div>

      <div className="space-y-3 px-4 pb-8">
        <div className="flex justify-center gap-8">
          <button
            type="button"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-xs font-bold"
            onClick={() => {
              window.speechSynthesis?.cancel();
              audioRef.current?.pause();
              startMic();
            }}
          >
            Talk
          </button>
          <button
            type="button"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-sm font-bold"
            onClick={hangup}
          >
            End
          </button>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim()) void sendCallerText(typed);
          }}
        >
          <input
            className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/30"
            placeholder="Mic fail? Type here"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
        </form>
      </div>
      <audio ref={audioRef} className="hidden" />
    </main>
  );
}
