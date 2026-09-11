import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { VirtualisProvider, useVirtualis } from "@/lib/virtualis/store";
import { getReviewAccess } from "@/lib/physicianreview/review.functions";
import { Login } from "../screens";
import { T, card } from "../theme";
import { VMark } from "../ui";
import ReviewPane from "./ReviewPane";
import CoordinatorPane from "./CoordinatorPane";

/* Authenticated wrapper. The screen only decides what to render; every
   server function checks the caller's role again. */
function Gate() {
  const { ready, session } = useVirtualis();
  const [access, setAccess] = useState(null);
  const [tab, setTab] = useState("review");

  useEffect(() => {
    if (!session) return;
    getReviewAccess()
      .then(setAccess)
      .catch(() => setAccess({ isPhysician: false, isCoordinator: false }));
  }, [session]);

  if (!ready) return null;
  if (!session) return <Login />;
  if (!access) return <div style={{ padding: 28, fontSize: 13.5, color: T.sub }}>Checking access…</div>;
  if (!access.isPhysician)
    return (
      <div style={{ padding: 28, fontSize: 13.5, color: T.sub, maxWidth: 460 }}>
        Physician Review is limited to clinical reviewers. Ask a coordinator if you need access.
      </div>
    );

  const Tab = ({ id, children }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        all: "unset",
        cursor: "pointer",
        padding: "6px 12px",
        borderRadius: 12,
        fontSize: 12.5,
        fontWeight: 660,
        color: tab === id ? "#fff" : T.blueDeep,
        background: tab === id ? T.blue : T.blueSoft,
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{ padding: 22, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <VMark size={26} />
        <div style={{ fontSize: 19, fontWeight: 780, color: T.ink }}>Physician Review</div>
        {access.isCoordinator && (
          <div style={{ display: "flex", gap: 7, marginLeft: 10 }}>
            <Tab id="review">Review</Tab>
            <Tab id="coordinate">Coordinate</Tab>
          </div>
        )}
        <Link to="/model-lab" style={{ marginLeft: "auto", fontSize: 12.5, color: T.blueDeep }}>
          Model Lab
        </Link>
      </div>

      <div style={{ ...card(), padding: 14, marginBottom: 14, fontSize: 12.5, color: T.sub }}>
        Acuity is recorded as Low, Moderate or High — never a numeric score. Nothing on this page
        validates, retrains or promotes a model, and no hospital data is imported automatically.
      </div>

      {tab === "review" || !access.isCoordinator ? <ReviewPane /> : <CoordinatorPane />}
    </div>
  );
}

export default function PhysicianReviewPage() {
  return (
    <VirtualisProvider>
      <Gate />
    </VirtualisProvider>
  );
}
