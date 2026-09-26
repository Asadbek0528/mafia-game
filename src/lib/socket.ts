/*
  =============================================================
  socket.ts — живые обновления через WebSocket.

  Идея простая: сервер присылает сообщение «что-то изменилось»
  (игрок зашёл, фаза сменилась, кого-то убили) — мы сразу
  заново загружаем комнату / игру через обычный API.
  Поэтому формат сообщений почти не важен.

  Если WebSocket не подключился — страница продолжает работать
  через опрос сервера (polling), только медленнее.

  Адреса настраиваются в .env.local (см. .env.example):
    NEXT_PUBLIC_WS_URL        — сервер, например ws://13.211.79.228
                                (пустая строка = WebSocket выключен)
    NEXT_PUBLIC_WS_ROOM_PATH  — путь комнаты, {id} заменится на номер
    NEXT_PUBLIC_WS_GAME_PATH  — путь игры
  =============================================================
*/
import { useEffect, useRef, useState } from "react";

import { getToken } from "./auth";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://13.211.79.228";
const ROOM_PATH = process.env.NEXT_PUBLIC_WS_ROOM_PATH ?? "/ws/room/{id}";
const GAME_PATH = process.env.NEXT_PUBLIC_WS_GAME_PATH ?? "/ws/game/{id}";

export const WS_PATHS = {
  room: (roomId: string) => ROOM_PATH.replace("{id}", roomId),
  game: (gameId: string) => GAME_PATH.replace("{id}", gameId),
};

// адрес с токеном: браузерный WebSocket не умеет слать заголовок Authorization
function buildUrl(path: string): string {
  const token = getToken();
  if (!token) return WS_URL + path;
  const separator = path.includes("?") ? "&" : "?";
  return `${WS_URL}${path}${separator}token=${encodeURIComponent(token)}`;
}

/*
  Хук: const isLive = useLiveUpdates(WS_PATHS.room(id), () => loadRoom());
  path = null — не подключаться (например, в демо).
  Возвращает true, пока соединение открыто.
*/
export function useLiveUpdates(
  path: string | null,
  onMessage: (data: unknown) => void,
): boolean {
  const [isConnected, setIsConnected] = useState(false);

  // в ref всегда свежая функция — не нужно переподключаться при каждой отрисовке
  const handlerRef = useRef(onMessage);
  useEffect(() => {
    handlerRef.current = onMessage;
  });

  useEffect(() => {
    if (!path || !WS_URL) return;

    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let isStopped = false;

    // переподключение: 2, 4, 8, 16, 30, 30... секунд
    function scheduleReconnect() {
      attempt += 1;
      const delay = Math.min(30_000, 1000 * 2 ** attempt);
      retryTimer = setTimeout(connect, delay);
    }

    function connect() {
      try {
        socket = new WebSocket(buildUrl(path!));
      } catch {
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        attempt = 0;
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        let data: unknown = event.data;
        try {
          data = JSON.parse(event.data);
        } catch {
          // не JSON — отдаём как есть
        }
        handlerRef.current(data);
      };

      socket.onclose = () => {
        setIsConnected(false);
        if (!isStopped) scheduleReconnect();
      };

      socket.onerror = () => socket?.close();
    }

    connect();

    return () => {
      isStopped = true;
      clearTimeout(retryTimer);
      socket?.close();
      setIsConnected(false);
    };
  }, [path]);

  return isConnected;
}
