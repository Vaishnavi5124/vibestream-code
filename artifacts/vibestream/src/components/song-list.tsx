import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  useVoteSong,
  useDeleteSong,
  useAddSong,
  getListSongsQueryKey,
  getGetPlaylistStatsQueryKey,
  type Song,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Play, Trash2, ArrowUp, ArrowDown, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SongListProps {
  songs: Song[];
  playingId: number | null;
  onPlay: (id: number) => void;
}

export function SongList({ songs, playingId, onPlay }: SongListProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const voteMutation = useVoteSong({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPlaylistStatsQueryKey() });
      },
    },
  });

  const deleteMutation = useDeleteSong();
  const addSongMutation = useAddSong();

  const handleVote = (
    id: number,
    direction: "up" | "down",
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    voteMutation.mutate({ id, data: { direction } });
  };

  const handleDelete = (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();

    deleteMutation.mutate(
      { id: song.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetPlaylistStatsQueryKey() });

          toast({
            title: "Song removed",
            description: `"${song.title}" was removed from the queue.`,
            action: (
              <ToastAction
                altText="Undo delete"
                onClick={() => {
                  addSongMutation.mutate(
                    {
                      data: {
                        youtubeUrl: `https://youtu.be/${song.youtubeId}`,
                        title: song.title,
                        addedBy: song.addedBy,
                      },
                    },
                    {
                      onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });
                      queryClient.invalidateQueries({
                        queryKey: getGetPlaylistStatsQueryKey(),
                      });
                      toast({
                        title: "Song restored",
                        description: `"${song.title}" is back in the queue.`,
                      });
                      },
                      onError: () => {
                        toast({
                          title: "Restore failed",
                          description: "Could not undo the delete. Try again.",
                          variant: "destructive",
                        });
                      },
                    },
                  );
                }}
              >
                Undo
              </ToastAction>
            ),
          });
        },
      },
    );
  };

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground border border-dashed border-border/50 rounded-xl bg-card/10 backdrop-blur">
        <Music className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-lg font-medium text-foreground">The queue is empty</p>
        <p className="text-sm mt-1">Add a song to start the vibe</p>
      </div>
    );
  }

  const sortedSongs = [...songs].sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {sortedSongs.map((song, index) => {
          const isPlaying = playingId === song.id;

          return (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{
                duration: 0.4,
                type: "spring",
                bounce: 0.3,
                delay: index * 0.05,
              }}
              key={song.id}
              onClick={() => onPlay(song.id)}
              className={cn(
                "group relative flex items-center gap-4 p-5 rounded-xl cursor-pointer transition-all duration-300",
                "border bg-card/40 backdrop-blur hover:bg-card hover:border-primary/50 hover:shadow-[0_0_20px_rgba(var(--primary),0.1)]",
                isPlaying
                  ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(var(--primary),0.15)]"
                  : "border-border/50",
              )}
            >
              <div className="relative shrink-0 w-20 h-14 rounded-md overflow-hidden bg-background border border-border/50 flex items-center justify-center">
                <img
                  src={`https://img.youtube.com/vi/${song.youtubeId}/default.jpg`}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                />
                <div
                  className={cn(
                    "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity",
                    isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  )}
                >
                  {isPlaying ? (
                    <div className="flex gap-[2px] items-center justify-center h-4">
                      <div className="w-1 h-full bg-primary animate-[bounce_1s_infinite_0s]" />
                      <div className="w-1 h-3/4 bg-primary animate-[bounce_1s_infinite_0.2s]" />
                      <div className="w-1 h-full bg-primary animate-[bounce_1s_infinite_0.4s]" />
                    </div>
                  ) : (
                    <Play className="w-6 h-6 text-white fill-white" />
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3
                  className={cn(
                    "font-medium truncate transition-colors",
                    isPlaying ? "text-primary" : "text-foreground group-hover:text-primary/90",
                  )}
                >
                  {song.title || song.youtubeId}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 flex-wrap sm:flex-nowrap">
                  <span className="bg-secondary px-3 py-1 rounded-full text-secondary-foreground whitespace-nowrap">
                    Added by {song.addedBy}
                  </span>
                  <span>&bull;</span>
                  <span className="whitespace-nowrap">
                    {formatDistanceToNow(new Date(song.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex flex-col items-center bg-background/50 rounded-lg p-1 border border-border/50">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-md hover:text-accent hover:bg-accent/20"
                    onClick={(e) => handleVote(song.id, "up", e)}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <span className="text-xs font-bold w-6 text-center">{song.votes}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-md hover:text-destructive hover:bg-destructive/20"
                    onClick={(e) => handleVote(song.id, "down", e)}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 ml-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/20"
                  onClick={(e) => handleDelete(song, e)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
