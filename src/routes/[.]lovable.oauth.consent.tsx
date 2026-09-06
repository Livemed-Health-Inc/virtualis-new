import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type ConsentDetails = {
  authorization_id: string;
  client: { name?: string };
};

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    authorization_id:
      typeof search["authorization_id"] === "string" ? search["authorization_id"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Authorize Agent Integration | Virtualis" },
      { name: "description", content: "Review and authorize a Virtualis agent integration." },
      { property: "og:title", content: "Authorize Agent Integration | Virtualis" },
      {
        property: "og:description",
        content: "Review and authorize a Virtualis agent integration.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConsentPage,
});

function ConsentPage() {
  const { authorization_id } = Route.useSearch();
  const [details, setDetails] = useState<ConsentDetails | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!authorization_id) return setError("This authorization request is invalid.");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return setNeedsLogin(true);
    setNeedsLogin(false);
    const { data, error: detailsError } =
      await supabase.auth.oauth.getAuthorizationDetails(authorization_id);
    if (detailsError) return setError("This authorization request has expired or is invalid.");
    if (data && "redirect_url" in data) {
      window.location.assign(data.redirect_url);
      return;
    }
    setDetails(data as ConsentDetails);
  }, [authorization_id]);

  useEffect(() => {
    void load();
  }, [load]);

  const signIn = async () => {
    setBusy(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) return setError("Sign-in failed. Check your credentials and try again.");
    await load();
  };

  const decide = async (approve: boolean) => {
    setBusy(true);
    setError("");
    const result = approve
      ? await supabase.auth.oauth.approveAuthorization(authorization_id, {
          skipBrowserRedirect: true,
        })
      : await supabase.auth.oauth.denyAuthorization(authorization_id, {
          skipBrowserRedirect: true,
        });
    setBusy(false);
    if (result.error || !result.data?.redirect_url) {
      return setError("The authorization could not be completed. Please try again.");
    }
    window.location.assign(result.data.redirect_url);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <section className="w-full max-w-md space-y-6 rounded-md border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-primary">Virtualis Nue</p>
          <h1 className="text-2xl font-semibold">Authorize agent integration</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            This connection can only confirm its security status. It cannot access patients,
            clinical messages, facilities, devices, or Model Lab data.
          </p>
        </div>

        {needsLogin ? (
          <div className="space-y-3">
            <input
              aria-label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              placeholder="Work email"
            />
            <input
              aria-label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              placeholder="Password"
            />
            <Button className="w-full" disabled={busy || !email || !password} onClick={signIn}>
              {busy ? "Signing in…" : "Sign in to continue"}
            </Button>
          </div>
        ) : details ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{details.client?.name ?? "An agent"}</strong> is
              requesting access to this limited integration.
            </p>
            <div className="flex gap-3">
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                Approve
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                disabled={busy}
                onClick={() => decide(false)}
              >
                Deny
              </Button>
            </div>
          </div>
        ) : !error ? (
          <p className="text-sm text-muted-foreground">Loading authorization request…</p>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  );
}
