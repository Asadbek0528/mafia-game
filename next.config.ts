import { networkInterfaces } from "node:os";

import type { NextConfig } from "next";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://54.206.85.23").replace(/\/$/, "");

const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((item) => item && item.family === "IPv4" && !item.internal)
  .map((item) => item!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanAddresses,

  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
