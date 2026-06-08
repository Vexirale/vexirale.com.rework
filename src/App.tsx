import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { siteConfig } from "./config";
import { useLanyard } from "./hooks/useLanyard";
import { useAlbumColor } from "./hooks/useAlbumColor";
import { useDocumentTitle } from "./hooks/useDocumentTitle";
import { selectFeaturedActivity } from "./lib/activity";
import { Background } from "./components/Background";
import { Landing } from "./components/Landing";
import { Portfolio } from "./components/Portfolio";
import { PerfToast } from "./components/PerfToast";

export default function App() {
  const [entered, setEntered] = useState(false);

  // Real backdrop-filter blur is opt-in (it's the main FPS cost). Panels are
  // faux-frosted by default; this re-enables true blur when configured.
  useEffect(() => {
    document.documentElement.classList.toggle(
      "live-blur",
      siteConfig.enableLiveBlur,
    );
  }, []);

  const { data, loading } = useLanyard(siteConfig.discordUserId);

  // Single featured activity, by priority Spotify > Watching > Playing.
  const featured = useMemo(() => selectFeaturedActivity(data), [data]);

  // Live accent: album-art color while Spotify plays, else the static accent.
  const albumArt = featured?.kind === "spotify" ? featured.image : null;
  const accent = useAlbumColor(albumArt, siteConfig.accentColor);

  // Reflect activity in the tab title (debounced; reverts when idle).
  useDocumentTitle(featured);

  return (
    <>
      <Background albumArt={albumArt} />
      <PerfToast />

      <AnimatePresence mode="wait">
        {entered ? (
          <Portfolio
            key="portfolio"
            data={data}
            loading={loading}
            featured={featured}
            accent={accent}
          />
        ) : (
          <Landing key="landing" onEnter={() => setEntered(true)} data={data} />
        )}
      </AnimatePresence>
    </>
  );
}
