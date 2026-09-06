/* Shared helpers for reading TikTok's public profile page. TikTok
 * server-renders a JSON blob into the page (`__UNIVERSAL_DATA_FOR_REHYDRATION__`)
 * that the client hydrates from — we read the same blob instead of TikTok's
 * internal mobile API, so no request signing is needed for this part. */

export const TIKTOK_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export class TikTokLookupError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "TikTokLookupError";
  }
}

export interface RawTikTokUser {
  id: string;
  secUid: string;
  uniqueId: string;
  nickname: string;
  avatarLarger: string;
  signature: string;
  verified: boolean;
  privateAccount: boolean;
  createTime: number;
  nickNameModifyTime: number;
  uniqueIdModifyTime: number;
  region?: string | null;
}

export interface RawTikTokStats {
  followerCount: number;
  followingCount: number;
  heartCount: number;
  videoCount: number;
  friendCount: number;
}

export interface RawUserDetail {
  user: RawTikTokUser;
  stats: RawTikTokStats;
  itemList?: unknown[];
  statusCode?: number;
}

/** Fetches https://www.tiktok.com/@username and pulls the embedded JSON
 *  state out of it. Throws TikTokLookupError with a message safe to show
 *  to an end user for "not found" / "blocked" cases. */
export async function fetchUserDetail(username: string): Promise<RawUserDetail> {
  const res = await fetch(`https://www.tiktok.com/@${encodeURIComponent(username)}?lang=en`, {
    headers: {
      "User-Agent": TIKTOK_UA,
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (res.status === 404) {
    throw new TikTokLookupError("No TikTok account with that username.", 404);
  }
  if (!res.ok) {
    throw new TikTokLookupError(
      `TikTok returned an unexpected status (${res.status}). Try again shortly.`,
      502,
    );
  }

  const html = await res.text();
  const match = html.match(
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!match) {
    throw new TikTokLookupError(
      "TikTok blocked this request (likely a bot check). Try again in a bit.",
      503,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    throw new TikTokLookupError("Couldn't parse TikTok's response.", 502);
  }

  const scope = (parsed as { __DEFAULT_SCOPE__?: Record<string, unknown> })
    .__DEFAULT_SCOPE__;
  const userDetail = scope?.["webapp.user-detail"] as
    | { userInfo?: RawUserDetail; statusCode?: number }
    | undefined;

  if (!userDetail?.userInfo?.user) {
    throw new TikTokLookupError("No TikTok account with that username.", 404);
  }

  return userDetail.userInfo;
}
