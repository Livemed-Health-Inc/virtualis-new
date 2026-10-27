// Shared presentation: colour scheme for note sections (used by NoteViewerModal and the staged demo).
const SECTION_COLORS = {
    SUBJECTIVE: {
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        text: "text-blue-600 dark:text-blue-400",
    },
    "HISTORY OF PRESENT ILLNESS": {
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        text: "text-blue-600 dark:text-blue-400",
    },
    HPI: {
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        text: "text-blue-600 dark:text-blue-400",
    },
    OBJECTIVE: {
        bg: "bg-green-500/10",
        border: "border-green-500/20",
        text: "text-green-600 dark:text-green-400",
    },
    "PHYSICAL EXAMINATION": {
        bg: "bg-green-500/10",
        border: "border-green-500/20",
        text: "text-green-600 dark:text-green-400",
    },
    EXAM: {
        bg: "bg-green-500/10",
        border: "border-green-500/20",
        text: "text-green-600 dark:text-green-400",
    },
    ASSESSMENT: {
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
        text: "text-amber-600 dark:text-amber-400",
    },
    PLAN: {
        bg: "bg-purple-500/10",
        border: "border-purple-500/20",
        text: "text-purple-600 dark:text-purple-400",
    },
    "CHIEF COMPLAINT": {
        bg: "bg-rose-500/10",
        border: "border-rose-500/20",
        text: "text-rose-600 dark:text-rose-400",
    },
    MEDICATIONS: {
        bg: "bg-teal-500/10",
        border: "border-teal-500/20",
        text: "text-teal-600 dark:text-teal-400",
    },
    ALLERGIES: {
        bg: "bg-red-500/10",
        border: "border-red-500/20",
        text: "text-red-600 dark:text-red-400",
    },
    "REVIEW OF SYSTEMS": {
        bg: "bg-indigo-500/10",
        border: "border-indigo-500/20",
        text: "text-indigo-600 dark:text-indigo-400",
    },
    ROS: {
        bg: "bg-indigo-500/10",
        border: "border-indigo-500/20",
        text: "text-indigo-600 dark:text-indigo-400",
    },
    FINDINGS: {
        bg: "bg-green-500/10",
        border: "border-green-500/20",
        text: "text-green-600 dark:text-green-400",
    },
    IMPRESSION: {
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
        text: "text-amber-600 dark:text-amber-400",
    },
    TECHNIQUE: {
        bg: "bg-slate-500/10",
        border: "border-slate-500/20",
        text: "text-slate-600 dark:text-slate-400",
    },
    INDICATION: {
        bg: "bg-rose-500/10",
        border: "border-rose-500/20",
        text: "text-rose-600 dark:text-rose-400",
    },
};
export const getSectionColors = (title) => {
    const upper = title.toUpperCase();
    return (SECTION_COLORS[upper] || {
        bg: "bg-muted/50",
        border: "border-border",
        text: "text-foreground",
    });
};
