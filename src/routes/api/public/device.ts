import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { clear, guard, consume, RateLimitUnavailable } from "@/lib/security/ratelimit.server";
import type { Database } from "@/integrations/supabase/types";

type DeviceRow = Database["public"]["Tables"]["devices"]["Row"];
type FacilityRow = Database["public"]["Tables"]["facilities"]["Row"];

/* Bedside kiosk provisioning. The tablet has no user account: it pairs once
   with a single-use admin code, then identifies itself with an expiring device
   token that rotates on sync. Only non-clinical cart configuration is ever
   returned, and every failure answers with the same opaque shape so the
   endpoint cannot be used to enumerate codes, tokens or devices. */

/** A kiosk token is good for 30 days and is re-issued whenever the tablet
    syncs inside the final third of that window. */
const TOKEN_TTL_DAYS = 30;
const ROTATE_WITHIN_MS = 10 * 24 * 60 * 60 * 1000;

const PAIR_LIMIT = { limit: 10, windowSeconds: 900, lockSeconds: 3600 };
const CODE_LIMIT = { limit: 5, windowSeconds: 900, lockSeconds: 3600 };
const SYNC_LIMIT = { limit: 120, windowSeconds: 300, lockSeconds: 300 };

const sha256 = async (s: string) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const mintToken = () => crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
const expiryFrom = (from: number) =>
  new Date(from + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("pair"), code: z.string().trim().min(6).max(16) }),
  z.object({ action: z.literal("sync"), token: z.string().trim().min(20).max(200) }),
]);

/** One shape for every rejection: no reason strings, no status variation that
    would tell an attacker whether a code, token or device actually exists. */
const deny = (status: 400 | 401 | 429 | 503) =>
  Response.json({ ok: false, reason: status === 429 ? "throttled" : "invalid" }, { status });

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
        if (!parsed.success) return deny(400);
        const input = parsed.data;

        const ipGate = await guard(
          request,
          input.action === "pair" ? "device_pair_ip" : "device_sync_ip",
          input.action === "pair" ? PAIR_LIMIT : SYNC_LIMIT,
        );
        if (!ipGate.ok) return deny(ipGate.status);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (input.action === "sync") {
          const hash = await sha256(input.token);
          const { data: device } = await supabaseAdmin
            .from("devices")
            .select("*")
            .eq("device_token_hash", hash)
            .eq("status", "enrolled")
            .is("revoked_at", null)
            .maybeSingle();
          if (!device) return deny(401);

          /* An expired token is dead: the cart must be re-enrolled with a
             fresh admin code rather than silently renewed. */
          const expiresAt = device.token_expires_at ? Date.parse(device.token_expires_at) : null;
          if (expiresAt !== null && expiresAt < Date.now()) return deny(401);

          const now = Date.now();
          const rotating = expiresAt === null || expiresAt - now < ROTATE_WITHIN_MS;
          const nextToken = rotating ? mintToken() : null;
          await supabaseAdmin
            .from("devices")
            .update({
              last_seen_at: new Date(now).toISOString(),
              ...(nextToken
                ? {
                    device_token_hash: await sha256(nextToken),
                    token_expires_at: expiryFrom(now),
                  }
                : {}),
            })
            .eq("id", device.id);

          const { data: facility } = await supabaseAdmin
            .from("facilities")
            .select("*")
            .eq("id", device.facility_id)
            .maybeSingle();
          return Response.json({
            ok: true,
            device: shape(device, facility),
            ...(nextToken ? { token: nextToken } : {}),
          });
        }

        /* A second bucket keyed on the code itself stops a distributed guess
           at one specific code, which per-IP throttling alone would miss. */
        const normalized = input.code.toUpperCase();
        try {
          if (!(await consume("device_pair_code", normalized, CODE_LIMIT))) return deny(429);
        } catch (e) {
          return deny(e instanceof RateLimitUnavailable ? 503 : 429);
        }

        const codeHash = await sha256(normalized);
        const { data: enrollment } = await supabaseAdmin
          .from("device_enrollments")
          .select("*")
          .eq("code_hash", codeHash)
          .is("consumed_at", null)
          .is("revoked_at", null)
          .maybeSingle();
        if (!enrollment || new Date(enrollment.expires_at) < new Date()) return deny(400);

        const token = mintToken();
        const nowMs = Date.now();
        const now = new Date(nowMs).toISOString();
        const { data: device } = await supabaseAdmin
          .from("devices")
          .update({
            device_token_hash: await sha256(token),
            status: "enrolled",
            enrolled_at: now,
            last_seen_at: now,
            token_expires_at: expiryFrom(nowMs),
            revoked_at: null,
          })
          .eq("id", enrollment.device_id)
          .select("*")
          .maybeSingle();
        if (!device) return deny(400);

        await supabaseAdmin
          .from("device_enrollments")
          .update({ consumed_at: now })
          .eq("id", enrollment.id);
        /* A legitimate pairing clears the attacker-facing counters so a busy
           ward is never locked out by its own successful enrollments. */
        await clear("device_pair_code", normalized).catch(() => {});
        await clear("device_pair_ip", ipGate.identifier).catch(() => {});

        const { data: facility } = await supabaseAdmin
          .from("facilities")
          .select("*")
          .eq("id", device.facility_id)
          .maybeSingle();

        const { recordAudit } = await import("@/lib/audit.server");
        await recordAudit(null, {
          action: "device_pair",
          entity_type: "device",
          entity_id: device.id,
          facility_id: device.facility_id,
        });

        return Response.json({ ok: true, token, device: shape(device, facility) });
      },
    },
  },
});
