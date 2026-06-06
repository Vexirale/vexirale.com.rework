/* Turns a raw Lanyard payload into a single, presentation-ready activity,
 * applying the priority: Spotify > Watching > Playing. */

import type { Activity, ActivityEmoji, LanyardData } from "./lanyard";

export interface CustomStatus {
  text?: string;
  emoji?: ActivityEmoji;
}

/** Extract the Discord custom status message (activity type 4): its text
 *  (`state`) and optional emoji. Returns null when none is set. */
export function getCustomStatus(data: LanyardData | null): CustomStatus | null {
  if (!data) return null;
  const custom = data.activities?.find((a) => a.type === 4);
  if (!custom) return null;
  const text = custom.state?.trim();
  if (!text && !custom.emoji) return null;
  return { text: text || undefined, emoji: custom.emoji };
}

export type FeaturedActivity =
  | {
      kind: "spotify";
      title: string;
      subtitle: string; // artist
      image: string | null;
      start: number;
      end: number;
      trackId: string | null;
      href: string | null;
    }
  | {
      kind: "watching";
      title: string;
      details?: string;
      state?: string;
      image: string | null;
      largeText?: string;
      href: string | null;
    }
  | {
      kind: "playing";
      title: string;
      details?: string;
      state?: string;
      image: string | null;
      largeText?: string;
      start?: number;
      href: null;
    };

const ACTIVITY_TYPE = {
  PLAYING: 0,
  STREAMING: 1,
  WATCHING: 3,
} as const;

/** Resolve a Discord activity asset reference to a usable image URL.
 *
 * Asset references arrive in a few shapes:
 *   • "mp:external/.../https/host/path"  → media proxy, maps to media.discordapp.net
 *   • "mp:.../path"                        → media.discordapp.net/path
 *   • "spotify:..."                        → handled separately via spotify object
 *   • "<asset_id>" (snowflake)             → app asset CDN for the application_id
 *   • already-absolute http(s) URL         → used as-is
 */
export function resolveAssetImage(
  ref: string | undefined,
  applicationId: string | undefined,
): string | null {
  if (!ref) return null;

  if (ref.startsWith("http://") || ref.startsWith("https://")) return ref;

  if (ref.startsWith("mp:")) {
    const path = ref.slice(3); // strip "mp:"
    // Media-proxy "external" refs embed the real URL after ".../https/".
    const ext = path.match(/^external\/[^/]+\/(https?)\/(.+)$/);
    if (ext) return `${ext[1]}://${ext[2]}`;
    return `https://media.discordapp.net/${path}`;
  }

  if (ref.startsWith("spotify:")) {
    const id = ref.split(":").pop();
    return id ? `https://i.scdn.co/image/${id}` : null;
  }

  // Plain application asset id.
  if (applicationId) {
    return `https://cdn.discordapp.com/app-assets/${applicationId}/${ref}.png`;
  }

  return null;
}

function streamHref(activity: Activity): string | null {
  if (activity.type === ACTIVITY_TYPE.STREAMING && activity.url) {
    return activity.url;
  }
  return null;
}

/** Pick the single highest-priority activity to feature, or null if idle. */
export function selectFeaturedActivity(
  data: LanyardData | null,
): FeaturedActivity | null {
  if (!data) return null;

  // 1. Spotify.
  if (data.listening_to_spotify && data.spotify) {
    const s = data.spotify;
    return {
      kind: "spotify",
      title: s.song,
      subtitle: s.artist,
      image: s.album_art_url,
      start: s.timestamps?.start ?? 0,
      end: s.timestamps?.end ?? 0,
      trackId: s.track_id,
      href: s.track_id
        ? `https://open.spotify.com/track/${s.track_id}`
        : null,
    };
  }

  const activities = data.activities ?? [];

  // 2. Watching (type 3).
  const watching = activities.find((a) => a.type === ACTIVITY_TYPE.WATCHING);
  if (watching) {
    return {
      kind: "watching",
      title: watching.name,
      details: watching.details,
      state: watching.state,
      image: resolveAssetImage(
        watching.assets?.large_image,
        watching.application_id,
      ),
      largeText: watching.assets?.large_text,
      href: streamHref(watching),
    };
  }

  // 3. Playing (type 0).
  const playing = activities.find((a) => a.type === ACTIVITY_TYPE.PLAYING);
  if (playing) {
    return {
      kind: "playing",
      title: playing.name,
      details: playing.details,
      state: playing.state,
      image: resolveAssetImage(
        playing.assets?.large_image,
        playing.application_id,
      ),
      largeText: playing.assets?.large_text,
      start: playing.timestamps?.start,
      href: null,
    };
  }

  // 4. Idle.
  return null;
}
