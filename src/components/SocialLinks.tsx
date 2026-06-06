import { useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import type { LucideProps } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ComponentType } from "react";
import type { Social } from "../config";

/** Look up a lucide-react icon component by its config name (e.g. "Github").
 *  Falls back to a generic Link icon if the name doesn't exist, so a typo in
 *  config never breaks the render. */
function iconFor(name: string): ComponentType<LucideProps> {
  const map = Icons as unknown as Record<string, ComponentType<LucideProps>>;
  return map[name] ?? Icons.Link;
}

const buttonClass =
  "group/social inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition-colors hover:border-white/30 hover:bg-white/[0.08] hover:text-white";

/** A social that opens a small glass popover instead of navigating. */
function PopoverSocial({ social }: { social: Social }) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const Icon = iconFor(social.icon);

  // Close on outside click or Esc.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // For mailto: links, show the bare address as the clickable text.
  const linkText = social.url.startsWith("mailto:")
    ? social.url.slice("mailto:".length)
    : social.label;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={social.label}
        aria-expanded={open}
        title={social.label}
        onClick={() => setOpen((v) => !v)}
        className={buttonClass}
      >
        <Icon className="h-[18px] w-[18px]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="glass absolute bottom-full left-0 z-20 mb-3 w-max max-w-[80vw] rounded-2xl px-4 py-3"
          >
            <p className="text-sm text-white/70">
              {social.popup}{" "}
              <a
                href={social.url}
                className="font-medium text-white underline decoration-white/30 underline-offset-2 transition-colors hover:decoration-white"
              >
                {linkText}
              </a>
            </p>
            {/* little tail */}
            <span className="glass absolute -bottom-1 left-5 h-3 w-3 rotate-45 rounded-[3px] border-t-0 border-l-0" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SocialLinks({ socials }: { socials: Social[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {socials.map((social) => {
        if (social.popup) {
          return (
            <PopoverSocial key={`${social.label}-${social.url}`} social={social} />
          );
        }
        const Icon = iconFor(social.icon);
        return (
          <a
            key={`${social.label}-${social.url}`}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.label}
            title={social.label}
            className={buttonClass}
          >
            <Icon className="h-[18px] w-[18px]" />
          </a>
        );
      })}
    </div>
  );
}
