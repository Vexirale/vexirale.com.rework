import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import type { Project } from "../config";
import type { Rgb } from "../lib/color";
import { rgbToRgba } from "../lib/color";

/** Turn a project title into a notepad-ish filename, e.g.
 *  "UKC1 Reverse Engineering" -> "ukc1_reverse_engineering.txt". */
function filenameFor(title: string): string {
  const slug =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "note";
  return `${slug}.txt`;
}

/** A focused, notepad-style modal. The whole viewport behind it blurs (the
 *  panel sits on a backdrop-blurred scrim), and the note text is shown in a
 *  monospace editor window. Rendered in a portal so fixed positioning and
 *  stacking are unaffected by the transformed project grid behind it. */
export function NotepadModal({
  project,
  accent,
  onClose,
}: {
  project: Project | null;
  accent: Rgb;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const open = Boolean(project);

  // Fast typewriter reveal of the note text when it opens.
  const fullText = project?.content ?? "";
  const [typed, setTyped] = useState(0);
  const done = typed >= fullText.length;

  useEffect(() => {
    if (!project) {
      setTyped(0);
      return;
    }
    if (reduced) {
      setTyped(fullText.length);
      return;
    }
    setTyped(0);
    // Finish in roughly the same short time regardless of length: chars/tick
    // scales with the text so it always feels like a quick burst of typing.
    const step = Math.max(1, Math.ceil(fullText.length / 45));
    const id = setInterval(() => {
      setTyped((n) => {
        const next = n + step;
        if (next >= fullText.length) {
          clearInterval(id);
          return fullText.length;
        }
        return next;
      });
    }, 16);
    return () => clearInterval(id);
  }, [project, reduced, fullText]);

  // Keep the latest typed line in view while the text streams in.
  useEffect(() => {
    const el = bodyRef.current;
    if (el && !done) el.scrollTop = el.scrollHeight;
  }, [typed, done]);

  // Esc to close, lock background scroll, and manage focus while open.
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the close button once the panel is in the DOM.
    const id = window.setTimeout(() => closeRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(id);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  const accentLine = rgbToRgba(accent, 0.5);

  return createPortal(
    <AnimatePresence>
      {project && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.15 : 0.3 }}
          onMouseDown={(e) => {
            // Click on the scrim (not the panel) closes.
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Backdrop: blurs and dims everything behind. */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${project.title} notes`}
            className="glass relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl"
            initial={
              reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            {/* Title bar */}
            <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#f23f43]/80" />
                <span className="h-3 w-3 rounded-full bg-[#f0b232]/80" />
                <span className="h-3 w-3 rounded-full bg-[#23a55a]/80" />
              </div>
              <span className="flex-1 truncate text-center font-mono text-xs text-white/50">
                {filenameFor(project.title)}
              </span>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Note body — monospace, whitespace preserved, typed in, scrollable. */}
            <div ref={bodyRef} className="overflow-y-auto px-5 py-5 sm:px-6">
              <pre
                className="whitespace-pre-wrap break-words pl-4 font-mono text-[13px] leading-relaxed text-white/80"
                style={{ borderLeft: `2px solid ${accentLine}` }}
              >
                {fullText.slice(0, typed)}
                {!done && (
                  <span className="ml-px animate-pulse text-white/70">▋</span>
                )}
              </pre>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
