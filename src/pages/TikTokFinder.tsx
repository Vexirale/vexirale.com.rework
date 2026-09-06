import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Globe2,
  Layers,
  Lock,
  Play,
  Repeat2,
  Search,
  Sparkles,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Video,
} from "lucide-react";
import { siteConfig } from "../config";
import { hexToRgb } from "../lib/color";
import { GlassPanel } from "../components/GlassPanel";
import { Skeleton } from "../components/Skeleton";
import {
  fetchHighlights,
  fetchProfile,
  fetchRegion,
  fetchReposts,
  fetchStories,
  fetchVideos,
  normalizeUsername,
  TikTokApiError,
  type TikTokHighlights,
  type TikTokMedia,
  type TikTokMediaItem,
  type TikTokProfile,
  type TikTokRegion,
  type TikTokStories,
} from "../lib/tiktok";

const accent = hexToRgb(siteConfig.accentColor);

type Status = "idle" | "loading" | "error" | "done";

interface SectionState<T> {
  status: Status;
  data: T | null;
  error: string | null;
}

const initialSection = <T,>(): SectionState<T> => ({
  status: "idle",
  data: null,
  error: null,
});

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDate(unixSeconds: number | null): string {
  if (!unixSeconds) return "Unknown";
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** One collapsible "fetch this data type" button + its result panel. */
function DataSection<T>({
  label,
  icon,
  state,
  onFetch,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  icon: ReactNode;
  state: SectionState<T>;
  onFetch: () => void;
  expanded: boolean;
  onToggle: () => void;
  children: (data: T) => ReactNode;
}) {
  const handleClick = () => {
    onToggle();
    if (state.status === "idle" || state.status === "error") onFetch();
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className="glass flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:border-white/25 sm:w-auto sm:min-w-[180px]"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-white/90">
          {icon}
          {label}
        </span>
        {state.status === "loading" ? (
          <Loader2 size={16} className="animate-spin text-white/50" />
        ) : state.status === "done" ? (
          <RefreshCw
            size={14}
            className="text-white/30 transition-transform hover:rotate-90 hover:text-white/60"
            onClick={(e) => {
              e.stopPropagation();
              onFetch();
            }}
          />
        ) : null}
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 overflow-hidden"
        >
          <GlassPanel accent={accent} className="p-5">
            {state.status === "loading" && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}
            {state.status === "error" && (
              <div className="flex items-start gap-2 text-sm text-white/70">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300/80" />
                <span>{state.error}</span>
              </div>
            )}
            {state.status === "done" && state.data && children(state.data)}
          </GlassPanel>
        </motion.div>
      )}
    </div>
  );
}

/** Thumbnail grid shared by Videos and Reposts. A repost is the same shape,
 *  so the original author is shown whenever it isn't the account looked up. */
function MediaGrid({ items, owner }: { items: TikTokMediaItem[]; owner: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noreferrer noopener"
          title={item.desc}
          className="group relative aspect-[9/16] overflow-hidden rounded-lg border border-white/10"
        >
          <img
            src={item.cover}
            alt={item.desc}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-4">
            {item.playCount !== null && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-white/90">
                <Play size={10} className="fill-current" />
                {formatNumber(item.playCount)}
              </span>
            )}
            {item.author && item.author.toLowerCase() !== owner.toLowerCase() && (
              <span className="block truncate text-[10px] text-white/60">
                @{item.author}
              </span>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}

const STAT_ITEMS: { key: keyof TikTokProfile["stats"]; label: string }[] = [
  { key: "followers", label: "Followers" },
  { key: "following", label: "Following" },
  { key: "hearts", label: "Hearts" },
  { key: "videos", label: "Videos" },
  { key: "friends", label: "Friends" },
];

export function TikTokFinder() {
  const [input, setInput] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [profile, setProfile] = useState<SectionState<TikTokProfile>>(initialSection);
  const [region, setRegion] = useState<SectionState<TikTokRegion>>(initialSection);
  const [videos, setVideos] = useState<SectionState<TikTokMedia>>(initialSection);
  const [reposts, setReposts] = useState<SectionState<TikTokMedia>>(initialSection);
  const [highlights, setHighlights] =
    useState<SectionState<TikTokHighlights>>(initialSection);
  const [stories, setStories] = useState<SectionState<TikTokStories>>(initialSection);

  const apiBase = siteConfig.tiktok.apiBase;
  const notConfigured = !apiBase;

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  /** Drives one section through loading → done/error. Every button uses this,
   *  so a new data type only needs its fetcher and a <DataSection>. */
  async function run<T>(
    setState: (state: SectionState<T>) => void,
    fetcher: (base: string, name: string) => Promise<T>,
    name: string,
  ) {
    setState({ status: "loading", data: null, error: null });
    try {
      setState({ status: "done", data: await fetcher(apiBase, name), error: null });
    } catch (err) {
      setState({
        status: "error",
        data: null,
        error: err instanceof TikTokApiError ? err.message : "Something went wrong.",
      });
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeUsername(input);
    if (!normalized) {
      setFormError("Enter a valid TikTok username (letters, numbers, . and _).");
      return;
    }
    setFormError(null);
    setUsername(normalized);
    setProfile(initialSection());
    setRegion(initialSection());
    setVideos(initialSection());
    setReposts(initialSection());
    setHighlights(initialSection());
    setStories(initialSection());
    setExpanded({ profile: true });
    void run(setProfile, fetchProfile, normalized);
  };

  return (
    <motion.div
      className="relative z-10 mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <a
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white/90"
      >
        <ArrowLeft size={15} />
        vexirale.com
      </a>

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-white sm:text-3xl">
          <Sparkles size={24} className="text-white/70" />
          TikTok Finder
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/50">
          Looks up a TikTok account's public profile data. Everything except the
          profile itself runs through a real headless browser on the backend,
          since TikTok blocks that data otherwise — those can take a few seconds,
          and may come back unavailable if TikTok doesn't expose it for a given
          account.
        </p>
      </div>

      {notConfigured ? (
        <GlassPanel accent={accent} className="p-6 text-center">
          <p className="text-sm text-white/60">
            The lookup backend isn't deployed yet — this page is a preview.
            See the README for Worker deploy steps.
          </p>
        </GlassPanel>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
            <div className="glass flex flex-1 items-center gap-2 rounded-2xl px-4 py-3">
              <span className="text-white/40">@</span>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="username"
                spellCheck={false}
                autoCapitalize="none"
                className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-white/90 transition-colors hover:border-white/25"
            >
              <Search size={16} />
              Fetch
            </button>
          </form>
          {formError && (
            <p className="-mt-4 mb-6 text-sm text-amber-300/80">{formError}</p>
          )}

          {username && (
            <div className="space-y-3">
              <DataSection
                label="Profile"
                icon={<BadgeCheck size={16} className="text-white/50" />}
                state={profile}
                onFetch={() => run(setProfile, fetchProfile, username)}
                expanded={Boolean(expanded.profile)}
                onToggle={() => toggle("profile")}
              >
                {(data) => (
                  <div>
                    <div className="flex items-center gap-4">
                      <img
                        src={data.avatar}
                        alt={data.uniqueId}
                        className="h-16 w-16 rounded-full border border-white/10 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 font-medium text-white">
                          {data.nickname}
                          {data.verified && (
                            <BadgeCheck size={15} className="text-sky-400" />
                          )}
                          {data.privateAccount && (
                            <Lock size={13} className="text-white/40" />
                          )}
                        </div>
                        <div className="text-sm text-white/50">@{data.uniqueId}</div>
                      </div>
                    </div>
                    {data.signature && (
                      <p className="mt-3 whitespace-pre-line text-sm text-white/70">
                        {data.signature}
                      </p>
                    )}
                    <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                      {STAT_ITEMS.map(({ key, label }) => (
                        <div key={key} className="text-center">
                          <div className="text-sm font-semibold text-white">
                            {formatNumber(data.stats[key])}
                          </div>
                          <div className="text-[11px] uppercase tracking-wide text-white/40">
                            {label}
                          </div>
                        </div>
                      ))}
                    </div>
                    <dl className="mt-4 space-y-1 border-t border-white/10 pt-3 text-xs text-white/40">
                      <div className="flex justify-between gap-4">
                        <dt>Account created</dt>
                        <dd>{formatDate(data.createTime)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt>Username last changed</dt>
                        <dd>{formatDate(data.usernameModifiedTime)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt>Nickname last changed</dt>
                        <dd>{formatDate(data.nicknameModifiedTime)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt>User ID</dt>
                        <dd className="font-mono">{data.userId}</dd>
                      </div>
                    </dl>
                  </div>
                )}
              </DataSection>

              <DataSection
                label="Region"
                icon={<Globe2 size={16} className="text-white/50" />}
                state={region}
                onFetch={() => run(setRegion, fetchRegion, username)}
                expanded={Boolean(expanded.region)}
                onToggle={() => toggle("region")}
              >
                {(data) =>
                  data.available && data.region ? (
                    <p className="text-sm text-white">
                      Detected region: <span className="font-semibold">{data.region}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-white/50">
                      {data.message ?? "TikTok didn't expose a region for this account."}
                    </p>
                  )
                }
              </DataSection>

              <DataSection
                label="Videos"
                icon={<Video size={16} className="text-white/50" />}
                state={videos}
                onFetch={() => run(setVideos, fetchVideos, username)}
                expanded={Boolean(expanded.videos)}
                onToggle={() => toggle("videos")}
              >
                {(data) =>
                  data.available && data.items.length > 0 ? (
                    <MediaGrid items={data.items} owner={username} />
                  ) : (
                    <p className="text-sm text-white/50">
                      {data.message ?? "No public videos found for this account."}
                    </p>
                  )
                }
              </DataSection>

              <DataSection
                label="Reposts"
                icon={<Repeat2 size={16} className="text-white/50" />}
                state={reposts}
                onFetch={() => run(setReposts, fetchReposts, username)}
                expanded={Boolean(expanded.reposts)}
                onToggle={() => toggle("reposts")}
              >
                {(data) =>
                  data.available && data.items.length > 0 ? (
                    <MediaGrid items={data.items} owner={username} />
                  ) : (
                    <p className="text-sm text-white/50">
                      {data.message ?? "No reposts found for this account."}
                    </p>
                  )
                }
              </DataSection>

              <DataSection
                label="Highlights"
                icon={<Layers size={16} className="text-white/50" />}
                state={highlights}
                onFetch={() => run(setHighlights, fetchHighlights, username)}
                expanded={Boolean(expanded.highlights)}
                onToggle={() => toggle("highlights")}
              >
                {(data) =>
                  data.available && data.items.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {data.items.map((item) => (
                        <div
                          key={item.id}
                          className="overflow-hidden rounded-lg border border-white/10"
                        >
                          {item.cover && (
                            <img
                              src={item.cover}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="aspect-video w-full object-cover"
                            />
                          )}
                          <div className="px-2 py-1.5">
                            <div className="truncate text-xs font-medium text-white/90">
                              {item.name}
                            </div>
                            {item.count !== null && (
                              <div className="text-[11px] text-white/40">
                                {item.count} videos
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-white/50">
                      {data.message ?? "No playlists / highlights found."}
                    </p>
                  )
                }
              </DataSection>

              <DataSection
                label="Stories"
                icon={<Sparkles size={16} className="text-white/50" />}
                state={stories}
                onFetch={() => run(setStories, fetchStories, username)}
                expanded={Boolean(expanded.stories)}
                onToggle={() => toggle("stories")}
              >
                {(data) =>
                  data.available && data.items.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {data.items.map((item) => (
                        <div
                          key={item.id}
                          className="aspect-[9/16] overflow-hidden rounded-lg border border-white/10"
                        >
                          <img
                            src={item.cover}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-white/50">
                      {data.message ?? "No active stories, or unavailable without a logged-in session."}
                    </p>
                  )
                }
              </DataSection>
            </div>
          )}
        </>
      )}

      <footer className="mt-16 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-white/25">
        {siteConfig.name} · tiktok finder
      </footer>
    </motion.div>
  );
}
