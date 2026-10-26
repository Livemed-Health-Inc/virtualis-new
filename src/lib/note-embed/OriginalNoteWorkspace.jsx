import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import VirtualisNote from "@/vendor/virtualis-note/45c17ca5/VirtualisNote";
import { NoteAdapterProvider } from "./boundary";
import { createDevelopmentAdapter } from "./adapter";
import { Button } from "@/components/ui/button";

const localTheme = `:host { position:fixed; inset:0; z-index:100; display:block; background:hsl(220 25% 98%); color:hsl(222 20% 6%); font-family:system-ui,sans-serif; }
.note-root { --background:hsl(220 25% 98%); --foreground:hsl(222 20% 6%); --card:hsl(0 0% 100%); --primary:hsl(224 100% 57%); --primary-foreground:hsl(0 0% 100%); --secondary:hsl(222 20% 6%); --secondary-foreground:hsl(0 0% 100%); --muted:hsl(220 14% 94%); --muted-foreground:hsl(220 10% 42%); --border:hsl(220 14% 88%); --warning:hsl(38 92% 50%); --accent:var(--primary); height:100dvh; overflow:auto; background:var(--background); color:var(--foreground); }
.workspace-bar { position:sticky; top:0; z-index:60; padding:12px 20px; display:flex; flex-wrap:wrap; gap:12px; align-items:center; justify-content:space-between; background:var(--card); border-bottom:1px solid var(--border); }
* { letter-spacing:0 !important; }`;

export default function OriginalNoteWorkspace({ onClose, adapter }) {
  const host = useRef(null);
  const [root, setRoot] = useState(null);
  const [synthetic] = useState(createDevelopmentAdapter);
  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const shadow = el.shadowRoot ?? el.attachShadow({ mode: "open" });
    // Clone loaded local CSS into the shadow, never import source app/global styles.
    for (const style of document.querySelectorAll("style"))
      shadow.appendChild(style.cloneNode(true));
    const theme = document.createElement("style");
    theme.textContent = localTheme;
    shadow.appendChild(theme);
    setRoot(shadow);
    return () => {
      // React owns the portal children; remove only our cloned style nodes.
      for (const style of shadow.querySelectorAll("style")) style.remove();
    };
  }, []);
  if (!import.meta.env.DEV) return null;
  return (
    <div ref={host} aria-label="Original Virtualis Note workspace">
      {root &&
        createPortal(
          <div
            className="note-root"
            role="dialog"
            aria-modal="true"
            aria-label="Synthetic Virtualis Note development"
          >
            <div className="workspace-bar">
              <div>
                <strong>Synthetic development integration</strong>
                <div className="text-xs text-muted-foreground">
                  In-memory only · generation, signing, database save, dictation, sync, analytics
                  and exports unavailable
                </div>
              </div>
              <Button variant="outline" onClick={onClose}>
                Return to thread
              </Button>
            </div>
            <NoteAdapterProvider adapter={adapter === undefined ? synthetic : adapter}>
              <VirtualisNote />
            </NoteAdapterProvider>
          </div>,
          root,
        )}
    </div>
  );
}
