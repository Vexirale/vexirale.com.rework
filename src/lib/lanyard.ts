/* Lanyard API types + a manual WebSocket client.
 * Reference: https://github.com/phineas/lanyard
 *
 * We connect over the WebSocket (wss://api.lanyard.rest/socket) rather than the
 * REST endpoint so status and activity update live, without a refresh. */

export interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  /** Avatar hash. Prefixed with "a_" when animated (use .gif). */
  avatar: string | null;
  discriminator: string;
}

export interface ActivityTimestamps {
  start?: number;
  end?: number;
}

export interface ActivityAssets {
  large_image?: string;
  large_text?: string;
  small_image?: string;
  small_text?: string;
}

/** Discord activity object. `type`:
 *  0 Playing · 1 Streaming · 2 Listening · 3 Watching · 4 Custom · 5 Competing */
export interface Activity {
  id: string;
  name: string;
  type: number;
  state?: string;
  details?: string;
  application_id?: string;
  timestamps?: ActivityTimestamps;
  assets?: ActivityAssets;
  /** Present on streaming activities (type 1). */
  url?: string;
}

export interface Spotify {
  track_id: string | null;
  timestamps: ActivityTimestamps;
  song: string;
  artist: string;
  album_art_url: string | null;
  album: string;
}

export type DiscordStatus = "online" | "idle" | "dnd" | "offline";

export interface LanyardData {
  discord_user: DiscordUser;
  discord_status: DiscordStatus;
  activities: Activity[];
  listening_to_spotify: boolean;
  spotify: Spotify | null;
  active_on_discord_web: boolean;
  active_on_discord_desktop: boolean;
  active_on_discord_mobile: boolean;
}

/* ---- WebSocket protocol ---- */

const SOCKET_URL = "wss://api.lanyard.rest/socket";

enum Opcode {
  Event = 0,
  Hello = 1,
  Initialize = 2,
  Heartbeat = 3,
}

interface SocketMessage {
  op: Opcode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  d?: any;
  t?: string;
}

export interface LanyardClientHandlers {
  onData: (data: LanyardData) => void;
  onConnectedChange?: (connected: boolean) => void;
}

/** Manual Lanyard WebSocket client with heartbeat + auto-reconnect. */
export function createLanyardClient(
  userId: string,
  handlers: LanyardClientHandlers,
) {
  let ws: WebSocket | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let reconnect: ReturnType<typeof setTimeout> | null = null;
  let attempts = 0;
  let closed = false;

  const clearTimers = () => {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
    if (reconnect) {
      clearTimeout(reconnect);
      reconnect = null;
    }
  };

  const scheduleReconnect = () => {
    if (closed) return;
    handlers.onConnectedChange?.(false);
    // Exponential backoff capped at 10s.
    const delay = Math.min(1000 * 2 ** attempts, 10000);
    attempts += 1;
    reconnect = setTimeout(connect, delay);
  };

  function connect() {
    clearTimers();
    try {
      ws = new WebSocket(SOCKET_URL);
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onmessage = (event) => {
      let msg: SocketMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.op === Opcode.Hello) {
        // Begin heartbeating on the interval Lanyard hands us.
        const interval: number = msg.d?.heartbeat_interval ?? 30000;
        ws?.send(
          JSON.stringify({
            op: Opcode.Initialize,
            d: { subscribe_to_id: userId },
          }),
        );
        heartbeat = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ op: Opcode.Heartbeat }));
          }
        }, interval);
      } else if (msg.op === Opcode.Event) {
        // INIT_STATE delivers the full presence; PRESENCE_UPDATE delivers diffs,
        // both shaped as the same LanyardData object for a single subscription.
        if (msg.t === "INIT_STATE" || msg.t === "PRESENCE_UPDATE") {
          attempts = 0;
          handlers.onConnectedChange?.(true);
          handlers.onData(msg.d as LanyardData);
        }
      }
    };

    ws.onclose = () => {
      clearTimers();
      scheduleReconnect();
    };

    ws.onerror = () => {
      // Let onclose drive the reconnect.
      ws?.close();
    };
  }

  connect();

  return {
    close() {
      closed = true;
      clearTimers();
      ws?.close();
      ws = null;
    },
  };
}
