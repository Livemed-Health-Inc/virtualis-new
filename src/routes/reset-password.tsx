import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
// @ts-expect-error - untyped JSX prototype component
import { SetPassword } from "@/components/virtualis/screens.jsx";
import {
  RECOVERY_INVALID_MESSAGE,
  RECOVERY_MESSAGE,
  isValidEmail,
  parseRecoveryLink,
  recoveryRedirectUrl,
  type RecoveryLink,
} from "@/lib/recovery";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose your password — Virtualis" },
      {
        name: "description",
        content: "Set the password for your Virtualis clinical account using your secure link.",
      },
      { property: "og:title", content: "Choose your password — Virtualis" },
      {
        property: "og:description",
        content: "Set the password for your Virtualis clinical account using your secure link.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

type Phase = "loading" | "confirm" | "verifying" | "ready" | "invalid" | "done";

function ResetPasswordPage() {
  const [link, setLink] = useState<RecoveryLink>({ kind: "none" });
  const [phase, setPhase] = useState<Phase>("loading");

  /* The credential is read once, then wiped from the address bar so it is not
     left in history, on a shared screen, or in a screenshot. */
  useEffect(() => {
    const parsed = parseRecoveryLink(window.location.hash, window.location.search);
    setLink(parsed);
    if (parsed.kind !== "none") window.history.replaceState(null, "", window.location.pathname);

    if (parsed.kind === "error") return setPhase("invalid");
    /* One-time codes are never redeemed on load: a mailbox link scanner would
       burn the link before the clinician ever saw this page. */
    if (parsed.kind === "otp") return setPhase("confirm");
    if (parsed.kind === "none") {
      supabase.auth
        .getSession()
        .then(({ data }) => setPhase(data.session ? "ready" : "invalid"))
        .catch(() => setPhase("invalid"));
      return;
    }
    setPhase("verifying");
    redeem(parsed)
      .then((ok) => setPhase(ok ? "ready" : "invalid"))
      .catch(() => setPhase("invalid"));
  }, []);

  const confirmRedeem = async () => {
    setPhase("verifying");
    const ok = await redeem(link).catch(() => false);
    setPhase(ok ? "ready" : "invalid");
  };

  if (phase === "loading" || phase === "verifying")
    return <Shell title="Verifying your link…" body="One moment while we check this link." />;

  if (phase === "invalid") return <Expired />;

  if (phase === "confirm")
    return (
      <Shell
        title="Confirm it's you"
        body="Your link is ready. Continue to choose your password — it can only be used once."
      >
        <Primary onClick={confirmRedeem}>Continue</Primary>
      </Shell>
    );

  if (phase === "done")
    return (
      <Shell title="Password updated" body="You can now sign in with your new password.">
        <Primary onClick={() => window.location.replace("/")}>Go to Virtualis</Primary>
      </Shell>
    );

  return (
    <div style={page}>
      <SetPassword
        mode={link.kind === "otp" || link.kind === "hash" ? link.type : "recovery"}
        onDone={async () => {
          /* Nothing transient survives the reset: the elevated recovery session
             is dropped before the workstation can be opened with it. */
          await supabase.auth.signOut().catch(() => {});
          setPhase("done");
        }}
      />
    </div>
  );
}

async function redeem(link: RecoveryLink): Promise<boolean> {
  if (link.kind === "otp") {
    const { error } = await supabase.auth.verifyOtp({
      email: link.email,
      token: link.token,
      type: link.type,
    });
    return !error;
  }
  if (link.kind === "hash") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: link.tokenHash,
      type: link.type,
    });
    return !error;
  }
  if (link.kind === "tokens") {
    const { error } = await supabase.auth.setSession({
      access_token: link.accessToken,
      refresh_token: link.refreshToken,
    });
    return !error;
  }
  if (link.kind === "code") {
    const { error } = await supabase.auth.exchangeCodeForSession(link.code);
    return !error;
  }
  return false;
}

function Expired() {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const request = async () => {
    setErr("");
    if (!isValidEmail(email)) return setErr("Enter your work email address.");
    setBusy(true);
    await supabase.auth
      .resetPasswordForEmail(email.trim(), {
        redirectTo: recoveryRedirectUrl(window.location.origin),
      })
      .catch(() => {});
    setBusy(false);
    setNote(RECOVERY_MESSAGE);
  };

  return (
    <Shell title="This link is no longer valid" body={RECOVERY_INVALID_MESSAGE}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Work email"
        style={input}
      />
      {err && <div style={{ fontSize: 13, color: "#c0392b", marginTop: 10 }}>{err}</div>}
      {note && <div style={{ fontSize: 13, color: "#4b5563", marginTop: 10 }}>{note}</div>}
      <Primary onClick={request}>{busy ? "Sending…" : "Send me a new link"}</Primary>
    </Shell>
  );
}

function Shell({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div style={page}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ fontSize: 22, fontWeight: 720, color: "#0b1220" }}>{title}</div>
        <p style={{ fontSize: 13.5, color: "#4b5563", margin: "6px 0 18px", lineHeight: 1.6 }}>
          {body}
        </p>
        {children}
      </div>
    </div>
  );
}

function Primary({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} style={primary}>
      {children}
    </button>
  );
}

const page: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "40px 20px",
  background: "#fff",
};
const input: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #d5dae3",
  fontSize: 15,
};
const primary: CSSProperties = {
  all: "unset",
  boxSizing: "border-box",
  cursor: "pointer",
  display: "block",
  width: "100%",
  textAlign: "center",
  marginTop: 18,
  padding: "14px 0",
  borderRadius: 16,
  fontSize: 15,
  fontWeight: 680,
  color: "#fff",
  background: "linear-gradient(135deg,#2E5CFF,#1E3FCC)",
};
