import { useState } from "react";
import type { DiscordStatus, DiscordUser } from "../lib/lanyard";

const STATUS_RING: Record<DiscordStatus, string> = {
  online: "#23a55a",
  idle: "#f0b232",
  dnd: "#f23f43",
  offline: "#80848e",
};

/** Build the avatar URL from the Discord user. Animated hashes (a_) use .gif,
 *  otherwise .png. Falls back to Discord's default avatar when none is set. */
function avatarUrl(user: DiscordUser): string {
  if (user.avatar) {
    const ext = user.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
  }
  // Default avatar index: new system uses (id >> 22) % 6; legacy uses disc % 5.
  let index = 0;
  try {
    index = Number((BigInt(user.id) >> 22n) % 6n);
  } catch {
    const disc = parseInt(user.discriminator ?? "0", 10);
    index = Number.isNaN(disc) ? 0 : disc % 5;
  }
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export function Avatar({
  user,
  status,
}: {
  user: DiscordUser;
  status: DiscordStatus;
}) {
  const [errored, setErrored] = useState(false);
  const ring = STATUS_RING[status] ?? STATUS_RING.offline;

  return (
    <div className="relative shrink-0">
      <div
        className="rounded-full p-[3px]"
        style={{ background: `linear-gradient(135deg, ${ring}, transparent)` }}
      >
        <img
          src={errored ? "https://cdn.discordapp.com/embed/avatars/0.png" : avatarUrl(user)}
          alt={user.global_name ?? user.username}
          onError={() => setErrored(true)}
          className="h-20 w-20 rounded-full border border-white/10 bg-black/40 object-cover sm:h-24 sm:w-24"
        />
      </div>
      <span
        className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-[3px] border-[#0a0a0a]"
        style={{ backgroundColor: ring }}
      />
    </div>
  );
}
