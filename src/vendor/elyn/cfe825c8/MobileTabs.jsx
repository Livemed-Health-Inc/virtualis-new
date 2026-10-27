import React from "react";
import { Button } from "@/lib/note-embed/boundary";
import { cn } from "@/lib/utils";
const TABS = [
    { id: "patients", label: "Patients" }, { id: "notes", label: "Notes" },
    { id: "bills", label: "Billing" }, { id: "priorauth", label: "Prior Auth" },
];
/** Command-center section switcher on narrow screens (the shell owns the bottom bar). */
export default function MobileTabs({ activeTab, onTabChange }) {
    return (React.createElement("div", { role: "tablist", className: "flex gap-1.5 overflow-x-auto px-3 pt-2 min-[700px]:hidden" }, TABS.map((t) => (React.createElement(Button, { key: t.id, type: "button", role: "tab", "aria-selected": activeTab === t.id, onClick: () => onTabChange(t.id), className: cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", activeTab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground") }, t.label)))));
}
