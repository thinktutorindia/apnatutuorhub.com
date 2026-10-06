"use client";

import { useEffect, useRef, useState } from "react";

type Turn = { who: "you" | "priya"; text: string };

function speakInBrowser(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const hindi = /[\u0900-\u097F]/.test(text);
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find((v) =>
    hindi
      ? /hi-IN|Hindi/i.test(`${v.lang} ${v.name}`)
      : /en-IN|Indian/i.test(`${v.lang} ${v.name}`)
  ) || voices.find((v) => (hindi ? v.lang.startsWith("hi") : v.lang.startsWith("en")));
  if (match) utter.voice = match;
  utter.lang = hindi ? "hi-IN" : "en-IN";
  utter.rate = 1;
  window.speechSynthesis.speak(utter);
}

export default function VoiceDemoPage() {
  const [callId] = useState(() => `demo-${Date.now()}`);
  const [fromPhone, setFromPhone] = useState("919876543210");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis?.getVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", () => window.speechSynthesis.getVoices());
  }, []);

  async function sendCallerText(text: string) {
    const line = text.trim();
    setError("");
    setBusy(true);
    if (line) setTurns((prev) => [...prev, { who: "you", text: line }]);
    try {
      const res = await fetch("/api/voice/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId, from: fromPhone, text: line }),
      });
      const data = (await res.json()) as { say?: string; audioUrl?: string; error?: string };
      const say = data.say?.trim();
      if (!say) {
        setError(data.error || "Priya did not reply. Check Gemini key on the server.");
        return;
      }
      setTurns((prev) => [...prev, { who: "priya", text: say }]);
      if (data.audioUrl) {
        try {
          const player = audioRef.current;
          if (player) {
            player.src = data.audioUrl;
            await player.play();
            return;
          }
        } catch {
          /* Chrome Hindi TTS below */
        }
      }
      speakInBrowser(say);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Call failed");
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
        onerror: (() => void) | null;
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
    rec.lang = "hi-IN";
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (event) => {
      const said = event.results[0]?.[0]?.transcript || "";
      if (said) void sendCallerText(said);
    };
    rec.start();
  }

  return (
    <main className="min-h-screen bg-[#F0F4F8] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-xl space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[#2D9E6B]">Client demo · no Sarvam Pro</p>
        <h1 className="font-heading text-2xl font-extrabold text-[#0F2540]">Priya voice demo</h1>
        <p className="text-sm text-slate-600">
          Uses the same Priya brain as production. Voice plays from Gemini if available, otherwise Chrome Hindi
          (free). Do not use this as the 08062180653 helpline.
        </p>
        <label className="block text-sm font-semibold">
          Test caller number
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            value={fromPhone}
            onChange={(e) => setFromPhone(e.target.value)}
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-full bg-[#2D9E6B] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            disabled={busy}
            onClick={() => void sendCallerText("")}
          >
            Start greeting
          </button>
          <button
            type="button"
            className="rounded-full border border-[#0F2540] px-4 py-2 text-sm font-bold text-[#0F2540]"
            onClick={startMic}
          >
            {listening ? "Listening…" : "Speak in Hindi"}
          </button>
        </div>
        <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
          {turns.length === 0 && <p className="text-sm text-slate-500">Click Start greeting, then speak or type.</p>}
          {turns.map((turn, i) => (
            <p key={`${turn.who}-${i}`} className={turn.who === "priya" ? "font-semibold text-[#0F2540]" : "text-slate-700"}>
              {turn.who === "priya" ? "Priya: " : "You: "}
              {turn.text}
            </p>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim()) void sendCallerText(typed);
          }}
        >
          <input
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2"
            placeholder="Type: Mujhe 8th class ke liye Rohini mein tutor chahiye"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <button type="submit" className="rounded-full bg-[#0F2540] px-4 py-2 text-sm font-bold text-white" disabled={busy}>
            Send
          </button>
        </form>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <audio ref={audioRef} className="hidden" />
      </div>
    </main>
  );
}
