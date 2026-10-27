import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CommandCenter from "@/vendor/elyn/cfe825c8/CommandCenter";
import selectedTheme from "@/vendor/elyn/cfe825c8/theme.css?raw";
import { NoteAdapterProvider } from "./boundary";
import { createDevelopmentAdapter } from "./adapter";
import { Button } from "@/components/ui/button";

const localTheme = `:host { position:fixed; inset:0; z-index:100; display:block; font-family:system-ui,sans-serif; }\n${selectedTheme}`;

export default function SelectedNoteWorkspace({ onClose, adapter }) {
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
    <div ref={host} aria-label="Selected ELYN Note workspace">
      {root &&
        createPortal(
          <div
            className="note-root"
            role="dialog"
            aria-modal="true"
            aria-label="Synthetic ELYN Note development"
          >
            <div className="workspace-bar">
              <div>
                <strong>ELYN · Synthetic development integration</strong>
                <div className="text-xs text-muted-foreground">
                  Memory only · RCM, chat transport, generation, dictation, saves, signing and exports unavailable
                </div>
              </div>
              <Button variant="outline" onClick={onClose}>
                Return to thread
              </Button>
            </div>
            <div className="note-content"><NoteAdapterProvider adapter={adapter === undefined ? synthetic : adapter}>
              <CommandCenter />
            </NoteAdapterProvider></div>
          </div>,
          root,
        )}
    </div>
  );
}
