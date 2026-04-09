import { Router } from "express";
import { db, songsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { AddSongBody, DeleteSongParams, VoteSongParams, VoteSongBody } from "@workspace/api-zod";

const router = Router();

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

router.get("/songs", async (req, res) => {
  const songs = await db.select().from(songsTable).orderBy(desc(songsTable.createdAt));
  res.json(songs);
});

router.get("/songs/stats", async (req, res) => {
  const allSongs = await db.select().from(songsTable).orderBy(desc(songsTable.createdAt));
  const topSong = await db.select().from(songsTable).orderBy(desc(songsTable.votes)).limit(1);
  const recentSong = allSongs[0];
  res.json({
    totalSongs: allSongs.length,
    topSong: topSong[0] ?? null,
    recentSong: recentSong ?? null,
  });
});

router.post("/songs", async (req, res) => {
  const parsed = AddSongBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { youtubeUrl, addedBy, title } = parsed.data;
  const youtubeId = extractYoutubeId(youtubeUrl);
  if (!youtubeId) {
    res.status(400).json({ error: "Invalid YouTube URL" });
    return;
  }

  const resolvedTitle = title?.trim() || `YouTube: ${youtubeId}`;

  const [song] = await db
    .insert(songsTable)
    .values({ youtubeId, title: resolvedTitle, addedBy })
    .returning();

  res.status(201).json(song);
});

router.delete("/songs/:id", async (req, res) => {
  const parsed = DeleteSongParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid song id" });
    return;
  }

  const { id } = parsed.data;
  const deleted = await db.delete(songsTable).where(eq(songsTable.id, id)).returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "Song not found" });
    return;
  }
  res.status(204).send();
});

router.post("/songs/:id/votes", async (req, res) => {
  const parsedParams = VoteSongParams.safeParse(req.params);
  const parsedBody = VoteSongBody.safeParse(req.body);

  if (!parsedParams.success || !parsedBody.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { id } = parsedParams.data;
  const { direction } = parsedBody.data;

  const delta = direction === "up" ? 1 : -1;
  const [updated] = await db
    .update(songsTable)
    .set({ votes: sql`${songsTable.votes} + ${delta}` })
    .where(eq(songsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Song not found" });
    return;
  }
  res.json(updated);
});

export default router;
