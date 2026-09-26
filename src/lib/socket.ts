import { useCallback, useEffect, useRef, useState } from "react";

import { getToken } from "./auth";

const WS_SETTING = process.env.NEXT_PUBLIC_WS_URL ?? "auto";
const WS_PORT = process.env.NEXT_PUBLIC_WS_PORT ?? "3001";
const ROOM_PATH = process.env.NEXT_PUBLIC_WS_ROOM_PATH ?? "/ws/room/{id}";
const GAME_PATH = process.env.NEXT_PUBLIC_WS_GAME_PATH ?? "/ws/game/{id}";

export const WS_PATHS = {
  room: (roomId: string) => ROOM_PATH.replace("{id}", roomId),
  game: (gameId: string) => GAME_PATH.replace("{id}", gameId),
};

function getServerUrl(): string {
  if (WS_SETTING !== "auto") return WS_SETTING;
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.hostname}:${WS_PORT}`;
}

function buildUrl(path: string): string {
  const token = getToken();
  const url = getServerUrl() + path;
  if (!token) return url;
  const separator = path.includes("?") ? "&" : "?";
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

export type LiveUpdates = {
  isLive: boolean;
  notify: (type?: string) => void;
};

export function useLiveUpdates(path: string | null, onMessage: (data: unknown) => void): LiveUpdates {
  const [isLive, setIsLive] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const handlerRef = useRef(onMessage);
  useEffect(() => {
    handlerRef.current = onMessage;
  });

  useEffect(() => {
    if (!path || !WS_SETTING) return;

    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let isStopped = false;

    function scheduleReconnect() {
      attempt += 1;
      const delay = Math.min(30_000, 1000 * 2 ** attempt);
      retryTimer = setTimeout(connect, delay);
    }

    function connect() {
      let socket: WebSocket;
      try {
        socket = new WebSocket(buildUrl(path!));
      } catch {
        scheduleReconnect();
        return;
      }
      socketRef.current = socket;

      socket.onopen = () => {
        attempt = 0;
        setIsLive(true);
        socket.send(JSON.stringify({ type: "hello" }));
      };

      socket.onmessage = (event) => {
        let data: unknown = event.data;
        try {
          data = JSON.parse(event.data);
        } catch {
          data = event.data;
        }
        handlerRef.current(data);
      };

      socket.onclose = () => {
        if (socketRef.current === socket) socketRef.current = null;
        setIsLive(false);
        if (!isStopped) scheduleReconnect();
      };

      socket.onerror = () => socket.close();
    }

    connect();

    return () => {
      isStopped = true;
      clearTimeout(retryTimer);
      socketRef.current?.close();
      socketRef.current = null;
      setIsLive(false);
    };
  }, [path]);

  const notify = useCallback((type = "update") => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type }));
  }, []);

  return { isLive, notify };
}
