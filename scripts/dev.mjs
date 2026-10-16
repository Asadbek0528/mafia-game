import { spawn } from "node:child_process";
import { createServer } from "node:net";

import { setting } from "./env.mjs";

process.env.WS_PORT ??= setting("WS_PORT", setting("NEXT_PUBLIC_WS_PORT", "3001"));
await import("./ws-server.mjs");

const args = process.argv.slice(2).filter((arg) => /^[\w.:=-]+$/.test(arg));

function isPortFree(port) {
  return new Promise((resolve) => {
    const probe = createServer()
      .once("error", () => resolve(false))
      .once("listening", () => probe.close(() => resolve(true)))
      .listen(port);
  });
}

// Next сам ищет свободный порт и может занять порт WebSocket-сервера — выбираем порт сами
async function pickNextPort() {
  const wsPort = Number(process.env.WS_PORT);
  for (let port = Number(setting("PORT", "3000")); port < 3100; port += 1) {
    if (port !== wsPort && (await isPortFree(port))) return port;
  }
  return 3000;
}

const hasPortArg = args.some((arg) => arg === "-p" || arg.startsWith("--port"));
if (!hasPortArg) {
  const port = await pickNextPort();
  if (port !== 3000) console.log(`  Порт 3000 занят — сайт запустится на ${port}`);
  args.push("-p", String(port));
}

const next = spawn(["npx", "next", "dev", ...args].join(" "), {
  stdio: "inherit",
  shell: true,
});

next.on("exit", (code) => process.exit(code ?? 0));

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    next.kill(signal);
    process.exit(0);
  });
}
