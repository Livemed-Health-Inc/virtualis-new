import { useCallback, useMemo, useState } from "react";
import { CARTS } from "./fleet.data";

/* Prototype-only fleet state. Nothing here writes to the backend. */
export function useDeviceFleet(scope = []) {
  const [carts, setCarts] = useState(CARTS);
  const [session, setSession] = useState(null);

  const inScope = useMemo(
    () => carts.filter((c) => scope.length === 0 || scope.includes(c.facility)),
    [carts, scope],
  );

  const patch = useCallback(
    (id, next) => setCarts((cs) => cs.map((c) => (c.id === id ? { ...c, ...next } : c))),
    [],
  );

  return {
    carts: inScope,
    session,
    prepare: (id) => patch(id, { state: "preparing" }),
    markReady: (id) => patch(id, { state: "available", mintti: "ready" }),
    requestClinician: (id, acuity = "urgent") =>
      patch(id, { state: "requested", acuity, waitedMin: 0 }),
    beamIn: (cart, mode) => {
      patch(cart.id, { state: "session" });
      setSession({ cart, mode, startedAt: Date.now() });
    },
    endSession: () => {
      if (session) patch(session.cart.id, { state: "available" });
      setSession(null);
    },
  };
}
