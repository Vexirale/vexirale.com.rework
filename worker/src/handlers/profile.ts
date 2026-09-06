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

export async function getProfile(username: string): Promise<ProfileResponse> {
  const { user, stats } = await fetchUserDetail(username);

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
      followers: stats.followerCount ?? 0,
      following: stats.followingCount ?? 0,
      hearts: stats.heartCount ?? 0,
      videos: stats.videoCount ?? 0,
      friends: stats.friendCount ?? 0,
    },
  };
}

export { TikTokLookupError };
