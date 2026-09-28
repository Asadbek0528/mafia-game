import { existsSync, readFileSync } from "node:fs";

function readEnvFile() {
  const env = {};
  if (!existsSync(".env.local")) return env;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

const fileEnv = readEnvFile();

export function setting(name, fallback) {
  return process.env[name] ?? fileEnv[name] ?? fallback;
}

export const BACKEND_URL = setting("BACKEND_URL", "http://13.210.238.201").replace(/\/$/, "");
