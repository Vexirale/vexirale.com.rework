import { motion, useReducedMotion } from "framer-motion";
import { siteConfig } from "../config";
import type { LanyardData } from "../lib/lanyard";
import type { FeaturedActivity } from "../lib/activity";
import type { Rgb } from "../lib/color";
import { PresencePanel } from "./PresencePanel";
import { ProjectPanel } from "./ProjectPanel";

interface PortfolioProps {
  data: LanyardData | null;
  loading: boolean;
  featured: FeaturedActivity | null;
  accent: Rgb;
}

export function Portfolio({ data, loading, featured, accent }: PortfolioProps) {
  const reduced = useReducedMotion();

  const container = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduced ? 0 : 0.1, delayChildren: 0.1 },
    },
  };

  const item = {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 120, damping: 18 },
    },
  };

  return (
    <motion.div
      key="portfolio"
      className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0.2 : 0.5 }}
    >
      <motion.div variants={container} initial="hidden" animate="show">
        {/* Presence panel first. */}
        <motion.div variants={item} className="mb-6 sm:mb-8">
          <PresencePanel
            data={data}
            loading={loading}
            featured={featured}
            accent={accent}
          />
        </motion.div>

        {/* Project panels grid. */}
        {siteConfig.projects.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {siteConfig.projects.map((project) => (
              <motion.div
                key={project.title + project.url}
                variants={item}
                style={{ transformStyle: "preserve-3d" }}
              >
                <ProjectPanel project={project} accent={accent} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <footer className="mt-16 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-white/25">
        {siteConfig.name} · {new Date().getFullYear()}
      </footer>
    </motion.div>
  );
}
