import { motion, useReducedMotion } from "framer-motion";
import { siteConfig } from "../config";

/** Full-screen black landing view: name, tagline, and a glowing Enter button. */
export function Landing({ onEnter }: { onEnter: () => void }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      key="landing"
      className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={
        reduced
          ? { opacity: 0 }
          : { opacity: 0, y: -40, scale: 0.96 }
      }
      transition={{ duration: reduced ? 0.2 : 0.7, ease: "easeInOut" }}
    >
      <motion.h1
        className="text-5xl font-semibold tracking-tight text-white sm:text-7xl"
        initial={{ opacity: 0, y: reduced ? 0 : 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.8, ease: "easeOut" }}
      >
        {siteConfig.name}
      </motion.h1>

      <motion.p
        className="mt-4 max-w-md font-mono text-sm uppercase tracking-[0.25em] text-white/50"
        initial={{ opacity: 0, y: reduced ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.8, ease: "easeOut" }}
      >
        {siteConfig.tagline}
      </motion.p>

      <motion.button
        type="button"
        onClick={onEnter}
        className="group relative mt-12 overflow-hidden rounded-full border border-white/20 bg-white/[0.04] px-10 py-3 text-sm font-medium uppercase tracking-[0.2em] text-white/90 backdrop-blur-md transition-colors hover:border-white/40 hover:bg-white/[0.08]"
        initial={{ opacity: 0, y: reduced ? 0 : 12 }}
        animate={
          reduced
            ? { opacity: 1, y: 0 }
            : {
                opacity: 1,
                y: 0,
                boxShadow: [
                  "0 0 0px rgba(255,255,255,0.0)",
                  "0 0 24px rgba(255,255,255,0.18)",
                  "0 0 0px rgba(255,255,255,0.0)",
                ],
              }
        }
        transition={{
          opacity: { delay: 0.55, duration: 0.6 },
          y: { delay: 0.55, duration: 0.6 },
          boxShadow: { delay: 1, duration: 3, repeat: Infinity, ease: "easeInOut" },
        }}
        whileHover={reduced ? undefined : { scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
      >
        Enter
      </motion.button>
    </motion.div>
  );
}
