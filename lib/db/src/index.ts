import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export async function ensureDatabase(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS songs (
      id SERIAL PRIMARY KEY,
      youtube_id TEXT NOT NULL,
      title TEXT NOT NULL,
      added_by TEXT NOT NULL,
      votes INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS playback_state (
      id INTEGER PRIMARY KEY,
      current_song_id INTEGER REFERENCES songs(id) ON DELETE SET NULL,
      started_at TIMESTAMP
    );
  `);

  await pool.query(`
    INSERT INTO playback_state (id, current_song_id, started_at)
    VALUES (1, NULL, NULL)
    ON CONFLICT (id) DO NOTHING;
  `);
}

export * from "./schema";
