import { useEffect, useState } from "react";
import { VirtualisProvider, useVirtualis } from "@/lib/virtualis/store";
import { getAdminData } from "@/lib/admin.functions";
import { Login } from "../screens";
import { T } from "../theme";
import ModelLab from "./ModelLab";

/* Authenticated wrapper: unauthenticated visitors get the standard Virtualis
   login experience, and non-administrators are turned away. This mirrors the
   server-side admin check — it does not replace it. */
function Gate() {
  const { ready, session } = useVirtualis();
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    if (!session) return;
    getAdminData()
      .then((d) => setAllowed(!!d.isAdmin))
      .catch(() => setAllowed(false));
  }, [session]);

  if (!ready) return null;
  if (!session) return <Login />;
  if (allowed === null)
    return <div style={{ padding: 28, fontSize: 13.5, color: T.sub }}>Checking access…</div>;
  if (!allowed)
    return (
      <div style={{ padding: 28, fontSize: 13.5, color: T.sub, maxWidth: 460 }}>
        Model Lab is restricted to Virtualis administrators. Ask an administrator if you need
        access.
      </div>
    );
  return <ModelLab />;
}

export default function ModelLabPage() {
  return (
    <VirtualisProvider>
      <Gate />
    </VirtualisProvider>
  );
}
