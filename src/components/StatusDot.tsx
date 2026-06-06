import type { DiscordStatus } from "../lib/lanyard";

const STATUS: Record<DiscordStatus, { color: string; label: string }> = {
  online: { color: "#23a55a", label: "Online" },
  idle: { color: "#f0b232", label: "Idle" },
  dnd: { color: "#f23f43", label: "Do Not Disturb" },
  offline: { color: "#80848e", label: "Offline" },
};

export function StatusDot({ status }: { status: DiscordStatus }) {
  const { color, label } = STATUS[status] ?? STATUS.offline;
  return (
    <span className="inline-flex items-center gap-2 text-sm text-white/70">
      <span
        className="relative inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
      >
        {status === "online" && (
          <span
            className="absolute inset-0 animate-ping rounded-full"
            style={{ backgroundColor: color, opacity: 0.6 }}
          />
        )}
      </span>
      <span className="font-mono text-xs uppercase tracking-wider">{label}</span>
    </span>
  );
}
