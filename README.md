# vexirale.com

A glassmorphism single-page portfolio: a black landing screen that animates
away to reveal frosted-glass panels over a slow animated background. The hero
"presence" panel shows a live Discord avatar, status, a rotating bio, social
links, and a live activity card (Spotify / watching / playing) driven by
[Lanyard](https://github.com/phineas/lanyard) over WebSocket. Each project is
its own glass panel.

Built with **React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion +
lucide-react**. Fully client-side and static — no backend.

## Run locally

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build locally
```

## Editing content

**Everything personal lives in one file: [`src/config.ts`](src/config.ts).**
Nothing personal is hardcoded in the components.

- **Name / tagline / accent color** — top of `siteConfig`.
- **Discord ID** — `discordUserId`. Drives the live avatar, status, and
  activity. (Your account must be in the
  [Lanyard Discord server](https://discord.gg/lanyard) for presence to work.)
- **Bio** — edit the strings in `bioLines`. Add or remove lines freely; the
  random rotation adapts automatically.
- **Projects** — push an object to `projects`. Each becomes its own panel.
- **Socials** — push an object to `socials`. `icon` is the name of any
  [lucide-react icon](https://lucide.dev) (e.g. `"Github"`, `"Mail"`).

The avatar, status, and live activity are automatic from Lanyard and need no
config beyond the Discord ID.

### Images

- **Project screenshots** → drop into `public/projects/` and set the project's
  `image` to e.g. `"/projects/foo.png"`. Omit `image` for a clean generated
  placeholder.
- **Share image (Open Graph)** → replace `public/og-image.png` (1200×630). It's
  referenced absolutely as `https://vexirale.com/og-image.png`. Edit the
  preview title/description in `index.html`.
- **Favicon** → replace `public/favicon.svg`.

### Tuning the background

Particle count and opacity are constants at the top of
[`src/components/Particles.tsx`](src/components/Particles.tsx) — lower them (or
set `COUNT` to `0`) if the background ever feels busy. Blob colors are pulled
from the current song's album art (neutral white/grey when nothing is playing);
the neutral palette + motion live in
[`src/components/Background.tsx`](src/components/Background.tsx).

### Guestbook (Supabase — one-time setup)

The guestbook needs a tiny free backend. Supabase gives one with no server of
your own:

1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run:

   ```sql
   create table guestbook (
     id bigint generated always as identity primary key,
     name text not null check (char_length(name) between 1 and 32),
     message text not null check (char_length(message) between 1 and 280),
     liked boolean not null default false,
     created_at timestamptz not null default now()
   );
   alter table guestbook enable row level security;
   -- anyone may read and sign…
   create policy "read"   on guestbook for select using (true);
   create policy "sign"   on guestbook for insert with check (true);
   -- …but only the service_role key (you) can delete / like
   -- (no update or delete policy = denied for the public anon key;
   --  the service_role key bypasses RLS).
   ```

3. In **Project Settings → API**, copy the **Project URL** (the bare
   `https://xxxx.supabase.co` — no `/rest/v1`) and the **anon** public key into
   `guestbook` in [`src/config.ts`](src/config.ts). The anon key is safe to
   commit — row-level security limits it to read/insert.
4. **Owner controls (delete / like).** There's no on-page lock — enable owner
   mode from the browser **console** on the live site:

   ```js
   localStorage.setItem("vx-gb-admin", "YOUR_SUPABASE_SERVICE_ROLE_KEY");
   location.reload();
   ```

   (service_role key is under Project Settings → API). It's stored only in your
   browser, never in the repo. Delete (🗑) and like (♥ → "liked by you") buttons
   then appear on each entry. To exit: `localStorage.removeItem("vx-gb-admin")`.

   _Already made the table before the like feature?_ Add the column:

   ```sql
   alter table guestbook add column if not exists liked boolean not null default false;
   ```

5. **Anti-spam + IP bans.** The site already blocks bots client-side (a hidden
   honeypot field, an instant-submit time trap, and a 24h-per-device cooldown).
   For a real **per-IP** 24h limit **and an IP ban list** enforced server-side,
   run this once in the SQL editor (stores only a salted hash of the IP for the
   rate limit; ban entries are owner-only):

   ```sql
   create extension if not exists pgcrypto with schema extensions;
   alter table guestbook add column if not exists ip_hash text;
   -- never expose the hash to the public anon role:
   revoke select (ip_hash) on guestbook from anon;

   -- IP ban list (only the service_role key / you can read or edit it):
   create table if not exists banned_ips (
     ip text primary key,
     reason text,
     created_at timestamptz not null default now()
   );
   alter table banned_ips enable row level security;

   create or replace function guestbook_ratelimit()
   returns trigger language plpgsql security definer as $$
   declare
     client_ip text;
   begin
     client_ip := nullif(split_part(coalesce(
       current_setting('request.headers', true)::json ->> 'x-real-ip',
       current_setting('request.headers', true)::json ->> 'x-forwarded-for',
       ''), ',', 1), '');

     -- blocked IPs can't post
     if client_ip is not null
        and exists (select 1 from banned_ips b where b.ip = client_ip) then
       raise exception 'You have been banned from the guestbook.';
     end if;

     -- 1 message per IP per 24h
     new.ip_hash := encode(
       extensions.digest('vexirale-salt:' || coalesce(client_ip, ''), 'sha256'), 'hex');
     if exists (
       select 1 from guestbook
       where ip_hash = new.ip_hash and created_at > now() - interval '24 hours'
     ) then
       raise exception 'You can only sign once a day. Come back tomorrow!';
     end if;
     return new;
   end;
   $$;

   drop trigger if exists guestbook_ratelimit_trg on guestbook;
   create trigger guestbook_ratelimit_trg
     before insert on guestbook
     for each row execute function guestbook_ratelimit();
   ```

   Change `'vexirale-salt:'` to your own secret string. Exception messages are
   shown to the visitor by the form. (Without this, the 24h limit is per-device
   only and can be bypassed by clearing storage.)

   **To ban an IP** (find it in the Supabase request logs, e.g. `x_real_ip`):

   ```sql
   insert into banned_ips (ip, reason) values ('1.2.3.4', 'why')
     on conflict (ip) do nothing;
   ```

   To unban: `delete from banned_ips where ip = '1.2.3.4';`

Leave `supabaseUrl` / `supabaseAnonKey` blank to keep the guestbook hidden
("coming soon") until you're ready.

## TikTok Finder (`vexirale.com/tiktok`)

A TikTok profile lookup tool in the same glass style as the rest of the site.
Give it a username and it fetches, on separate buttons:

- **Profile** — nickname, avatar, bio, verified/private flags, follower/
  following/heart/video counts, account creation date, and username/nickname
  change history. Free and instant — it just reads the JSON TikTok embeds in
  the public profile page HTML, no auth needed.
- **Region, Reposts, Stories** — TikTok gates all three behind a signed
  request (`X-Bogus`) that only its own obfuscated client JS can produce.
  Rather than reimplementing that signature (it's fragile and goes stale
  every time TikTok changes it), the Worker drives a real headless Chromium
  via [Cloudflare Browser Rendering](https://developers.cloudflare.com/browser-rendering/)
  and lets TikTok's own page sign its own requests. This is slower (a few
  seconds, real navigation) and genuinely best-effort: some accounts simply
  don't expose region or an active story to a logged-out viewer no matter
  how you ask, and the page says so honestly instead of faking data.

Nothing here can run client-side — TikTok blocks browser CORS outright — so
it needs the small Cloudflare Worker in [`/worker`](worker).

### Deploying the Worker

1. `cd worker && npm install`
2. `npx wrangler login`
3. Enable **Browser Rendering** for your account (Cloudflare dashboard →
   Workers & Pages → Browser Rendering — free to turn on; free tier is
   ~5 browser-hours/month, so fine for personal traffic).
4. `npm run deploy` — wrangler prints a `*.workers.dev` URL. To use
   `api.vexirale.com` instead, add an A/AAAA or CNAME for it in Cloudflare
   DNS, then uncomment the `routes` block in `worker/wrangler.toml` and
   redeploy.
5. Put that URL into `tiktok.apiBase` in [`src/config.ts`](src/config.ts) and
   rebuild the site. Leave it blank to keep the page in its "not deployed
   yet" placeholder state.

`worker/wrangler.toml`'s `ALLOWED_ORIGIN` locks CORS to `https://vexirale.com`
— change it if you serve the frontend elsewhere (or temporarily to your local
dev origin while testing).

**Heads up on fragility:** TikTok's markup and network calls change without
notice. `/profile` is the stable one. If `/region`, `/reposts`, or `/stories`
start always coming back "unavailable," check `worker/src/handlers/browser.ts`
against TikTok's current page first — the selectors and API-path substrings
it watches for may need updating.

**On the "stalker" framing:** this only surfaces data TikTok's own public
profile pages already show a logged-out visitor. It doesn't access DMs,
private accounts' content, or anything requiring the target's own login.
Use it on accounts that are fine with that, not to actually stalk anyone.

## Deployment (GitHub Pages, custom domain vexirale.com)

- Vite `base` is `/` (apex custom domain, not a project subpath).
- `public/CNAME` contains `vexirale.com`.
- [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and
  deploys to GitHub Pages on every push to `main` (via `configure-pages`,
  `upload-pages-artifact`, and `deploy-pages`).

To enable: in the repo settings, set **Pages → Build and deployment → Source**
to **GitHub Actions**, then point the `vexirale.com` DNS at GitHub Pages. Pushes
to `main` deploy automatically.

## Accessibility

Respects `prefers-reduced-motion` (heavy animations are shortened or skipped)
and adapts to touch devices (tilt and cursor spotlight are disabled; panels stay
fully tappable).
