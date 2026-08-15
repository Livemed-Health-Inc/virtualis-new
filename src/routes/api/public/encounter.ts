import { createFileRoute } from "@tanstack/react-router";
import { canTransition, effectivePresence, kioskBody } from "@/lib/handoff/core";
import type { PresenceRow, RequestStatus } from "@/lib/handoff/core";

/* Bedside handoff API. The kiosk has no user account: every call is scoped by
   the opaque device token issued at enrollment, and the facility is derived
   server-side from that token. No patient identifiers cross this boundary. */

const sha256 = async (s: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const fail = (status = 400) => new Response(JSON.stringify({ ok: false }), { status });

export const Route = createFileRoute("/api/public/encounter")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = kioskBody.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return fail(400);
        const input = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: device } = await supabaseAdmin
          .from("devices")
          .select("id, facility_id")
          .eq("device_token_hash", await sha256(input.token))
          .eq("status", "enrolled")
          .maybeSingle();
        if (!device) return fail(401);

        if (input.action === "coverage") {
          const { data: rows } = await supabaseAdmin
            .from("provider_presence")
            .select("user_id, facility_id, specialty, status, ready_to_round, last_seen_at")
            .eq("facility_id", device.facility_id);
          const live = (rows ?? []).map((r) => effectivePresence(r as PresenceRow));

          const counts = new Map<string, number>();
          live
            .filter((p) => p.available && p.specialty)
            .forEach((p) => counts.set(p.specialty, (counts.get(p.specialty) ?? 0) + 1));

          const readyIds = live.filter((p) => p.readyToRound).map((p) => p.userId);
          let rounding: { providerId: string; name: string }[] = [];
          if (readyIds.length) {
            const [{ data: acks }, { data: profiles }] = await Promise.all([
              supabaseAdmin
                .from("rounding_acks")
                .select("provider_id")
                .eq("device_id", device.id)
                .in("provider_id", readyIds),
              supabaseAdmin.from("profiles").select("id, name").in("id", readyIds),
            ]);
            const acked = new Set((acks ?? []).map((a) => a.provider_id));
            rounding = readyIds
              .filter((id) => !acked.has(id))
              .map((id) => ({
                providerId: id,
                name: (profiles ?? []).find((p) => p.id === id)?.name ?? "Clinician",
              }));
          }

          return Response.json({
            ok: true,
            coverage: [...counts].map(([specialty, available]) => ({ specialty, available })),
            rounding,
          });
        }

        if (input.action === "request") {
          const { data } = await supabaseAdmin
            .from("encounter_requests")
            .insert({
              device_id: device.id,
              facility_id: device.facility_id,
              specialty: input.specialty,
              urgency: input.urgency,
              mode: input.mode,
            })
            .select("id, status")
            .maybeSingle();
          if (!data) return fail(400);
          return Response.json({ ok: true, requestId: data.id, status: data.status });
        }

        if (input.action === "ack_rounding") {
          await supabaseAdmin
            .from("rounding_acks")
            .upsert({ device_id: device.id, provider_id: input.providerId });
          return Response.json({ ok: true });
        }

        const { data: req } = await supabaseAdmin
          .from("encounter_requests")
          .select("id, status, provider_id, mode, specialty")
          .eq("id", input.requestId)
          .eq("device_id", device.id)
          .maybeSingle();
        if (!req) return fail(404);

        if (input.action === "cancel") {
          if (!canTransition(req.status as RequestStatus, "cancelled")) return fail(409);
          await supabaseAdmin
            .from("encounter_requests")
            .update({ status: "cancelled", ended_at: new Date().toISOString() })
            .eq("id", req.id);
          return Response.json({ ok: true, status: "cancelled" });
        }

        let provider: { name: string; role: string } | null = null;
        if (req.status === "accepted" && req.provider_id) {
          const { data: p } = await supabaseAdmin
            .from("profiles")
            .select("name, role")
            .eq("id", req.provider_id)
            .maybeSingle();
          provider = p ? { name: p.name, role: p.role } : null;
        }
        return Response.json({ ok: true, status: req.status, provider });
      },
    },
  },
});
