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
  url: string;
  tags: string[];
  /** Optional thumbnail: a path in /public (e.g. "/projects/foo.png") or a URL.
   *  If omitted, the panel renders a clean generated placeholder. */
  image?: string;
}

export interface Social {
  /** e.g. "GitHub" — used as the accessible label / tooltip. */
  label: string;
  /** e.g. "https://github.com/..." */
  url: string;
  /** A lucide-react icon name, e.g. "Github". See https://lucide.dev */
  icon: string;
}

export const siteConfig = {
  name: "vexirale",
  tagline: "PLACEHOLDER tagline",
  discordUserId: "852601534759567410",
  accentColor: "#ffffff",

  bioLines: [
    "PLACEHOLDER bio line 1",
    "PLACEHOLDER bio line 2",
    "PLACEHOLDER bio line 3",
  ],

  projects: [
    // EXAMPLE entries. Edit, add, or remove freely.
    {
      title: "Fritsparts",
      description: "PLACEHOLDER one-liner",
      url: "https://fritsparts.com",
      tags: ["Web"],
      image: "/projects/fritsparts.png",
    },
    {
      title: "Fatbike Parts",
      description: "PLACEHOLDER one-liner",
      url: "https://fatbikeparts.eu",
      tags: ["E-commerce"],
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
    { label: "Email", url: "mailto:PLACEHOLDER", icon: "Mail" },
    // add or remove here...
  ] as Social[],
};

export type SiteConfig = typeof siteConfig;
