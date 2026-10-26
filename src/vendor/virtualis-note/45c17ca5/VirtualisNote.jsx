import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "../../../lib/note-embed/boundary";
import { useNavigate } from "../../../lib/note-embed/boundary";
import { useVirtualisNoteState } from "../../../lib/note-embed/boundary";
import { useNoteGeneration } from "../../../lib/note-embed/boundary";
import { AppLayout, Disabled as AnalyticsDashboard, Disabled as RadiologyContextInput, Disabled as ModalitySelector, Disabled as RadiologySafetyHeader, Disabled as RadiologyTemplatePicker, Disabled as BillingConfirmationModal, Disabled as SyncStatusIndicator, Disabled as CompletenessBlockDialog } from "../../../lib/note-embed/boundary";
import { Waveform, NoteSection, Modal, Toast, copyToClipboard, parseNoteSections, } from "./widgets";
import logo from "./favicon.png";
const elynLogo = { url: logo };
import { Button } from "../../../lib/note-embed/boundary";
import { cn } from "@/lib/utils";
import { Menu, X, Mic, MicOff, AlertCircle, ChevronDown, ChevronUp, Stethoscope, Scan, Video, Phone, Plus, Trash2, Clock, FileText, RotateCcw, Sparkles, CheckCircle2, } from "lucide-react";
import { ENCOUNTER_TYPES, POS_CODES } from "./encounterContext";
export default function VirtualisNote() {
    const navigate = useNavigate();
    const s = useVirtualisNoteState();
    const { generateNote, generateHandoff, savePatient, startEditingNote, saveNoteEdits, confirmBilling, discardBilling, confirmReview, } = useNoteGeneration(s);
    const handleBillingConfirm = (edited) => {
        confirmBilling({
            icd10: edited.icd10,
            cpt: edited.cpt,
            em: edited.emLevel,
            rvu: edited.rvu,
            mdm: edited.mdmComplexity,
            modifiers: s.codes?.modifiers || [],
        });
    };
    return (React.createElement(AppLayout, { maxWidth: "7xl", className: "p-3 md:p-4 min-h-screen" },
        React.createElement(Header, { s: s, navigate: navigate }),
        React.createElement(AnimatePresence, { mode: "wait" },
            s.activeTab === "document" && (React.createElement(motion.div, { key: "document", initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } },
                React.createElement(StatsBar, { stats: s.todayStats }),
                React.createElement("div", { className: "md:hidden space-y-3" },
                    React.createElement(CollapsibleSection, { id: "recording", title: "Voice Recording", icon: "\uD83C\uDF99\uFE0F", expanded: s.expandedSection, toggle: s.toggleSection, headerAction: s.speech.isRecording && (React.createElement("span", { className: "w-2 h-2 bg-destructive rounded-full animate-pulse" })) },
                        React.createElement(VoiceRecorderSection, { speech: s.speech })),
                    React.createElement(CollapsibleSection, { id: "patient", title: s.patient.name || "Patient", icon: "\uD83D\uDC64", expanded: s.expandedSection, toggle: s.toggleSection, headerAction: s.savedPatients.length > 0 && (React.createElement("span", { className: "text-xs text-muted-foreground" },
                            s.savedPatients.length,
                            " saved")) },
                        React.createElement(PatientSection, { s: s })),
                    React.createElement(ModeToggle, { documentMode: s.documentMode, setDocumentMode: s.setDocumentMode }),
                    s.documentMode === "clinical" && (React.createElement(CollapsibleSection, { id: "encounter", title: "Encounter", icon: "\uD83C\uDFE5", expanded: s.expandedSection, toggle: s.toggleSection },
                        React.createElement(EncounterContextSection, { encounterContext: s.encounterContext, setEncounterContext: s.setEncounterContext }))),
                    React.createElement(CollapsibleSection, { id: "noteType", title: s.documentMode === "radiology" ? "Modality" : "Note Type", icon: s.documentMode === "radiology" ? "🔬" : "📋", expanded: s.expandedSection, toggle: s.toggleSection }, s.documentMode === "radiology" ? (React.createElement(ModalitySelector, { modality: s.radiologyModality, onModalityChange: (m) => {
                            s.setRadiologyModality(m);
                            s.setRadiologyContext((prev) => ({
                                ...prev,
                                modality: m,
                            }));
                        } })) : (React.createElement(NoteTypeSelector, { noteType: s.noteType, setNoteType: s.setNoteType }))),
                    s.documentMode === "radiology" && (React.createElement(CollapsibleSection, { id: "studyContext", title: "Study Details", icon: "\uD83D\uDCCB", expanded: s.expandedSection, toggle: s.toggleSection },
                        React.createElement(RadiologyContextInput, { context: s.radiologyContext, onChange: s.setRadiologyContext, modality: s.radiologyModality, onModalityChange: s.setRadiologyModality }))),
                    React.createElement(TranscriptSection, { s: s, generateNote: generateNote }),
                    (s.generatedNote || s.isGenerating) && (React.createElement(NoteDisplay, { s: s, startEditingNote: startEditingNote, saveNoteEdits: saveNoteEdits, generateHandoff: generateHandoff, confirmReview: confirmReview })),
                    s.codes && (React.createElement(CollapsibleSection, { id: "billing", title: "Billing", icon: "\uD83D\uDCB0", expanded: s.expandedSection, toggle: s.toggleSection, headerAction: React.createElement("span", { className: "text-sm font-bold text-primary" },
                            s.codes.rvu?.toFixed(2),
                            " RVU") },
                        React.createElement(EditableBillingSection, { codes: s.codes, setCodes: s.setCodes, noteId: s.currentNoteId, userId: s.user?.id, showToast: s.showToast })))),
                React.createElement("div", { className: "hidden md:grid grid-cols-12 gap-5" },
                    React.createElement("div", { className: "col-span-3 space-y-5" },
                        React.createElement(PanelCard, { title: "\uD83D\uDC64 Patient", headerAction: s.savedPatients.length > 0 && (React.createElement(Button, { variant: "ghost", size: "sm", onClick: () => s.setShowPatientList(!s.showPatientList), className: "h-7 px-2 text-xs rounded-lg hover:bg-muted" }, s.showPatientList
                                ? "✕"
                                : `📋 ${s.savedPatients.length}`)) },
                            React.createElement(PatientSection, { s: s })),
                        React.createElement(PanelCard, { title: "\uD83C\uDF99\uFE0F Voice Recording", variant: "secondary" },
                            React.createElement(VoiceRecorderSection, { speech: s.speech })),
                        React.createElement(ModeToggle, { documentMode: s.documentMode, setDocumentMode: s.setDocumentMode }),
                        s.documentMode === "clinical" && (React.createElement(PanelCard, { title: "\uD83C\uDFE5 Encounter" },
                            React.createElement(EncounterContextSection, { encounterContext: s.encounterContext, setEncounterContext: s.setEncounterContext }))),
                        React.createElement(PanelCard, { title: s.documentMode === "radiology"
                                ? "🔬 Modality"
                                : "📋 Note Type", variant: "warning" }, s.documentMode === "radiology" ? (React.createElement(ModalitySelector, { modality: s.radiologyModality, onModalityChange: (m) => {
                                s.setRadiologyModality(m);
                                s.setRadiologyContext((prev) => ({
                                    ...prev,
                                    modality: m,
                                }));
                            } })) : (React.createElement(NoteTypeSelector, { noteType: s.noteType, setNoteType: s.setNoteType }))),
                        s.documentMode === "radiology" && (React.createElement(PanelCard, { title: "\uD83D\uDCCB Study Details", variant: "secondary" },
                            React.createElement(RadiologyContextInput, { context: s.radiologyContext, onChange: s.setRadiologyContext, modality: s.radiologyModality, onModalityChange: s.setRadiologyModality })))),
                    React.createElement("div", { className: "col-span-6 space-y-5" },
                        React.createElement(TranscriptSection, { s: s, generateNote: generateNote, desktop: true }),
                        React.createElement(NoteDisplay, { s: s, startEditingNote: startEditingNote, saveNoteEdits: saveNoteEdits, generateHandoff: generateHandoff, desktop: true, confirmReview: confirmReview })),
                    React.createElement("div", { className: "col-span-3 space-y-5" },
                        React.createElement(PanelCard, { title: "\uD83D\uDCB0 Billing", variant: "warning", headerAction: s.codes && (React.createElement("span", { className: "text-lg font-bold text-primary" },
                                s.codes.rvu?.toFixed(2),
                                " RVU")) }, s.codes ? (React.createElement(EditableBillingSection, { codes: s.codes, setCodes: s.setCodes, noteId: s.currentNoteId, userId: s.user?.id, showToast: s.showToast })) : (React.createElement("div", { className: "text-center py-10" },
                            React.createElement("div", { className: "w-16 h-16 mx-auto rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center mb-4" },
                                React.createElement("span", { className: "text-3xl" }, "\uD83D\uDCB0")),
                            React.createElement("div", { className: "text-sm text-muted-foreground" }, "Billing codes will appear"),
                            React.createElement("div", { className: "text-xs text-muted-foreground mt-1" }, "after note generation")))))))),
            s.activeTab === "analytics" && (React.createElement(motion.div, { key: "analytics", initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } },
                React.createElement(AnalyticsDashboard, null))),
            s.activeTab === "settings" && (React.createElement(motion.div, { key: "settings", initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 }, className: "bg-card/60 backdrop-blur-xl border border-primary/20 rounded-2xl p-6 max-w-xl mx-auto" },
                React.createElement("h2", { className: "text-xl font-bold mb-6 text-primary" }, "\u2699\uFE0F Settings"),
                React.createElement("div", { className: "space-y-4" }, [
                    [
                        "👤",
                        "Profile Settings",
                        "Update your name, specialty, and NPI",
                        "/profile",
                    ],
                    [
                        "💰",
                        "Billing Agent",
                        "Manage billing records and CPT codes",
                        "/billing-agent",
                    ],
                    [
                        "🏥",
                        "Practice Manager",
                        "Patient census and multi-specialty view",
                        "/practice-manager",
                    ],
                ].map(([icon, title, desc, path]) => (React.createElement(Button, { key: path, onClick: () => navigate(path), variant: "outline", className: "w-full justify-start h-14 px-4 border-primary/20 hover:border-primary/40" },
                    React.createElement("div", { className: "flex items-center gap-3" },
                        React.createElement("span", { className: "text-xl" }, icon),
                        React.createElement("div", { className: "text-left" },
                            React.createElement("div", { className: "font-medium" }, title),
                            React.createElement("div", { className: "text-xs text-muted-foreground" }, desc)))))))))),
        React.createElement(AnimatePresence, null, s.showPatientModal && (React.createElement(Modal, { onClose: () => s.setShowPatientModal(false) },
            React.createElement(PatientModal, { s: s, savePatient: savePatient })))),
        s.showBillingConfirmation && s.pendingBilling && (React.createElement(BillingConfirmationModal, { isOpen: s.showBillingConfirmation, onClose: () => s.setShowBillingConfirmation(false), billing: {
                icd10: s.pendingBilling.billing.icd10 || [],
                cpt: s.pendingBilling.billing.cpt || [],
                emLevel: s.pendingBilling.billing.em || "",
                rvu: s.pendingBilling.billing.rvu || 0,
                mdmComplexity: s.pendingBilling.billing.mdm || "",
            }, patientName: s.patient.name, noteType: s.pendingBilling.currentNoteType, onConfirm: handleBillingConfirm, onDiscard: discardBilling })),
        React.createElement(CompletenessBlockDialog, { items: s.completenessPrompt?.items ?? null, onCancel: () => s.completenessPrompt?.resolve(null), onOverride: (reason) => s.completenessPrompt?.resolve(reason) }),
        React.createElement(AnimatePresence, null, s.showHandoff && (React.createElement(Modal, { onClose: () => s.setShowHandoff(false) },
            React.createElement("div", { className: "p-6 max-h-[calc(100dvh-2rem)] overflow-y-auto" },
                React.createElement("div", { className: "flex justify-between items-center mb-4" },
                    React.createElement("h2", { className: "text-lg font-semibold text-primary" }, "\uD83D\uDD04 Handoff Summary"),
                    React.createElement(Button, { variant: "ghost", size: "sm", onClick: () => s.setShowHandoff(false) }, "\u2715")),
                React.createElement("div", { className: "whitespace-pre-wrap text-sm leading-relaxed" }, s.handoffSummary),
                React.createElement("div", { className: "flex gap-3 mt-6" },
                    React.createElement(Button, { variant: "outline", onClick: () => s.setShowHandoff(false), className: "flex-1 border-primary/30" }, "Close"),
                    React.createElement(Button, { onClick: () => copyToClipboard(s.handoffSummary, s.showToast), className: "flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" }, "\uD83D\uDCCB Copy")))))),
        React.createElement(AnimatePresence, null, s.toast && React.createElement(Toast, { message: s.toast }))));
}
// === Sub-components ===
function Header({ s, navigate, }) {
    return (React.createElement("header", { className: "bg-card/70 backdrop-blur-xl border border-border rounded-2xl p-3 md:p-5 mb-4 md:mb-6" },
        React.createElement("div", { className: "flex justify-between items-center" },
            React.createElement("div", { className: "flex items-center gap-3" },
                React.createElement("img", { src: elynLogo.url, alt: "Virtualis Note", className: "w-10 h-10 md:w-12 md:h-12 object-contain mix-blend-multiply dark:mix-blend-screen" }),
                React.createElement("div", null,
                    React.createElement("h1", { className: "text-xl md:text-2xl font-medium text-primary" }, "Virtualis\u00AE Note\u2122"),
                    React.createElement("span", { className: "hidden md:inline-block px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded-full" }, "Rounds Simplified"))),
            React.createElement("nav", { className: "hidden md:flex gap-1 bg-muted/50 p-1 rounded-xl" }, [
                ["document", "📝", "Document"],
                ["analytics", "📊", "Analytics"],
                ["settings", "⚙️", "Settings"],
            ].map(([key, icon, label]) => (React.createElement(Button, { key: key, onClick: () => s.setActiveTab(key), variant: "ghost", size: "sm", className: cn("px-4 py-2 rounded-lg", s.activeTab === key
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted") },
                React.createElement("span", { className: "mr-1.5" }, icon),
                label)))),
            React.createElement("div", { className: "hidden md:flex items-center gap-2" },
                React.createElement(SyncStatusIndicator, { status: s.syncStatus, lastSyncTime: s.lastSyncTime, connectedDevices: s.connectedDevices, onForceSync: s.forceSync }),
                React.createElement(VoiceStatusBadge, { speech: s.speech }),
                React.createElement(Button, { onClick: () => navigate("/practice-manager"), variant: "outline", size: "sm" }, "Practice"),
                React.createElement(Button, { variant: "ghost", onClick: s.signOut, size: "sm", className: "text-muted-foreground" }, "Sign Out")),
            React.createElement("div", { className: "flex md:hidden items-center gap-2" },
                React.createElement(SyncStatusIndicator, { status: s.syncStatus, lastSyncTime: s.lastSyncTime, compact: true }),
                React.createElement(VoiceStatusBadge, { speech: s.speech, compact: true }),
                React.createElement(Button, { variant: "ghost", size: "sm", onClick: () => s.setMobileMenuOpen(!s.mobileMenuOpen), className: "p-2" }, s.mobileMenuOpen ? (React.createElement(X, { className: "w-5 h-5" })) : (React.createElement(Menu, { className: "w-5 h-5" }))))),
        React.createElement(AnimatePresence, null, s.mobileMenuOpen && (React.createElement(motion.div, { initial: { height: 0, opacity: 0 }, animate: { height: "auto", opacity: 1 }, exit: { height: 0, opacity: 0 }, className: "md:hidden mt-4 pt-4 border-t border-border" },
            React.createElement("nav", { className: "flex flex-col gap-2 mb-4" }, [
                ["document", "📝", "Document"],
                ["analytics", "📊", "Analytics"],
                ["settings", "⚙️", "Settings"],
            ].map(([key, icon, label]) => (React.createElement(Button, { key: key, onClick: () => {
                    s.setActiveTab(key);
                    s.setMobileMenuOpen(false);
                }, variant: "ghost", className: cn("justify-start px-4 py-3 rounded-xl", s.activeTab === key
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground") },
                React.createElement("span", { className: "mr-2 text-lg" }, icon),
                label)))),
            React.createElement("div", { className: "flex flex-col gap-2" },
                React.createElement(Button, { onClick: () => {
                        navigate("/profile");
                        s.setMobileMenuOpen(false);
                    }, variant: "outline", className: "justify-start" }, "\uD83D\uDC64 Profile Settings"),
                React.createElement(Button, { onClick: () => {
                        navigate("/practice-manager");
                        s.setMobileMenuOpen(false);
                    }, variant: "outline", className: "justify-start" }, "Practice Manager"),
                React.createElement(Button, { variant: "ghost", onClick: s.signOut, className: "justify-start text-destructive" }, "Sign Out")))))));
}
function StatsBar({ stats, }) {
    return (React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6" }, [
        ["Notes Today", stats.notes, "📝"],
        ["Total wRVU", stats.rvu.toFixed(1), "💰"],
        ["Consults", stats.consults, "🩺"],
        ["Avg Time", stats.avgTime, "⏱️"],
    ].map(([label, value, icon]) => (React.createElement("div", { key: label, className: "bg-card/60 backdrop-blur-xl border border-border rounded-xl p-3 md:p-4" },
        React.createElement("div", { className: "flex items-center justify-between" },
            React.createElement("div", null,
                React.createElement("div", { className: "text-xl md:text-2xl font-bold text-foreground" }, value),
                React.createElement("div", { className: "text-xs text-muted-foreground" }, label)),
            React.createElement("div", { className: "text-xl md:text-2xl opacity-60" }, icon)))))));
}
function PanelCard({ title, children, variant, headerAction, }) {
    const bg = variant === "secondary"
        ? "bg-secondary/10"
        : variant === "warning"
            ? "bg-warning/10"
            : "bg-primary/10";
    const text = variant === "secondary"
        ? "text-secondary"
        : variant === "warning"
            ? "text-warning"
            : "text-primary";
    return (React.createElement("div", { className: "bg-card/60 backdrop-blur-xl border border-border rounded-2xl overflow-hidden" },
        React.createElement("div", { className: `${bg} px-5 py-3 border-b border-border` },
            React.createElement("div", { className: "flex items-center justify-between" },
                React.createElement("span", { className: `text-sm font-semibold ${text} uppercase tracking-wider` }, title),
                headerAction)),
        React.createElement("div", { className: "p-5" }, children)));
}
function CollapsibleSection({ id, title, icon, children, expanded, toggle, headerAction, }) {
    const isExpanded = expanded === id;
    return (React.createElement("div", { className: "bg-card/60 backdrop-blur-xl border border-border rounded-2xl overflow-hidden" },
        React.createElement("button", { onClick: () => toggle(id), className: "w-full flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border" },
            React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("span", { className: "text-lg" }, icon),
                React.createElement("span", { className: "text-sm font-semibold text-primary" }, title)),
            React.createElement("div", { className: "flex items-center gap-2" },
                headerAction,
                isExpanded ? (React.createElement(ChevronUp, { className: "w-4 h-4 text-muted-foreground" })) : (React.createElement(ChevronDown, { className: "w-4 h-4 text-muted-foreground" })))),
        React.createElement(AnimatePresence, null, isExpanded && (React.createElement(motion.div, { initial: { height: 0, opacity: 0 }, animate: { height: "auto", opacity: 1 }, exit: { height: 0, opacity: 0 }, transition: { duration: 0.2 } },
            React.createElement("div", { className: "p-4" }, children))))));
}
function ModeToggle({ documentMode, setDocumentMode, }) {
    return (React.createElement("div", { className: "bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-3" },
        React.createElement("div", { className: "flex gap-2" }, [
            ["clinical", Stethoscope, "Clinical"],
            ["radiology", Scan, "Radiology"],
        ].map(([mode, Icon, label]) => (React.createElement(Button, { key: mode, onClick: () => setDocumentMode(mode), variant: "ghost", size: "sm", className: cn("flex-1 h-10 rounded-xl", documentMode === mode
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted") },
            React.createElement(Icon, { className: "w-4 h-4 mr-2" }),
            label))))));
}
function VoiceStatusBadge({ speech, compact = false, }) {
    if (speech.error)
        return (React.createElement("span", { className: "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border bg-destructive/15 border-destructive/40 text-destructive" },
            React.createElement(AlertCircle, { className: "w-3 h-3" }),
            !compact && "Error"));
    if (speech.isRecording)
        return (React.createElement("span", { className: "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border animate-pulse bg-destructive/15 border-destructive/40 text-destructive" },
            React.createElement("span", { className: "w-2 h-2 bg-destructive rounded-full" }),
            !compact && "Recording"));
    return (React.createElement("span", { className: cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border", speech.isSupported
            ? "bg-primary/15 border-primary/40 text-primary"
            : "bg-muted border-border text-muted-foreground") }, speech.isSupported ? (React.createElement(React.Fragment, null,
        React.createElement(Mic, { className: "w-3 h-3" }),
        !compact && "Voice Ready")) : (React.createElement(React.Fragment, null,
        React.createElement(MicOff, { className: "w-3 h-3" }),
        !compact && "No Voice"))));
}
function VoiceRecorderSection({ speech }) {
    return (React.createElement("div", { className: "space-y-4" },
        speech.error && (React.createElement("div", { className: "flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl" },
            React.createElement(AlertCircle, { className: "w-4 h-4 text-destructive mt-0.5 flex-shrink-0" }),
            React.createElement("div", { className: "flex-1" },
                React.createElement("p", { className: "text-sm text-destructive" }, speech.error.message),
                React.createElement(Button, { variant: "ghost", size: "sm", onClick: speech.clearError, className: "mt-2 h-7 text-xs text-destructive hover:bg-destructive/20" }, "Dismiss")))),
        React.createElement("div", { className: "bg-muted/50 rounded-xl p-4" },
            React.createElement(Waveform, { active: speech.isRecording })),
        React.createElement(Button, { onClick: speech.isRecording ? speech.stop : speech.start, disabled: !speech.isSupported && !speech.error, className: cn("w-full h-12 text-base font-semibold rounded-xl", speech.isRecording
                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground recording-pulse"
                : "bg-secondary hover:bg-secondary/90 text-secondary-foreground") }, speech.isRecording ? (React.createElement(React.Fragment, null,
            React.createElement(MicOff, { className: "w-5 h-5 mr-2" }),
            "Stop Recording")) : (React.createElement(React.Fragment, null,
            React.createElement(Mic, { className: "w-5 h-5 mr-2" }),
            "Start Recording"))),
        speech.interim && (React.createElement("div", { className: "text-sm text-muted-foreground italic bg-muted/50 rounded-lg p-3" },
            "\"",
            speech.interim,
            "\"")),
        speech.permissionState === "denied" && (React.createElement("p", { className: "text-xs text-muted-foreground text-center" }, "Microphone access is blocked. Enable it in browser settings."))));
}
function PatientSection({ s }) {
    const [showImport, setShowImport] = React.useState(false);
    return (React.createElement(React.Fragment, null,
        React.createElement(AnimatePresence, null, s.showPatientList && s.savedPatients.length > 0 && (React.createElement(motion.div, { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: "auto" }, exit: { opacity: 0, height: 0 }, className: "mb-4 max-h-48 overflow-auto rounded-xl border border-border bg-muted/50" }, s.savedPatients.map((p) => (React.createElement("div", { key: p.id, onClick: () => s.selectPatient(p), className: "p-3 cursor-pointer hover:bg-muted border-b border-border last:border-b-0 flex justify-between items-center" },
            React.createElement("div", null,
                React.createElement("div", { className: "text-sm font-medium text-foreground" }, p.name),
                React.createElement("div", { className: "text-xs text-muted-foreground" }, p.room && `Room ${p.room}`)),
            s.patient.id === p.id && (React.createElement("span", { className: "text-primary text-sm" }, "\u2713")))))))),
        s.patient.name ? (React.createElement("div", null,
            React.createElement("div", { className: "flex justify-between items-start mb-3" },
                React.createElement("div", null,
                    React.createElement("div", { className: "font-bold text-lg text-foreground" }, s.patient.name),
                    React.createElement("div", { className: "text-sm text-muted-foreground" },
                        s.patient.room && `Room ${s.patient.room}`,
                        " ",
                        s.patient.mrn && `• ${s.patient.mrn}`)),
                React.createElement("div", { className: "flex gap-1" },
                    React.createElement(Button, { variant: "ghost", size: "sm", onClick: () => s.setShowPatientModal(true), className: "h-8 w-8 p-0 rounded-lg hover:bg-muted" }, "\u270F\uFE0F"),
                    React.createElement(Button, { variant: "ghost", size: "sm", onClick: s.clearPatient, className: "h-8 w-8 p-0 rounded-lg hover:bg-destructive/20 text-destructive" }, "\u2715"))),
            s.patient.diagnosis && (React.createElement("div", { className: "text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mb-2" },
                "\uD83D\uDCCB ",
                s.patient.diagnosis)),
            s.patient.allergies && (React.createElement("div", { className: "text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-2" },
                "\u26A0\uFE0F ",
                s.patient.allergies)),
            s.patient.insurance_name && (React.createElement("div", { className: "text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2" },
                "\uD83C\uDFE5 ",
                s.patient.insurance_name,
                " ",
                s.patient.insurance_id && `• ${s.patient.insurance_id}`)))) : (React.createElement(Button, { onClick: () => s.setShowPatientModal(true), variant: "outline", className: "w-full h-16 border-dashed border-2 border-border text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 rounded-xl" },
            React.createElement("div", { className: "text-center" },
                React.createElement("div", { className: "text-2xl mb-1" }, "+"),
                React.createElement("div", { className: "text-sm" }, "Add Patient Manually")))),
        s.savedPatients.length > 0 && (React.createElement(Button, { variant: "ghost", size: "sm", onClick: () => s.setShowPatientList(!s.showPatientList), className: "w-full mt-3 text-xs text-muted-foreground" }, s.showPatientList
            ? "Hide saved patients"
            : `View ${s.savedPatients.length} saved patients`))));
}
// Enhanced transcript with word count, duration badge, append/replace toggle
function TranscriptSection({ s, generateNote, desktop, }) {
    const wordCount = s.editableTranscript.trim()
        ? s.editableTranscript.trim().split(/\s+/).length
        : 0;
    const charCount = s.editableTranscript.length;
    const isRadiology = s.documentMode === "radiology";
    return (React.createElement("div", { className: "bg-card/60 backdrop-blur-xl border border-border rounded-2xl overflow-hidden" },
        isRadiology && (React.createElement("div", { className: "px-4 md:px-5 pt-4" },
            React.createElement(RadiologySafetyHeader, { patientName: s.patient.name, mrn: s.patient.mrn, dob: s.patient.dob, modality: s.radiologyModality, bodyPart: s.radiologyContext.bodyPart || "", accessionNumber: s.accessionNumber, setAccessionNumber: s.setAccessionNumber, accessionVerified: s.accessionVerified, setAccessionVerified: s.setAccessionVerified, isStat: s.isStat, setIsStat: s.setIsStat, dictationStartedAt: s.dictationStartedAt }))),
        React.createElement("div", { className: "px-4 md:px-5 py-3 bg-muted/50 border-b border-border flex justify-between items-center" },
            React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("span", { className: "text-sm font-semibold text-muted-foreground uppercase tracking-wider" }, "\uD83D\uDCDD Transcript"),
                s.speech.isRecording && (React.createElement("span", { className: "flex items-center gap-1 px-2 py-0.5 bg-destructive/15 border border-destructive/30 rounded-full text-xs text-destructive animate-pulse" },
                    React.createElement(Clock, { className: "w-3 h-3" }),
                    " Live"))),
            React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("button", { onClick: () => s.setAppendMode(!s.appendMode), className: cn("px-2 py-1 rounded-lg text-xs font-medium border transition-colors", s.appendMode
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted border-border text-muted-foreground") }, s.appendMode ? "➕ Append" : "🔄 Replace"),
                React.createElement(Button, { variant: "ghost", size: "sm", onClick: () => copyToClipboard(s.editableTranscript, s.showToast), className: "h-7 px-2 text-xs" }, "\uD83D\uDCCB"),
                React.createElement(Button, { variant: "ghost", size: "sm", onClick: () => {
                        s.speech.clear();
                        s.setEditableTranscript("");
                    }, className: "h-7 px-2 text-xs text-destructive" }, "\uD83D\uDDD1\uFE0F"))),
        React.createElement("div", { className: "p-4 md:p-5" },
            isRadiology && (React.createElement(RadiologyTemplatePicker, { modality: s.radiologyModality, onInsert: (tpl) => {
                    const cur = s.editableTranscript.trim();
                    s.setEditableTranscript(cur ? `${cur}\n\n${tpl}` : tpl);
                    if (!s.dictationStartedAt)
                        s.setDictationStartedAt(Date.now());
                } })),
            React.createElement("textarea", { value: s.editableTranscript, onChange: (e) => s.setEditableTranscript(e.target.value), placeholder: "Start recording or type your clinical notes here...", className: cn("w-full p-3 md:p-4 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground resize-y text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20", desktop ? "min-h-[140px] font-mono" : "min-h-[120px]") }),
            s.editableTranscript.trim() && (React.createElement("div", { className: "flex items-center gap-3 mt-2 text-xs text-muted-foreground" },
                React.createElement("span", { className: "flex items-center gap-1" },
                    React.createElement(FileText, { className: "w-3 h-3" }),
                    wordCount,
                    " words"),
                React.createElement("span", null,
                    charCount,
                    " chars"))),
            !s.isPatientClaimsReady && s.editableTranscript.trim() && (React.createElement("div", { className: "mt-3 p-2.5 md:p-3 rounded-xl bg-warning/10 border border-warning/30 flex items-center gap-2" },
                React.createElement(AlertCircle, { className: "w-4 h-4 text-warning flex-shrink-0" }),
                React.createElement("p", { className: "text-xs md:text-sm text-warning" }, "Complete patient demographics & insurance before generating"))),
            React.createElement(Button, { onClick: generateNote, disabled: s.isGenerating || !s.editableTranscript.trim(), className: "w-full mt-3 md:mt-4 h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl disabled:opacity-50" }, s.isGenerating
                ? `⏳ Generating ${s.documentMode === "radiology" ? "Report" : "Note"}...`
                : `✨ Generate ${s.documentMode === "radiology" ? s.radiologyModality.toUpperCase() + " Report" : s.noteType + " Note"}`))));
}
// Section color map for note editing
const SECTION_COLORS = {
    "Chief Complaint": "border-l-destructive",
    HPI: "border-l-primary",
    "History of Present Illness": "border-l-primary",
    "Review of Systems": "border-l-secondary",
    "Physical Exam": "border-l-warning",
    Assessment: "border-l-accent",
    Plan: "border-l-chart-1",
    Findings: "border-l-primary",
    Impression: "border-l-accent",
};
// Auto-resize textarea hook
function AutoResizeTextarea({ value, onChange, className, }) {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.style.height = "auto";
            ref.current.style.height = ref.current.scrollHeight + "px";
        }
    }, [value]);
    return (React.createElement("textarea", { ref: ref, value: value, onChange: (e) => onChange(e.target.value), className: cn("w-full p-3 rounded-xl bg-muted/50 border border-border text-foreground text-sm resize-none focus:outline-none focus:border-primary/50 overflow-hidden", className) }));
}
// Improved NoteDisplay with section colors, auto-resize, unsaved indicator
function NoteDisplay({ s, startEditingNote, saveNoteEdits, generateHandoff, desktop, confirmReview, }) {
    const hasUnsavedEdits = s.isEditingNote;
    const allSectionsReviewed = Object.keys(s.reviewedSections).length > 0 &&
        Object.values(s.reviewedSections).every((v) => v);
    const hasNote = Boolean(s.generatedNote);
    const needsReview = false;
    const handleReviewToggle = (title) => {
        s.setReviewedSections((prev) => ({ ...prev, [title]: !prev[title] }));
    };
    const handleReviewAll = () => {
        s.setReviewedSections((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((k) => {
                updated[k] = true;
            });
            return updated;
        });
    };
    return (React.createElement("div", { className: cn("backdrop-blur-xl rounded-2xl overflow-hidden", needsReview
            ? "bg-amber-500/5 border-2 border-dashed border-amber-500/40"
            : "bg-card/60 border border-border") },
        React.createElement("div", { className: cn("px-4 md:px-5 py-3 border-b border-border flex justify-between items-center", desktop ? "bg-primary/10" : "bg-muted/30") },
            React.createElement("div", { className: "flex items-center gap-2 md:gap-3" },
                React.createElement("span", { className: cn("text-sm font-semibold uppercase tracking-wider text-primary") }, "\uD83D\uDCC4 Synthetic Draft"),
                needsReview && (React.createElement("span", { className: "flex items-center gap-1 text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full" },
                    React.createElement(Sparkles, { className: "w-3 h-3" }),
                    "Synthetic Draft \u00B7 Review Required")),
                s.isNoteReviewed && s.currentNoteId && !s.isEditingNote && (React.createElement("span", { className: "flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full" },
                    React.createElement(CheckCircle2, { className: "w-3 h-3" }),
                    "Physician Reviewed \u2713")),
                hasUnsavedEdits && (React.createElement("span", { className: "text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full animate-pulse" }, "\u25CF Unsaved changes"))),
            s.generatedNote && (React.createElement("div", { className: "flex gap-1 md:gap-2" }, s.generatedNote && (React.createElement(React.Fragment, null,
                React.createElement(Button, { size: "sm", variant: s.isEditingNote ? "default" : desktop ? "outline" : "ghost", onClick: s.isEditingNote ? saveNoteEdits : startEditingNote, className: "h-7 px-3 text-xs" }, s.isEditingNote ? "Keep in memory" : "✏️ Edit"),
                s.isEditingNote && (React.createElement(Button, { size: "sm", variant: "ghost", onClick: () => s.setIsEditingNote(false), className: "h-7 px-2 text-xs text-muted-foreground" },
                    React.createElement(RotateCcw, { className: "w-3 h-3 mr-1" }),
                    "Discard")),
                !s.isEditingNote && (React.createElement(React.Fragment, null,
                    React.createElement(Button, { size: "sm", onClick: () => copyToClipboard(s.generatedNote, s.showToast), className: "h-7 px-3 text-xs bg-primary text-primary-foreground" }, "Copy All"),
                    desktop && (React.createElement(Button, { variant: "ghost", size: "sm", onClick: generateHandoff, className: "h-7 px-3 text-xs text-muted-foreground" }, "\uD83D\uDD04 Handoff"))))))))),
        React.createElement("div", { className: cn("p-4 md:p-5", desktop ? "min-h-[350px]" : "") }, s.generatedNote ? (React.createElement("div", { className: cn("space-y-3 md:space-y-4 overflow-auto", desktop ? "max-h-[400px] pr-2" : "max-h-[400px]") },
            s.isEditingNote
                ? Object.entries(s.editedNoteSections).map(([title, content]) => (React.createElement("div", { key: title, className: cn("border-l-4 pl-3 rounded-r-xl", SECTION_COLORS[title] || "border-l-muted-foreground") },
                    React.createElement("div", { className: "flex items-center justify-between mb-1" },
                        React.createElement("label", { className: "text-xs font-semibold text-primary uppercase tracking-wider" }, title),
                        React.createElement(Button, { variant: "ghost", size: "sm", onClick: () => copyToClipboard(`${title}:\n${content}`, s.showToast), className: "h-6 px-2 text-xs text-muted-foreground" }, "\uD83D\uDCCB")),
                    React.createElement(AutoResizeTextarea, { value: content, onChange: (v) => s.setEditedNoteSections((prev) => ({
                            ...prev,
                            [title]: v,
                        })) }))))
                : parseNoteSections(s.generatedNote).map((section, i) => (React.createElement(NoteSection, { key: i, title: section.title, content: section.content.trim(), onCopy: (text) => copyToClipboard(`${section.title}:\n${text}`, s.showToast), isAiGenerated: false, isReviewed: s.reviewedSections[section.title] || false, onReviewToggle: needsReview ? handleReviewToggle : undefined }))),
            needsReview && (React.createElement("div", { className: "flex flex-col items-center gap-3 pt-4 border-t border-amber-500/20" },
                React.createElement("div", { className: "flex items-center gap-2 text-xs text-muted-foreground" },
                    React.createElement(Sparkles, { className: "w-3.5 h-3.5 text-amber-500" }),
                    React.createElement("span", null, "Review each section above, then confirm")),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement(Button, { variant: "outline", size: "sm", onClick: handleReviewAll, className: "text-xs h-8 border-amber-500/30 text-amber-600 dark:text-amber-400" }, "Review All Sections"),
                    React.createElement(Button, { onClick: confirmReview, disabled: !allSectionsReviewed, className: cn("h-10 px-6 text-sm font-semibold rounded-xl transition-all", allSectionsReviewed
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-muted text-muted-foreground cursor-not-allowed") },
                        React.createElement(CheckCircle2, { className: "w-4 h-4 mr-2" }),
                        "I've Reviewed This Note")),
                React.createElement("p", { className: "text-[10px] text-muted-foreground" }, allSectionsReviewed
                    ? "✓ All sections reviewed — ready to confirm"
                    : `${Object.values(s.reviewedSections).filter((v) => v).length}/${Object.keys(s.reviewedSections).length} sections reviewed`))))) : (React.createElement("div", { className: cn("flex flex-col items-center justify-center text-muted-foreground", desktop ? "h-[280px]" : "h-32") },
            desktop && (React.createElement("div", { className: "w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4" },
                React.createElement("span", { className: "text-4xl" }, "\uD83D\uDCDD"))),
            React.createElement("div", { className: "text-base font-medium" }, s.isGenerating
                ? "Generating note..."
                : "Your note will appear here"),
            desktop && !s.isGenerating && (React.createElement("div", { className: "text-sm mt-1" }, "Record or type, then generate")))))));
}
function NoteTypeSelector({ noteType, setNoteType, }) {
    return (React.createElement("div", { className: "grid grid-cols-3 gap-2" }, [
        ["H&P", "🏥"],
        ["Consult", "🩺"],
        ["Progress", "📋"],
    ].map(([type, icon]) => (React.createElement(Button, { key: type, onClick: () => setNoteType(type), variant: "ghost", className: cn("flex flex-col gap-2 h-auto py-3 md:py-4 rounded-xl border-2", noteType === type
            ? "bg-primary text-primary-foreground border-transparent"
            : "border-border text-muted-foreground hover:border-primary/50 hover:bg-muted") },
        React.createElement("span", { className: "text-lg md:text-xl" }, icon),
        React.createElement("span", { className: "text-xs font-semibold" }, type))))));
}
function EncounterContextSection({ encounterContext, setEncounterContext, }) {
    return (React.createElement("div", { className: "space-y-3" },
        React.createElement("div", { className: "grid grid-cols-3 gap-1.5" }, ENCOUNTER_TYPES.map((et) => (React.createElement("button", { key: et.id, onClick: () => setEncounterContext((prev) => ({
                ...prev,
                encounterType: et.id,
                isTelehealth: et.id === "telehealth_consult" ? true : prev.isTelehealth,
                placeOfService: et.id === "telehealth_consult" ? "02" : prev.placeOfService,
            })), className: cn("flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all", encounterContext.encounterType === et.id
                ? "bg-primary text-primary-foreground border-transparent"
                : "border-border text-muted-foreground hover:border-primary/50 hover:bg-muted") },
            React.createElement("span", { className: "text-base" }, et.icon),
            React.createElement("span", { className: "font-medium leading-tight text-center" }, et.label))))),
        React.createElement("div", { className: "flex items-center justify-between p-3 bg-muted/50 rounded-xl" },
            React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement(Video, { className: "w-4 h-4 text-primary" }),
                React.createElement("span", { className: "text-sm text-foreground" }, "Telehealth")),
            React.createElement("button", { onClick: () => setEncounterContext((prev) => ({
                    ...prev,
                    isTelehealth: !prev.isTelehealth,
                    placeOfService: !prev.isTelehealth ? "02" : prev.placeOfService,
                })), className: cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", encounterContext.isTelehealth
                    ? "bg-primary"
                    : "bg-muted-foreground/30") },
                React.createElement("span", { className: cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", encounterContext.isTelehealth ? "translate-x-6" : "translate-x-1") }))),
        React.createElement("div", null,
            React.createElement("label", { className: "text-xs text-muted-foreground mb-1 block" }, "Place of Service"),
            React.createElement("select", { value: encounterContext.placeOfService, onChange: (e) => setEncounterContext((prev) => ({
                    ...prev,
                    placeOfService: e.target.value,
                })), className: "w-full p-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50" }, POS_CODES.map((pos) => (React.createElement("option", { key: pos.code, value: pos.code }, pos.label))))),
        (encounterContext.encounterType === "initial_consult" ||
            encounterContext.encounterType === "telehealth_consult") && (React.createElement("div", { className: "space-y-2 p-3 bg-warning/5 border border-warning/20 rounded-xl" },
            React.createElement("div", { className: "flex items-center gap-1.5" },
                React.createElement(Phone, { className: "w-3.5 h-3.5 text-warning" }),
                React.createElement("span", { className: "text-xs font-medium text-warning" }, "Referring Provider (Required)")),
            React.createElement("input", { value: encounterContext.referringProvider, onChange: (e) => setEncounterContext((prev) => ({
                    ...prev,
                    referringProvider: e.target.value,
                })), placeholder: "Provider name", className: "w-full p-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50" }),
            React.createElement("input", { value: encounterContext.referringNPI, onChange: (e) => setEncounterContext((prev) => ({
                    ...prev,
                    referringNPI: e.target.value,
                })), placeholder: "NPI #", className: "w-full p-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:border-primary/50" }))),
        (encounterContext.isTelehealth ||
            encounterContext.encounterType === "telehealth_consult") && (React.createElement("div", { className: "p-2 bg-primary/5 border border-primary/20 rounded-lg" },
            React.createElement("p", { className: "text-xs text-primary" },
                "\u2713 Modifier -95 will be auto-applied \u2022 POS",
                " ",
                encounterContext.placeOfService)))));
}
// Editable inline billing section with add/remove codes, E/M dropdown, MDM, RVU override
const EM_LEVELS = [
    "99202",
    "99203",
    "99204",
    "99205",
    "99211",
    "99212",
    "99213",
    "99214",
    "99215",
    "99221",
    "99222",
    "99223",
    "99231",
    "99232",
    "99233",
    "99241",
    "99242",
    "99243",
    "99244",
    "99245",
    "99251",
    "99252",
    "99253",
    "99254",
    "99255",
];
const MDM_LEVELS = ["Straightforward", "Low", "Moderate", "High"];
function EditableBillingSection({ codes, setCodes, noteId, userId, showToast, }) {
    const [newIcd, setNewIcd] = React.useState("");
    const [newCpt, setNewCpt] = React.useState("");
    const [isDirty, setIsDirty] = React.useState(false);
    const updateCode = (field, value) => {
        setCodes((prev) => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };
    const addCode = (type, code, setter) => {
        if (!code.trim())
            return;
        updateCode(type, [
            ...(codes[type] || []),
            { code: code.trim().toUpperCase(), description: "Custom" },
        ]);
        setter("");
    };
    const removeCode = (type, idx) => {
        updateCode(type, codes[type].filter((_, i) => i !== idx));
    };
    const saveBillingChanges = () => showToast("Billing persistence unavailable in development.");
    return (React.createElement("div", { className: "space-y-4" },
        React.createElement("div", { className: "flex items-center gap-3 p-3 bg-warning/10 border border-warning/20 rounded-xl" },
            React.createElement("span", { className: "text-2xl" }, "\uD83C\uDFF7\uFE0F"),
            React.createElement("div", { className: "flex-1" },
                React.createElement("select", { value: codes.em, onChange: (e) => updateCode("em", e.target.value), className: "w-full p-1.5 rounded-lg bg-muted/50 border border-border text-foreground text-sm font-bold focus:outline-none focus:border-primary/50" }, EM_LEVELS.map((l) => (React.createElement("option", { key: l, value: l }, l)))),
                React.createElement("div", { className: "text-xs text-muted-foreground mt-1" }, "E/M Level"))),
        React.createElement("div", { className: "bg-muted/50 rounded-xl p-3" },
            React.createElement("div", { className: "flex justify-between items-center" },
                React.createElement("span", { className: "text-xs text-muted-foreground" }, "MDM Complexity"),
                React.createElement("select", { value: codes.mdm, onChange: (e) => updateCode("mdm", e.target.value), className: "p-1 rounded-lg bg-card border border-border text-foreground text-sm font-bold focus:outline-none focus:border-primary/50" }, MDM_LEVELS.map((l) => (React.createElement("option", { key: l, value: l }, l)))))),
        React.createElement("div", { className: "bg-muted/50 rounded-xl p-3" },
            React.createElement("div", { className: "flex justify-between items-center" },
                React.createElement("span", { className: "text-xs text-muted-foreground" }, "RVU"),
                React.createElement("input", { type: "number", step: "0.01", value: codes.rvu || 0, onChange: (e) => updateCode("rvu", parseFloat(e.target.value) || 0), className: "w-20 p-1 text-right rounded-lg bg-card border border-border text-foreground text-sm font-bold focus:outline-none focus:border-primary/50" }))),
        React.createElement("div", null,
            React.createElement("div", { className: "text-xs font-semibold text-muted-foreground mb-2 uppercase" }, "ICD-10 Codes"),
            React.createElement("div", { className: "space-y-1.5" },
                codes.icd10?.map((c, i) => (React.createElement("div", { key: i, className: "flex items-center justify-between p-2 bg-muted/30 rounded-lg group" },
                    React.createElement("span", { className: "px-2 py-0.5 bg-primary/15 border border-primary/30 rounded text-xs text-primary font-mono" }, c.code),
                    React.createElement("button", { onClick: () => removeCode("icd10", i), className: "p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" },
                        React.createElement(Trash2, { className: "w-3.5 h-3.5" }))))),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("input", { value: newIcd, onChange: (e) => setNewIcd(e.target.value), onKeyDown: (e) => e.key === "Enter" && addCode("icd10", newIcd, setNewIcd), placeholder: "Add ICD-10...", className: "flex-1 px-2 py-1.5 bg-muted/50 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" }),
                    React.createElement(Button, { size: "sm", variant: "ghost", onClick: () => addCode("icd10", newIcd, setNewIcd), disabled: !newIcd.trim(), className: "h-7 w-7 p-0" },
                        React.createElement(Plus, { className: "w-3.5 h-3.5" }))))),
        React.createElement("div", null,
            React.createElement("div", { className: "text-xs font-semibold text-muted-foreground mb-2 uppercase" }, "CPT Codes"),
            React.createElement("div", { className: "space-y-1.5" },
                codes.cpt?.map((c, i) => (React.createElement("div", { key: i, className: "flex items-center justify-between p-2 bg-muted/30 rounded-lg group" },
                    React.createElement("span", { className: "px-2 py-0.5 bg-primary/15 border border-primary/30 rounded text-xs text-primary font-mono" }, c.code),
                    React.createElement("button", { onClick: () => removeCode("cpt", i), className: "p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" },
                        React.createElement(Trash2, { className: "w-3.5 h-3.5" }))))),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("input", { value: newCpt, onChange: (e) => setNewCpt(e.target.value), onKeyDown: (e) => e.key === "Enter" && addCode("cpt", newCpt, setNewCpt), placeholder: "Add CPT...", className: "flex-1 px-2 py-1.5 bg-muted/50 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" }),
                    React.createElement(Button, { size: "sm", variant: "ghost", onClick: () => addCode("cpt", newCpt, setNewCpt), disabled: !newCpt.trim(), className: "h-7 w-7 p-0" },
                        React.createElement(Plus, { className: "w-3.5 h-3.5" }))))),
        isDirty && (React.createElement(Button, { onClick: saveBillingChanges, className: "w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl" }, "\uD83D\uDCBE Save Billing Changes")),
        React.createElement(Button, { onClick: () => copyToClipboard(`E/M: ${codes.em}\nMDM: ${codes.mdm}\nRVU: ${codes.rvu}\nICD-10: ${codes.icd10?.map((c) => c.code).join(", ")}\nCPT: ${codes.cpt?.map((c) => c.code).join(", ")}`, showToast), variant: "outline", className: "w-full h-10 font-semibold rounded-xl border-warning/30 text-warning hover:bg-warning/10" }, "\uD83D\uDCCB Copy All Codes")));
}
function PatientModal({ s, savePatient, }) {
    const inputClass = "w-full p-2 rounded-lg bg-muted/50 border border-primary/20 text-foreground text-sm";
    return (React.createElement("div", { className: "p-6 max-h-[calc(100dvh-2rem)] overflow-y-auto" },
        React.createElement("h2", { className: "text-lg font-semibold mb-2 text-primary" }, s.patient.id ? "Edit Patient" : "Add Patient"),
        React.createElement("p", { className: "text-xs text-muted-foreground mb-4" }, "Fields marked * are required for claims submission"),
        !s.isPatientClaimsReady && (React.createElement("div", { className: "mb-4 p-3 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-2" },
            React.createElement(AlertCircle, { className: "w-4 h-4 text-warning mt-0.5 flex-shrink-0" }),
            React.createElement("p", { className: "text-xs text-warning" }, "Complete all required fields to enable note generation and billing"))),
        React.createElement("div", { className: "space-y-3" },
            React.createElement("div", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wider" }, "Demographics"),
            React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                React.createElement("div", null,
                    React.createElement("label", { className: "text-xs text-muted-foreground mb-1 block" }, "Name *"),
                    React.createElement("input", { value: s.patient.name, onChange: (e) => s.setPatient({ ...s.patient, name: e.target.value }), placeholder: "Last, First", className: inputClass })),
                React.createElement("div", null,
                    React.createElement("label", { className: "text-xs text-muted-foreground mb-1 block" }, "MRN *"),
                    React.createElement("input", { value: s.patient.mrn, onChange: (e) => s.setPatient({ ...s.patient, mrn: e.target.value }), placeholder: "Medical Record #", className: inputClass })),
                React.createElement("div", null,
                    React.createElement("label", { className: "text-xs text-muted-foreground mb-1 block" }, "DOB *"),
                    React.createElement("input", { type: "date", value: s.patient.dob, onChange: (e) => s.setPatient({ ...s.patient, dob: e.target.value }), className: inputClass })),
                React.createElement("div", null,
                    React.createElement("label", { className: "text-xs text-muted-foreground mb-1 block" }, "Room"),
                    React.createElement("input", { value: s.patient.room, onChange: (e) => s.setPatient({ ...s.patient, room: e.target.value }), placeholder: "Room #", className: inputClass }))),
            React.createElement("div", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2" }, "Insurance"),
            React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                React.createElement("div", null,
                    React.createElement("label", { className: "text-xs text-muted-foreground mb-1 block" }, "Insurance/Payer *"),
                    React.createElement("input", { value: s.patient.insurance_name, onChange: (e) => s.setPatient({ ...s.patient, insurance_name: e.target.value }), placeholder: "e.g., Blue Cross", className: inputClass })),
                React.createElement("div", null,
                    React.createElement("label", { className: "text-xs text-muted-foreground mb-1 block" }, "Member ID *"),
                    React.createElement("input", { value: s.patient.insurance_id, onChange: (e) => s.setPatient({ ...s.patient, insurance_id: e.target.value }), placeholder: "Member/Policy ID", className: inputClass })),
                React.createElement("div", null,
                    React.createElement("label", { className: "text-xs text-muted-foreground mb-1 block" }, "Group #"),
                    React.createElement("input", { value: s.patient.insurance_group, onChange: (e) => s.setPatient({ ...s.patient, insurance_group: e.target.value }), placeholder: "Group number", className: inputClass })),
                React.createElement("div", null,
                    React.createElement("label", { className: "text-xs text-muted-foreground mb-1 block" }, "Plan Type"),
                    React.createElement("select", { value: s.patient.insurance_plan_type, onChange: (e) => s.setPatient({
                            ...s.patient,
                            insurance_plan_type: e.target.value,
                        }), className: inputClass },
                        React.createElement("option", { value: "" }, "Select..."),
                        [
                            "Medicare",
                            "Medicaid",
                            "Commercial",
                            "Tricare",
                            "Workers Comp",
                            "Self-Pay",
                            "Other",
                        ].map((t) => (React.createElement("option", { key: t, value: t }, t)))))),
            React.createElement("div", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2" }, "Clinical"),
            React.createElement("div", null,
                React.createElement("label", { className: "text-xs text-muted-foreground mb-1 block" }, "Diagnosis"),
                React.createElement("input", { value: s.patient.diagnosis, onChange: (e) => s.setPatient({ ...s.patient, diagnosis: e.target.value }), placeholder: "Primary diagnosis", className: inputClass })),
            React.createElement("div", null,
                React.createElement("label", { className: "text-xs text-muted-foreground mb-1 block" }, "Allergies"),
                React.createElement("input", { value: s.patient.allergies, onChange: (e) => s.setPatient({ ...s.patient, allergies: e.target.value }), placeholder: "Comma separated", className: inputClass }))),
        React.createElement("div", { className: "flex gap-3 mt-6" },
            React.createElement(Button, { variant: "outline", onClick: () => s.setShowPatientModal(false), className: "flex-1 border-primary/30" }, "Cancel"),
            React.createElement(Button, { onClick: savePatient, disabled: !s.patient.name.trim() || !s.patient.facility_id, className: "flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" }, s.patient.id ? "Update" : "Save"))));
}
