import React from "react";
import { Button } from "@/lib/note-embed/boundary";
import headerLogoUrl from "./logo-wordmark.png";
import { User, FileText, CreditCard, ClipboardList, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
const headerLogo = { url: headerLogoUrl };
export const navTabs = [
    { id: "patients", label: "Patients", icon: User },
    { id: "notes", label: "Notes", icon: FileText },
    { id: "bills", label: "Billing", icon: CreditCard },
    { id: "priorauth", label: "Prior Auth", icon: ClipboardList },
    { id: "settings", label: "Settings", icon: SettingsIcon },
];
/** Presentation-only floating pill nav shared by the Command Center and the staged demo. */
export default function CommandCenterPillNav({ activeTab, onTabChange, right, tabs = navTabs, }) {
    return (React.createElement("div", { className: "px-3 pt-3 md:pt-5" },
        React.createElement("div", { className: "pill-nav mx-auto max-w-7xl flex items-center justify-between gap-3 pl-4 pr-2 h-14" },
            React.createElement("div", { className: "flex items-center gap-3 min-w-0" },
                React.createElement("img", { src: headerLogo.url, alt: "Virtualis\u00AE Note\u2122", className: "h-8 w-auto object-contain shrink-0 [image-rendering:auto]" }),
                React.createElement("div", { className: "hidden md:flex items-center gap-1 ml-4" }, tabs.map((tab) => {
                    const active = activeTab === tab.id;
                    return (React.createElement(Button, { key: tab.id, onClick: () => onTabChange(tab.id), className: cn("relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors", active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground") },
                        React.createElement(tab.icon, { className: "w-4 h-4" }),
                        React.createElement("span", { className: "hidden lg:inline" }, tab.label)));
                }))),
            React.createElement("div", { className: "flex items-center gap-2 shrink-0" }, right))));
}
