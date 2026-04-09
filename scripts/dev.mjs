import { spawn } from "node:child_process";

const rootEnv = { ...process.env };
const frontendPort = rootEnv.FRONTEND_PORT ?? "3000";
const backendPort = rootEnv.BACKEND_PORT ?? "4001";
const frontendUrl = `http://localhost:${frontendPort}`;

const children = [];
let shuttingDown = false;

function run(name, args, extraEnv = {}) {
  const command = process.platform === "win32" ? "cmd.exe" : "pnpm";
  const commandArgs =
    process.platform === "win32" ? ["/d", "/s", "/c", "pnpm", ...args] : args;

  const child = spawn(command, commandArgs, {
    cwd: process.cwd(),
    env: { ...rootEnv, ...extraEnv },
    stdio: "inherit",
    shell: false,
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    if (code === 0) {
      return;
    }

    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.error(`${name} exited with ${reason}`);
    shutdown(code ?? 1);
  });

  children.push(child);
  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }

  process.exit(exitCode);
}

function openBrowser(url) {
  if (rootEnv.NO_OPEN === "1") {
    return;
  }

  let command;
  let args;

  if (process.platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", url];
  } else if (process.platform === "darwin") {
    command = "open";
    args = [url];
  } else {
    command = "xdg-open";
    args = [url];
  }

  const child = spawn(command, args, {
    stdio: "ignore",
    detached: true,
    shell: false,
  });

  child.unref();
}

run(
  "api-server",
  ["--filter", "@workspace/api-server", "run", "dev"],
  {
    PORT: backendPort,
    NODE_ENV: rootEnv.NODE_ENV ?? "development",
  },
);

run(
  "vibestream",
  ["--filter", "@workspace/vibestream", "run", "dev"],
  {
    PORT: frontendPort,
    BASE_PATH: rootEnv.BASE_PATH ?? "/",
    API_PORT: backendPort,
    NODE_ENV: rootEnv.NODE_ENV ?? "development",
  },
);

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log(`VibeStream frontend: http://localhost:${frontendPort}`);
console.log(`VibeStream API: http://localhost:${backendPort}/api`);

setTimeout(() => {
  openBrowser(frontendUrl);
}, 2500);
