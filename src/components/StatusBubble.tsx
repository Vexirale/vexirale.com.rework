import { motion, useReducedMotion } from "framer-motion";
import type { CustomStatus } from "../lib/activity";
import { useLite } from "../hooks/useLite";

/** Render a Discord custom-status emoji: a custom (server) emoji as an image,
 *  or a standard unicode emoji as text. */
function EmojiBit({ emoji }: { emoji: CustomStatus["emoji"] }) {
  if (!emoji) return null;
  if (emoji.id) {
    const ext = emoji.animated ? "gif" : "png";
    return (
      <img
        src={`https://cdn.discordapp.com/emojis/${emoji.id}.${ext}`}
        alt={emoji.name ?? ""}
        className="h-4 w-4 shrink-0"
      />
    );
  }
  if (emoji.name) return <span className="shrink-0 text-sm">{emoji.name}</span>;
  return null;
}

/** A bubbly "thought bubble" floating on the right of the presence panel that
 *  shows the live Discord custom status message (like Discord shows next to an
 *  avatar). Small trailing circles lead up to the main glass bubble, which bobs
 *  gently. Rendered only when a custom status is set. */
export function StatusBubble({ status }: { status: CustomStatus }) {
  const reduced = useReducedMotion();
  const lite = useLite();
  // No continuous motion on phones / weak GPUs (it forces backdrop re-blurs).
  const idle = reduced || lite;

  const float = idle
    ? undefined
    : {
        y: [0, -5, 0],
        transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
      };

  return (
    <motion.div
      className="relative max-w-[45%] shrink-0 select-none sm:max-w-[240px]"
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: -4 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
    >
      {/* Main bubble. Text wraps onto multiple lines (with a sane cap) instead
          of being clipped. */}
      <motion.div
        animate={float}
        className="glass flex items-start gap-2 rounded-2xl rounded-bl-md px-3 py-2"
      >
        <span className="mt-px shrink-0">
          <EmojiBit emoji={status.emoji} />
        </span>
        {status.text && (
          <span
            className="min-w-0 break-words text-xs leading-snug text-white/75"
            title={status.text}
          >
            {status.text}
          </span>
        )}
      </motion.div>

      {/* Thought-bubble tail: two dots descending below-left toward the avatar,
          sitting outside the main bubble so they never clip inside it. Plain
          translucent fills (no backdrop-filter) to keep them cheap. */}
      <motion.span
        aria-hidden
        className="absolute left-3 top-full mt-1 h-2.5 w-2.5 rounded-full border border-white/10 bg-white/[0.1]"
        animate={idle ? undefined : { y: [0, -2, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
      />
      <motion.span
        aria-hidden
        className="absolute left-0 top-full mt-[14px] h-1.5 w-1.5 rounded-full border border-white/10 bg-white/[0.1]"
        animate={idle ? undefined : { y: [0, -2, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
      />
    </motion.div>
  );
}
