import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Gauge, X } from "lucide-react";
import {
  dismissReducedNotice,
  enableFullExperience,
  useReducedNotice,
} from "../hooks/useLite";

/** Notice shown when the frame rate dipped and we automatically dialed back the
 *  heavier visuals. Lets the visitor force the full experience back on. */
export function PerfToast() {
  const reduced = useReducedMotion();
  const show = useReducedNotice();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          className="glass fixed bottom-4 left-4 z-50 w-[min(92vw,24rem)] rounded-2xl p-4 pr-10"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
        >
          <button
            type="button"
            onClick={dismissReducedNotice}
            aria-label="Dismiss"
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 text-amber-300">
            <Gauge className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Performance mode on</h3>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-white/70">
            im crinneee ur device cant run this BEAUTIFUL motherfuckingwebsite.com 
            its okay tho, i slowed some things down so you can still experience some of it :)
          </p>
          <button
            type="button"
            onClick={enableFullExperience}
            className="mt-2 text-sm font-medium text-amber-300 underline decoration-amber-300/40 underline-offset-2 transition-colors hover:decoration-amber-300"
          >
            No, I want to LAG. give me the full experience!
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
