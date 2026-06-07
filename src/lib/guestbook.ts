import { siteConfig } from "../config";

/* Guestbook storage via the Supabase REST API (PostgREST). No server of our
 * own: reads + inserts use the public anon key (restricted by row-level
 * security); deletes + likes use the owner's service_role key, which lives only
 * in the owner's browser localStorage and is never committed. */

const gb = siteConfig.guestbook;
// Use just the project origin: tolerate a trailing slash and a pasted
// "/rest/v1" suffix (which would otherwise double up to /rest/v1/rest/v1 → 404).
const BASE_URL = gb.supabaseUrl
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/rest\/v1$/, "");

export interface GuestEntry {
  id: number | string;
  name: string;
  message: string;
  liked?: boolean;
  created_at?: string;
}

export function guestbookConfigured(): boolean {
  return Boolean(gb.enabled && BASE_URL && gb.supabaseAnonKey);
}

function endpoint(query = ""): string {
  return `${BASE_URL}/rest/v1/${gb.table}${query}`;
}

function headers(authKey: string): Record<string, string> {
  return {
    apikey: gb.supabaseAnonKey,
    Authorization: `Bearer ${authKey}`,
    "Content-Type": "application/json",
  };
}

/** Surface the real PostgREST error so setup problems are diagnosable. */
async function fail(res: Response, action: string): Promise<never> {
  let detail = "";
  try {
    const body = await res.json();
    detail = body.message || body.hint || body.error || "";
  } catch {
    /* ignore */
  }
  throw new Error(`${action} failed (${res.status})${detail ? `: ${detail}` : ""}`);
}

/** Most recent entries first. */
export async function fetchEntries(limit = 200): Promise<GuestEntry[]> {
  // Explicit columns only (never expose the server-side ip_hash used for the
  // per-IP rate limit).
  const res = await fetch(
    endpoint(
      `?select=id,name,message,liked,created_at&order=created_at.desc&limit=${limit}`,
    ),
    { headers: headers(gb.supabaseAnonKey) },
  );
  if (!res.ok) return fail(res, "Load");
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
  if (!res.ok) return fail(res, "Post");
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
  if (!res.ok) return fail(res, "Delete");
}

/** Toggle the owner "like" on an entry — requires the service_role key. */
export async function setLiked(
  id: GuestEntry["id"],
  liked: boolean,
  adminKey: string,
): Promise<void> {
  const res = await fetch(endpoint(`?id=eq.${encodeURIComponent(String(id))}`), {
    method: "PATCH",
    headers: { ...headers(adminKey), Prefer: "return=minimal" },
    body: JSON.stringify({ liked }),
  });
  if (!res.ok) return fail(res, "Like");
}
