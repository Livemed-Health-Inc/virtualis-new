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
      { property: "og:url", content: "https://virtualischat.com/" },
      { property: "og:image", content: "https://virtualischat.com/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://virtualischat.com/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://virtualischat.com/" }],

  }),
  component: VirtualisApp,
});
