/* Region / Videos / Reposts / Highlights / Stories all need data that TikTok
 * only serves to a signed request (`X-Bogus`), and that signature is generated
 * by TikTok's own obfuscated client JS. Rather than reimplementing that
 * (fragile, goes stale fast), we drive a real headless Chromium via
 * Cloudflare's Browser Rendering product and let TikTok's own page sign its
 * own requests, then read the results back out. This is inherently slower
 * (real navigation + render) and best-effort: if TikTok doesn't expose a
 * piece of data to a logged-out session at all — which region and stories
 * often aren't — no amount of browser automation gets it back, and we report
 * "unavailable" rather than fabricate something.
 *
 * NOTE: the exact DOM structure / selectors below are TikTok's current
 * (2026) web app and can drift. If a route below starts always coming back
 * "unavailable", check with `wrangler dev --remote` first — TikTok's markup
 * or its network calls may have changed. */

import puppeteer, { type BrowserWorker } from "@cloudflare/puppeteer";
import { TIKTOK_UA, TikTokLookupError } from "../tiktokPage";

export interface Env {
  BROWSER: BrowserWorker;
  ALLOWED_ORIGIN: string;
}

const NAV_TIMEOUT_MS = 20_000;

/** Ceiling on a whole browser-backed lookup, so a wedged session returns an
 *  error instead of hanging the caller until their client gives up. */
const OVERALL_TIMEOUT_MS = 45_000;

/** How long a browser stays alive after we disconnect, ready for the next
 *  request to reuse. Reuse is what gets around the free plan's limit of one
 *  NEW browser acquisition every 20 seconds.
 *
 *  Keep this SMALL. Idle keep-alive time is still billed browser time, and
 *  the free plan's entire daily allowance is ten browser-minutes — so a long
 *  keep-alive spends the whole day's budget on one warm, idle browser. A
 *  minute is enough to click through several buttons in one sitting without
 *  doing that. */
const KEEP_ALIVE_MS = 60_000;

/** TikTok's own signed call for a profile's post grid. Both the Videos tab
 *  and the Reposts tab load through it. */
const POST_LIST_API = "/api/post/item_list";

/** Reposts are a separate endpoint, not the post grid filtered by author —
 *  confirmed from a live /debug run, where both fired on page load. */
const REPOST_LIST_API = "/api/repost/item_list";

/** Gets a browser, strongly preferring one that is already running.
 *
 *  Cloudflare's free plan allows one NEW browser acquisition every 20 seconds,
 *  so launching per request means the second lookup within that window fails
 *  outright. A session with no `connectionId` has no Worker attached to it and
 *  can be connected to instead, which doesn't count as an acquisition. */
async function acquireBrowser(env: Env) {
  const sessions = await puppeteer.sessions(env.BROWSER).catch(() => []);
  for (const session of sessions.filter((s) => !s.connectionId)) {
    try {
      return await puppeteer.connect(env.BROWSER, session.sessionId);
    } catch {
      // Session died between listing and connecting — try the next one.
    }
  }

  try {
    return await puppeteer.launch(env.BROWSER, { keep_alive: KEEP_ALIVE_MS });
  } catch (launchError) {
    // Say why, not just "no". Without this the caller can't tell a 20-second
    // acquisition cooldown from an exhausted daily quota from a broken
    // binding — and those need completely different responses.
    const limits = await puppeteer.limits(env.BROWSER).catch(() => null);
    const wait = limits?.timeUntilNextAllowedBrowserAcquisition;
    const detail = limits
      ? `${limits.activeSessions.length}/${limits.maxConcurrentSessions} sessions in use, ${limits.allowedBrowserAcquisitions} acquisition(s) allowed`
      : String(launchError instanceof Error ? launchError.message : launchError).slice(0, 200);

    throw new TikTokLookupError(
      wait
        ? `All browsers are busy — try again in about ${Math.ceil(wait / 1000)}s. (${detail})`
        : `Couldn't get a browser: ${detail}. If this persists, the daily Browser Run allowance may be spent — see /browser-status.`,
      503,
    );
  }
}

export interface BrowserStatus {
  limits: Awaited<ReturnType<typeof puppeteer.limits>> | null;
  sessions: Awaited<ReturnType<typeof puppeteer.sessions>> | null;
  error: string | null;
}

/** Reports the Browser Run pool: how many sessions are alive, which are free
 *  to reuse, and how long until another acquisition is allowed. Deliberately
 *  does NOT open a browser, so it still answers when every other route is
 *  failing to get one — which is exactly when you need to know why. */
export async function getBrowserStatus(env: Env): Promise<BrowserStatus> {
  const [limits, sessions] = await Promise.all([
    puppeteer.limits(env.BROWSER).catch(() => null),
    puppeteer.sessions(env.BROWSER).catch(() => null),
  ]);
  return {
    limits,
    sessions,
    error:
      limits === null && sessions === null
        ? "Browser Run did not respond — the binding may not be provisioned for this account."
        : null,
  };
}

async function withPage<T>(
  env: Env,
  fn: (page: import("@cloudflare/puppeteer").Page) => Promise<T>,
): Promise<T> {
  const browser = await acquireBrowser(env);
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const page = await browser.newPage();
    await page.setUserAgent(TIKTOK_UA);
    await page.setViewport({ width: 1280, height: 900 });
    page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);

    // A wedged page shouldn't hang the request until the client gives up.
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new TikTokLookupError("That lookup timed out.", 504)),
        OVERALL_TIMEOUT_MS,
      );
    });

    try {
      return await Promise.race([fn(page), timeout]);
    } finally {
      clearTimeout(timer);
      await page.close().catch(() => {});
    }
  } finally {
    // Disconnect rather than close: the browser stays warm for the next
    // request to reuse, which is what keeps us under the acquisition limit.
    try {
      await browser.disconnect();
    } catch {
      // Already gone — nothing to release.
    }
  }
}

/** Collects JSON bodies of XHR/fetch responses from TikTok's API while a
 *  page action runs, so we can read data TikTok only sends after its own
 *  JS signs the request. */
function collectApiResponses(
  page: import("@cloudflare/puppeteer").Page,
  urlIncludes: string | string[],
) {
  const needles = Array.isArray(urlIncludes) ? urlIncludes : [urlIncludes];
  const bodies: unknown[] = [];

  // Reading a body is async, and Puppeteer does not await event listeners —
  // so every read has to be tracked and awaited explicitly via settled().
  // Without that, `bodies` is read while the parses are still pending and
  // comes back empty even though the responses arrived with HTTP 200. That
  // was the actual cause of every route reporting "found nothing".
  const reads: Promise<void>[] = [];

  const listener = (res: import("@cloudflare/puppeteer").HTTPResponse) => {
    if (!needles.some((needle) => res.url().includes(needle))) return;
    reads.push(
      res
        .json()
        .then((body: unknown) => {
          bodies.push(body);
        })
        .catch(() => {
          // Not JSON, or the body went away with the page — skip it.
        }),
    );
  };

  page.on("response", listener);
  return {
    bodies,
    stop: () => page.off("response", listener),
    /** Await before reading `bodies`. */
    settled: () => Promise.all(reads).then(() => undefined),
  };
}

function profileUrl(username: string): string {
  return `https://www.tiktok.com/@${encodeURIComponent(username)}`;
}

export interface RegionResult {
  region: string | null;
  available: boolean;
  message: string | null;
}

/** Everything one page visit can yield. */
interface LookupBundle {
  region: RegionResult;
  videos: MediaResult;
  reposts: MediaResult;
  highlights: HighlightsResult;
  stories: StoriesResult;
}

/** Long enough that clicking through every button costs one visit, short
 *  enough that a lookup still reflects a reasonably current profile. */
const CACHE_TTL_SECONDS = 900;

function bundleCacheKey(username: string): Request {
  return new Request(
    `https://tiktok-lookup.invalid/${encodeURIComponent(username.toLowerCase())}`,
  );
}

/** `caches.default` is a Workers extension. The DOM lib — which this file
 *  needs for the page.evaluate() callbacks — shadows CacheStorage with the
 *  browser type, and that one has no `default`, so reach it through a narrow
 *  cast rather than dropping DOM types the rest of the file depends on. */
function workerCache(): Cache {
  return (caches as unknown as { default: Cache }).default;
}

async function readBundle(username: string): Promise<LookupBundle | null> {
  try {
    const hit = await workerCache().match(bundleCacheKey(username));
    return hit ? ((await hit.json()) as LookupBundle) : null;
  } catch {
    return null;
  }
}

async function writeBundle(username: string, bundle: LookupBundle): Promise<void> {
  try {
    await workerCache().put(
      bundleCacheKey(username),
      new Response(JSON.stringify(bundle), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `max-age=${CACHE_TTL_SECONDS}`,
        },
      }),
    );
  } catch {
    // The cache is an optimisation — failing to store must not fail a lookup.
  }
}

function readRegionFrom(
  page: import("@cloudflare/puppeteer").Page,
  bodies: unknown[],
): Promise<string | null> {
  // TikTok's own signed client-side fetch sometimes carries `region` even
  // when the server-rendered HTML doesn't.
  for (const body of bodies) {
    const region = (body as { userInfo?: { user?: { region?: string } } })
      ?.userInfo?.user?.region;
    if (region) return Promise.resolve(region);
  }

  return page
    .evaluate(() => {
      const w = window as unknown as {
        __UNIVERSAL_DATA_FOR_REHYDRATION__?: {
          __DEFAULT_SCOPE__?: {
            "webapp.user-detail"?: { userInfo?: { user?: { region?: string } } };
          };
        };
      };
      return (
        w.__UNIVERSAL_DATA_FOR_REHYDRATION__?.__DEFAULT_SCOPE__?.[
          "webapp.user-detail"
        ]?.userInfo?.user?.region ?? null
      );
    })
    .catch(() => null);
}

/** One page visit that gathers every browser-only data type at once.
 *
 *  Doing a visit per data type is what made this unusable: five buttons meant
 *  five page loads, and the free plan's whole daily allowance is ten browser
 *  minutes. One visit costs roughly a fifth of that, and the result is cached
 *  so clicking the remaining buttons costs nothing. */
async function collectAll(env: Env, username: string): Promise<LookupBundle> {
  return withPage(env, async (page) => {
    // Endpoint list confirmed from a live /debug run: loading a profile fires
    // all of these itself, each returning 200. Reposts have their OWN
    // endpoint and arrive on load, so no tab clicking is needed.
    const posts = collectApiResponses(page, POST_LIST_API);
    const repostFeed = collectApiResponses(page, REPOST_LIST_API);
    const detail = collectApiResponses(page, "/api/user/detail");
    const playlists = collectApiResponses(page, [
      "/api/user/playlist",
      "/api/user/collection_list",
      "highlight",
    ]);
    const storyFeed = collectApiResponses(page, "/api/story/item_list");

    await page.goto(profileUrl(username), { waitUntil: "domcontentloaded" });

    // Wait for TikTok's own signed grid call rather than for an idle network,
    // which on TikTok may never actually settle.
    if (posts.bodies.length === 0) {
      await page
        .waitForResponse((res) => res.url().includes(POST_LIST_API), {
          timeout: 12_000,
        })
        .catch(() => null);
    }

    // The rest of the calls fire around the same time; give the slower ones a
    // moment rather than racing them.
    await new Promise((resolve) => setTimeout(resolve, 2_500));

    const region = await readRegionFrom(page, detail.bodies);

    posts.stop();
    repostFeed.stop();
    detail.stop();
    playlists.stop();
    storyFeed.stop();

    // Bodies are parsed asynchronously, so wait for every read to land before
    // touching the arrays — skipping this is what made all of these empty.
    await Promise.all([
      posts.settled(),
      repostFeed.settled(),
      detail.settled(),
      playlists.settled(),
      storyFeed.settled(),
    ]);

    // The grid endpoint can also echo reposts back, so ownership still decides
    // what counts as the account's own video.
    const owned = (item: RawPost) =>
      (item.author?.uniqueId ?? "").toLowerCase() === username.toLowerCase();
    const videos = toMediaItems(itemsFromBodies(posts.bodies).filter(owned));
    const reposts = toMediaItems(itemsFromBodies(repostFeed.bodies));

    const highlights: HighlightItem[] = playlistsFromBodies(playlists.bodies).map(
      (p) => ({
        id: (p.mixId ?? p.id) as string,
        name: (p.mixName ?? p.name) as string,
        cover: p.coverUrl ?? p.cover ?? "",
        count: p.itemCount ?? p.videoCount ?? null,
      }),
    );

    const stories = itemsFromBodies(storyFeed.bodies).map((s) => ({
      id: s.id,
      cover: s.video?.cover ?? "",
    }));

    return {
      region: region
        ? { region, available: true, message: null }
        : {
            region: null,
            available: false,
            message:
              "TikTok doesn't expose region for this account without an authenticated session.",
          },
      videos: {
        items: videos,
        available: videos.length > 0,
        // Measured, not guessed: TikTok answers the video-list endpoint with
        // HTTP 200 and a zero-byte body for every account tested from here,
        // so its own grid doesn't render either. Blaming the account would be
        // misleading — the profile's video count is still accurate.
        message:
          videos.length > 0
            ? null
            : "TikTok returns an empty video list to this server, so the grid can't be read. The video count on the profile above is still accurate.",
      },
      reposts: {
        items: reposts,
        available: reposts.length > 0,
        message: reposts.length === 0 ? "No public reposts found." : null,
      },
      highlights: {
        items: highlights,
        available: highlights.length > 0,
        message:
          highlights.length > 0
            ? null
            : "No highlights or playlists found — TikTok may not serve them to a logged-out session.",
      },
      stories: {
        items: stories,
        available: stories.length > 0,
        message:
          stories.length > 0
            ? null
            : "No active stories, or unavailable without a logged-in session.",
      },
    };
  });
}

/** Cached bundle for a username, collecting it first if needed. Whichever
 *  button is clicked first pays for the visit; the rest are free. */
async function getBundle(env: Env, username: string): Promise<LookupBundle> {
  const cached = await readBundle(username);
  if (cached) return cached;

  const bundle = await collectAll(env, username);
  await writeBundle(username, bundle);
  return bundle;
}

export async function getRegion(env: Env, username: string): Promise<RegionResult> {
  return (await getBundle(env, username)).region;
}

interface RawPost {
  id: string;
  desc: string;
  createTime?: number;
  video?: { cover?: string; dynamicCover?: string };
  author?: { uniqueId?: string };
  stats?: { playCount?: number };
}

/** One post, shaped for the frontend. Used by both Videos and Reposts. */
export interface MediaItem {
  id: string;
  desc: string;
  cover: string;
  url: string;
  /** Whose video it is — differs from the looked-up account on a repost. */
  author: string;
  playCount: number | null;
  createTime: number | null;
}

export interface MediaResult {
  items: MediaItem[];
  available: boolean;
  message: string | null;
}

function itemsFromBodies(bodies: unknown[]): RawPost[] {
  const items: RawPost[] = [];
  for (const body of bodies) {
    const list = (body as { itemList?: RawPost[] })?.itemList;
    if (Array.isArray(list)) items.push(...list);
  }
  return items;
}

function toMediaItems(raw: RawPost[]): MediaItem[] {
  const seen = new Set<string>();
  const items: MediaItem[] = [];
  for (const item of raw) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push({
      id: item.id,
      desc: item.desc ?? "",
      cover: item.video?.dynamicCover ?? item.video?.cover ?? "",
      url: `https://www.tiktok.com/@${item.author?.uniqueId ?? ""}/video/${item.id}`,
      author: item.author?.uniqueId ?? "",
      playCount: item.stats?.playCount ?? null,
      createTime: item.createTime ?? null,
    });
  }
  return items;
}

/** Videos the account posted itself — the default profile grid, which TikTok
 *  loads client-side via its own signed call the moment the page hydrates. */
export async function getVideos(env: Env, username: string): Promise<MediaResult> {
  return (await getBundle(env, username)).videos;
}

export async function getReposts(env: Env, username: string): Promise<MediaResult> {
  return (await getBundle(env, username)).reposts;
}

export interface HighlightItem {
  id: string;
  name: string;
  cover: string;
  count: number | null;
}

export interface HighlightsResult {
  items: HighlightItem[];
  available: boolean;
  message: string | null;
}

interface RawPlaylist {
  id?: string;
  mixId?: string;
  name?: string;
  mixName?: string;
  cover?: string;
  coverUrl?: string;
  itemCount?: number;
  videoCount?: number;
}

/** Pulls playlist/collection objects out of whatever shape TikTok wraps them
 *  in — the key name has moved around between versions, so match on content
 *  rather than trusting one path. */
function playlistsFromBodies(bodies: unknown[]): RawPlaylist[] {
  const found: RawPlaylist[] = [];
  const visit = (node: unknown, depth: number) => {
    if (depth > 4 || !node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const entry of node) visit(entry, depth + 1);
      return;
    }
    const obj = node as RawPlaylist & Record<string, unknown>;
    const id = obj.mixId ?? obj.id;
    const name = obj.mixName ?? obj.name;
    if (typeof id === "string" && typeof name === "string" && name.length > 0) {
      found.push(obj);
      return;
    }
    for (const value of Object.values(obj)) visit(value, depth + 1);
  };
  for (const body of bodies) visit(body, 0);
  return found;
}

/** "Highlights" covers two different things TikTok pins above the video grid:
 *  the newer Highlights row (the circles, story-highlight style) and the older
 *  playlists / collections. They're separate features — an account can have
 *  highlights with `profileTab.showPlayListTab` false — so we watch for both
 *  kinds of response and never bail early on the playlist flag alone.
 *
 *  Neither appears in the server-rendered page at all, so this route is the
 *  least certain of the set and degrades to an honest "none found". */
export async function getHighlights(
  env: Env,
  username: string,
): Promise<HighlightsResult> {
  return (await getBundle(env, username)).highlights;
}

/** One data-bearing response, as actually received. `bytes` and `keys` are
 *  what separate "TikTok served nothing" from "the shape changed" from "the
 *  body could not be read" — three problems with three different fixes that
 *  all look identical from the outside. */
export interface ResponseSample {
  url: string;
  status: number;
  bytes: number;
  keys: string[];
  itemCount: number | null;
}

export interface DebugResult {
  title: string;
  looksBlocked: boolean;
  bodyStart: string;
  apiRequests: string[];
  samples: ResponseSample[];
  videoLinksInDom: number;
  hydratedItemListLength: number | null;
  hydratedRegion: string | null;
}

/** Reports what TikTok actually serves the headless browser: the page title,
 *  whether it looks like a bot wall, which API calls fired, and whether the
 *  grid rendered. The other routes can only say "found nothing" — this says
 *  why, which is the difference between fixing it and guessing at it. */
export async function getDebug(env: Env, username: string): Promise<DebugResult> {
  return withPage(env, async (page) => {
    const apiRequests: string[] = [];
    const samples: ResponseSample[] = [];
    const reads: Promise<void>[] = [];

    // A response body can only be read once, so this route uses ONE reader
    // and derives both the item counts and the raw samples from it. Reading
    // the same response twice would starve whichever reader lost the race.
    const interesting =
      /item_list|\/api\/user\/playlist|collection_list|\/api\/user\/detail/;

    page.on("response", (res) => {
      const url = res.url();
      if (url.includes("/api/")) {
        apiRequests.push(`${res.status()} ${url.split("?")[0]}`);
      }
      if (!interesting.test(url)) return;

      reads.push(
        res
          .text()
          .then((text) => {
            let keys: string[] = [];
            let itemCount: number | null = null;
            try {
              const parsed: unknown = JSON.parse(text);
              if (parsed && typeof parsed === "object") {
                keys = Object.keys(parsed as Record<string, unknown>).slice(0, 12);
                const list = (parsed as { itemList?: unknown[] }).itemList;
                itemCount = Array.isArray(list) ? list.length : null;
              }
            } catch {
              keys = text.length === 0 ? ["<empty body>"] : ["<not json>"];
            }
            samples.push({
              url: url.split("?")[0],
              status: res.status(),
              bytes: text.length,
              keys,
              itemCount,
            });
          })
          .catch((err: unknown) => {
            samples.push({
              url: url.split("?")[0],
              status: res.status(),
              bytes: -1,
              keys: [`<read failed: ${err instanceof Error ? err.message : "unknown"}>`],
              itemCount: null,
            });
          }),
      );
    });

    await page.goto(profileUrl(username), { waitUntil: "domcontentloaded" });
    // Give the client-side grid fetch a chance to fire after hydration.
    await new Promise((resolve) => setTimeout(resolve, 8_000));
    await Promise.all(reads);

    const body = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
    const videoLinksInDom = await page
      .evaluate(() => document.querySelectorAll('a[href*="/video/"]').length)
      .catch(() => -1);
    const hydrated = await page
      .evaluate(() => {
        const w = window as unknown as {
          __UNIVERSAL_DATA_FOR_REHYDRATION__?: {
            __DEFAULT_SCOPE__?: {
              "webapp.user-detail"?: {
                userInfo?: { itemList?: unknown[]; user?: { region?: string } };
              };
            };
          };
        };
        const info =
          w.__UNIVERSAL_DATA_FOR_REHYDRATION__?.__DEFAULT_SCOPE__?.[
            "webapp.user-detail"
          ]?.userInfo;
        return {
          itemListLength: info?.itemList ? info.itemList.length : null,
          region: info?.user?.region ?? null,
        };
      })
      .catch(() => ({ itemListLength: null, region: null }));

    return {
      title: await page.title().catch(() => ""),
      looksBlocked: /verify|captcha|robot|unusual traffic/i.test(body.slice(0, 2000)),
      bodyStart: body.slice(0, 300).replace(/\s+/g, " "),
      apiRequests: [...new Set(apiRequests)],
      samples,
      videoLinksInDom,
      hydratedItemListLength: hydrated.itemListLength,
      hydratedRegion: hydrated.region,
    };
  });
}

export interface StoryItem {
  id: string;
  cover: string;
}

export interface StoriesResult {
  items: StoryItem[];
  available: boolean;
  message: string | null;
}

export async function getStories(env: Env, username: string): Promise<StoriesResult> {
  return (await getBundle(env, username)).stories;
}
