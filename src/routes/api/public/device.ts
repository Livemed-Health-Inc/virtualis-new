import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

type DeviceRow = Database["public"]["Tables"]["devices"]["Row"];
type FacilityRow = Database["public"]["Tables"]["facilities"]["Row"];

/* Bedside kiosk provisioning. The tablet has no user account: it pairs once
   with a single-use admin code, then identifies itself with a long-lived
   device token. Only non-clinical cart configuration is ever returned. */

const sha256 = async (s: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("pair"), code: z.string().trim().min(6).max(16) }),
  z.object({ action: z.literal("sync"), token: z.string().trim().min(20).max(200) }),
]);

const shape = (d: DeviceRow, facility: FacilityRow | null) => ({
  id: d.id,
  label: d.label,
  unit: d.unit,
  room: d.room,
  floating: d.floating,
  hasMintti: d.has_mintti,
  facility: facility
    ? { id: facility.id, name: facility.name, short: facility.short, hue: facility.hue }
    : { id: d.facility_id, name: d.facility_id, short: d.facility_id, hue: "#2E5CFF" },
});

export const Route = createFileRoute("/api/public/device")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Bad request", { status: 400 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const input = parsed.data;

        if (input.action === "sync") {
          const hash = await sha256(input.token);
          const { data: device } = await supabaseAdmin
            .from("devices")
            .select("*")
            .eq("device_token_hash", hash)
            .eq("status", "enrolled")
            .maybeSingle();
          if (!device) return Response.json({ ok: false, reason: "unenrolled" }, { status: 404 });
          await supabaseAdmin
            .from("devices")
            .update({ last_seen_at: new Date().toISOString() })
            .eq("id", device.id);
          const { data: facility } = await supabaseAdmin
            .from("facilities")
            .select("*")
            .eq("id", device.facility_id)
            .maybeSingle();
          return Response.json({ ok: true, device: shape(device, facility) });
        }

        const codeHash = await sha256(input.code.toUpperCase());
        const { data: enrollment } = await supabaseAdmin
          .from("device_enrollments")
          .select("*")
          .eq("code_hash", codeHash)
          .is("consumed_at", null)
          .is("revoked_at", null)
          .maybeSingle();
        if (!enrollment || new Date(enrollment.expires_at) < new Date())
          return Response.json({ ok: false, reason: "invalid" }, { status: 400 });

        const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
        const now = new Date().toISOString();
        const { data: device } = await supabaseAdmin
          .from("devices")
          .update({
            device_token_hash: await sha256(token),
            status: "enrolled",
            enrolled_at: now,
            last_seen_at: now,
          })
          .eq("id", enrollment.device_id)
          .select("*")
          .maybeSingle();
        if (!device) return Response.json({ ok: false, reason: "invalid" }, { status: 400 });
        await supabaseAdmin
          .from("device_enrollments")
          .update({ consumed_at: now })
          .eq("id", enrollment.id);
        const { data: facility } = await supabaseAdmin
          .from("facilities")
          .select("*")
          .eq("id", device.facility_id)
          .maybeSingle();
        return Response.json({ ok: true, token, device: shape(device, facility) });
      },
    },
  },
});
