import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";

const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}

for (const lockfile of ["package-lock.json", "yarn.lock"]) {
  const lockfilePath = path.resolve(process.cwd(), lockfile);
  if (existsSync(lockfilePath)) {
    unlinkSync(lockfilePath);
  }
}
