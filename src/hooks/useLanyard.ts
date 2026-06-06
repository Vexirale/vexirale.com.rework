import { useEffect, useState } from "react";
import { createLanyardClient, type LanyardData } from "../lib/lanyard";

export interface UseLanyardResult {
  data: LanyardData | null;
  /** True once the first payload has arrived. Drives the skeleton state. */
  loading: boolean;
  connected: boolean;
}

/** Subscribes to a Discord user's Lanyard presence over the WebSocket. */
export function useLanyard(userId: string): UseLanyardResult {
  const [data, setData] = useState<LanyardData | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const client = createLanyardClient(userId, {
      onData: setData,
      onConnectedChange: setConnected,
    });
    return () => client.close();
  }, [userId]);

  return { data, loading: data === null, connected };
}
