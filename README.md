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

Leave `supabaseUrl` / `supabaseAnonKey` blank to keep the guestbook hidden
("coming soon") until you're ready.

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
