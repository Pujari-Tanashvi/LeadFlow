/**
 * Runs the LeadFlow API and the Vite dev server together with one command.
 *
 * The frontend calls same-origin `/api/*`, which Vite proxies to the Express
 * server (see vite.config.ts). If only `vite` runs, that proxy has nothing to
 * forward to and every sign-in attempt fails with a gateway error, which is a
 * confusing way to learn that the backend was never started. This script makes
 * the API and the web server a single, self-contained `npm run dev`.
 *
 * No extra dependency: Node's own child_process is enough.
 */
import { spawn } from "node:child_process";
import process from "node:process";

const API_PORT = process.env.PORT ?? "4000";
const WEB_PORT = process.env.WEB_PORT ?? "3000";
const API_TARGET = `http://127.0.0.1:${API_PORT}`;

/** Exit the whole dev run when either child dies (e.g. Ctrl+C, a crash). */
const children = new Set();
let shuttingDown = false;

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill();
  }
  process.exit(code);
}

function start(label, command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
    ...options,
  });
  children.add(child);

  const prefix = `[${label}]`;
  const forward = (stream, target) => {
    let buffer = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) target.write(`${prefix} ${line}\n`);
    });
    stream.on("end", () => {
      if (buffer) target.write(`${prefix} ${buffer}\n`);
    });
  };
  forward(child.stdout, process.stdout);
  forward(child.stderr, process.stderr);

  child.on("exit", (code, signal) => {
    children.delete(child);
    if (shuttingDown) return;
    if (code === 0) {
      console.log(`${prefix} exited.`);
      shutdown(0);
      return;
    }
    console.error(
      `${prefix} stopped unexpectedly (${signal ?? `exit code ${code}`}). Shutting down.`,
    );
    shutdown(typeof code === "number" && code !== 0 ? code : 1);
  });

  return child;
}

console.log(`LeadFlow dev — API on ${API_TARGET}, web on http://localhost:${WEB_PORT}`);

// Fail fast with an actionable message instead of letting the proxy 502 later.
try {
  const response = await fetch(`${API_TARGET}/api/health`, {
    signal: AbortSignal.timeout(1500),
  });
  if (!response.ok) {
    console.warn(`[api] health check returned ${response.status}.`);
  }
} catch {
  console.log("[api] starting… (first boot can take a few seconds)");
}

start(
  "api",
  process.execPath,
  ["node_modules/tsx/dist/cli.mjs", "server/src/index.ts"],
);

start("web", process.execPath, [
  "node_modules/vite/bin/vite.js",
  "--port",
  WEB_PORT,
  "--host",
  "0.0.0.0",
]);

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));