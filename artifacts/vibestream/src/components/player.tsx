import { motion } from "framer-motion";
import type { Song } from "@workspace/api-client-react";
import { Disc3 } from "lucide-react";

interface PlayerProps {
  song: Song | null;
}

export function Player({ song }: PlayerProps) {
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
        <iframe
          src={`https://www.youtube.com/embed/${song.youtubeId}?autoplay=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
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
