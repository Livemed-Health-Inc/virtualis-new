import React, { createContext, useContext, useState } from "react";
import { Button as HostButton } from "@/components/ui/button";
import { assertAdapter } from "./adapter";
import NoteViewerModal from "@/vendor/elyn/cfe825c8/NoteViewerModal";

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
  return <span className="hidden xl:inline text-xs text-muted-foreground">Synthetic facility</span>;
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
  /generate|handoff|sign|practice|profile|save|update|review$|analytics|radiology|copy|recording|dictation|new note|TXT|JSON|print|📋/i;
function childText(children) {
  return React.Children.toArray(children).map((c) =>
    typeof c === "string" ? c : React.isValidElement(c) ? childText(c.props.children) : "",
  ).join(" ");
}
export function Button({ children, ...props }) {
  const text = childText(children);
  const unavailable = blocked.test(text);
  return (
    <HostButton
      variant="ghost"
      {...props}
      disabled={props.disabled || unavailable}
      title={unavailable ? "Unavailable in development" : props.title}
    >
      {children}
      {unavailable && <span className="ml-1 text-xs">· unavailable</span>}
    </HostButton>
  );
}
export function useCommandCenter() {
  const a = useAdapter();
  const [activeTab, setActiveTab] = useState("notes");
  const [generatedNote, setGeneratedNote] = useState(a.draft);
  const [toast, showToast] = useState("");
  return {
    patient: a.patient,
    patients: [{ ...a.patient, status: "not_seen" }],
    generatedNote,
    setGeneratedNote,
    activeTab,
    setActiveTab,
    toast,
    showToast,
    statsCards: [{ label: "Synthetic drafts", value: 1 }, { label: "Signed", value: 0 }],
    handleRecordPress: () => showToast("Dictation and generation unavailable in development."),
  };
}
export function SyntheticNote({ s }) {
  return <NoteViewerModal isOpen note={{ generatedNote: s.generatedNote, noteType: "Synthetic Progress", patientName: s.patient.name, dateGenerated: "2026-10-27 · synthetic fixture" }} onClose={() => s.setActiveTab("patients")} onToast={s.showToast} onNoteUpdated={s.setGeneratedNote} />;
}
export function SyntheticPatient({ s }) {
  return <div className="p-6 space-y-3"><h2 className="text-xl font-semibold">{s.patient.name}</h2><p className="text-muted-foreground">{s.patient.diagnosis}</p><Button onClick={() => s.setActiveTab("notes")}>Open synthetic draft</Button></div>;
}
export function UnavailableSection({ title }) {
  return <section className="p-6"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-2 text-muted-foreground">Unavailable in synthetic development. Nothing is generated, saved, signed or sent.</p></section>;
}
export function MemoryText({ content, className }) {
  return <div className={`${className} whitespace-pre-wrap`}>{content}</div>;
}
export function MemoryToast({ message }) {
  return <div role="status" className="absolute bottom-3 inset-x-3 border border-border bg-card p-3 text-sm">{message}</div>;
}
