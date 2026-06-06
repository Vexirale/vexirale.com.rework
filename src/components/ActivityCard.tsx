import { useEffect, useState } from "react";
import { Music, Tv, Gamepad2, ExternalLink } from "lucide-react";
import type { FeaturedActivity } from "../lib/activity";

/** Tick once a second so progress bars / elapsed timers stay live. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Image with a clean icon fallback so the card never looks broken. */
function ArtworkImage({
  src,
  title,
  fallback,
}: {
  src: string | null;
  title?: string;
  fallback: React.ReactNode;
}) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-white/50">
        {fallback}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      title={title}
      onError={() => setErrored(true)}
      className="h-16 w-16 shrink-0 rounded-lg border border-white/10 bg-black/40 object-cover"
    />
  );
}

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.15em] text-white/40";

/** Consistent card shell so all three variants share footprint + style. */
function CardShell({
  children,
  href,
  tint,
}: {
  children: React.ReactNode;
  href: string | null;
  tint: string;
}) {
  const base =
    "block rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition-colors";
  const inner = (
    <div
      className="rounded-2xl"
      style={{
        background: `linear-gradient(120deg, ${tint}, transparent 60%)`,
      }}
    >
      {children}
    </div>
  );
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} hover:border-white/25 hover:bg-white/[0.07]`}
      >
        {inner}
      </a>
    );
  }
  return <div className={base}>{inner}</div>;
}

export function ActivityCard({
  activity,
  tint,
}: {
  activity: FeaturedActivity;
  tint: string;
}) {
  const isSpotify = activity.kind === "spotify";
  const isPlaying = activity.kind === "playing";
  const now = useNow(
    isSpotify || (isPlaying && Boolean(activity.start)),
  );

  if (activity.kind === "spotify") {
    const span = activity.end - activity.start;
    const elapsed = now - activity.start;
    const pct =
      span > 0 ? Math.min(100, Math.max(0, (elapsed / span) * 100)) : 0;

    return (
      <CardShell href={activity.href} tint={tint}>
        <div className="flex items-center gap-3 p-1">
          <ArtworkImage
            src={activity.image}
            fallback={<Music className="h-6 w-6" />}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Music className="h-3 w-3 text-white/40" />
              <span className={labelClass}>Listening to Spotify</span>
            </div>
            <p className="truncate text-sm font-medium text-white">
              {activity.title}
            </p>
            <p className="truncate text-xs text-white/55">
              {activity.subtitle}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-[10px] text-white/40">
                {fmt(Math.min(elapsed, span))}
              </span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white/70 transition-[width] duration-1000 ease-linear"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-white/40">
                {fmt(span)}
              </span>
            </div>
          </div>
          {activity.href && (
            <ExternalLink className="h-4 w-4 shrink-0 self-start text-white/30" />
          )}
        </div>
      </CardShell>
    );
  }

  if (activity.kind === "watching") {
    return (
      <CardShell href={activity.href} tint={tint}>
        <div className="flex items-center gap-3 p-1">
          <ArtworkImage
            src={activity.image}
            title={activity.largeText}
            fallback={<Tv className="h-6 w-6" />}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Tv className="h-3 w-3 text-white/40" />
              <span className={labelClass}>Watching</span>
            </div>
            <p className="truncate text-sm font-medium text-white">
              {activity.title}
            </p>
            {activity.details && (
              <p className="truncate text-xs text-white/55">
                {activity.details}
              </p>
            )}
            {activity.state && (
              <p className="truncate text-xs text-white/45">{activity.state}</p>
            )}
          </div>
          {activity.href && (
            <ExternalLink className="h-4 w-4 shrink-0 self-start text-white/30" />
          )}
        </div>
      </CardShell>
    );
  }

  // Playing — no link (non-interactive).
  const elapsed = activity.start ? now - activity.start : 0;
  return (
    <CardShell href={null} tint={tint}>
      <div className="flex items-center gap-3 p-1">
        <ArtworkImage
          src={activity.image}
          title={activity.largeText}
          fallback={<Gamepad2 className="h-6 w-6" />}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Gamepad2 className="h-3 w-3 text-white/40" />
            <span className={labelClass}>Playing</span>
          </div>
          <p className="truncate text-sm font-medium text-white">
            {activity.title}
          </p>
          {activity.details && (
            <p className="truncate text-xs text-white/55">{activity.details}</p>
          )}
          {activity.state && (
            <p className="truncate text-xs text-white/45">{activity.state}</p>
          )}
          {activity.start ? (
            <p className="mt-1 font-mono text-[10px] text-white/40">
              {fmt(elapsed)} elapsed
            </p>
          ) : null}
        </div>
      </div>
    </CardShell>
  );
}
