import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { siteConfig } from "../config";
import type { LanyardData } from "../lib/lanyard";

type Line = { text: string; tail?: string; cmd?: boolean };

/** Terminal "checkpoint" boot sequence shown before the portfolio. It yaps a
 *  few terminal steps (some reflect real live status: the Discord-presence and
 *  Spotify lines read "ok" or "failure"), then waits for Enter / a click. */
export function Landing({
  onEnter,
  data,
}: {
  onEnter: () => void;
  data: LanyardData | null;
}) {
  const reduced = useReducedMotion();

  // Random-but-stable "components" count for flavor.
  const modules = useMemo(() => 200 + Math.floor(Math.random() * 700), []);

  const online = Boolean(data && data.discord_status !== "offline");
  const playing = Boolean(data?.listening_to_spotify);

  const lines = useMemo<Line[]>(() => {
    // "..." while still connecting, then resolves to ok / failure.
    const discord = data == null ? "..." : online ? "ok" : "failure";
    const spotify = data == null ? "..." : playing ? "ok" : "failure";
    return [
      { text: "$ ssh guest@vexirale.com", cmd: true },
      { text: "> establishing tunnel...", tail: "ok" },
      { text: "$ whoami", cmd: true },
      { text: "> guest (read only)" },
      { text: "$ cd /home/vexirale", cmd: true },
      { text: "> mounting filesystem...", tail: "ok" },
      { text: "> loading profile.json...", tail: "ok" },
      { text: "> syncing discord presence...", tail: discord },
      { text: "> pinging spotify...", tail: spotify },
      { text: "$ ./boot --portfolio", cmd: true },
      { text: `> hydrated ${modules} components...`, tail: "ok" },
      { text: "> warming the aurora...", tail: "ok" },
      { text: "> waking the catgirls...", tail: "ok" },
      { text: "> checking guestbook...", tail: "ok" },
      { text: "> all systems nominal" },
    ];
  }, [data, online, playing, modules]);

  const [count, setCount] = useState(reduced ? lines.length : 0);
  const [phase, setPhase] = useState<"run" | "ready" | "granted">(
    reduced ? "ready" : "run",
  );
  const done = useRef(false);

  // Reveal the lines one by one.
  useEffect(() => {
    if (phase !== "run") return;
    if (count >= lines.length) {
      setPhase("ready");
      return;
    }
    const id = setTimeout(() => setCount((c) => c + 1), 280);
    return () => clearTimeout(id);
  }, [phase, count, lines.length]);

  const activate = () => {
    if (phase === "run") {
      setCount(lines.length);
      setPhase("ready");
      return;
    }
    if (phase === "ready" && !done.current) {
      done.current = true;
      setPhase("granted");
      setTimeout(onEnter, 850);
    }
  };

  // Enter key advances/grants access too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") activate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <motion.div
      key="landing"
      onClick={activate}
      className="flex min-h-[100dvh] cursor-pointer items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -30, scale: 0.97 }}
      transition={{ duration: reduced ? 0.2 : 0.6, ease: "easeInOut" }}
    >
      <div className="glass w-full max-w-xl overflow-hidden rounded-2xl">
        {/* Title bar */}
        <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-2.5">
          <span className="font-mono text-xs text-white/45">// checkpoint</span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          </span>
        </div>

        {/* Body */}
        <div className="min-h-[16rem] px-5 py-5 font-mono text-[13px] leading-relaxed sm:px-6">
          {lines.slice(0, count).map((line, i) => (
            <motion.div
              key={i}
              initial={reduced ? false : { opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="text-white/75"
            >
              {line.cmd ? (
                <span className="text-white/50">{line.text}</span>
              ) : (
                <>
                  <span className="text-sky-300/80">{line.text.slice(0, 1)}</span>
                  {line.text.slice(1)}
                </>
              )}
              {line.tail && (
                <span
                  className={
                    line.tail === "failure"
                      ? "text-red-400"
                      : line.tail === "ok"
                        ? "text-emerald-400"
                        : "text-white/40"
                  }
                >
                  {" "}
                  {line.tail}
                </span>
              )}
            </motion.div>
          ))}

          {phase === "ready" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-white/80"
            >
              <span className="animate-pulse">
                [ press <span className="text-white">enter</span> or click
                anywhere to access ]
              </span>
              <span className="ml-1 inline-block w-2 animate-pulse text-white/70">
                ▋
              </span>
            </motion.div>
          )}

          {phase === "granted" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 font-semibold text-emerald-400"
            >
              &gt; access granted ✓
            </motion.div>
          )}

          {phase === "run" && (
            <span className="inline-block w-2 animate-pulse text-white/70">▋</span>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/25 sm:px-6">
          {siteConfig.name} · runs once per hour · {new Date().getFullYear()}
        </div>
      </div>
    </motion.div>
  );
}
