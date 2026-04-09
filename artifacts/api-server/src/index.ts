import 'dotenv/config'
import app from "./app";
import { logger } from "./lib/logger";
import { ensureDatabase } from "@workspace/db";

const rawPort = process.env["PORT"];

const port = Number(rawPort ?? "4001");

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await ensureDatabase();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
