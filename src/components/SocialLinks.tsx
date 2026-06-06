import * as Icons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import type { Social } from "../config";

/** Look up a lucide-react icon component by its config name (e.g. "Github").
 *  Falls back to a generic Link icon if the name doesn't exist, so a typo in
 *  config never breaks the render. */
function iconFor(name: string): ComponentType<LucideProps> {
  const map = Icons as unknown as Record<string, ComponentType<LucideProps>>;
  return map[name] ?? Icons.Link;
}

export function SocialLinks({ socials }: { socials: Social[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {socials.map((social) => {
        const Icon = iconFor(social.icon);
        return (
          <a
            key={`${social.label}-${social.url}`}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.label}
            title={social.label}
            className="group/social inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 transition-colors hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
          >
            <Icon className="h-[18px] w-[18px]" />
          </a>
        );
      })}
    </div>
  );
}
