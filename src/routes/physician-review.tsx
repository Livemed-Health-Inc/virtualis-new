import { createFileRoute } from "@tanstack/react-router";
// @ts-expect-error - untyped JSX prototype component
import PhysicianReviewPage from "@/components/virtualis/physicianreview/PhysicianReviewPage.jsx";

export const Route = createFileRoute("/physician-review")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Physician Review — Virtualis Nue" },
      {
        name: "description",
        content:
          "Blinded physician labelling and adjudication for Virtualis acuity review. Sign-in and an assigned case are required.",
      },
      { property: "og:title", content: "Virtualis Physician Review" },
      {
        property: "og:description",
        content: "Authenticated clinical labelling workflow: Low, Moderate or High acuity only.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PhysicianReviewPage,
});
