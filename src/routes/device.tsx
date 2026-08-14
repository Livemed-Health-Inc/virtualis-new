import { createFileRoute } from "@tanstack/react-router";
// @ts-expect-error - untyped JSX prototype component
import DeviceStation from "@/components/virtualis/devices/DeviceStation.jsx";

export const Route = createFileRoute("/device")({
  head: () => ({
    meta: [
      { title: "Bedside Station — Virtualis Shared Device" },
      {
        name: "description",
        content:
          "Shared hospital cart station: package a consult with room, acuity and reason, then reach the on-call specialty directly. No sign-in required.",
      },
      { property: "og:title", content: "Virtualis Bedside Station" },
      {
        property: "og:description",
        content: "Shared cart device for consult packaging and on-call specialty routing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DeviceStation,
});
