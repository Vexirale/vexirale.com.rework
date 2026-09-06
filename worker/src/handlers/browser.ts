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
 *  request to reuse. The free plan allows only one NEW browser acquisition
 *  every 20 seconds, so reusing a warm one is the difference between the
 *  buttons working back-to-back and failing instantly. */
const KEEP_ALIVE_MS = 600_000;

/** TikTok's own signed call for a profile's post grid. Both the Videos tab
 *  and the Reposts tab load through it. */
const POST_LIST_API = "/api/post/item_list";

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
  } catch {
    const limits = await puppeteer.limits(env.BROWSER).catch(() => null);
    const wait = limits?.timeUntilNextAllowedBrowserAcquisition;
    throw new TikTokLookupError(
      wait
        ? `All browsers are busy — try again in about ${Math.ceil(wait / 1000)}s.`
        : "Couldn't get a browser right now. Try again in a moment.",
      503,
    );
  }
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
  const listener = async (res: import("@cloudflare/puppeteer").HTTPResponse) => {
    if (!needles.some((needle) => res.url().includes(needle))) return;
    try {
      bodies.push(await res.json());
    } catch {
      // Not JSON (or body already consumed) — ignore.
    }
  };
  page.on("response", listener);
  return {
    bodies,
    stop: () => page.off("response", listener),
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

export async function getRegion(env: Env, username: string): Promise<RegionResult> {
  return withPage(env, async (page) => {
    const { bodies, stop } = collectApiResponses(page, "/api/user/detail");
    await page.goto(profileUrl(username), { waitUntil: "networkidle0" });
    stop();

    // Try the network-captured responses first (these come from TikTok's own
    // signed client-side fetch, which sometimes carries `region` even when
    // the server-rendered HTML doesn't).
    for (const body of bodies) {
      const region = (body as { userInfo?: { user?: { region?: string } } })
        ?.userInfo?.user?.region;
      if (region) return { region, available: true, message: null };
    }

    // Fall back to whatever hydrated into the page's own state.
    const region = await page
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

    if (region) return { region, available: true, message: null };
    return {
      region: null,
      available: false,
      message: "TikTok doesn't expose region for this account without an authenticated session.",
    };
  });
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
  return withPage(env, async (page) => {
    const { bodies, stop } = collectApiResponses(page, POST_LIST_API);
    await page.goto(profileUrl(username), { waitUntil: "networkidle0" });

    // The grid is lazy — give the first signed call a moment if it hasn't
    // landed by the time navigation settles.
    if (bodies.length === 0) {
      await page
        .waitForResponse((res) => res.url().includes(POST_LIST_API), {
          timeout: 10_000,
        })
        .catch(() => null);
    }
    stop();

    const items = toMediaItems(
      itemsFromBodies(bodies).filter(
        (item) => (item.author?.uniqueId ?? "").toLowerCase() === username.toLowerCase(),
      ),
    );

    if (items.length === 0) {
      return {
        items: [],
        available: false,
        message: "No public videos found — the account may be private, empty, or TikTok didn't serve the grid.",
      };
    }
    return { items, available: true, message: null };
  });
}

export async function getReposts(env: Env, username: string): Promise<MediaResult> {
  return withPage(env, async (page) => {
    const { bodies, stop } = collectApiResponses(page, POST_LIST_API);
    await page.goto(profileUrl(username), { waitUntil: "networkidle0" });

    // The "Reposts" tab only exists in the DOM for accounts with public
    // reposts. TikTok's own client-side router loads them on click.
    const clicked = await page
      .evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('[role="tab"], a, div'));
        const repostTab = tabs.find((el) =>
          (el.textContent ?? "").trim().toLowerCase() === "reposts",
        ) as HTMLElement | undefined;
        repostTab?.click();
        return Boolean(repostTab);
      })
      .catch(() => false);

    if (!clicked) {
      stop();
      return {
        items: [],
        available: false,
        message: "This account has no visible Reposts tab.",
      };
    }

    await page
      .waitForResponse((res) => res.url().includes(POST_LIST_API), {
        timeout: 10_000,
      })
      .catch(() => null);
    stop();

    // Anything in the grid authored by someone else is a repost; the account's
    // own videos come from the same endpoint on first load.
    const items = toMediaItems(
      itemsFromBodies(bodies).filter(
        (item) =>
          item.author?.uniqueId &&
          item.author.uniqueId.toLowerCase() !== username.toLowerCase(),
      ),
    );

    return {
      items,
      available: true,
      message: items.length === 0 ? "No reposts found." : null,
    };
  });
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
  return withPage(env, async (page) => {
    const { bodies, stop } = collectApiResponses(page, ["playlist", "highlight"]);
    await page.goto(profileUrl(username), { waitUntil: "networkidle0" });

    if (bodies.length === 0) {
      await page
        .waitForResponse(
          (res) => res.url().includes("playlist") || res.url().includes("highlight"),
          { timeout: 8_000 },
        )
        .catch(() => null);
    }
    stop();

    const items: HighlightItem[] = playlistsFromBodies(bodies).map((p) => ({
      id: (p.mixId ?? p.id) as string,
      name: (p.mixName ?? p.name) as string,
      cover: p.coverUrl ?? p.cover ?? "",
      count: p.itemCount ?? p.videoCount ?? null,
    }));

    if (items.length === 0) {
      return {
        items: [],
        available: false,
        message: "No highlights or playlists found — TikTok may not serve them to a logged-out session.",
      };
    }
    return { items, available: true, message: null };
  });
}

export interface DebugResult {
  title: string;
  looksBlocked: boolean;
  bodyStart: string;
  apiRequests: string[];
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
    page.on("response", (res) => {
      const url = res.url();
      if (url.includes("/api/")) {
        apiRequests.push(`${res.status()} ${url.split("?")[0]}`);
      }
    });

    await page.goto(profileUrl(username), { waitUntil: "domcontentloaded" });
    // Give the client-side grid fetch a chance to fire after hydration.
    await new Promise((resolve) => setTimeout(resolve, 8_000));

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
  return withPage(env, async (page) => {
    const { bodies, stop } = collectApiResponses(page, "story");
    await page.goto(profileUrl(username), { waitUntil: "networkidle0" });
    stop();

    const raw = itemsFromBodies(bodies);

    if (raw.length === 0) {
      return {
        items: [],
        available: false,
        message: "No active stories, or unavailable without a logged-in session.",
      };
    }

    return {
      items: raw.map((s) => ({ id: s.id, cover: s.video?.cover ?? "" })),
      available: true,
      message: null,
    };
  });
}
