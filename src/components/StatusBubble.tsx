import { motion, useReducedMotion } from "framer-motion";
import type { DiscordStatus } from "../lib/lanyard";

const STATUS: Record<
  DiscordStatus,
  { color: string; label: string; mood: string }
> = {
  online: { color: "#23a55a", label: "Online", mood: "around" },
  idle: { color: "#f0b232", label: "Idle", mood: "afk" },
  dnd: { color: "#f23f43", label: "Do Not Disturb", mood: "busy" },
  offline: { color: "#80848e", label: "Offline", mood: "away" },
};

/** A bubbly "thought bubble" that floats on the right of the presence panel
 *  header and shows the live Discord status. Small trailing circles lead up to
 *  the main glass bubble; it bobs gently and the dot pulses when online. */
export function StatusBubble({
  status,
  connecting,
}: {
  status?: DiscordStatus;
  connecting?: boolean;
}) {
  const reduced = useReducedMotion();

  const info = status ? STATUS[status] ?? STATUS.offline : STATUS.offline;
  const color = connecting ? "#80848e" : info.color;
  const label = connecting ? "Connecting" : info.label;

  const float = reduced
    ? undefined
    : { y: [0, -5, 0], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } };

  return (
    <motion.div
      className="relative shrink-0 select-none"
      initial={reduced ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
    >
      {/* Trailing thought-bubble dots leading down toward the avatar/name. */}
      <motion.span
        aria-hidden
        className="glass absolute -bottom-1 left-1 h-2 w-2 rounded-full"
        animate={reduced ? undefined : { y: [0, -2, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
      />
      <motion.span
        aria-hidden
        className="glass absolute bottom-1 left-3 h-3 w-3 rounded-full"
        animate={reduced ? undefined : { y: [0, -3, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
      />

      {/* Main bubble. */}
      <motion.div
        animate={float}
        className="glass flex items-center gap-2 rounded-2xl rounded-bl-md px-3 py-2"
        style={{ boxShadow: `0 6px 24px ${color}22` }}
      >
        <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
          <span
            className="relative inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
          />
          {status === "online" && !connecting && !reduced && (
            <span
              className="absolute inset-0 animate-ping rounded-full"
              style={{ backgroundColor: color, opacity: 0.6 }}
            />
          )}
        </span>

        <div className="flex flex-col leading-tight">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
            {connecting ? "···" : info.mood}
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: connecting ? "#ffffffaa" : color }}
          >
            {label}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
