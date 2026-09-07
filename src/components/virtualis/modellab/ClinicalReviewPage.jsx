import { useEffect, useState } from "react";
import { VirtualisProvider, useVirtualis } from "@/lib/virtualis/store";
import { getReviewAccess } from "@/lib/modellab/review.functions";
import { Login } from "../screens";
import { T } from "../theme";
import ClinicalReview from "./ClinicalReview";

/* Reviewing is a clinical judgement, so clinical reviewers as well as
   administrators may enter. This mirrors the server-side role check in every
   review server function — it does not replace it. */
function Gate() {
  const { ready, session } = useVirtualis();
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    if (!session) return;
    getReviewAccess()
      .then((d) => setAllowed(!!d.allowed))
      .catch(() => setAllowed(false));
  }, [session]);

  if (!ready) return null;
  if (!session) return <Login />;
  if (allowed === null)
    return <div style={{ padding: 28, fontSize: 13.5, color: T.sub }}>Checking access…</div>;
  if (!allowed)
    return (
      <div style={{ padding: 28, fontSize: 13.5, color: T.sub, maxWidth: 460 }}>
        Clinical Review is restricted to credentialed clinical reviewers. Ask an administrator if
        you need reviewer access.
      </div>
    );
  return <ClinicalReview />;
}

export default function ClinicalReviewPage() {
  return (
    <VirtualisProvider>
      <Gate />
    </VirtualisProvider>
  );
}
