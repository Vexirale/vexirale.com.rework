/* ===========================================================================
 *  vexirale.com — SITE CONFIG
 *  ---------------------------------------------------------------------------
 *  This is the ONLY file you need to touch to update personal content.
 *  Nothing personal is hardcoded in the components.
 *
 *  HOW TO EDIT
 *  -----------
 *  • name / tagline ....... Shown on the landing screen and presence panel.
 *  • discordUserId ........ Your Discord ID. Drives the live avatar, status,
 *                           and activity via Lanyard. (You must be a member of
 *                           the Lanyard Discord server for this to work.)
 *  • accentColor .......... One restrained accent color (hex). Drives the
 *                           status dot, hover glow, and background tint. While
 *                           Spotify is playing, the presence panel temporarily
 *                           overrides this with the album-art color.
 *
 *  • bioLines ............. The presence panel rotates randomly through these.
 *                           Add or remove lines freely — the rotation adapts.
 *                           Put {visitors} in a line to show this week's live
 *                           visitor count there.
 *
 *  • timezone ............. Your IANA timezone + short label, shown beside the
 *                           visitor's local time under the status bubble.
 *
 *  • visitorCounter ....... Weekly visitor count (free Abacus API, no backend).
 *                           Displayed wherever {visitors} appears in bioLines.
 *
 *  • projects ............. Each entry becomes its own glass panel. To add a
 *                           project, push one object. Drop screenshots into
 *                           /public/projects/ and point `image` at them
 *                           (e.g. "/projects/foo.png"). Omit `image` to get a
 *                           clean generated placeholder instead.
 *
 *  • socials .............. Each entry becomes one icon link. `icon` is either:
 *                            - a lucide icon name (https://lucide.dev), e.g.
 *                              "Github", "Mail", "MessageCircle". A curated set
 *                              is bundled (see ICONS in SocialLinks.tsx); add a
 *                              line there to use one not listed. Unknown names
 *                              fall back to a generic link icon. OR
 *                            - a Simple Icons brand icon (https://simpleicons.org)
 *                              as "si:<slug>", e.g. "si:roblox", "si:spotify",
 *                              "si:x" — loaded from their CDN, no bundle cost.
 *
 *  The avatar, status, and live activity (Spotify / watching / playing) are
 *  fully automatic from Lanyard and need no config beyond discordUserId.
 * =========================================================================== */

export interface Project {
  title: string;
  description: string;
  /** External link opened in a new tab when the panel is clicked.
   *  Omit it for "note" projects that use `content` instead (see below). */
  url?: string;
  tags: string[];
  /** Optional thumbnail: a path in /public (e.g. "/projects/foo.png") or a URL.
   *  If omitted, the panel renders a clean generated placeholder. */
  image?: string;
  /** Optional notepad text. When set, clicking the panel opens a focused,
   *  notepad-style modal (the background blurs) showing this text instead of
   *  navigating to `url`. Use a template string with line breaks for layout. */
  content?: string;
  /** Optional development status bar on the panel, tinted with the current
   *  theme/accent color (the album-art color while music is playing):
   *   • "active"   — animated "Active development" bar
   *   • "finished" — completed bar with a check
   *  Omit for no status bar. */
  status?: "active" | "finished";
}

export interface Social {
  /** e.g. "GitHub" — used as the accessible label / tooltip. */
  label: string;
  /** e.g. "https://github.com/..." (or a "mailto:" address). */
  url: string;
  /** A lucide-react icon name, e.g. "Github". See https://lucide.dev */
  icon: string;
  /** Optional. When set, clicking the icon opens a small glass popover showing
   *  this message instead of navigating away. `url` becomes a link inside the
   *  popover (a "mailto:" address is shown as the clickable text). */
  popup?: string;
}

export const siteConfig = {
  name: "vexirale",
  tagline: "Discover me & my projects.",
  discordUserId: "852601534759567410",
  accentColor: "#ffffff",

  // Real frosted-glass blur (CSS backdrop-filter) is gorgeous but very
  // expensive: panels re-blur every frame while scrolling, which tanks FPS on
  // many machines (and falls back to slow software rendering in some browsers).
  // The site ships with a smooth faux-frosted look by default. Set this to
  // true ONLY if you have a strong GPU and want the real live blur back.
  enableLiveBlur: false,

  // Your timezone, shown in the header time indicator next to the visitor's
  // local time. `timezone` is an IANA name; `timezoneLabel` is the short badge.
  timezone: "Europe/Amsterdam",
  timezoneLabel: "AMS",

  // All-time visit counter in the header — a cute image counter where little
  // characters hold up each digit (Moe Counter, count.getloli.com). Counts
  // automatically, no backend. Preview themes at count.getloli.com and set
  // `theme` to the one you like (catgirl/booru styles: "moebooru", "rule34",
  // "gelbooru", "kasuterura-1".."kasuterura-4", many "booru-*"). `name` must be
  // unique to your site — changing it starts a fresh count.
  moeCounter: { enabled: true, name: "vexirale-com", theme: "rule34" },

  // Weekly visitor counter (uses the free Abacus API; no backend needed). Each
  // ISO week gets its own counter, so it shows "visitors this week". Put the
  // {visitors} token in any bio line to display it (see bioLines below).
  visitorCounter: {
    enabled: true,
    // A unique namespace for your site on the counter service. Change it once;
    // changing it later resets the count.
    namespace: "vexirale-com",
  },

  bioLines: [
    "hi!! welcome to my portfolio",
    // The {visitors} token is replaced with this week's live visitor count.
    "{visitors} visitors stopped by this week (including you!)",
    "im slow so i like when people explain stuff",
    "im probably doomscrolling on tiktok rn",
    "yayayayayay",
    "how'd you know my music taste is fried?",
    "born in 2008 btw",
    "ouxi gt2000 go brrr",
    "i want a cat :(",
    "omg so tufff i got my own domain",
    "okay idk what else to add, instead of stalking me.. talk to me!",
    "if im listening to brazilian funk... im probably at the gym, heh.",
    "shout out to daniel",
    "lock in.",
    "hmph!",
    "viltrumite mark HOLY PEAAKK!!!",
    "uhhhm yes.",
    "if u steal this code, ur just stealing vibecode tbh",
    "uhm",
  ],

  projects: [
    // EXAMPLE entries. Edit, add, or remove freely.
    {
      title: "Fritsparts",
      description: "A silly lil vibecoded website for my MAVO4 PWS. aka graduation project.",
      url: "https://fritsparts.com",
      tags: ["Graduation Project"],
      image: "/projects/fritsparts.png",
      status: "finished",
    },
    {
      title: "Fatbike Parts",
      description: "My webshop regarding fatbike parts, uhhh quick lil e-commerce thigny",
      url: "https://fatbikeparts.eu",
      tags: ["E-commerce", "Relaunching soon?"],
      status: "finished",
    },
    {
      // A "note" project: no `url`, so clicking opens a notepad-style modal
      // showing the `content` below (the background blurs behind it). Edit the
      // text freely — line breaks and blank lines are preserved.
      title: "UKC1 Reverse Engineering",
      description: "UKC1 RE showcase — click to open the notepad.",
      tags: ["Reverse Engineering", "Notes"],
      status: "active",
      content: `UKC1 - REVERSE ENGINEERING NOTES
================================

Soooo yeah, don't really know how to start this, but here it goes.

> Overview

UKC1. a super common universal ebike/fatbike/conversion kit display, so popular
and yet so fucking undocumented.

theres a flasher tool for the UKC1 display, which is not public (buuut i leaked to the public myself),
but actually CUSTOMIZING the thing? zero docs. nothing online. 

apparently UKRiver sells an official tool for like $600. yeah, no. i aint got
that kinda money. so i just did it myself.

launched up claude, opened Ghidra and HxD, and started digging. props to
RISUNMOTOR for at least dropping their .bin, (even though that shit was 
dated asf and made me go insane numerous times)

> Tools

  - Claude Opus 4.8
  - Ghidra        (decompiler)
  - HxD           (hex editor, overwrite mode only)
  - Keystone      (assembler)
  - Capstone      (disassembler)
  - Python        (glue + a custom patcher, see below)

> Findings

what i actually pieced together about how this thing ticks:

  - the app firmware loads at 0x08000000, so file offset = addr - 0x08000000.
    (had the wrong base for way too long. sigh.)

  - the live speed limit is ONE byte in RAM at 0x200000c7. everything that
    caps your speed reads it. once you own the byte, you own the limit ig.

  - catch: on boot the firmware reloads that byte from EEPROM, and it does it
    AFTER the password screen. so anything you write early just gets stomped a
    split second later. took me a while to even realize that's what was happening.

  - buttons run through a decoder that returns a code per action. holding '-'
    long enough returns a specific code that the main loop routes to the walk
    assist routine. that routine has no normal callers, it's only reached by a
    jump table. basically begging to be hijacked.

> Accomplishments

  - Dual entry passcode system. for, heh, off-road and road use.

    boot the bike -> passcode screen.
    enter 1234 -> off-road mode, derestricted (no speed limit)
    enter 1111 -> road mode, fully legal, capped at 25 km/h. (cant change)
    wrong code or the power button -> screen just freezes. no boot bypass.

    road mode never touches EEPROM. it sets a flag, then every single main
    loop pass it re-writes 25 km/h back into that RAM byte. so even when the
    boot reload tries to undo it, the very next loop slams it right back. it
    just sticks. so even when you try to change the speed limit, it wont let
    you. (unlesss you use the other code at boot.) secure very much

  - Killswitch.

    took the walk assist function (normally your minus-hold) and gutted it,
    dropped in a tiny stub that writes 25 km/h straight to the speed-limit
    byte. hold '-' and boom, instant cap. RAM only, which is the whole reason
    the dual passcode system exists.

    also made it way snappier. stock walk assist wants ~100 polling cycles of
    hold before it fires. cut it to 33, so the killswitch triggers about 3x
    faster now. so you dont gotta wait like 3s for it to kick in

  - A custom patcher.

    once it all worked i wrote a python tool that takes the clean factory .bin
    and stamps every mod on from a single config. passwords, speed caps, the
    killswitch trigger time, all tweakable. it checks the firmware SHA256 so it
    refuses to touch anything but the exact stock image, asserts the original
    bytes at every patch site before overwriting, and spits out a byte-for-byte
    reproducible build. good for selling ig.

> Notes

cannot overstate how cursed this display is to reverse engineer. but it's
done, it works, and now theres at least ONE corner of the internet with real
notes on it.

if ur into this and wna reverse engineer it urself.. godspeed`,
    },
    // add more here...
  ] as Project[],

  socials: [
    { label: "GitHub", url: "https://github.com/Vexirale", icon: "Github" },
    {
      label: "Discord",
      url: "https://discord.com/users/852601534759567410",
      icon: "si:discord",
    },
    {
      label: "Email",
      url: "mailto:inquiries@vexirale.com",
      icon: "Mail",
      popup: "Questions?",
    },
    {
      label: "Roblox",
      url: "https://www.roblox.com/users/487582825/profile",
      icon: "si:roblox",
    },
    {
      label: "TikTok",
      url: "https://www.tiktok.com/@vexirale",
      icon: "si:tiktok",
    },
    {
      label: "Steam",
      url: "https://steamcommunity.com/id/vexirale",
      icon: "si:steam",
    },
    {
      label: "Spotify",
      url: "https://open.spotify.com/user/31taplaaukndq5ekom33j4hhc6dy",
      icon: "si:spotify",
    },
    {
      label: "Instagram",
      url: "https://www.instagram.com/vexirailed",
      icon: "si:instagram",
    },
    {
      label: "Youtube",
      url: "https://www.youtube.com/channel/UC7jTGf8LI-4R4u1VsFwW_1A",
      icon: "si:youtube",
    },
    // add or remove here...
  ] as Social[],

  // Guestbook — visitors can leave a name + message. Backed by Supabase (free,
  // no server of your own). One-time setup is in the README ("Guestbook").
  // The anon key is SAFE to commit (it's public; row-level security limits it).
  // To DELETE / LIKE entries: enable owner mode from the browser console with
  //   localStorage.setItem('vx-gb-admin', '<service_role key>'); location.reload()
  // (the key stays in your browser, never in the repo). Leave url/anonKey blank
  // to hide the guestbook until you set it up.
  guestbook: {
    enabled: true,
    supabaseUrl: "https://ojudkxckmupbbysvsjwr.supabase.co", // e.g. "https://abcd1234.supabase.co"
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdWRreGNrbXVwYmJ5c3ZzandyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MjYxODksImV4cCI6MjA5NjQwMjE4OX0.SxrWG64pBoJSIcQFQj5ZfLaNWSq9QHJbZRstE4f8xi0", // public anon/publishable key
    table: "guestbook",
    // Where visitors email to request their message be removed (GDPR).
    contactEmail: "inquiries@vexirale.com",
    // Always-on entries pinned to the top (live here, not in the DB).
    pinned: [
      {
        name: "claude • admin",
        message:
          "first",
      },
    ],
  },
};

export type SiteConfig = typeof siteConfig;
