import type { NextConfig } from "next";

/*
  Адрес backend. Меняется в .env.local (BACKEND_URL=http://...),
  после изменения перезапустите npm run dev.
*/
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://13.211.79.228").replace(/\/$/, "");

const nextConfig: NextConfig = {
  /*
    Прокси до backend.
    Фронт делает запрос на /backend/rooms,
    а Next.js пересылает его на BACKEND_URL/rooms.
    Поэтому в браузере нет ошибок CORS.
  */
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
