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
 *  • socials .............. Each entry becomes one icon link. `icon` is the
 *                           NAME of a lucide icon (https://lucide.dev), e.g.
 *                           "Github", "Mail", "Twitter", "MessageCircle".
 *                           A curated set is bundled (see ICONS in
 *                           components/SocialLinks.tsx); to use one that isn't
 *                           listed, add it to that map (one line). Unknown
 *                           names fall back to a generic link icon.
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
    "okay idk what else to add, instead of stalking me.. talk to me!"
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
      description: "My webshop regarding fatbike parts, custom parts made right here in the netherlands!",
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
      content: `UKC1 — REVERSE ENGINEERING NOTES
================================

Soooo yeah, Dont really know how to begin this...

> Overview
 UKC1, A famous universal ebike display. but yet... so fucking undocumented...
 Although there is a flasher tool (uploaded and leaked it to the public myself.)
 theres... zero to NO.. documenation online on how to actually customize it.

 I did hear that you can purchase a $600 tool from UKRiver themselves.. buttt, lets be honest
 i aint got that kinda money..

 So I did it myself, Launched a Claude sesh. Launched Ghidra, and HXD ofc.

 Thankfully RISUNMOTOR did drop their .bin firmware but man is that hard to reverese engineer.

> Tools
  - Claude Opus 4.8
  - Ghidra
  - HxD

> Findings
uhhh ill do this later
  
> Accomplishments
  - Succesfully enabled a Dual Entry passcode system
    for.. heh.. Off-Road and Road use.

    Lets say you start the bike, you get prompted with a passcode login screen on entry,
    You enter: 1234 -> Bike is in 'off-road' mode and doesnt have a speed limit.

    Okay, now lets say you want to use it for road-use
    You enter: 1111 -> Bike is in 'road' mode, 100% legal with the speed limited to 25km/h

    Road mode only writes 25kmh to RAM, not EEPROM. but hey if it works, it works.. right?

    - Succesfully coded a killswitch.
      Replaced the Walk assist function,
      With some lil teeny tiny thing that overwrites the speed limit string to 25kmh.
      When holding down the '-' key for 1.5s
      Writes it to RAM, not EEPROM. so thats why the Dual Entry passcode system is in place.

> Notes
  fuck this stupid display is SO hard to reverse engineer`,
    },
    // add more here...
  ] as Project[],

  socials: [
    { label: "GitHub", url: "https://github.com/Vexirale", icon: "Github" },
    {
      label: "Discord",
      url: "https://discord.com/users/852601534759567410",
      icon: "MessageCircle",
    },
    {
      label: "Email",
      url: "mailto:inquiries@vexirale.com",
      icon: "Mail",
      popup: "Questions?",
    },
    {
      label: "Roblox",
      url: "https://roblox.com/useds",
      icon: "gamepad-2",
    },
    // add or remove here...
  ] as Social[],
};

export type SiteConfig = typeof siteConfig;
