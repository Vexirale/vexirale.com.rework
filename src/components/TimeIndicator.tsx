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
    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-white/40">
      <Clock className="h-3 w-3" />
      <span className="text-white/60">{owner}</span>
      <span>{siteConfig.timezoneLabel}</span>
      <span className="text-white/25">·</span>
      <span className="text-white/60">{visitor}</span>
      <span title={visitorTzLabel()}>you</span>
    </div>
  );
}
