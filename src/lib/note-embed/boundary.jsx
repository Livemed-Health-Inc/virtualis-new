import React, { createContext, useContext, useState } from "react";
import { Button as HostButton } from "@/components/ui/button";
import { assertAdapter } from "./adapter";
import { parseNoteSections } from "@/vendor/virtualis-note/45c17ca5/utils";

const Context = createContext(null);
export function NoteAdapterProvider({ adapter, children }) {
  assertAdapter(adapter);
  return <Context.Provider value={adapter}>{children}</Context.Provider>;
}
function useAdapter() {
  const a = useContext(Context);
  assertAdapter(a);
  return a;
}
export function Disabled() {
  return <span className="text-xs text-muted-foreground">Unavailable in development</span>;
}
export function AppLayout({ children, className }) {
  return <main className={`mx-auto max-w-7xl ${className}`}>{children}</main>;
}
export function useNavigate() {
  useAdapter();
  return () => {};
}
// No motion library, timers, global listeners or browser effects on mount.
const visual = React.forwardRef(function Visual(
  { initial, animate, exit, transition, ...props },
  ref,
) {
  return <div ref={ref} {...props} />;
});
export const motion = { div: visual };
export function AnimatePresence({ children }) {
  return <>{children}</>;
}
const blocked =
  /generate|handoff|sign out|practice|profile|save$|update$|reviewed this note|analytics|radiology/i;
export function Button({ children, ...props }) {
  const text = React.Children.toArray(children)
    .filter((c) => typeof c === "string")
    .join(" ");
  const unavailable = blocked.test(text);
  return (
    <HostButton
      {...props}
      disabled={props.disabled || unavailable}
      title={unavailable ? "Unavailable in development" : props.title}
    >
      {children}
      {unavailable && <span className="ml-1 text-xs">· unavailable</span>}
    </HostButton>
  );
}
export function useVirtualisNoteState() {
  const a = useAdapter();
  const [patient, setPatient] = useState({ ...a.patient });
  const [editableTranscript, setEditableTranscript] = useState(
    "Synthetic transcript. Type to rehearse draft editing; no service is connected.",
  );
  const [generatedNote, setGeneratedNote] = useState(a.draft);
  const [editedNoteSections, setEditedNoteSections] = useState(() =>
    Object.fromEntries(parseNoteSections(a.draft).map((s) => [s.title, s.content.trim()])),
  );
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [encounterContext, setEncounterContext] = useState({
    encounterType: "follow_up",
    isTelehealth: false,
    placeOfService: "21",
    referringProvider: "",
    referringNPI: "",
  });
  const [noteType, setNoteType] = useState("Progress");
  const [activeTab, setActiveTab] = useState("document");
  const [expandedSection, setExpandedSection] = useState("patient");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [appendMode, setAppendMode] = useState(true);
  const [toast, showToast] = useState("");
  const unavailable = () =>
    showToast("Unavailable in development. Nothing was saved, signed or sent.");
  return {
    patient,
    setPatient,
    editableTranscript,
    setEditableTranscript,
    generatedNote,
    setGeneratedNote,
    editedNoteSections,
    setEditedNoteSections,
    isEditingNote,
    setIsEditingNote,
    encounterContext,
    setEncounterContext,
    noteType,
    setNoteType,
    activeTab,
    setActiveTab,
    expandedSection,
    toggleSection: (id) => setExpandedSection(id === expandedSection ? null : id),
    mobileMenuOpen,
    setMobileMenuOpen,
    showPatientModal,
    setShowPatientModal,
    appendMode,
    setAppendMode,
    toast,
    showToast,
    documentMode: "clinical",
    setDocumentMode: unavailable,
    savedPatients: [],
    showPatientList: false,
    setShowPatientList: unavailable,
    clearPatient: () => setPatient({ ...a.patient }),
    selectPatient: unavailable,
    speech: {
      isSupported: false,
      isRecording: false,
      error: null,
      interim: "",
      clear: () => {},
      start: unavailable,
      stop: unavailable,
    },
    isNoteReviewed: false,
    reviewedSections: {},
    setReviewedSections: unavailable,
    currentNoteId: null,
    isGenerating: false,
    codes: null,
    pendingBilling: null,
    showBillingConfirmation: false,
    setShowBillingConfirmation: unavailable,
    completenessPrompt: null,
    showHandoff: false,
    setShowHandoff: unavailable,
    signOut: unavailable,
    forceSync: unavailable,
    isPatientClaimsReady: false,
    todayStats: { notes: 0, rvu: 0, consults: 0, avgTime: "—" },
  };
}
export function useNoteGeneration(s) {
  const unavailable = () =>
    s.showToast("Unavailable in development. Nothing was saved, signed or sent.");
  return {
    generateNote: unavailable,
    generateHandoff: unavailable,
    savePatient: unavailable,
    confirmBilling: unavailable,
    discardBilling: unavailable,
    confirmReview: unavailable,
    startEditingNote: () => {
      s.setEditedNoteSections(
        Object.fromEntries(
          parseNoteSections(s.generatedNote).map((v) => [v.title, v.content.trim()]),
        ),
      );
      s.setIsEditingNote(true);
    },
    saveNoteEdits: () => {
      s.setGeneratedNote(
        Object.entries(s.editedNoteSections)
          .map(([k, v]) => `## ${k}\n${v}`)
          .join("\n"),
      );
      s.setIsEditingNote(false);
      s.showToast("Draft retained in memory only — not saved or signed.");
    },
  };
}
