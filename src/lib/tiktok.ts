/* Client for the TikTok lookup Worker (see /worker). Every call hits a
 * separate endpoint so the /tiktok page can fetch each data type on its own
 * button instead of one big blocking request. */

export interface TikTokStats {
  followers: number;
  following: number;
  hearts: number;
  videos: number;
  friends: number;
}

export interface TikTokProfile {
  uniqueId: string;
  nickname: string;
  avatar: string;
  signature: string;
  verified: boolean;
  privateAccount: boolean;
  userId: string;
  secUid: string;
  /** Unix seconds, or null if TikTok didn't return one. */
  createTime: number | null;
  usernameModifiedTime: number | null;
  nicknameModifiedTime: number | null;
  stats: TikTokStats;
}

export interface TikTokRegion {
  region: string | null;
  available: boolean;
  message: string | null;
}

/** One post. Shared by the Videos and Reposts sections — a repost is the same
 *  shape, just authored by someone other than the account looked up. */
export interface TikTokMediaItem {
  id: string;
  desc: string;
  cover: string;
  url: string;
  author: string;
  playCount: number | null;
  createTime: number | null;
}

export interface TikTokMedia {
  items: TikTokMediaItem[];
  available: boolean;
  message: string | null;
}

/** A playlist / collection pinned to the profile. */
export interface TikTokHighlightItem {
  id: string;
  name: string;
  cover: string;
  count: number | null;
}

export interface TikTokHighlights {
  items: TikTokHighlightItem[];
  available: boolean;
  message: string | null;
}

export interface TikTokStoryItem {
  id: string;
  cover: string;
}

export interface TikTokStories {
  items: TikTokStoryItem[];
  available: boolean;
  message: string | null;
}

export class TikTokApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "TikTokApiError";
  }
}

async function request<T>(
  base: string,
  path: string,
  username: string,
  signal?: AbortSignal,
): Promise<T> {
  const url = `${base.replace(/\/$/, "")}${path}?u=${encodeURIComponent(username)}`;
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch {
    throw new TikTokApiError(
      "Couldn't reach the lookup service. It may be down or blocking requests right now.",
      0,
    );
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : null) ?? `Request failed (${res.status})`;
    throw new TikTokApiError(message, res.status);
  }
  return body as T;
}

export const fetchProfile = (base: string, username: string, signal?: AbortSignal) =>
  request<TikTokProfile>(base, "/profile", username, signal);

export const fetchRegion = (base: string, username: string, signal?: AbortSignal) =>
  request<TikTokRegion>(base, "/region", username, signal);

export const fetchVideos = (base: string, username: string, signal?: AbortSignal) =>
  request<TikTokMedia>(base, "/videos", username, signal);

export const fetchReposts = (base: string, username: string, signal?: AbortSignal) =>
  request<TikTokMedia>(base, "/reposts", username, signal);

export const fetchHighlights = (base: string, username: string, signal?: AbortSignal) =>
  request<TikTokHighlights>(base, "/highlights", username, signal);

export const fetchStories = (base: string, username: string, signal?: AbortSignal) =>
  request<TikTokStories>(base, "/stories", username, signal);

/** Strips a leading "@" and surrounding whitespace, and validates the result
 *  looks like a TikTok handle (letters, digits, underscore, period, 2-24 chars). */
export function normalizeUsername(input: string): string | null {
  const trimmed = input.trim().replace(/^@/, "");
  if (!/^[a-zA-Z0-9._]{2,24}$/.test(trimmed)) return null;
  return trimmed;
}
