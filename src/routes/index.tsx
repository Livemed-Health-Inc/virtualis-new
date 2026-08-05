import { createFileRoute } from "@tanstack/react-router";
// @ts-expect-error - untyped JSX prototype component
import VirtualisApp from "@/components/VirtualisApp.jsx";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Virtualis — Messaging That Triages Itself" },
      {
        name: "description",
        content:
          "Acuity-routed clinical communication: consults triaged, matched, and delivered to the right on-call specialist.",
      },
      { property: "og:title", content: "Virtualis — Intelligent Medicine" },
      {
        property: "og:description",
        content:
          "Acuity-routed clinical messaging for care teams, with AI triage and on-call routing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VirtualisApp,
});
