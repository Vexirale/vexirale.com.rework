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
 *
 *  • projects ............. Each entry becomes its own glass panel. To add a
 *                           project, push one object. Drop screenshots into
 *                           /public/projects/ and point `image` at them
 *                           (e.g. "/projects/foo.png"). Omit `image` to get a
 *                           clean generated placeholder instead.
 *
 *  • socials .............. Each entry becomes one icon link. `icon` is the
 *                           NAME of a lucide-react icon (https://lucide.dev).
 *                           e.g. "Github", "Mail", "Twitter", "MessageCircle".
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

  bioLines: [
    "Welcome i guess 😭😭",
    "Im slow so I like when people explain stuff",
    "omg so tuff i got my own domain",
    "born in 2008",
    "tiktok addicted ig",
    "i bench 5kg btw (on both sides)",
    "ouxi gt2000 go brrr",
    "can you tell that my music taste is fried?",
    "uhhh okay idk what else to add",
  ],

  projects: [
    // EXAMPLE entries. Edit, add, or remove freely.
    {
      title: "Fritsparts",
      description: "PLACEHOLDER one-liner",
      url: "https://fritsparts.com",
      tags: ["Graduation Project"],
      image: "/projects/fritsparts.png",
    },
    {
      title: "Fatbike Parts",
      description: "PLACEHOLDER one-liner",
      url: "https://fatbikeparts.eu",
      tags: ["E-commerce"],
    },
    {
      // A "note" project: no `url`, so clicking opens a notepad-style modal
      // showing the `content` below (the background blurs behind it). Edit the
      // text freely — line breaks and blank lines are preserved.
      title: "UKC1 Reverse Engineering",
      description: "UKC1 RE showcase — click to open the notepad.",
      tags: ["Reverse Engineering", "Notes"],
      content: `UKC1 — REVERSE ENGINEERING NOTES
================================

PLACEHOLDER — replace this with your own write-up.

> Overview
  A short summary of what UKC1 is and why you took it apart.

> Tools
  - PLACEHOLDER (e.g. Ghidra, IDA, Wireshark, ...)
  - PLACEHOLDER

> Findings
  1. PLACEHOLDER finding one.
  2. PLACEHOLDER finding two.
  3. PLACEHOLDER finding three.

> Notes
  Anything else you want to jot down. Blank lines and
  indentation are kept exactly as written here.`,
    },
    // add more here...
  ] as Project[],

  socials: [
    { label: "GitHub", url: "https://github.com/PLACEHOLDER", icon: "Github" },
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
