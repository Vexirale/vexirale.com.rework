import { getProfile } from "./handlers/profile";
import { getRegion, getReposts, getStories, type Env } from "./handlers/browser";
import { TikTokLookupError } from "./tiktokPage";

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

const USERNAME_RE = /^[a-zA-Z0-9._]{2,24}$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN;
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }
    if (request.method !== "GET") {
      return json({ error: "Method not allowed." }, 405, origin);
    }

    const username = url.searchParams.get("u")?.trim().replace(/^@/, "") ?? "";
    if (!USERNAME_RE.test(username)) {
      return json({ error: "Invalid or missing username." }, 400, origin);
    }

    try {
      switch (url.pathname) {
        case "/profile":
          return json(await getProfile(username), 200, origin);
        case "/region":
          return json(await getRegion(env, username), 200, origin);
        case "/reposts":
          return json(await getReposts(env, username), 200, origin);
        case "/stories":
          return json(await getStories(env, username), 200, origin);
        default:
          return json({ error: "Not found." }, 404, origin);
      }
    } catch (err) {
      if (err instanceof TikTokLookupError) {
        return json({ error: err.message }, err.status, origin);
      }
      console.error(err);
      return json({ error: "Unexpected error looking that up." }, 500, origin);
    }
  },
};
