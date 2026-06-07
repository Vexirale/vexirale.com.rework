import { siteConfig } from "../config";

/* Guestbook storage via the Supabase REST API (PostgREST). No server of our
 * own: reads + inserts use the public anon key (restricted by row-level
 * security); deletes use the owner's service_role key, which lives only in the
 * owner's browser localStorage and is never committed. */

const gb = siteConfig.guestbook;

export interface GuestEntry {
  id: number | string;
  name: string;
  message: string;
  created_at?: string;
}

export function guestbookConfigured(): boolean {
  return Boolean(gb.enabled && gb.supabaseUrl && gb.supabaseAnonKey);
}

function endpoint(query = ""): string {
  return `${gb.supabaseUrl}/rest/v1/${gb.table}${query}`;
}

function headers(authKey: string): Record<string, string> {
  return {
    apikey: gb.supabaseAnonKey,
    Authorization: `Bearer ${authKey}`,
    "Content-Type": "application/json",
  };
}

/** Most recent entries first. */
export async function fetchEntries(limit = 200): Promise<GuestEntry[]> {
  const res = await fetch(
    endpoint(`?select=*&order=created_at.desc&limit=${limit}`),
    { headers: headers(gb.supabaseAnonKey) },
  );
  if (!res.ok) throw new Error(`fetch failed (${res.status})`);
  return res.json();
}

export async function addEntry(
  name: string,
  message: string,
): Promise<GuestEntry> {
  const res = await fetch(endpoint(), {
    method: "POST",
    headers: { ...headers(gb.supabaseAnonKey), Prefer: "return=representation" },
    body: JSON.stringify({ name, message }),
  });
  if (!res.ok) throw new Error(`post failed (${res.status})`);
  const rows = (await res.json()) as GuestEntry[];
  return rows[0];
}

/** Delete an entry — requires the owner's service_role key. */
export async function deleteEntry(
  id: GuestEntry["id"],
  adminKey: string,
): Promise<void> {
  const res = await fetch(endpoint(`?id=eq.${encodeURIComponent(String(id))}`), {
    method: "DELETE",
    headers: headers(adminKey),
  });
  if (!res.ok) throw new Error(`delete failed (${res.status})`);
}
