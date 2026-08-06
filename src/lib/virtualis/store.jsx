import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/* Live clinical data layer. Everything here is scoped by the signed-in
   provider's credentials — RLS enforces it server-side, so no view can
   leak a facility the clinician is not privileged at. */

const Ctx = createContext(null);
export const useVirtualis = () => useContext(Ctx);

const ago = (iso) => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};
const clock = (iso) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const ageSec = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));

function shapeThread(row, messages, userId, lastRead) {
  const msgs = messages.map((m) => ({
    me: m.sender_id === userId,
    who: m.sender_id === userId ? "You" : m.sender_name,
    kind: m.kind === "text" ? undefined : m.kind,
    text: m.body,
    t: clock(m.created_at),
  }));
  const unread = lastRead
    ? messages.filter((m) => m.sender_id !== userId && new Date(m.created_at) > new Date(lastRead))
        .length
    : messages.filter((m) => m.sender_id !== userId).length;
  return {
    id: row.id,
    name: row.name,
    team: row.is_team,
    members: row.members || undefined,
    context: row.context,
    facility: row.facility_id,
    patient: row.patient,
    room: row.room,
    mrn: row.mrn || undefined,
    dob: row.dob || undefined,
    time: ago(row.last_message_at),
    ageSec: ageSec(row.last_message_at),
    acuity: row.acuity,
    newCount: unread,
    reason: row.reason,
    confidence: row.confidence,
    msgs,
  };
}

export function VirtualisProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState({});
  const [threadRows, setThreadRows] = useState([]);
  const [messages, setMessages] = useState([]);
  const [reads, setReads] = useState({});

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;

  const load = useCallback(async () => {
    if (!userId) return;
    const [p, c, ct, sh, th, rd] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("provider_credentials").select("*"),
      supabase.from("care_team").select("*").order("name"),
      supabase.from("shifts").select("*"),
      supabase.from("threads").select("*").order("last_message_at", { ascending: false }),
      supabase.from("thread_reads").select("*"),
    ]);
    setProfile(p.data);
    setCredentials(c.data ?? []);
    setStaff(ct.data ?? []);
    setThreadRows(th.data ?? []);
    setReads(Object.fromEntries((rd.data ?? []).map((r) => [r.thread_id, r.last_read_at])));
    const byDay = {};
    (sh.data ?? []).forEach((s) => {
      (byDay[s.day_of_month] ||= []).push({
        label: s.label,
        facility: s.facility_id,
        time: s.time_label,
        acuity: s.acuity,
      });
    });
    setShifts(byDay);
    const ids = (th.data ?? []).map((t) => t.id);
    if (ids.length) {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .in("thread_id", ids)
        .order("created_at");
      setMessages(data ?? []);
    } else setMessages([]);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  /* Realtime: new messages and new/updated threads stream straight in. */
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("virtualis-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) =>
        setMessages((m) => (m.some((x) => x.id === p.new.id) ? m : [...m, p.new])),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "threads" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const scope = useMemo(() => credentials.map((c) => c.facility_id), [credentials]);

  const threads = useMemo(
    () =>
      threadRows.map((r) =>
        shapeThread(
          r,
          messages.filter((m) => m.thread_id === r.id),
          userId,
          reads[r.id],
        ),
      ),
    [threadRows, messages, userId, reads],
  );

  const me = useMemo(
    () => ({
      name: profile?.name ?? "Clinician",
      initials: profile?.initials ?? "MD",
      role: profile?.role ?? "Virtual Provider",
      homeFacility: profile?.home_facility ?? scope[0] ?? "saint",
      credentials: credentials.map((c) => ({
        facility: c.facility_id,
        privileges: c.privileges,
        expires: c.expires_on,
      })),
    }),
    [profile, credentials, scope],
  );

  const markRead = useCallback(
    async (threadId) => {
      if (!userId) return;
      const now = new Date().toISOString();
      setReads((r) => ({ ...r, [threadId]: now }));
      await supabase
        .from("thread_reads")
        .upsert({ user_id: userId, thread_id: threadId, last_read_at: now });
    },
    [userId],
  );

  const sendMessage = useCallback(
    async (threadId, body, kind = "text") => {
      if (!userId || !body?.trim()) return;
      const { data } = await supabase
        .from("messages")
        .insert({
          thread_id: threadId,
          sender_id: userId,
          sender_name: me.name,
          kind,
          body: body.trim(),
        })
        .select()
        .single();
      if (data) setMessages((m) => (m.some((x) => x.id === data.id) ? m : [...m, data]));
      markRead(threadId);
    },
    [userId, me.name, markRead],
  );

  const createThread = useCallback(
    async (input) => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("threads")
        .insert({
          name: input.name,
          context: input.context ?? "",
          facility_id: input.facility,
          patient: input.patient || "—",
          room: input.room || "—",
          mrn: input.mrn || null,
          acuity: input.acuity ?? "routine",
          reason: input.reason ?? "",
          confidence: input.confidence ?? 0,
          is_team: !!input.team,
          members: input.members ?? null,
          created_by: userId,
        })
        .select()
        .single();
      if (error || !data) return null;
      setThreadRows((t) => [data, ...t]);
      if (input.reason) await sendMessage(data.id, input.reason, "consult");
      await markRead(data.id);
      return data.id;
    },
    [userId, sendMessage, markRead],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setThreadRows([]);
    setMessages([]);
  }, []);

  const value = {
    ready,
    session,
    userId,
    me,
    scope,
    staff: staff.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      dept: s.dept,
      facility: s.facility_id,
      initials: s.initials,
      online: s.online,
    })),
    shifts,
    threads,
    sendMessage,
    createThread,
    markRead,
    signOut,
    reload: load,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
