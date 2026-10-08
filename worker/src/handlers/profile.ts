import { fetchUserDetail, TikTokLookupError } from "../tiktokPage";

export interface ProfileResponse {
  uniqueId: string;
  nickname: string;
  avatar: string;
  signature: string;
  verified: boolean;
  privateAccount: boolean;
  userId: string;
  secUid: string;
  createTime: number | null;
  usernameModifiedTime: number | null;
  nicknameModifiedTime: number | null;
  stats: {
    followers: number;
    following: number;
    hearts: number;
    videos: number;
    friends: number;
  };
}

/** TikTok ships `stats` as numbers and `statsV2` as strings, and the strings
 *  exist for a reason: `stats.heartCount` is a signed 32-bit int, so any
 *  account past ~2.1B likes wraps NEGATIVE (khaby.lame reports -1620350139
 *  against a real 2674617157). `statsV2` is also exact where `stats` rounds —
 *  162850996 followers versus a flat 162900000. Prefer it, fall back to the
 *  numeric field, and drop a negative value rather than render it. */
function pickStat(
  v2: string | undefined,
  v1: number | undefined,
  rounded?: number,
): number {
  const parsed = v2 === undefined ? NaN : Number(v2);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  if (typeof v1 === "number" && v1 >= 0) return v1;
  // Last resort: the rounded sibling (`heart`) survives the overflow.
  if (typeof rounded === "number" && rounded >= 0) return rounded;
  return 0;
}

export async function getProfile(username: string): Promise<ProfileResponse> {
  const { user, stats, statsV2 } = await fetchUserDetail(username);

  return {
    uniqueId: user.uniqueId,
    nickname: user.nickname,
    avatar: user.avatarLarger,
    signature: user.signature ?? "",
    verified: Boolean(user.verified),
    privateAccount: Boolean(user.privateAccount),
    userId: user.id,
    secUid: user.secUid,
    createTime: user.createTime || null,
    usernameModifiedTime: user.uniqueIdModifyTime || null,
    nicknameModifiedTime: user.nickNameModifyTime || null,
    stats: {
      followers: pickStat(statsV2?.followerCount, stats.followerCount),
      following: pickStat(statsV2?.followingCount, stats.followingCount),
      hearts: pickStat(statsV2?.heartCount, stats.heartCount, stats.heart),
      videos: pickStat(statsV2?.videoCount, stats.videoCount),
      friends: pickStat(statsV2?.friendCount, stats.friendCount),
    },
  };
}

export { TikTokLookupError };
