import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, FileText } from "lucide-react";
import type { Project } from "../config";
import type { Rgb } from "../lib/color";
import { rgbToCss, rgbToRgba } from "../lib/color";
import { GlassPanel } from "./GlassPanel";

/** "Active development" indicator: a pulsing dot + an indeterminate progress
 *  bar tinted with the current theme/accent color (album-art color while music
 *  plays). */
function ActiveBar({ accent }: { accent: Rgb }) {
  const reduced = useReducedMotion();
  const color = rgbToCss(accent);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
        />
        <span
          className="font-mono text-[10px] uppercase tracking-wider"
          style={{ color: rgbToRgba(accent, 0.9) }}
        >
          Active development
        </span>
      </div>
      <div className="relative h-1 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="absolute inset-y-0 w-1/3 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          }}
          initial={{ x: "-110%" }}
          animate={reduced ? { x: "150%" } : { x: ["-110%", "320%"] }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
          }
        />
      </div>
    </div>
  );
}

/** Deterministic soft gradient + initial used when a project has no image. */
function Placeholder({ title, accent }: { title: string; accent: Rgb }) {
  const initial = title.trim().charAt(0).toUpperCase() || "•";
  return (
    <div
      className="flex h-40 w-full items-center justify-center"
      style={{
        background: `linear-gradient(135deg, ${rgbToRgba(
          accent,
          0.18,
        )}, rgba(255,255,255,0.02))`,
      }}
    >
      <span className="text-5xl font-bold text-white/25">{initial}</span>
    </div>
  );
}

export function ProjectPanel({
  project,
  accent,
  onOpenNote,
}: {
  project: Project;
  accent: Rgb;
  /** Called when a "note" project (one with `content`) is activated. */
  onOpenNote: (project: Project) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const showImage = project.image && !imgError;
  const isNote = Boolean(project.content);

  const inner = (
    <>
      {/* Thumbnail or placeholder */}
      <div className="relative overflow-hidden rounded-t-3xl border-b border-white/10">
        {showImage ? (
          <img
            src={project.image}
            alt={project.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <Placeholder title={project.title} accent={accent} />
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-white">{project.title}</h3>
          {isNote ? (
            <FileText className="h-5 w-5 shrink-0 text-white/40 transition-colors group-hover:text-white" />
          ) : (
            <ArrowUpRight className="h-5 w-5 shrink-0 text-white/40 transition-colors group-hover:text-white" />
          )}
        </div>

        <p className="flex-1 text-sm leading-relaxed text-white/60">
          {project.description}
        </p>

        {project.active && <ActiveBar accent={accent} />}

        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/55"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );

  // Note projects open a modal; everything else links out. Both share the
  // same panel chrome and the translateZ lift used by the 3D tilt.
  const surface = (children: ReactNode) =>
    isNote ? (
      <button
        type="button"
        onClick={() => onOpenNote(project)}
        className="flex h-full flex-col text-left"
        style={{ transform: "translateZ(20px)" }}
      >
        {children}
      </button>
    ) : (
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full flex-col"
        style={{ transform: "translateZ(20px)" }}
      >
        {children}
      </a>
    );

  return (
    <GlassPanel accent={accent} tilt className="flex h-full flex-col">
      {surface(inner)}
    </GlassPanel>
  );
}
