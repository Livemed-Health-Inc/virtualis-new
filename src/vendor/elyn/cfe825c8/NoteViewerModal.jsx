import React, { useState } from 'react';
import { AnimatePresence, motion, Button, MemoryText as MarkdownDisplay } from '@/lib/note-embed/boundary';
import { Textarea } from '@/components/ui/textarea';
import { X, Copy, Check, FileDown, Download, Printer, FileEdit, Eye, CheckCircle2, Pen, Shield, Lock, ClipboardCheck, Save, Edit3, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseNoteSections } from './utils';
import { getSectionColors as getColors } from './noteSectionColors';
const STATUS_CONFIG = {
    draft: {
        label: "Draft",
        icon: FileEdit,
        color: "text-muted-foreground",
        bg: "bg-muted",
    },
    pending_review: {
        label: "Pending Review",
        icon: Eye,
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10",
    },
    signed: {
        label: "Signed",
        icon: CheckCircle2,
        color: "text-green-600 dark:text-green-400",
        bg: "bg-green-500/10",
    },
};
export default function NoteViewerModal({ isOpen, onClose, note, onToast, onNoteUpdated }) {
    const status = 'draft', reviewedAt = null, onStatusChange = undefined;
    const [isEditing, setIsEditing] = useState(false);
    const [editedSections, setEditedSections] = useState({});
    const copiedAll = false, copiedSection = null, isSaving = false;
    if (!note)
        return null;
    const sections = parseNoteSections(note.generatedNote);
    const statusConfig = STATUS_CONFIG[status], StatusIcon = statusConfig.icon;
    const toast = msg => onToast?.(msg);
    const unavailable = () => toast('Unavailable in development. Nothing saved, signed, exported or sent.');
    const handleCopySection = unavailable, handleCopyAll = unavailable, handlePrint = unavailable, setPendingExport = unavailable;
    const handleSectionEdit = (index, content) => setEditedSections(prev => ({ ...prev, [index]: content }));
    const handleSave = () => {
        onNoteUpdated?.(sections.map((s, i) => '## ' + s.title + '\n' + (editedSections[i] ?? s.content)).join('\n'));
        setIsEditing(false);
        setEditedSections({});
        toast('Draft retained in memory only — not saved or signed.');
    };
    const hasEdits = Object.keys(editedSections).length > 0;
    return (React.createElement(AnimatePresence, null, isOpen && (React.createElement("div", { className: "h-full flex flex-col p-3 md:p-4" },
        React.createElement(motion.div, { initial: { y: "100%", opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: "100%", opacity: 0 }, transition: { duration: 0.25, ease: "easeOut" }, className: "relative bg-card border border-border rounded-2xl w-full max-w-4xl mx-auto h-full flex flex-col overflow-hidden" },
            React.createElement("div", { className: "flex justify-center pt-2 pb-0.5 md:hidden print:hidden" },
                React.createElement("div", { className: "w-10 h-1 rounded-full bg-border/40" })),
            React.createElement("div", { className: "flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-border print:border-black/10" },
                React.createElement("div", { className: "flex items-center gap-2 sm:gap-3 min-w-0 flex-1" },
                    React.createElement("div", { className: "w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 hidden sm:flex items-center justify-center flex-shrink-0" },
                        React.createElement(ClipboardCheck, { className: "w-5 h-5 text-primary" })),
                    React.createElement("div", { className: "min-w-0 flex-1" },
                        React.createElement("h3", { className: "font-semibold text-sm sm:text-base text-foreground print:text-black truncate", title: `${note.noteType} — ${note.patientName || "Patient"}` },
                            note.noteType,
                            " \u2014 ",
                            note.patientName || "Patient"),
                        React.createElement("div", { className: "flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5" },
                            React.createElement("span", { className: "text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap" }, note.dateGenerated),
                            React.createElement("div", { className: "flex items-center gap-1.5" },
                                React.createElement("span", { className: cn("px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold flex items-center gap-1 print:hidden whitespace-nowrap", statusConfig.bg, statusConfig.color) },
                                    React.createElement(StatusIcon, { className: "w-2.5 h-2.5" }),
                                    statusConfig.label),
                                isEditing && (React.createElement("span", { className: "px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-primary/10 text-primary flex items-center gap-1 whitespace-nowrap" },
                                    React.createElement(Edit3, { className: "w-2.5 h-2.5" }),
                                    "Editing")))))),
                React.createElement("div", { className: "flex items-center gap-1 ml-2" },
                    status !== "signed" && (React.createElement(Button, { variant: isEditing ? "default" : "ghost", size: "sm", onClick: () => {
                            if (isEditing && hasEdits) {
                                handleSave();
                            }
                            else {
                                setIsEditing(!isEditing);
                            }
                        }, "aria-label": isEditing && hasEdits ? "Keep in memory" : isEditing ? "Done" : "Edit", disabled: isSaving, className: cn("rounded-lg print:hidden h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm", isEditing &&
                            hasEdits &&
                            "bg-primary text-primary-foreground") }, isSaving ? (React.createElement("span", { className: "animate-spin text-xs" }, "\u23F3")) : isEditing && hasEdits ? (React.createElement(React.Fragment, null,
                        React.createElement(Save, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" }),
                        React.createElement("span", null, "Keep in memory"))) : isEditing ? (React.createElement(React.Fragment, null,
                        React.createElement(Eye, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" }),
                        React.createElement("span", { className: "hidden sm:inline" }, "Done"))) : (React.createElement(React.Fragment, null,
                        React.createElement(Edit3, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-1.5" }),
                        React.createElement("span", { className: "hidden sm:inline" }, "Edit"))))),
                    React.createElement("button", { onClick: onClose, "aria-label": "Close note panel", className: "p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors print:hidden" },
                        React.createElement(X, { className: "w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" })))),
            React.createElement("div", { className: "flex-1 overflow-y-auto min-h-0 print:overflow-visible" },
                React.createElement("div", { className: "p-5 space-y-4" },
                    !reviewedAt && note.generatedNote && (React.createElement("div", { className: "flex items-center gap-2 p-3 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5" },
                        React.createElement(Sparkles, { className: "w-4 h-4 text-amber-500 flex-shrink-0" }),
                        React.createElement("span", { className: "text-xs font-medium text-amber-600 dark:text-amber-400" }, "Synthetic Draft \u00B7 Human Review Required"))),
                    reviewedAt && (React.createElement("div", { className: "flex items-center gap-2 p-3 rounded-xl border border-green-500/30 bg-green-500/5" },
                        React.createElement(CheckCircle2, { className: "w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" }),
                        React.createElement("span", { className: "text-xs font-medium text-green-600 dark:text-green-400" },
                            "Physician Reviewed \u00B7",
                            " ",
                            new Date(reviewedAt).toLocaleString()))),
                    sections.map((section, i) => {
                        const colors = getColors(section.title);
                        const isCopied = copiedSection === section.title;
                        const currentContent = editedSections[i] !== undefined
                            ? editedSections[i]
                            : section.content;
                        return (React.createElement("div", { key: i, className: cn("rounded-xl border p-4", colors.bg, colors.border) },
                            React.createElement("div", { className: "flex items-center justify-between mb-2" },
                                React.createElement("span", { className: cn("text-xs font-bold uppercase tracking-wider", colors.text) }, section.title),
                                React.createElement(Button, { variant: "ghost", size: "sm", onClick: () => handleCopySection(section.title, currentContent), className: "h-7 px-2 text-xs print:hidden" },
                                    isCopied ? (React.createElement(Check, { className: "w-3 h-3 mr-1 text-green-500" })) : (React.createElement(Copy, { className: "w-3 h-3 mr-1" })),
                                    isCopied ? "Copied" : "Copy")),
                            isEditing ? (React.createElement(Textarea, { value: currentContent, onChange: (e) => handleSectionEdit(i, e.target.value), className: "min-h-[80px] text-sm leading-relaxed bg-background/50 border-border resize-y" })) : (React.createElement(MarkdownDisplay, { content: currentContent, className: "text-sm text-foreground/90 print:text-black" }))));
                    }))),
            React.createElement("div", { className: "px-5 py-2.5 border-t border-border bg-muted/20 print:bg-gray-50" },
                React.createElement("div", { className: "flex items-center gap-3 text-[10px] text-muted-foreground print:text-gray-500" },
                    React.createElement("span", { className: "flex items-center gap-1" },
                        React.createElement(Shield, { className: "w-3 h-3" }),
                        "Synthetic only"),
                    React.createElement("span", { className: "hidden sm:inline" }, "\u00B7"),
                    React.createElement("span", { className: "hidden sm:flex items-center gap-1" },
                        React.createElement(Lock, { className: "w-3 h-3" }),
                        "No services connected"),
                    React.createElement("span", { className: "hidden sm:inline" }, "\u00B7"),
                    React.createElement("span", { className: "hidden sm:inline" }, "Memory only"),
                    React.createElement("span", { className: "hidden sm:inline" }, "\u00B7"),
                    React.createElement("span", { className: "hidden sm:inline" }, "Not saved or signed"))),
            React.createElement("div", { className: "px-5 pt-4 pb-3 border-t border-border flex flex-wrap items-center gap-2 print:hidden" },
                onStatusChange && status === "draft" && (React.createElement(Button, { onClick: () => onStatusChange("pending_review"), variant: "outline", size: "sm", className: "rounded-lg border-amber-500/30 text-amber-600 dark:text-amber-400" },
                    React.createElement(Eye, { className: "w-3.5 h-3.5 mr-1.5" }),
                    "Review")),
                onStatusChange && status === "pending_review" && (React.createElement(Button, { onClick: () => onStatusChange("signed"), size: "sm", className: "rounded-lg bg-green-600 hover:bg-green-700 text-white" },
                    React.createElement(Pen, { className: "w-3.5 h-3.5 mr-1.5" }),
                    "Sign Note")),
                React.createElement(Button, { onClick: unavailable, size: "sm", variant: "outline", className: "rounded-lg" },
                    React.createElement(Copy, { className: "w-3.5 h-3.5 mr-1.5" }),
                    "Copy Note"),
                React.createElement("div", { className: "flex-1 hidden md:block" }),
                React.createElement(Button, { onClick: handleCopyAll, variant: "outline", size: "sm", className: "rounded-lg hover:bg-transparent md:hover:bg-accent" },
                    copiedAll ? (React.createElement(Check, { className: "w-3.5 h-3.5 mr-1.5 text-green-500" })) : (React.createElement(Copy, { className: "w-3.5 h-3.5 mr-1.5" })),
                    copiedAll ? "Copied" : "Copy All"),
                React.createElement(Button, { onClick: () => setPendingExport('txt'), variant: "outline", size: "sm", className: "rounded-lg hover:bg-transparent md:hover:bg-accent" },
                    React.createElement(FileDown, { className: "w-3.5 h-3.5 mr-1.5" }),
                    "TXT"),
                React.createElement(Button, { onClick: () => setPendingExport('json'), variant: "outline", size: "sm", className: "rounded-lg hover:bg-transparent md:hover:bg-accent" },
                    React.createElement(Download, { className: "w-3.5 h-3.5 mr-1.5" }),
                    "JSON"),
                true && (React.createElement(Button, { onClick: handlePrint, variant: "outline", size: "sm", className: "rounded-lg" },
                    React.createElement(Printer, { className: "w-3.5 h-3.5 mr-1.5" }),
                    "Print"))))))));
}
