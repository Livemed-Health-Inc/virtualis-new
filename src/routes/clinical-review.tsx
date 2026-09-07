import { createFileRoute } from "@tanstack/react-router";
// @ts-expect-error - untyped JSX prototype component
import ClinicalReviewPage from "@/components/virtualis/modellab/ClinicalReviewPage.jsx";

export const Route = createFileRoute("/clinical-review")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Clinical Review — Virtualis Acuity Adjudication" },
      {
        name: "description",
        content:
          "Internal Virtualis console for clinicians to adjudicate synthetic acuity decisions and produce defensible evaluation labels. Sign-in required.",
      },
      { property: "og:title", content: "Virtualis Clinical Review" },
      {
        property: "og:description",
        content: "Authenticated clinical labelling and adjudication workflow for the acuity model.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ClinicalReviewPage,
});
