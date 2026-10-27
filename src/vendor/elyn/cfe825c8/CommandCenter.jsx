import React from 'react';
import { AnimatePresence, motion, useCommandCenter, SyntheticNote, SyntheticPatient, UnavailableSection, MemoryToast as Toast } from '@/lib/note-embed/boundary';
import CommandCenterHeader from './CommandCenterHeader';
import MobileTabs from './MobileTabs';
export default function CommandCenter() {
    const s = useCommandCenter();
    return (React.createElement("div", { className: "h-full bg-background overflow-hidden flex flex-col", style: { paddingTop: 'var(--safe-top, env(safe-area-inset-top, 0px))' } },
        React.createElement(CommandCenterHeader, { s: s }),
        React.createElement(MobileTabs, { activeTab: s.activeTab, onTabChange: s.setActiveTab }),
        React.createElement("h1", { className: "sr-only" }, "Clinical Command Center"),
        React.createElement("main", { className: "flex-1 min-h-0 relative overflow-hidden" },
            React.createElement(AnimatePresence, { mode: "wait" },
                s.activeTab === 'patients' && React.createElement(SyntheticPatient, { s: s }),
                s.activeTab === 'notes' && (React.createElement(motion.div, { key: "notes", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "absolute inset-0 flex flex-col overflow-hidden" },
                    React.createElement(SyntheticNote, { s: s }))),
                s.activeTab === 'bills' && React.createElement(UnavailableSection, { title: "RCM / Billing" }),
                s.activeTab === 'priorauth' && React.createElement(UnavailableSection, { title: "Prior Authorization" }),
                s.activeTab === 'settings' && React.createElement(UnavailableSection, { title: "Settings" }),
                s.activeTab === "chat" && React.createElement(UnavailableSection, { title: "Chat transport" }))),
        React.createElement(AnimatePresence, null, s.toast && React.createElement(Toast, { message: s.toast }))));
}
