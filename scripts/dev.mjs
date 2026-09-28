import { spawn } from "node:child_process";

import { setting } from "./env.mjs";

process.env.WS_PORT ??= setting("WS_PORT", setting("NEXT_PUBLIC_WS_PORT", "3001"));
await import("./ws-server.mjs");

const args = process.argv.slice(2).filter((arg) => /^[\w.:=-]+$/.test(arg));

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
