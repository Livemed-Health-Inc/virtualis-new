import React from "react";
import { Button } from "@/lib/note-embed/boundary";
import { Plus, AlertTriangle, MessageSquare, } from "lucide-react";
import { Disabled as FacilitySelector } from "@/lib/note-embed/boundary";
import CommandCenterPillNav, { navTabs } from "./CommandCenterPillNav";
const headerTabs = [...navTabs.slice(0, 4), { id: "chat", label: "Chat", icon: MessageSquare }, navTabs[4]];
function progressColor(p) {
    if (p >= 80)
        return "bg-success";
    if (p >= 50)
        return "bg-warning";
    return "bg-primary";
}
export default function CommandCenterHeader({ s }) {
    // Rounding stats from patients
    const activePatients = s.patients.filter((p) => p.status !== "discharged");
    const total = activePatients.length;
    const notSeen = activePatients.filter((p) => !p.status || p.status === "not_seen").length;
    const inProgress = activePatients.filter((p) => p.status === "in_progress").length;
    const seen = activePatients.filter((p) => p.status === "seen").length;
    const signed = activePatients.filter((p) => p.status === "signed").length;
    const critical = activePatients.filter((p) => p.diagnosis?.toLowerCase().includes("critical")).length;
    const needsAttention = activePatients.filter((p) => (p.acuity_score ?? 0) >= 70).length;
    const completed = seen + signed;
    const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return (React.createElement(React.Fragment, null,
        React.createElement("header", { className: "flex-shrink-0 z-40 bg-transparent" },
            React.createElement(CommandCenterPillNav, { activeTab: s.activeTab, tabs: headerTabs, onTabChange: (id) => (id === "chat" ? (s.setActiveTab("chat")) : s.setActiveTab(id)), right: React.createElement(React.Fragment, null,
                    React.createElement(FacilitySelector, { onManageClick: () => s.setIsManageFacilitiesOpen(true) }),
                    React.createElement(Button, { onClick: s.handleRecordPress, className: "pill-cta h-10" },
                        React.createElement(Plus, { className: "w-4 h-4" }),
                        React.createElement("span", { className: "hidden sm:inline" }, "New Note"),
                        React.createElement("span", { className: "pill-arrow" },
                            React.createElement(Plus, { className: "w-3 h-3 opacity-0" }))),
                    React.createElement("span", { className: "text-xs text-muted-foreground" }, "RCM and account actions unavailable")) }),
            React.createElement("div", { className: "hidden lg:flex items-center gap-2 px-6 pt-4 max-w-7xl mx-auto flex-wrap" },
                s.statsCards.map((stat) => (React.createElement("div", { key: stat.label, className: "glass-badge py-1 px-3 gap-2" },
                    React.createElement("span", { className: "text-[11px] uppercase tracking-wider text-muted-foreground font-semibold" }, stat.label),
                    React.createElement("span", { className: "text-sm font-bold text-foreground" }, stat.value)))),
                React.createElement("div", { className: "glass-badge py-1 px-3 gap-2" },
                    React.createElement("span", { className: "text-[11px] uppercase tracking-wider text-muted-foreground font-semibold" }, "Active"),
                    React.createElement("span", { className: "text-sm font-bold text-foreground" }, notSeen + inProgress + seen)),
                React.createElement("div", { className: "glass-badge py-1 px-3 gap-2" },
                    React.createElement("span", { className: "text-[11px] uppercase tracking-wider text-muted-foreground font-semibold" }, "Signed"),
                    React.createElement("span", { className: "text-sm font-bold text-foreground" }, signed)),
                needsAttention > 0 && (React.createElement("div", { className: "glass-badge py-1 px-3 gap-2", style: { borderColor: "hsl(var(--destructive) / 0.3)" } },
                    React.createElement(AlertTriangle, { className: "w-3.5 h-3.5 text-destructive" }),
                    React.createElement("span", { className: "text-[11px] uppercase tracking-wider text-destructive/80 font-semibold" }, "Attention"),
                    React.createElement("span", { className: "text-sm font-bold text-destructive" }, needsAttention))),
                critical > 0 && (React.createElement("div", { className: "glass-badge py-1 px-3 gap-2", style: { borderColor: "hsl(var(--destructive) / 0.3)" } },
                    React.createElement(AlertTriangle, { className: "w-3.5 h-3.5 text-destructive" }),
                    React.createElement("span", { className: "text-[11px] uppercase tracking-wider text-destructive/80 font-semibold" }, "Critical"),
                    React.createElement("span", { className: "text-sm font-bold text-destructive" }, critical)))),
            React.createElement("div", { className: "flex lg:hidden items-center gap-3 px-4 pt-3 overflow-x-auto scrollbar-hide" },
                s.statsCards.map((stat) => (React.createElement("div", { key: stat.label, className: "flex items-center gap-1 text-[11px] whitespace-nowrap" },
                    React.createElement("span", { className: "text-muted-foreground" }, stat.label),
                    React.createElement("span", { className: "font-semibold text-foreground" }, stat.value)))),
                React.createElement("span", { className: "text-muted-foreground/40" }, "\u00B7"),
                React.createElement("div", { className: "flex items-center gap-1 text-[11px] whitespace-nowrap" },
                    React.createElement("span", { className: "text-muted-foreground" }, "Active"),
                    React.createElement("span", { className: "font-semibold text-foreground" }, notSeen + inProgress + seen)),
                React.createElement("div", { className: "flex items-center gap-1 text-[11px] whitespace-nowrap" },
                    React.createElement("span", { className: "text-muted-foreground" }, "Signed"),
                    React.createElement("span", { className: "font-semibold text-foreground" }, signed)),
                needsAttention > 0 && (React.createElement("div", { className: "flex items-center gap-1 text-[11px] whitespace-nowrap" },
                    React.createElement(AlertTriangle, { className: "w-3 h-3 text-destructive animate-pulse" }),
                    React.createElement("span", { className: "text-destructive font-semibold" },
                        "\u26A0 ",
                        needsAttention))),
                critical > 0 && (React.createElement("div", { className: "flex items-center gap-1 text-[11px] whitespace-nowrap" },
                    React.createElement(AlertTriangle, { className: "w-3 h-3 text-destructive" }),
                    React.createElement("span", { className: "text-destructive font-semibold" }, critical)))))));
}
