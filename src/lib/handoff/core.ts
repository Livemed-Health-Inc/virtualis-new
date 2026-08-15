/* Pure handoff rules shared by the kiosk API, the clinician surface and tests.
   No I/O here so the semantics stay deterministic and verifiable. */

import { z } from "zod";

export type RequestStatus = "requested" | "accepted" | "declined" | "ended" | "cancelled";

const TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  requested: ["accepted", "declined", "cancelled"],
  accepted: ["ended"],
  declined: [],
  ended: [],
  cancelled: [],
};

export const canTransition = (from: RequestStatus, to: RequestStatus) =>
  TRANSITIONS[from]?.includes(to) ?? false;

/** A heartbeat older than this is treated as offline. */
export const PRESENCE_TTL_MS = 90_000;

export type PresenceRow = {
  user_id: string;
  facility_id: string;
  specialty: string;
  status: "offline" | "online" | "in_consult";
  ready_to_round: boolean;
  last_seen_at: string;
};

export const isPresenceStale = (lastSeenAt: string, now = Date.now()) =>
  now - new Date(lastSeenAt).getTime() > PRESENCE_TTL_MS;

/** Stale presence reads as offline but never erases the persisted rounding flag. */
export function effectivePresence(row: PresenceRow, now = Date.now()) {
  const stale = isPresenceStale(row.last_seen_at, now);
  return {
    userId: row.user_id,
    specialty: row.specialty,
    status: stale ? ("offline" as const) : row.status,
    available: !stale && row.status === "online",
    readyToRound: row.ready_to_round,
  };
}

/** The chime runs while something is genuinely waiting on a human. */
export const shouldChime = (s: { incoming: number; unackedRounding: number; muted?: boolean }) =>
  !s.muted && s.incoming + s.unackedRounding > 0;

/* Kiosk payloads. `.strict()` is the PHI guard: any patient field is rejected. */
const token = z.string().trim().min(20).max(200);

export const kioskBody = z
  .discriminatedUnion("action", [
    z.object({ action: z.literal("coverage"), token }).strict(),
    z
      .object({
        action: z.literal("request"),
        token,
        specialty: z.string().trim().min(2).max(80),
        urgency: z.enum(["critical", "urgent", "routine"]),
        mode: z.enum(["call", "consult"]),
      })
      .strict(),
    z.object({ action: z.literal("status"), token, requestId: z.string().uuid() }).strict(),
    z.object({ action: z.literal("cancel"), token, requestId: z.string().uuid() }).strict(),
    z.object({ action: z.literal("ack_rounding"), token, providerId: z.string().uuid() }).strict(),
  ])
  .describe("Bedside kiosk handoff API — never carries patient identifiers");
