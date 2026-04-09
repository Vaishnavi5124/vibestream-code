import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { Song } from "@workspace/api-client-react";
import { Disc3 } from "lucide-react";

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
    __youtubeIframeApiPromise?: Promise<YouTubeNamespace>;
  }
}

interface YouTubePlayer {
  destroy: () => void;
}

interface YouTubeNamespace {
  Player: new (
    element: HTMLDivElement,
    config: {
      videoId?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
      };
    },
  ) => YouTubePlayer;
  PlayerState: {
    ENDED: number;
  };
}

function loadYouTubeIframeApi(): Promise<YouTubeNamespace> {
  if (window.YT) {
    return Promise.resolve(window.YT);
  }

  if (window.__youtubeIframeApiPromise) {
    return window.__youtubeIframeApiPromise;
  }

  window.__youtubeIframeApiPromise = new Promise<YouTubeNamespace>((resolve) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }

    window.onYouTubeIframeAPIReady = () => {
      if (window.YT) {
        resolve(window.YT);
      }
    };
  });

  return window.__youtubeIframeApiPromise;
}

interface PlayerProps {
  song: Song | null;
  playbackStartedAt: string | null;
  onEnded: () => void;
}

export function Player({ song, playbackStartedAt, onEnded }: PlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const onEndedRef = useRef(onEnded);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    if (!song || !containerRef.current) {
      return;
    }

    let disposed = false;
    const startSeconds = playbackStartedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(playbackStartedAt).getTime()) / 1000))
      : 0;

    void loadYouTubeIframeApi().then((YT) => {
      if (disposed || !containerRef.current) {
        return;
      }

      playerRef.current?.destroy();
      containerRef.current.innerHTML = "";

      playerRef.current = new YT.Player(containerRef.current, {
        videoId: song.youtubeId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          iv_load_policy: 3,
          start: startSeconds,
          origin: window.location.origin,
        },
        events: {
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.ENDED) {
              onEndedRef.current();
            }
          },
        },
      });
    });

    return () => {
      disposed = true;
    };
  }, [song, playbackStartedAt]);

  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  if (!song) {
    return (
      <div className="w-full aspect-video bg-card/20 rounded-2xl border border-border/30 flex flex-col items-center justify-center text-muted-foreground backdrop-blur-sm">
        <Disc3 className="w-16 h-16 mb-4 opacity-20" />
        <p className="font-display text-lg">Select a track to play</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full flex flex-col gap-4"
    >
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-[0_0_50px_rgba(var(--primary),0.15)] ring-1 ring-border/50">
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      </div>

      <div className="px-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold uppercase tracking-wider mb-2 border border-primary/20">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Now Playing
        </div>
        <h2 className="text-2xl font-bold font-display text-foreground truncate">
          {song.title || song.youtubeId}
        </h2>
        <p className="text-muted-foreground mt-1">
          Dropped by <span className="text-foreground font-medium">{song.addedBy}</span>
        </p>
      </div>
    </motion.div>
  );
}
