import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVirtualis } from "@/lib/virtualis/store";
import { effectivePresence, shouldChime } from "@/lib/handoff/core";
import { primeChime, startChimeLoop } from "@/lib/handoff/chime";

/* Clinician side of the bedside handoff: presence heartbeat, incoming
   device requests, and the alert chime. RLS keeps everything facility-scoped. */

const HEARTBEAT_MS = 30_000;
const POLL_MS = 15_000;

export function useHandoff() {
  const { userId, scope, me } = useVirtualis() ?? {};
  const [presence, setPresence] = useState([]);
  const [requests, setRequests] = useState([]);
  const [muted, setMuted] = useState(false);
  const facilities = useMemo(() => scope ?? [], [scope]);
  const key = facilities.join(",");

  const mine = useMemo(
    () => presence.find((p) => p.user_id === userId) ?? null,
    [presence, userId],
  );
  const available = mine ? effectivePresence(mine).available : false;
  const readyToRound = !!mine?.ready_to_round;

  const load = useCallback(async () => {
    if (!userId || !facilities.length) return;
    const [p, r] = await Promise.all([
      supabase.from("provider_presence").select("*").in("facility_id", facilities),
      supabase
        .from("encounter_requests")
        .select("*")
        .in("facility_id", facilities)
        .in("status", ["requested", "accepted"])
        .order("requested_at", { ascending: false }),
    ]);
    setPresence(p.data ?? []);
    setRequests(r.data ?? []);
  }, [userId, facilities]);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!userId || !facilities.length) return;
    const ch = supabase
      .channel("virtualis-handoff")
      .on("postgres_changes", { event: "*", schema: "public", table: "encounter_requests" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "provider_presence" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, key, load]);

  /* Heartbeat. It refreshes liveness only and never touches ready_to_round. */
  const beat = useCallback(
    async (status) => {
      if (!userId || !facilities.length) return;
      const rows = facilities.map((f) => ({
        user_id: userId,
        facility_id: f,
        specialty: me?.dept ?? "",
        status,
        last_seen_at: new Date().toISOString(),
      }));
      await supabase.from("provider_presence").upsert(rows, { onConflict: "user_id,facility_id" });
      load();
    },
    [userId, facilities, me?.dept, load],
  );

  const heartbeatOn = useRef(false);
  heartbeatOn.current = available;
  useEffect(() => {
    const id = setInterval(() => {
      if (heartbeatOn.current) beat("online");
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [beat]);

  const setAvailable = useCallback(
    (v) => {
      primeChime();
      return beat(v ? "online" : "offline");
    },
    [beat],
  );

  const setReadyToRound = useCallback(
    async (v) => {
      if (!userId || !facilities.length) return;
      primeChime();
      await supabase
        .from("provider_presence")
        .update({ ready_to_round: v, ready_to_round_at: v ? new Date().toISOString() : null })
        .eq("user_id", userId)
        .in("facility_id", facilities);
      load();
    },
    [userId, facilities, load],
  );

  const respond = useCallback(
    async (id, next) => {
      primeChime();
      const patch = { status: next };
      if (next === "accepted") {
        patch.provider_id = userId;
        patch.accepted_at = new Date().toISOString();
      }
      if (next === "ended") patch.ended_at = new Date().toISOString();
      const q = supabase.from("encounter_requests").update(patch).eq("id", id);
      await (next === "ended" ? q.eq("status", "accepted") : q.eq("status", "requested"));
      if (next === "accepted") await beat("in_consult");
      load();
    },
    [userId, beat, load],
  );

  const incoming = useMemo(() => requests.filter((r) => r.status === "requested"), [requests]);
  const activeEncounter = useMemo(
    () => requests.find((r) => r.status === "accepted" && r.provider_id === userId) ?? null,
    [requests, userId],
  );
  const chiming = shouldChime({ incoming: incoming.length, unackedRounding: 0, muted });

  useEffect(() => {
    if (!chiming) return;
    return startChimeLoop();
  }, [chiming]);

  return {
    presence,
    incoming,
    activeEncounter,
    available,
    readyToRound,
    muted,
    setMuted,
    setAvailable,
    setReadyToRound,
    respond,
    chiming,
    reload: load,
  };
}
