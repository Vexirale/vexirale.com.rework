import { useEffect, useRef } from "react";
import type { FeaturedActivity } from "../lib/activity";

const DEFAULT_TITLE = "vexirale";

function titleFor(activity: FeaturedActivity | null): string {
  if (!activity) return DEFAULT_TITLE;
  switch (activity.kind) {
    case "spotify":
      return `vexirale · ♪ ${activity.title}`;
    case "watching":
      return `vexirale · ${activity.title}`;
    case "playing":
      return `vexirale · ${activity.title}`;
  }
}

/** Reflects the current activity in document.title, debounced so it does not
 *  flicker on rapid presence changes. Restores the default on unmount. */
export function useDocumentTitle(activity: FeaturedActivity | null) {
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const next = titleFor(activity);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      document.title = next;
    }, 400);

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [next]);

  useEffect(() => {
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, []);
}
