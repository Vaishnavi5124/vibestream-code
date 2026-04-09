import { useGetPlaylistStats, getGetPlaylistStatsQueryKey, type Song } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Headphones, Clock, ListMusic } from "lucide-react";
import { motion } from "framer-motion";

interface PlaylistStatsCardProps {
  songs: Song[];
  playCounts: Record<number, number>;
}

export function PlaylistStatsCard({ songs, playCounts }: PlaylistStatsCardProps) {
  const { data: stats, isLoading } = useGetPlaylistStats({
    query: { queryKey: getGetPlaylistStatsQueryKey() }
  });

  const mostPlayedSong = songs.reduce<{ song: Song | null; count: number }>(
    (current, song) => {
      const count = playCounts[song.id] ?? 0;
      if (count > current.count) {
        return { song, count };
      }
      return current;
    },
    { song: null, count: 0 },
  );

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-card/40 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="bg-card/30 border-border/50 backdrop-blur overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <ListMusic className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground font-medium">Total Tracks</p>
                <p className="text-2xl font-bold font-display tracking-tight text-foreground">{stats.totalSongs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="bg-card/30 border-border/50 backdrop-blur overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                <Headphones className="w-5 h-5 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground font-medium">Most Played</p>
                <p className="text-sm font-bold font-display tracking-tight text-foreground truncate">
                  {mostPlayedSong.song ? mostPlayedSong.song.title || "Unknown" : "Start listening"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {mostPlayedSong.count > 0 ? `${mostPlayedSong.count} plays` : "No plays yet"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="bg-card/30 border-border/50 backdrop-blur overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground font-medium">Recent Drop</p>
                <p className="text-sm font-bold font-display tracking-tight text-foreground truncate">
                  {stats.recentSong ? stats.recentSong.title || "Unknown" : "None"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
