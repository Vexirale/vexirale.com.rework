import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { siteConfig } from "../config";

function formatIn(date: Date, timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }
}

/** Short label for the visitor's local timezone, e.g. "GMT+2". */
function visitorTzLabel(): string {
  try {
    const offsetMin = -new Date().getTimezoneOffset();
    const sign = offsetMin >= 0 ? "+" : "-";
    const h = Math.floor(Math.abs(offsetMin) / 60);
    const m = Math.abs(offsetMin) % 60;
    return `GMT${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
  } catch {
    return "local";
  }
}

/** Shows the owner's local time (configured timezone) alongside the visitor's
 *  local time, updating every few seconds. Sits under the status bubble. */
export function TimeIndicator() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);

  const owner = formatIn(now, siteConfig.timezone);
  const visitor = formatIn(now);

  return (
    <div className="glass flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2">
      <Clock className="h-4 w-4 shrink-0 text-white/40" />
      <div className="flex flex-col gap-1 font-mono text-[11px] leading-none">
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/35">{siteConfig.timezoneLabel}</span>
          <span className="tabular-nums text-white/75">{owner}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/35" title={visitorTzLabel()}>
            YOU
          </span>
          <span className="tabular-nums text-white/75">{visitor}</span>
        </div>
      </div>
    </div>
  );
}
