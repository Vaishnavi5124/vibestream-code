import { useState, useEffect, useRef } from "react";
import { useListSongs, getListSongsQueryKey } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { AddSongForm } from "@/components/add-song-form";
import { SongList } from "@/components/song-list";
import { PlaylistStatsCard } from "@/components/playlist-stats";
import { Player } from "@/components/player";
import { Radio } from "lucide-react";

const PLAY_COUNTS_STORAGE_KEY = "vibestream-play-counts";

interface PlaybackState {
  currentSongId: number | null;
  startedAt: string | null;
}

function sortSongsByQueueOrder<T extends { votes: number; createdAt: string }>(songs: T[]) {
  return [...songs].sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function Home() {
  const { data: songs, isLoading } = useListSongs({
    query: { queryKey: getListSongsQueryKey() }
  });
  const { data: playback } = useQuery<PlaybackState>({
    queryKey: ["playback"],
    queryFn: async () => {
      const response = await fetch("/api/playback");
      if (!response.ok) {
        throw new Error("Failed to load playback state");
      }
      return response.json() as Promise<PlaybackState>;
    },
    refetchInterval: 2000,
  });
  
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [playbackStartedAt, setPlaybackStartedAt] = useState<string | null>(null);
  const [playCounts, setPlayCounts] = useState<Record<number, number>>(() => {
    if (typeof window === "undefined") {
      return {};
    }

    try {
      const stored = window.localStorage.getItem(PLAY_COUNTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) as Record<number, number> : {};
    } catch {
      return {};
    }
  });
  const previousPlayingId = useRef<number | null>(null);
  const sortedSongs = sortSongsByQueueOrder(songs || []);

  const syncPlayback = async (songId: number | null, startedAt?: string) => {
    const payload = {
      songId,
      startedAt: startedAt ?? new Date().toISOString(),
    };

    const response = await fetch("/api/playback", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed to update playback");
    }

    const nextPlayback = (await response.json()) as PlaybackState;
    setPlayingId(nextPlayback.currentSongId);
    setPlaybackStartedAt(nextPlayback.startedAt);
  };

  useEffect(() => {
    if (playback) {
      setPlayingId(playback.currentSongId);
      setPlaybackStartedAt(playback.startedAt);
      return;
    }

    if (!playingId && sortedSongs.length > 0) {
      void syncPlayback(sortedSongs[0].id);
    }
  }, [playback, sortedSongs, playingId]);

  useEffect(() => {
    if (!playingId || previousPlayingId.current === playingId) {
      return;
    }

    previousPlayingId.current = playingId;

    setPlayCounts((current) => {
      const next = {
        ...current,
        [playingId]: (current[playingId] ?? 0) + 1,
      };

      window.localStorage.setItem(PLAY_COUNTS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [playingId]);

  const playingSong = songs?.find(s => s.id === playingId) || null;

  const handleSongEnded = () => {
    if (sortedSongs.length === 0 || playingId === null) {
      return;
    }

    const currentIndex = sortedSongs.findIndex((song) => song.id === playingId);
    if (currentIndex === -1) {
      setPlayingId(sortedSongs[0].id);
      return;
    }

    const nextSong = sortedSongs[(currentIndex + 1) % sortedSongs.length];
    void syncPlayback(nextSong.id);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground relative overflow-hidden selection:bg-primary/30">
      {/* Ambient background glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 relative z-10">
        
        {/* Header */}
        <header className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Radio className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold font-display tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              For You
            </h1>
            <p className="text-sm text-muted-foreground font-medium">our playlist</p>
          </div>
        </header>

        <PlaylistStatsCard songs={songs || []} playCounts={playCounts} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Main Left Column (Player + Add) */}
          <div className="lg:col-span-7 flex flex-col gap-8 sticky top-8">
            <Player
              song={playingSong}
              playbackStartedAt={playbackStartedAt}
              onEnded={handleSongEnded}
            />
            <AddSongForm />
          </div>

          {/* Right Column (Queue) */}
          <div className="lg:col-span-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="font-display font-bold text-xl flex items-center gap-2">
                Up Next 
                <span className="text-sm font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {songs?.length || 0} tracks
                </span>
              </h3>
            </div>
            
            <div className="flex-1 bg-card/20 border border-border/30 rounded-2xl p-4 backdrop-blur-sm min-h-[500px]">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-20 bg-card/40 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <SongList 
                  songs={songs || []} 
                  playingId={playingId} 
                  onPlay={(id) => {
                    void syncPlayback(id);
                  }}
                />
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
