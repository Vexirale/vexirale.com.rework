import { AnimatePresence, motion } from "framer-motion";
import { siteConfig } from "../config";
import type { LanyardData } from "../lib/lanyard";
import type { FeaturedActivity } from "../lib/activity";
import type { Rgb } from "../lib/color";
import { rgbToRgba } from "../lib/color";
import { GlassPanel } from "./GlassPanel";
import { Avatar } from "./Avatar";
import { StatusBubble } from "./StatusBubble";
import { BioRotator } from "./BioRotator";
import { SocialLinks } from "./SocialLinks";
import { ActivityCard } from "./ActivityCard";
import { Skeleton } from "./Skeleton";

interface PresencePanelProps {
  data: LanyardData | null;
  loading: boolean;
  featured: FeaturedActivity | null;
  accent: Rgb;
}

export function PresencePanel({
  data,
  loading,
  featured,
  accent,
}: PresencePanelProps) {
  return (
    <GlassPanel accent={accent} className="p-6 sm:p-8">
      <div className="flex flex-col gap-6">
        {/* Header: avatar + name on the left, live status bubble on the right */}
        <div className="flex items-start gap-4 sm:gap-5">
          {loading || !data ? (
            <Skeleton className="h-20 w-20 rounded-full sm:h-24 sm:w-24" />
          ) : (
            <Avatar user={data.discord_user} status={data.discord_status} />
          )}

          <div className="min-w-0 flex-1 pt-1">
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">
              {siteConfig.name}
            </h1>
            {data?.discord_user.global_name && (
              <p className="mt-0.5 font-mono text-xs text-white/40">
                @{data.discord_user.username}
              </p>
            )}
          </div>

          {/* Live Discord status thought-bubble. */}
          <StatusBubble
            status={data?.discord_status}
            connecting={loading || !data}
          />
        </div>

        {/* Bio rotation */}
        <BioRotator lines={siteConfig.bioLines} />

        {/* Socials */}
        <SocialLinks socials={siteConfig.socials} />

        {/* Live activity card — collapses cleanly when idle. */}
        {loading ? (
          <Skeleton className="h-[88px] w-full rounded-2xl" />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {featured && (
              <motion.div
                key={featured.kind + ("title" in featured ? featured.title : "")}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <ActivityCard
                  activity={featured}
                  tint={rgbToRgba(accent, 0.14)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </GlassPanel>
  );
}
