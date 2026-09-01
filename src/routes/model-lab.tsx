import { createFileRoute } from "@tanstack/react-router";
// @ts-expect-error - untyped JSX prototype component
import ModelLabPage from "@/components/virtualis/modellab/ModelLabPage.jsx";

export const Route = createFileRoute("/model-lab")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Model Lab — Virtualis Acuity Engineering" },
      {
        name: "description",
        content:
          "Internal Virtualis Model Lab: evaluate acuity decisions on synthetic input and govern approved training data. Sign-in required.",
      },
      { property: "og:title", content: "Virtualis Model Lab" },
      {
        property: "og:description",
        content: "Authenticated engineering surface for the Virtualis acuity model.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ModelLabPage,
});
