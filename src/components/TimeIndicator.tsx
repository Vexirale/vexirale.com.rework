import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { siteConfig } from "../config";

function formatIn(date: Date, timeZone?: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone,
  };
  try {
    return new Intl.DateTimeFormat([], opts).format(date);
  } catch {
    delete opts.timeZone;
    return new Intl.DateTimeFormat([], opts).format(date);
  }
}

/** Glass clock widget: the owner's local time (configured timezone, shown large)
 *  and the visitor's local time, both with live seconds. */
export function TimeIndicator() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const owner = formatIn(now, siteConfig.timezone);
  const visitor = formatIn(now);

  return (
    <div className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 sm:w-auto">
      <Clock className="h-9 w-9 shrink-0 text-white/55" strokeWidth={1.25} />
      <div className="flex flex-1 flex-col">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">
          {siteConfig.timezoneLabel} time · for me
        </span>
        <span className="font-mono text-lg font-semibold tabular-nums leading-tight text-white">
          {owner}
        </span>
        <span className="my-1 h-px w-full bg-white/10" />
        <span className="flex items-center justify-between gap-2 font-mono text-[11px] tabular-nums text-white/50">
          <span>your time:</span>
          <span className="text-white/75">{visitor}</span>
        </span>
      </div>
    </div>
  );
}
