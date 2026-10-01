import { networkInterfaces } from "node:os";

import type { NextConfig } from "next";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://13.210.238.201").replace(/\/$/, "");
const WS_PORT = process.env.WS_PORT ?? process.env.NEXT_PUBLIC_WS_PORT ?? "3001";
const WS_TARGET = (process.env.WS_INTERNAL_URL ?? `http://127.0.0.1:${WS_PORT}`).replace(/\/$/, "");

function lanRank(address: string): number {
  if (address.startsWith("192.168.")) return 0;
  if (address.startsWith("10.")) return 1;
  return 2;
}

const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((item) => item && item.family === "IPv4" && !item.internal)
  .map((item) => item!.address)
  .sort((a, b) => lanRank(a) - lanRank(b));

const nextConfig: NextConfig = {
  allowedDevOrigins: lanAddresses,

  env: {
    NEXT_PUBLIC_LAN_HOST: process.env.NODE_ENV === "production" ? "" : (lanAddresses[0] ?? ""),
  },

  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
      {
        source: "/ws/:path*",
        destination: `${WS_TARGET}/ws/:path*`,
      },
    ];
  },
};

export default nextConfig;
