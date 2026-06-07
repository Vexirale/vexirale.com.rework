import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  Pin,
  Send,
  Trash2,
} from "lucide-react";
import { siteConfig } from "../config";
import {
  addEntry,
  deleteEntry,
  fetchEntries,
  guestbookConfigured,
  setLiked,
  type GuestEntry,
} from "../lib/guestbook";

const NAME_MAX = 32;
const MSG_MAX = 280;
const PAGE_SIZE = 7; // messages per page
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // currently 1s for testing (was 24 * 60 * 60 * 1000)
const MIN_FILL_MS = 2500; // submitted faster than this == almost certainly a bot
// Owner mode: set this in the browser console to reveal delete + like controls:
//   localStorage.setItem('vx-gb-admin', 'YOUR_SUPABASE_SERVICE_ROLE_KEY')
// then reload. Remove it with localStorage.removeItem('vx-gb-admin').
const ADMIN_KEY = "vx-gb-admin";
const NAME_KEY = "vx-gb-name";
const LAST_KEY = "vx-gb-last";

function ls(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function Guestbook() {
  const configured = guestbookConfigured();

  const [entries, setEntries] = useState<GuestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [name, setName] = useState(() => ls(NAME_KEY));
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [page, setPage] = useState(0);

  // Spam traps: a honeypot field bots fill but humans never see, and the time
  // the form mounted (instant submits are bots).
  const [honeypot, setHoneypot] = useState("");
  const mountedAt = useRef(Date.now());

  // Owner mode is enabled purely via the console (no UI lock).
  const admin = ls(ADMIN_KEY).trim();
  const isOwner = Boolean(admin);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!configured) {
      setLoading(false);
      return;
    }
    fetchEntries()
      .then((rows) => mounted.current && setEntries(rows))
      .catch(() => mounted.current && setLoadError(true))
      .finally(() => mounted.current && setLoading(false));
    return () => {
      mounted.current = false;
    };
  }, [configured]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    // Honeypot tripped → a bot. Pretend it worked and drop it silently.
    if (honeypot) {
      setMessage("");
      return;
    }
    // Submitted implausibly fast → almost certainly a bot.
    if (Date.now() - mountedAt.current < MIN_FILL_MS) {
      setFormError("Hold on a sec, then try again.");
      return;
    }

    const n = name.trim();
    const m = message.trim();
    if (!n || !m) {
      setFormError("Add a name and a message.");
      return;
    }
    const last = Number(ls(LAST_KEY) || 0);
    if (Date.now() - last < COOLDOWN_MS) {
      setFormError("You can sign once a day — come back tomorrow! 💤");
      return;
    }

    setSubmitting(true);
    try {
      const entry = await addEntry(n.slice(0, NAME_MAX), m.slice(0, MSG_MAX));
      setEntries((prev) => [entry, ...prev]);
      setPage(0); // jump to the first page to show the new message
      setMessage("");
      try {
        localStorage.setItem(NAME_KEY, n);
        localStorage.setItem(LAST_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    } catch (err) {
      // Surface the real reason (most often a missing row-level-security policy).
      setFormError(err instanceof Error ? err.message : "Couldn't post that.");
    } finally {
      if (mounted.current) setSubmitting(false);
    }
  };

  const remove = async (id: GuestEntry["id"]) => {
    const prev = entries;
    setEntries((e) => e.filter((x) => x.id !== id)); // optimistic
    try {
      await deleteEntry(id, admin);
    } catch (err) {
      setEntries(prev);
      window.alert(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  const toggleLike = async (entry: GuestEntry) => {
    const next = !entry.liked;
    setEntries((e) =>
      e.map((x) => (x.id === entry.id ? { ...x, liked: next } : x)),
    ); // optimistic
    try {
      await setLiked(entry.id, next, admin);
    } catch (err) {
      setEntries((e) =>
        e.map((x) => (x.id === entry.id ? { ...x, liked: !next } : x)),
      );
      window.alert(err instanceof Error ? err.message : "Like failed.");
    }
  };

  // Pinned config entries always lead the list, then the live DB entries.
  const pinned: GuestEntry[] = (siteConfig.guestbook.pinned ?? []).map(
    (p, i) => ({ id: `pin-${i}`, name: p.name, message: p.message, pinned: true }),
  );
  const all = [...pinned, ...entries];
  const pageCount = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const paged = all.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="glass rounded-3xl p-6 sm:p-8">
      <div className="mb-5 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-white/60" />
        <h2 className="text-lg font-semibold text-white">Guestbook</h2>
      </div>

      {!configured ? (
        <p className="py-6 text-center text-sm text-white/40">
          ✨ Guestbook coming soon
        </p>
      ) : (
        <>
          {/* Sign form */}
          <form onSubmit={submit} className="mb-6 flex flex-col gap-3">
            {/* Honeypot — hidden from humans; bots fill it and get rejected. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              required
              aria-label="Your name"
              placeholder="Your name (required)"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MSG_MAX}
              rows={3}
              required
              aria-label="Your message"
              placeholder="Leave a message…"
              className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] text-white/30">
                {message.length}/{MSG_MAX}
              </span>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white transition-colors hover:border-white/30 hover:bg-white/[0.1] disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Sign
              </button>
            </div>
            {formError && <p className="text-xs text-red-300/80">{formError}</p>}
          </form>

          {/* Entries */}
          {loading ? (
            <div className="flex justify-center py-6 text-white/40">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : loadError ? (
            <p className="py-4 text-center text-sm text-white/40">
              Couldn't load the guestbook right now.
            </p>
          ) : all.length === 0 ? (
            <p className="py-4 text-center text-sm text-white/40">
              No messages yet — be the first to sign! ✍️
            </p>
          ) : (
            <>
              <ul className="flex flex-col gap-3">
                <AnimatePresence initial={false}>
                  {paged.map((entry) => (
                    <motion.li
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-white">
                          {entry.name}
                        </span>
                        {entry.pinned ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-white/30">
                            <Pin className="h-3 w-3" /> pinned
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] text-white/30">
                            {relativeTime(entry.created_at)}
                          </span>
                        )}
                        {isOwner && !entry.pinned && (
                          <span className="ml-auto flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleLike(entry)}
                              aria-label={entry.liked ? "Unlike" : "Like"}
                              className="inline-flex h-6 w-6 items-center justify-center rounded text-white/30 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                            >
                              <Heart
                                className="h-3.5 w-3.5"
                                fill={entry.liked ? "currentColor" : "none"}
                                style={
                                  entry.liked ? { color: "#fb7185" } : undefined
                                }
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(entry.id)}
                              aria-label="Delete entry"
                              className="inline-flex h-6 w-6 items-center justify-center rounded text-white/30 transition-colors hover:bg-red-500/15 hover:text-red-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-white/70">
                        {entry.message}
                      </p>
                      {entry.liked && (
                        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-rose-300">
                          <Heart className="h-3 w-3" fill="currentColor" />
                          liked by {siteConfig.name}
                        </p>
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              {pageCount > 1 && (
                <div className="mt-4 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setPage(current - 1)}
                    disabled={current === 0}
                    aria-label="Previous page"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:border-white/30 hover:text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="font-mono text-[11px] text-white/40">
                    {current + 1} / {pageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(current + 1)}
                    disabled={current >= pageCount - 1}
                    aria-label="Next page"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:border-white/30 hover:text-white disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
