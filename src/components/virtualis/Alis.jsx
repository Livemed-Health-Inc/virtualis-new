import { useEffect, useRef, useState } from "react";
import { T, mono, inputStyle, VMark } from "./ui";
import { supabase } from "@/integrations/supabase/client";

/* Live assistant: streamed from the app server (Lovable AI). Messages stay in
   memory only — nothing is written to browser storage. */
async function ask(history, signal) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/alis", {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${data.session?.access_token ?? ""}`,
    },
    body: JSON.stringify({
      messages: history.map((m) => ({ role: m.me ? "user" : "assistant", content: m.text })),
    }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || "ALIS is unavailable right now.");
  }
  return res.body.pipeThrough(new TextDecoderStream()).getReader();
}

const SUGGESTIONS = [
  "Sepsis bundle timing?",
  "Draft a cardiology consult",
  "How does acuity routing work?",
];

export default function Alis({ compact }) {
  const [msgs, setMsgs] = useState([
    {
      me: false,
      text: "Hello, Dr. Hussain — I'm ALIS AI™, the clinical assistant inside Virtualis®. Ask me about a workup, draft a consult, or have me summarize a telehealth encounter.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  const abort = useRef(null);
  const send = async (preset) => {
    const text = (preset ?? draft).trim();
    if (!text || busy) return;
    const history = [...msgs.slice(1).filter((m) => !m.error && m.text), { me: true, text }];
    setMsgs((m) => [...m, { me: true, text }]);
    setDraft("");
    setBusy(true);
    abort.current = new AbortController();
    try {
      const reader = await ask(history, abort.current.signal);
      setMsgs((m) => [...m, { me: false, text: "" }]);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setMsgs((m) => [...m.slice(0, -1), { me: false, text: m[m.length - 1].text + value }]);
      }
    } catch (e) {
      if (e.name !== "AbortError") setMsgs((m) => [...m, { me: false, error: true, text: e.message }]);
    } finally {
      setBusy(false);
    }
  };

  const Bubble = ({ m }) => (
    <div
      style={{
        alignSelf: m.me ? "flex-end" : "flex-start",
        maxWidth: "min(84%, 620px)",
        display: "flex",
        gap: 8,
        alignItems: "flex-end",
      }}
    >
      {!m.me && (
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            background: "linear-gradient(135deg,#2E5CD6,#0F1E52)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <VMark size={15} mono />
        </span>
      )}
      <div
        style={{
          background: m.me ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : "#fff",
          color: m.me ? "#fff" : T.ink,
          border: m.me ? "none" : "1px solid " + T.line,
          borderRadius: m.me ? "20px 20px 6px 20px" : "20px 20px 20px 6px",
          padding: "11px 15px",
          fontSize: 14.5,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          boxShadow: m.me ? "0 6px 16px rgba(41,112,255,.22)" : "0 2px 6px rgba(16,24,40,.04)",
        }}
      >
        {m.text}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {!compact && (
        <div style={{ textAlign: "center", padding: "22px 16px 6px" }}>
          <div
            style={{
              width: 66,
              height: 66,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#2E5CD6,#0F1E52)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 26px rgba(27,63,160,.32)",
            }}
          >
            <VMark size={34} mono />
          </div>
          <div
            style={{
              fontSize: 21,
              fontWeight: 720,
              color: T.ink,
              letterSpacing: -0.4,
              marginTop: 10,
            }}
          >
            ALIS AI™
          </div>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>
            Clinical AI assistant · Officially patented
          </div>
        </div>
      )}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 11,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 860,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 11,
          }}
        >
          {msgs.map((m, i) => (
            <Bubble key={i} m={m} />
          ))}
          {busy && (
            <div
              style={{ alignSelf: "flex-start", display: "flex", gap: 8, alignItems: "flex-end" }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  background: "linear-gradient(135deg,#2E5CD6,#0F1E52)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <VMark size={15} mono />
              </span>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid " + T.line,
                  borderRadius: "20px 20px 20px 6px",
                  padding: "13px 16px",
                  display: "flex",
                  gap: 4,
                }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: T.faint,
                      animation: `blink 1.1s ${i * 0.18}s ease-in-out infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>
      <div style={{ padding: "8px 16px 12px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          {msgs.length < 3 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    flexShrink: 0,
                    fontSize: 12.5,
                    fontWeight: 570,
                    color: T.blueDeep,
                    background: T.blueSoft,
                    border: "1px solid #D6E4FF",
                    borderRadius: 18,
                    padding: "7px 13px",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask ALIS anything clinical…"
              style={{ ...inputStyle, borderRadius: 24, flex: 1, minWidth: 0 }}
            />
            <button
              onClick={() => (busy ? abort.current?.abort() : send())}
              title={busy ? "Stop" : "Send"}
              style={{
                all: "unset",
                cursor: "pointer",
                width: 44,
                height: 44,
                borderRadius: 22,
                background:
                  busy || draft.trim() ? "linear-gradient(135deg,#2E5CFF,#1E3FCC)" : T.ghost,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background .2s ease",
                flexShrink: 0,
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {busy ? <rect x="7" y="7" width="10" height="10" rx="1.5" fill="#fff" /> : <path d="M12 19 V5 M6 11 L12 5 L18 11" />}
              </svg>
            </button>
          </div>
          <div
            style={{
              textAlign: "center",
              fontSize: 11,
              color: T.faint,
              marginTop: 7,
              fontFamily: mono,
              letterSpacing: 0.2,
            }}
          >
            Informational only — clinical decisions remain with the provider.
          </div>
        </div>
      </div>
    </div>
  );
}
