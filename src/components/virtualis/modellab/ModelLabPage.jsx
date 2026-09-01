import { VirtualisProvider, useVirtualis } from "@/lib/virtualis/store";
import { Login } from "../screens";
import ModelLab from "./ModelLab";

/* Authenticated wrapper: unauthenticated visitors get the standard
   Virtualis login experience, never the lab. */
function Gate() {
  const { ready, session } = useVirtualis();
  if (!ready) return null;
  return session ? <ModelLab /> : <Login />;
}

export default function ModelLabPage() {
  return (
    <VirtualisProvider>
      <Gate />
    </VirtualisProvider>
  );
}
