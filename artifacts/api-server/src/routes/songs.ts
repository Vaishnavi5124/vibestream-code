import { Router } from "express";
import { db, pool, songsTable } from "@workspace/db";
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

async function getPlaybackState() {
  const result = await pool.query<{
    current_song_id: number | null;
    started_at: Date | null;
  }>(`
    SELECT current_song_id, started_at
    FROM playback_state
    WHERE id = 1
  `);

  const row = result.rows[0];
  return {
    currentSongId: row?.current_song_id ?? null,
    startedAt: row?.started_at ? row.started_at.toISOString() : null,
  };
}

async function setPlaybackState(songId: number | null, startedAt = new Date()) {
  await pool.query(
    `
      UPDATE playback_state
      SET current_song_id = $1, started_at = $2
      WHERE id = 1
    `,
    [songId, songId === null ? null : startedAt],
  );
}

router.get("/songs", async (req, res) => {
  const songs = await db.select().from(songsTable).orderBy(desc(songsTable.createdAt));
  res.json(songs);
});

router.get("/playback", async (_req, res) => {
  const playback = await getPlaybackState();
  res.json(playback);
});

router.put("/playback", async (req, res) => {
  const { songId, startedAt } = req.body ?? {};

  if (songId !== null && (!Number.isInteger(songId) || songId <= 0)) {
    res.status(400).json({ error: "Invalid song id" });
    return;
  }

  const playbackStartedAt =
    typeof startedAt === "string" ? new Date(startedAt) : new Date();

  if (songId !== null && Number.isNaN(playbackStartedAt.getTime())) {
    res.status(400).json({ error: "Invalid playback start time" });
    return;
  }

  await setPlaybackState(songId ?? null, playbackStartedAt);
  res.json(await getPlaybackState());
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

  const playback = await getPlaybackState();
  if (playback.currentSongId === null) {
    await setPlaybackState(song.id);
  }

  res.status(201).json(song);
});

router.post("/songs/restore", async (req, res) => {
  const { youtubeId, title, addedBy, votes, createdAt } = req.body ?? {};

  if (
    typeof youtubeId !== "string" ||
    typeof title !== "string" ||
    typeof addedBy !== "string"
  ) {
    res.status(400).json({ error: "Invalid restore payload" });
    return;
  }

  const restoredVotes =
    typeof votes === "number" && Number.isInteger(votes) ? votes : 0;
  const restoredCreatedAt =
    typeof createdAt === "string" || createdAt instanceof Date
      ? new Date(createdAt)
      : new Date();

  if (Number.isNaN(restoredCreatedAt.getTime())) {
    res.status(400).json({ error: "Invalid restore timestamp" });
    return;
  }

  const [song] = await db
    .insert(songsTable)
    .values({
      youtubeId,
      title,
      addedBy,
      votes: restoredVotes,
      createdAt: restoredCreatedAt,
    })
    .returning();

  const playback = await getPlaybackState();
  if (playback.currentSongId === null) {
    await setPlaybackState(song.id, restoredCreatedAt);
  }

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

  const playback = await getPlaybackState();
  if (playback.currentSongId === id) {
    const remainingSongs = await db
      .select()
      .from(songsTable)
      .orderBy(desc(songsTable.votes), desc(songsTable.createdAt));

    const nextSong = remainingSongs[0] ?? null;
    await setPlaybackState(nextSong?.id ?? null);
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
